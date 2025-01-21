import 'reflect-metadata';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from './websocket/WebSocketServer';
import { wsMonitor } from './routes/debug.routes';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import channelRoutes from './routes/channel.routes';
import messageRoutes from './routes/message.routes';
import bodyParser from 'body-parser';
import connectDB from './config/database';
import dotenv from 'dotenv';
import passport from 'passport';
import path from 'path';
import session from 'express-session';
import { jwtConfig } from './config/jwt.config';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { Duplex } from 'stream';
import { pineconeConfig } from './config/pinecone';
import Logger from './utils/logger';
import searchRoutes from './routes/search.routes';

// Load environment variables
console.log('Current working directory:', process.cwd());
const result = dotenv.config();
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('.env file loaded successfully');
  console.log('PINECONE_API_KEY exists:', !!process.env.PINECONE_API_KEY);
  console.log('PINECONE_INDEX exists:', !!process.env.PINECONE_INDEX);
}

// Import OAuth configuration after environment variables are loaded
import './config/oauth.config';

const app = express();
const httpServer = createServer(app);

// Connect to MongoDB and initialize Pinecone
Promise.all([
  connectDB(),
  pineconeConfig.initialize()
]).then(() => {
  Logger.info('Database connections initialized', {
    context: 'Startup',
    data: {
      mongodb: true,
      pinecone: true
    }
  });
}).catch((error) => {
  Logger.error('Failed to initialize database connections', {
    context: 'Startup',
    data: { error }
  });
  process.exit(1);
});

// Configure middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  maxAge: 86400,
  optionsSuccessStatus: 204
}));

// Add CSP headers
app.use((req, res, next) => {
  // Only apply strict CSP to non-OAuth routes
  if (!req.path.startsWith('/api/auth/google')) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
        "style-src 'self' 'unsafe-inline' https: data:",
        "img-src 'self' data: https: blob:",
        "font-src 'self' https: data:",
        "frame-src 'self' https://accounts.google.com https://*.google.com",
        "connect-src 'self' http://localhost:3000 ws: wss: https: blob:",
        "media-src 'self' blob:",
        "object-src 'none'"
      ].join('; ')
    );
  } else {
    // More permissive CSP for OAuth routes
    res.setHeader(
      'Content-Security-Policy',
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"
    );
  }
  next();
});

// Configure session middleware
app.use(session({
  secret: jwtConfig.secret.toString(),
  resave: false,
  saveUninitialized: false,
  name: 'session',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Parse JSON bodies
app.use(bodyParser.json());

// Initialize Passport after session
app.use(passport.initialize());

// Mount routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/unread', messageRoutes);
app.use('/api/search', searchRoutes);

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Basic route handler
app.get('/', (req, res) => {
  res.json({ message: 'ChatGenius API Server' });
});

// Initialize WebSocket server
const webSocketServer = new WebSocketServer(httpServer);

// Add WebSocket upgrade handler
httpServer.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
  try {
    // Only handle WebSocket upgrade requests
    if (request.headers.upgrade?.toLowerCase() !== 'websocket') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/ws') {
      console.log('Upgrading WebSocket connection', {
        pathname,
        hasToken: !!url.searchParams.get('token'),
        tokenPreview: url.searchParams.get('token')?.substring(0, 15) + '...'
      });

      // Ensure the socket doesn't timeout during the upgrade
      socket.setTimeout(0);
      socket.setNoDelay(true);
      socket.setKeepAlive(true);
    } else {
      console.log('Invalid WebSocket path:', pathname);
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
    }
  } catch (error) {
    console.error('Error handling WebSocket upgrade:', error);
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
  }
});

// Add graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  webSocketServer.shutdown();
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Export the HTTP server for use in other modules
export const server = httpServer;

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
