import { Router } from 'express';
import passport from 'passport';
import { channelService } from '../services/channel.service';

const router = Router();

// Middleware to ensure user is authenticated
const authenticate = passport.authenticate('jwt', { session: false });

// DM routes - these need to come before the general channel routes
router.get('/dm', authenticate, async (req, res) => {
  try {
    const channels = await channelService.getDMChannels(req.user._id.toString());
    res.json(channels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching DM channels' });
  }
});

router.post('/dm/:userId', authenticate, async (req, res) => {
  try {
    const channel = await channelService.createDMChannel(req.user._id.toString(), req.params.userId);
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: 'Error creating DM channel' });
  }
});

// Regular channel routes
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, isPrivate, members } = req.body;
    const channel = await channelService.createChannel({
      name,
      description,
      isPrivate,
      createdBy: req.user._id.toString(),
      members
    });
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: 'Error creating channel' });
  }
});

// Get all channels (public + private where user is member)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const channels = await channelService.getChannels(userId);
    res.json(channels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching channels' });
  }
});

// Get a specific channel
router.get('/:channelId', authenticate, async (req, res) => {
  try {
    const channel = await channelService.getChannelById(req.params.channelId, req.user._id.toString());
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: 'Error fetching channel' });
  }
});

// Update a channel
router.patch('/:channelId', authenticate, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const channel = await channelService.updateChannel(
      req.params.channelId,
      req.user._id.toString(),
      { name, description, isPrivate }
    );
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: 'Error updating channel' });
  }
});

// Add a member to a channel
router.post('/:channelId/members', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    const channel = await channelService.addMemberToChannel(
      req.params.channelId,
      userId,
      req.user._id.toString()
    );
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: 'Error adding member to channel' });
  }
});

// Remove a member from a channel
router.delete('/:channelId/members/:userId', authenticate, async (req, res) => {
  try {
    const channel = await channelService.removeMemberFromChannel(
      req.params.channelId,
      req.params.userId,
      req.user._id.toString()
    );
    res.json(channel);
  } catch (error) {
    res.status(400).json({ message: 'Error removing member from channel' });
  }
});

export default router;
