import { Server, Namespace } from 'socket.io';
import { createServer } from 'http';
import { Express } from 'express';
import { socketIOMonitor } from './routes/debug.routes';
import { featureFlags } from './config/feature-flags';

let mainNamespace: Namespace;

export function initializeSocket(app: Express) {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    allowEIO3: true,
    maxHttpBufferSize: 1e8
  });

  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });

  mainNamespace = io.of('/');

  mainNamespace.on('connection', async (socket) => {
    const startTime = Date.now();
    socketIOMonitor.trackConnection();

    socket.on('disconnect', (reason) => {
      if (featureFlags.shouldHandleInSocketIO('presence')) {
        socketIOMonitor.trackDisconnection();
      }
    });

    socket.on('error', () => {
      socketIOMonitor.trackFailedConnection();
    });

    // Message handling
    socket.on('message', async (message) => {
      if (!featureFlags.shouldHandleInSocketIO('messaging')) {
        return; // Let WebSocket handle it
      }

      try {
        const messageId = message.id || Date.now().toString();
        socketIOMonitor.trackMessageSent(messageId);

        const latency = Date.now() - startTime;
        socketIOMonitor.trackLatency(latency);

        // Emit success or trigger fallback
        socket.emit('message:sent', { id: messageId, success: true });
      } catch (error) {
        socketIOMonitor.trackFailedMessage();

        // If fallback is enabled and WebSocket is available
        if (featureFlags.isFallbackEnabled('messaging') &&
            featureFlags.shouldHandleInWS('messaging')) {
          console.log('Falling back to WebSocket for message:', messageId);
          // Trigger WebSocket fallback (implement this)
          socket.emit('use:fallback', {
            feature: 'messaging',
            messageId,
            error: error.message
          });
        } else {
          socket.emit('message:error', {
            id: messageId,
            error: error.message
          });
        }
      }
    });

    // Typing indicators
    socket.on('typing_start', (data) => {
      if (featureFlags.shouldHandleInSocketIO('typing')) {
        socket.to(data.channelId).emit('typing_indicator', {
          ...data,
          isTyping: true
        });
      }
    });

    socket.on('typing_stop', (data) => {
      if (featureFlags.shouldHandleInSocketIO('typing')) {
        socket.to(data.channelId).emit('typing_indicator', {
          ...data,
          isTyping: false
        });
      }
    });

    // Channel events
    socket.on('join_channel', async (channelId) => {
      if (featureFlags.shouldHandleInSocketIO('channels')) {
        try {
          await handleChannelJoin(socket, channelId);
        } catch (error) {
          if (featureFlags.isFallbackEnabled('channels') &&
              featureFlags.shouldHandleInWS('channels')) {
            socket.emit('use:fallback', {
              feature: 'channels',
              channelId,
              error: error.message
            });
          }
        }
      }
    });
  });

  return { io, httpServer, mainNamespace };
}

export { mainNamespace };
