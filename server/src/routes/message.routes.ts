import { Router, Request, Response } from 'express';
import passport from 'passport';
import { messageService } from '../services/message.service';
import { IUser } from '../models/types';
import { Types } from 'mongoose';
import { mainNamespace } from '../socket';
import { UnreadMessage } from '../models';
import mongoose from 'mongoose';
import { Message } from '../models';

interface UnreadDoc {
  channelId: mongoose.Types.ObjectId;
  count: number;
}

const router = Router();

// Middleware to ensure user is authenticated
const authenticate = passport.authenticate('jwt', { session: false });

// Type guard for authenticated user
function isAuthenticatedUser(user: any): user is IUser {
  return user && Types.ObjectId.isValid(user._id);
}

// Get channel messages
router.get('/channel/:channelId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    if (!isAuthenticatedUser(user)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { channelId } = req.params;
    const { before } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 100); // Cap at 100 messages

    if (isNaN(limit)) {
      return res.status(400).json({ message: 'Invalid limit parameter' });
    }

    console.log('Fetching messages for channel:', {
      channelId,
      userId: user._id.toString(),
      limit,
      before,
      timestamp: new Date().toISOString()
    });

    const messages = await messageService.getMessages(channelId, user._id.toString());
    res.json(messages);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error getting channel messages:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
});

// Get unread counts for all channels
router.get('/unread', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    if (!isAuthenticatedUser(user)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get unread counts from UnreadMessage model
    const unreadMessages = await UnreadMessage.find({
      user: new mongoose.Types.ObjectId(user._id.toString())
    }).lean();

    // Convert to map of channelId -> count
    const unreadCounts = unreadMessages.reduce((acc: Record<string, number>, doc) => {
      acc[doc.channel.toString()] = doc.count;
      return acc;
    }, {});

    res.json(unreadCounts);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

// Mark channel as read
router.post('/channel/:channelId/read', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    if (!isAuthenticatedUser(user)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('Marking channel as read:', {
      channelId: req.params.channelId,
      userId: user._id.toString()
    });

    const { channelId } = req.params;
    await messageService.markChannelAsRead(channelId, user._id.toString());

    console.log('Channel marked as read successfully');
    res.json({ message: 'Channel marked as read' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error marking channel as read:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
});

// Create message
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    if (!isAuthenticatedUser(user)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { content, channelId, attachments } = req.body;

    console.log('Creating message:', {
      content,
      channelId,
      userId: user._id.toString()
    });

    const message = await messageService.createMessage({
      content,
      channelId,
      senderId: user._id.toString(),
      attachments
    });

    // Log the populated message data
    console.log('Message created:', {
      messageId: message._id,
      channelId: message.channelId,
      sender: message.sender
    });

    res.json(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

// Delete message
router.delete('/:messageId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    if (!isAuthenticatedUser(user)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { messageId } = req.params;
    await messageService.deleteMessage(messageId, user._id.toString());
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

// Add reaction
router.post('/:messageId/reactions', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    if (!isAuthenticatedUser(user)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { messageId } = req.params;
    const { emoji } = req.body;

    // First get the message to get its channelId
    const existingMessage = await Message.findById(messageId);
    if (!existingMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = await messageService.addReaction(
      messageId,
      user._id.toString(),
      emoji,
      existingMessage.channelId.toString()
    );

    res.json(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

// Remove reaction
router.delete('/:messageId/reactions/:emoji', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    if (!isAuthenticatedUser(user)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { messageId, emoji } = req.params;

    // First get the message to get its channelId
    const existingMessage = await Message.findById(messageId);
    if (!existingMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = await messageService.removeReaction(
      messageId,
      user._id.toString(),
      emoji,
      existingMessage.channelId.toString()
    );

    res.json(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

export default router;
