// 🔥 MUST BE FIRST — dotenv before ANY other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get the directory where this file is located (backend directory)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory explicitly
const envPath = path.resolve(__dirname, '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✓ Loaded .env from: ${envPath}`);
} else {
  // Fallback to default behavior
  dotenv.config();
  console.warn(`⚠️  .env file not found at: ${envPath}`);
}

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectDB } from './config/database.js';
import { errorHandler } from './utils/errorHandler.js';
import { setupSocketIO } from './sockets/socketHandler.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';

// ----------------------------------------------------
// ENV CHECK (debug)
// ----------------------------------------------------

console.log('ENV CHECK:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: !!process.env.MONGODB_URI,
  CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
});

// Debug: Show actual Cloudinary values (first few chars only for security)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  console.log(`✓ CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME.substring(0, 10)}...`);
} else {
  console.error('✗ CLOUDINARY_CLOUD_NAME: NOT SET');
}
if (process.env.CLOUDINARY_API_KEY) {
  console.log(`✓ CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY.substring(0, 10)}...`);
} else {
  console.error('✗ CLOUDINARY_API_KEY: NOT SET');
}
if (process.env.CLOUDINARY_API_SECRET) {
  console.log(`✓ CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET.substring(0, 10)}...`);
} else {
  console.error('✗ CLOUDINARY_API_SECRET: NOT SET');
}

// ----------------------------------------------------
// Connect to MongoDB
// ----------------------------------------------------

connectDB();

// ----------------------------------------------------
// Express app & HTTP server
// ----------------------------------------------------

const app = express();
const httpServer = createServer(app);

// ----------------------------------------------------
// Socket.IO setup
// ----------------------------------------------------

const socketOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:5173', 'http://localhost:8080', 'https://mind-thread-psi.vercel.app/'];

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? socketOrigins : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available everywhere (controllers, etc.)
app.set('io', io);

// Initialize socket handlers
setupSocketIO(io);

// ----------------------------------------------------
// Middleware
// ----------------------------------------------------

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: isDevelopment ? true : socketOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// Routes
// ----------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', messageRoutes);
app.use('/api/groups', summaryRoutes);
app.use('/api/groups', fileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// ----------------------------------------------------
// Error handling (must be last)
// ----------------------------------------------------

app.use(errorHandler);

// ----------------------------------------------------
// Start server
// ----------------------------------------------------

const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
