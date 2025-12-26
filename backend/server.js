import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/database.js';
import { errorHandler } from './utils/errorHandler.js';
import { setupSocketIO } from './sockets/socketHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Make io available in controllers


// Import routes
import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import { serveFile } from './controllers/fileController.js';

// Load environment variables
// Try to load from .env in the backend directory (where this file is located)
const envPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(process.cwd(), '.env');
const backendEnvPath = path.resolve(process.cwd(), 'backend/.env');

let envFile = null;

// Check in order: backend/.env (current dir), .env (current dir), backend/.env (from root)
if (existsSync(envPath)) {
  envFile = envPath;
} else if (existsSync(rootEnvPath)) {
  envFile = rootEnvPath;
} else if (existsSync(backendEnvPath)) {
  envFile = backendEnvPath;
}

if (envFile) {
  dotenv.config({ path: envFile });
  console.log(`✓ Loaded .env from: ${envFile}`);
} else {
  // Fallback to default dotenv behavior
  dotenv.config();
  console.warn('⚠️  No .env file found. Using default dotenv behavior.');
  console.warn('   Please create a .env file in the backend directory from .env.example');
}

// Debug: Show if API key is loaded (without showing the actual key)
console.log(`✓ GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Not set'}`);
console.log(`✓ MONGODB_URI: ${process.env.MONGODB_URI ? '✓ Set' : '✗ Not set'}`);


// Validate required environment variables
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
  console.warn('⚠️  WARNING: GEMINI_API_KEY is not configured.');
  console.warn('   AI summary features will not work.');
  console.warn('   Get your API key from: https://makersuite.google.com/app/apikey');
  console.warn('   Then add it to your .env file: GEMINI_API_KEY=your-actual-api-key');
}

// Connect to database
connectDB();

// Create Express app
const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.io
const socketOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000'];

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? socketOrigins 
      : true, // Allow all origins in development
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketIO(io);
app.set('io', io);
// Middleware
// CORS configuration - allow multiple origins in development
const isDevelopment = process.env.NODE_ENV !== 'production';

// Simple CORS configuration - very permissive in development
if (isDevelopment) {
  // In development, allow all origins
  app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }));
} else {
  // In production, use specific origins
  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : [];
  
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', messageRoutes);
app.use('/api/groups', summaryRoutes);
app.use('/api/groups', fileRoutes);
// File serving route (public, but should be protected in production)
app.get('/api/files/:filename', serveFile);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

