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
import { Duplex } from 'stream';

// Load environment variables
dotenv.config();

// Import OAuth configuration after environment variables are loaded
import './config/oauth.config';

const app = express();
const httpServer = createServer(app);

// Connect to MongoDB
connectDB();

// Configure middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
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
        "connect-src 'self' ws: wss: https: blob:",
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

// Initialize WebSocket server with the HTTP server instance
export const wss = new WebSocketServer(httpServer, {
  path: '/ws',
  maxReconnectDelay: 30000,
  maxAttempts: 5,
  timeout: 60000
});

// Add WebSocket upgrade handler
httpServer.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/ws') {
      console.log('Upgrading WebSocket connection');
      wss.handleUpgrade(request, socket, head);
    } else {
      console.log('Invalid WebSocket path:', pathname);
      socket.destroy();
    }
  } catch (error) {
    console.error('Error handling WebSocket upgrade:', error);
    socket.destroy();
  }
});

// Export the HTTP server for use in other modules
export const server = httpServer;

// Graceful shutdown
const shutdown = () => {
  httpServer.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
