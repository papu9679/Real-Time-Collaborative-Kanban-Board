import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { initSocketIO } from './sockets/socketHandler.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

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
