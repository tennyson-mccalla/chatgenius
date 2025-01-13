import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { jwtConfig } from './config/jwt.config';
import { JwtPayload } from 'jsonwebtoken';
import { ensureDefaultChannels } from './config/setup';
import { Channel, Message, User } from './models';
import { connectDB } from './config/db.config';
import routes from './routes';
import messageService from './services/message.service';

// Load environment variables first
dotenv.config();

// Load passport configurations in correct order
import './config/oauth.config';
import './config/passport.config';
import authRoutes from './routes/auth.routes';
import channelRoutes from './routes/channel.routes';
import messageRoutes from './routes/message.routes';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
    credentials: true
  },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Create default namespace
const mainNamespace = io.of('/');

interface AuthPayload extends JwtPayload {
  id: string;
}

interface PresenceData {
  count: number;
  status: string;
  user: any;
}

// Track user presence with user info
const userPresence = new Map<string, PresenceData>();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    console.log('Socket middleware: Auth attempt', {
      socketId: socket.id,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 20) + '...' : undefined,
      transport: socket.conn.transport.name
    });

    if (!token) {
      console.log('Socket middleware: No token provided', { socketId: socket.id });
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, jwtConfig.secret) as { id: string };
    console.log('Socket middleware: Token verified', {
      socketId: socket.id,
      userId: decoded.id,
      transport: socket.conn.transport.name
    });

    // Get user info
    const user = await User.findById(decoded.id).select('username avatar status');
    if (!user) {
      return next(new Error('User not found'));
    }

    // Force cleanup of any existing presence for this user
    const existingPresence = userPresence.get(decoded.id);
    if (existingPresence) {
      console.log('Force cleaning up existing presence for user:', {
        userId: decoded.id,
        username: user.username,
        existingCount: existingPresence.count
      });

      // Delete from presence map
      userPresence.delete(decoded.id);

      // Broadcast offline status
      io.emit('presence_update', {
        userId: decoded.id,
        status: 'offline',
        user
      });

      // Wait a bit before allowing new connection
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Attach user info to socket
    socket.data.userId = decoded.id;
    socket.data.user = user;
    next();
  } catch (error: any) {
    console.error('Socket middleware: Auth error', {
      socketId: socket.id,
      error: error.message,
      transport: socket.conn.transport.name
    });
    next(new Error('Invalid token'));
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('ChatGenius API is running');
});

// Debug endpoint to get all users and their presence
app.get('/api/debug/presence', async (req, res) => {
  try {
    // Get all users from the database
    const users = await User.find().select('_id username status');

    // Map users to include their current presence status
    const usersWithPresence = users.map(user => ({
      _id: user._id,
      username: user.username,
      dbStatus: user.status,
      presenceInfo: userPresence.get(user._id.toString()),
      isOnline: userPresence.has(user._id.toString())
    }));

    res.json({
      users: usersWithPresence,
      presenceMapSize: userPresence.size,
      rawPresenceMap: Array.from(userPresence.entries()).map(([userId, data]) => ({
        userId,
        count: data.count,
        status: data.status,
        username: data.user?.username
      }))
    });
  } catch (error) {
    console.error('Error fetching debug presence info:', error);
    res.status(500).json({ error: 'Failed to fetch presence info' });
  }
});

// Debug endpoint to reset presence map
app.post('/api/debug/reset-presence', async (req, res) => {
  try {
    console.log('Resetting presence map. Current state:', {
      size: userPresence.size,
      users: Array.from(userPresence.keys())
    });

    // Store users that were marked as online
    const onlineUsers = Array.from(userPresence.entries()).map(([userId, data]) => ({
      userId,
      user: data.user
    }));

    // Clear the presence map
    userPresence.clear();

    // Broadcast offline status for all previously online users
    for (const { userId, user } of onlineUsers) {
      io.emit('presence_update', {
        userId,
        status: 'offline',
        user
      });
    }

    console.log('Presence map reset complete');
    res.json({
      message: 'Presence map reset successfully',
      usersReset: onlineUsers.length
    });
  } catch (error) {
    console.error('Error resetting presence map:', error);
    res.status(500).json({ error: 'Failed to reset presence map' });
  }
});

