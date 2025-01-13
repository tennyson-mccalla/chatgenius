import { Channel, IChannel, User } from '../models';
import mongoose from 'mongoose';

interface CreateChannelParams {
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string; // user ID
  members?: string[]; // array of user IDs
}

class ChannelService {
  async createChannel(params: CreateChannelParams): Promise<IChannel> {
    const { name, description, isPrivate, createdBy, members = [] } = params;

    // Always include the creator in the members list
    const uniqueMembers = Array.from(new Set([createdBy, ...members]));

    // Validate that all members exist
    const memberCount = await User.countDocuments({
      _id: { $in: uniqueMembers.map(id => new mongoose.Types.ObjectId(id)) }
    });

    if (memberCount !== uniqueMembers.length) {
      throw new Error('One or more member IDs are invalid');
    }

    // Create the channel
    const channel = await Channel.create({
      name,
      description,
      isPrivate,
      isDM: false,
      members: uniqueMembers,
      createdBy
    });

    return channel.populate(['members', 'createdBy']);
  }

  async getChannels(userId: string) {
    try {
      console.log('Fetching channels for user:', userId);

      const channels = await Channel.find({
        isDM: false
      })
      .populate('createdBy', 'username avatar')
      .lean();

      const channelsWithAccess = channels.map(channel => {
        const isCreator = channel.createdBy?._id.toString() === userId;
        const isMember = channel.members.some(memberId => memberId.toString() === userId);
        const hasAccess = !channel.isPrivate || isMember || isCreator;

        console.log('Channel access check:', {
          channelId: channel._id,
          channelName: channel.name,
          isPrivate: channel.isPrivate,
          isCreator,
          isMember,
          hasAccess
        });

        return {
          ...channel,
          hasAccess
        };
      });

      return channelsWithAccess;
    } catch (error) {
      console.error('Error fetching channels:', error);
      throw error;
    }
  }

  async getChannelById(channelId: string, userId: string): Promise<IChannel | null> {
    // Try to find by ID first
    let channel = await Channel.findOne({
      _id: channelId,
      $or: [
        { isPrivate: false },
        { members: userId },
        { createdBy: userId }
      ]
    }).populate(['members', 'createdBy']);

    // If not found by ID, try to find by name
    if (!channel) {
      channel = await Channel.findOne({
        name: channelId,  // Try using the channelId as a name
        $or: [
          { isPrivate: false },
          { members: userId },
          { createdBy: userId }
        ]
      }).populate(['members', 'createdBy']);
    }

    return channel;
  }

  async addMemberToChannel(channelId: string, userId: string, addedBy: string): Promise<IChannel> {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if the user adding is a member
    if (!channel.members.includes(new mongoose.Types.ObjectId(addedBy))) {
      throw new Error('You do not have permission to add members to this channel');
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Add member if not already in the channel
    if (!channel.members.includes(new mongoose.Types.ObjectId(userId))) {
      channel.members.push(new mongoose.Types.ObjectId(userId));
      await channel.save();
    }

    return channel.populate(['members', 'createdBy']);
  }

  async removeMemberFromChannel(channelId: string, userId: string, removedBy: string): Promise<IChannel> {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if the user removing is a member
    if (!channel.members.includes(new mongoose.Types.ObjectId(removedBy))) {
      throw new Error('You do not have permission to remove members from this channel');
    }

    // Cannot remove the last member
    if (channel.members.length <= 1) {
      throw new Error('Cannot remove the last member from a channel');
    }

    // Remove member
    channel.members = channel.members.filter(
      memberId => !memberId.equals(new mongoose.Types.ObjectId(userId))
    );
    await channel.save();

    return channel.populate(['members', 'createdBy']);
  }

  async updateChannel(
    channelId: string,
    userId: string,
    updates: { name?: string; description?: string; isPrivate?: boolean }
  ): Promise<IChannel> {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if the user is a member
    if (!channel.members.includes(new mongoose.Types.ObjectId(userId))) {
      throw new Error('You do not have permission to update this channel');
    }

    // Update allowed fields
    if (updates.name) channel.name = updates.name;
    if (updates.description !== undefined) channel.description = updates.description;
    if (updates.isPrivate !== undefined) channel.isPrivate = updates.isPrivate;

    await channel.save();
    return channel.populate(['members', 'createdBy']);
  }

  async addUserToPublicChannels(userId: string): Promise<void> {
    console.log('Adding user to all public channels:', userId);

    // Find all public channels
    const publicChannels = await Channel.find({
      isPrivate: false,
      isDM: false,
      members: { $ne: userId } // Only get channels where user is not already a member
    });

    if (publicChannels.length === 0) {
      console.log('No public channels found to add user to');
      return;
    }

    console.log(`Found ${publicChannels.length} public channels to add user to`);

    // Add user to all public channels
    await Channel.updateMany(
      { _id: { $in: publicChannels.map(c => c._id) } },
      { $addToSet: { members: userId } }
    );

    console.log('User added to all public channels successfully');
  }
}

export default new ChannelService();
