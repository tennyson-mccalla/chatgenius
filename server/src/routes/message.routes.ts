import { Router } from 'express';
import passport from 'passport';
import messageService from '../services/message.service';

const router = Router();

// Middleware to ensure user is authenticated
const authenticate = passport.authenticate('jwt', { session: false });

// Get channel messages
router.get('/channel/:channelId', authenticate, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { before } = req.query;
    const limit = parseInt(req.query.limit as string) || 50;

    console.log('Fetching messages for channel:', channelId, 'User:', req.user);

    const messages = await messageService.getChannelMessages(
      channelId,
      req.user._id,
      limit,
      before ? new Date(before as string) : undefined
    );

    res.json(messages);
  } catch (error) {
    console.error('Error getting channel messages:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get thread messages
router.get('/thread/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { before } = req.query;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await messageService.getThreadMessages(
      messageId,
      req.user._id,
      limit,
      before ? new Date(before as string) : undefined
    );

    res.json(messages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create message
router.post('/', authenticate, async (req, res) => {
  try {
    const { content, channelId, parentMessageId, attachments } = req.body;

    console.log('Creating message:', {
      content,
      channelId,
      userId: req.user._id,
      parentMessageId
    });

    const message = await messageService.createMessage({
      content,
      channelId,
      senderId: req.user._id,
      parentMessageId,
      attachments
    });

    res.json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update message
router.patch('/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const message = await messageService.updateMessage(
      messageId,
      req.user._id,
      content
    );

    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete message
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    await messageService.deleteMessage(messageId, req.user._id);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add reaction
router.post('/:messageId/reactions', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const message = await messageService.addReaction(
      messageId,
      req.user.id,
      emoji
    );

    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove reaction
router.delete('/:messageId/reactions/:emoji', authenticate, async (req, res) => {
  try {
    const { messageId, emoji } = req.params;
    const message = await messageService.removeReaction(
      messageId,
      req.user.id,
      emoji
    );

    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
