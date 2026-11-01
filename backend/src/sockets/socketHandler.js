import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { Board } from '../models/Board.js';
import { Membership } from '../models/Membership.js';

// In-memory presence map: boardId -> Map(socketId -> userInfo)
const boardPresence = new Map();

// Helper to get distinct active users on a board
const getActiveUsersOnBoard = (boardId) => {
  const socketsMap = boardPresence.get(boardId);
  if (!socketsMap) return [];
  const uniqueUsers = new Map();
  for (const info of socketsMap.values()) {
    uniqueUsers.set(info.user.id.toString(), info.user);
  }
  return Array.from(uniqueUsers.values());
};

export const initSocketIO = (io) => {
  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // Also check headers / cookies if not in auth
      if (!token && socket.handshake.headers?.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((res, c) => {
          const [key, val] = c.trim().split('=');
          if (key && val) res[key] = decodeURIComponent(val);
          return res;
        }, {});
        token = cookies.token;
      }

      if (!token && socket.handshake.headers?.authorization?.startsWith('Bearer ')) {
        token = socket.handshake.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar
      };

      next();
    } catch (err) {
      console.error('[Socket Auth Error]:', err.message);
      next(new Error('Authentication error: Invalid session'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] User connected: ${socket.user.name} (${socket.id})`);

    // Tenant room join with server authorization
    socket.on('tenant:join', async ({ tenantId }, callback) => {
      try {
        if (!tenantId) return;

        // Verify membership
        const membership = await Membership.findOne({
          userId: socket.user.id,
          $or: [{ tenantId }, { role: 'org_admin' }]
        });

        if (!membership) {
          if (callback) callback({ success: false, error: 'Unauthorized tenant access' });
          return;
        }

        const roomName = `tenant:${tenantId}`;
        socket.join(roomName);
        if (callback) callback({ success: true, room: roomName });
      } catch (err) {
        console.error('[Socket tenant:join error]', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Board room join with server authorization
    socket.on('board:join', async ({ boardId }, callback) => {
      try {
        if (!boardId) return;

        const board = await Board.findById(boardId);
        if (!board) {
          if (callback) callback({ success: false, error: 'Board not found' });
          return;
        }

        // Check if user has org_admin for board's org or membership in board's tenant
        const authorized = await Membership.findOne({
          userId: socket.user.id,
          $or: [
            { organizationId: board.organizationId, role: 'org_admin' },
            { tenantId: board.tenantId }
          ]
        });

        if (!authorized) {
          if (callback) callback({ success: false, error: 'Unauthorized to view this board' });
          return;
        }

        const roomName = `board:${boardId}`;
        socket.join(roomName);

        // Track presence
        if (!boardPresence.has(boardId)) {
          boardPresence.set(boardId, new Map());
        }
        boardPresence.get(boardId).set(socket.id, {
          socketId: socket.id,
          user: socket.user,
          joinedAt: new Date()
        });

        // Broadcast updated presence to the board
        const activeUsers = getActiveUsersOnBoard(boardId);
        io.to(roomName).emit('presence:updated', {
          boardId,
          activeUsers
        });

        if (callback) callback({ success: true, room: roomName, activeUsers });
      } catch (err) {
        console.error('[Socket board:join error]', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Board room leave
    socket.on('board:leave', ({ boardId }) => {
      if (!boardId) return;
      const roomName = `board:${boardId}`;
      socket.leave(roomName);

      if (boardPresence.has(boardId)) {
        boardPresence.get(boardId).delete(socket.id);
        const activeUsers = getActiveUsersOnBoard(boardId);
        io.to(roomName).emit('presence:updated', {
          boardId,
          activeUsers
        });
      }
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User disconnected: ${socket.user.name} (${socket.id})`);

      // Clean up presence across all boards
      for (const [boardId, socketsMap] of boardPresence.entries()) {
        if (socketsMap.has(socket.id)) {
          socketsMap.delete(socket.id);
          const activeUsers = getActiveUsersOnBoard(boardId);
          io.to(`board:${boardId}`).emit('presence:updated', {
            boardId,
            activeUsers
          });
        }
      }
    });
  });
};