// Debug endpoint to update test user statuses
app.post('/api/debug/update-test-users', async (req, res) => {
  try {
    // Update all test account users to offline
    const result = await User.updateMany(
      { username: { $regex: /^Test Account/ } },
      { $set: { status: 'offline' } }
    );

    console.log('Updated test users to offline:', result);
    res.json({
      message: 'Test users updated successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating test users:', error);
    res.status(500).json({ error: 'Failed to update test users' });
  }
});

// Socket.IO connection handling
mainNamespace.on('connection', async (socket) => {
  const userId = socket.data.userId;
  const user = socket.data.user;
  console.log('Socket event: Client connected', {
    socketId: socket.id,
    userId,
    username: user?.username,
    transport: socket.conn.transport.name,
    rooms: Array.from(socket.rooms)
  });

  // Update presence count and info
  const currentPresence = userPresence.get(userId);
  const currentCount = currentPresence?.count || 0;
  userPresence.set(userId, {
    count: currentCount + 1,
    status: 'online',
    user: user
  });

  // Send initial presence state to the connecting client
  const presenceList = Array.from(userPresence.entries()).map(([userId, data]) => ({
    userId,
    status: data.status,
    user: data.user
  }));
  socket.emit('initial_presence', presenceList);

  // Broadcast user online status if this is their first connection
  if (currentCount === 0) {
    io.emit('presence_update', { userId, status: 'online', user });
  }

  // Join user's channels
  try {
    // Get all channels where user is a member OR channel is public
    const channels = await Channel.find({
      $or: [
        { members: userId },
        { isPrivate: false }
      ]
    });

    for (const channel of channels) {
      socket.join(channel._id.toString());
      console.log('Joined channel:', { socketId: socket.id, channelId: channel._id });
    }
  } catch (error) {
    console.error('Error joining channels:', error);
  }

  socket.on('join_channel', async (channelId) => {
    try {
      const channel = await Channel.findById(channelId);
      if (!channel) {
        console.log('Channel not found:', channelId);
        return;
      }

      // Join the room
      socket.join(channelId);
      console.log('Joined channel:', { socketId: socket.id, channelId });

      // Get room members count
      const room = io.sockets.adapter.rooms.get(channelId);
      console.log('Room status:', {
        channelId,
        memberCount: room?.size || 0
      });
    } catch (error) {
      console.error('Error joining channel:', error);
    }
  });

  socket.on('leave_channel', (channelId) => {
    socket.leave(channelId);
    console.log('Left channel:', { socketId: socket.id, channelId });
  });

  socket.on('new_message', async (message) => {
    try {
      console.log('Socket event: New message received', {
        socketId: socket.id,
        content: message.content,
        channelId: message.channelId,
        senderId: socket.data.userId,
        transport: socket.conn.transport.name
      });

      // Create message in database
      const savedMessage = await messageService.createMessage({
        content: message.content,
        channelId: message.channelId,
        senderId: socket.data.userId
      });

      console.log('Socket event: Broadcasting message', {
        messageId: savedMessage._id,
        channelId: message.channelId,
        recipientCount: io.sockets.adapter.rooms.get(message.channelId)?.size || 0
      });

      // Broadcast to everyone in the channel, including sender
      io.in(message.channelId).emit('message_received', savedMessage);

    } catch (error) {
      console.error('Socket event: Message handling error', {
        socketId: socket.id,
        error: error.message,
        channelId: message.channelId
      });
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', { socketId: socket.id, userId });

    // Update presence count
    const presence = userPresence.get(userId);
    if (presence) {
      const newCount = Math.max(0, presence.count - 1);
      console.log('Updating presence count:', { userId, oldCount: presence.count, newCount });

      if (newCount === 0) {
        // Store user info before deleting from presence map
        const userInfo = presence.user;
        userPresence.delete(userId);

        // Broadcast user offline status with user info
        console.log('Broadcasting offline status for user:', {
          userId,
          username: userInfo?.username,
          remainingUsers: Array.from(userPresence.keys())
        });

        io.emit('presence_update', {
          userId,
          status: 'offline',
          user: userInfo
        });
      } else {
        userPresence.set(userId, {
          count: newCount,
          status: 'online',
          user: presence.user
        });
      }
    }
  });
});

// Create default channels if they don't exist
const createDefaultChannels = async () => {
  try {
    const generalChannel = await Channel.findOne({ name: 'general' });
    if (!generalChannel) {
      console.log('Creating general channel...');
      await Channel.create({
        name: 'general',
        description: 'General discussion channel',
        isPrivate: false,
        isDM: false,
        members: [], // Will be populated as users join
        createdBy: new mongoose.Types.ObjectId(), // System user
      });
      console.log('General channel created successfully');
    }
  } catch (error) {
    console.error('Error creating default channels:', error);
  }
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatgenius')
  .then(async () => {
    console.log('Connected to MongoDB');
    await createDefaultChannels();

    // Start the server
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
