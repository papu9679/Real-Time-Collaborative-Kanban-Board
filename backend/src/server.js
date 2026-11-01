import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { initSocketIO } from './sockets/socketHandler.js';
import { User } from './models/User.js';
import { seedDatabase } from './utils/seed.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Automatic first-run provisioning: if database is empty, seed demo data automatically
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Database] Empty database detected on first run. Auto-seeding initial demo data (Acme Technologies, branches, boards, tasks)...');
      await seedDatabase();
      console.log('[Database] Initial data populated successfully!');
    }
  } catch (seedErr) {
    console.warn('[Database] Auto-seed check notice:', seedErr.message);
  }

  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ];

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Make io instance accessible across Express controllers/services
  app.set('io', io);

  // Register real-time event handlers & presence
  initSocketIO(io);

  server.listen(PORT, () => {
    console.log(`[Server] Flowspace backend running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`[Server] Real-time collaboration enabled via Socket.IO`);
  });
};

startServer().catch((err) => {
  console.error('[Server Startup Error]:', err);
  process.exit(1);
});
