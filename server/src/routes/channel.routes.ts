import { Router } from 'express';
import passport from 'passport';
import channelService from '../services/channel.service';

const router = Router();

// Middleware to ensure user is authenticated
const authenticate = passport.authenticate('jwt', { session: false });

// Create a new channel
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, isPrivate, members } = req.body;
    const channel = await channelService.createChannel({
      name,
      description,
      isPrivate,
      createdBy: req.user.id,
      members
    });
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all channels (public + private where user is member)
router.get('/', authenticate, async (req, res) => {
  try {
    const channels = await channelService.getChannels(req.user.id);
    res.json(channels);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a specific channel
router.get('/:channelId', authenticate, async (req, res) => {
  try {
    const channel = await channelService.getChannelById(req.params.channelId, req.user.id);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a channel
router.patch('/:channelId', authenticate, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const channel = await channelService.updateChannel(
      req.params.channelId,
      req.user.id,
      { name, description, isPrivate }
    );
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add a member to a channel
router.post('/:channelId/members', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    const channel = await channelService.addMemberToChannel(
      req.params.channelId,
      userId,
      req.user.id
    );
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove a member from a channel
router.delete('/:channelId/members/:userId', authenticate, async (req, res) => {
  try {
    const channel = await channelService.removeMemberFromChannel(
      req.params.channelId,
      req.params.userId,
      req.user.id
    );
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
