import { Message, IMessage, Channel, User } from '../models';
import mongoose from 'mongoose';

interface CreateMessageParams {
  content: string;
  channelId: string;
  senderId: string;
  parentMessageId?: string;
  attachments?: {
    url: string;
    type: string;
    name: string;
  }[];
}

class MessageService {
  async createMessage(params: CreateMessageParams): Promise<IMessage> {
    const { content, channelId, senderId, parentMessageId, attachments } = params;

    console.log('Creating message with params:', {
      content,
      channelId,
      senderId,
      parentMessageId
    });

    // Try to find channel by name first
    let channel = await Channel.findOne({ name: channelId });

    // If not found by name, try by ID
    if (!channel && mongoose.Types.ObjectId.isValid(channelId)) {
      channel = await Channel.findById(channelId);
    }

    if (!channel) {
      console.error('Channel not found:', channelId);
      throw new Error('Channel not found');
    }

    console.log('Channel found:', {
      name: channel.name,
      isPrivate: channel.isPrivate,
      memberCount: channel.members.length,
      members: channel.members.map(m => m.toString())
    });

    // Now check if user is a member or if it's a public channel
    const canPost = !channel.isPrivate || channel.members.some(memberId =>
      memberId.toString() === senderId.toString()
    );

    if (!canPost) {
      console.error('User cannot post in private channel:', {
        userId: senderId,
        channelName: channel.name
      });
      throw new Error('You cannot post messages in this private channel');
    }

    // Create the message
    const message = await Message.create({
      content,
      channel: channel._id,
      sender: senderId,
      ...(parentMessageId && { parentMessage: new mongoose.Types.ObjectId(parentMessageId) }),
      attachments
    });

    // Update channel's lastMessage timestamp
    await Channel.findByIdAndUpdate(channel._id, {
      lastMessage: new Date()
    });

    // Return fully populated message for real-time updates
    return await message.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'channel', select: 'name isPrivate' }
    ]);
  }

  async getChannelMessages(channelId: string, userId: string, limit = 50, before?: Date): Promise<IMessage[]> {
    console.log('Getting channel messages:', {
      channelId,
      userId,
      limit,
      before
    });

    // Try to find channel by name first
    let channel = await Channel.findOne({ name: channelId });

    // If not found by name, try by ID
    if (!channel && mongoose.Types.ObjectId.isValid(channelId)) {
      channel = await Channel.findById(channelId);
    }

    if (!channel) {
      console.error('Channel not found:', channelId);
      throw new Error('Channel not found');
    }

    // Check access
    const isCreator = channel.createdBy?.toString() === userId;
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

    if (!hasAccess) {
      console.error('Access denied to channel:', {
        channelId: channel._id,
        channelName: channel.name,
        userId
      });
      throw new Error('Access denied');
    }

    // Build query
    const query: any = {
      channel: channel._id,
      parentMessage: null // Only get top-level messages
    };

    if (before) {
      query.createdAt = { $lt: before };
    }

    console.log('Fetching messages with query:', query);

    // Get messages
    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('sender', 'username avatar')
      .lean();

    console.log('Found messages:', {
      channelId: channel._id,
      channelName: channel.name,
      count: messages.length
    });

    return messages;
  }

  async getThreadMessages(parentMessageId: string, userId: string, limit = 50, before?: Date): Promise<IMessage[]> {
    const parentMessage = await Message.findById(parentMessageId).populate('channel');
    if (!parentMessage) {
      throw new Error('Parent message not found');
    }

    // Verify user has access to the channel
    const channel = await Channel.findOne({
      _id: parentMessage.channel,
      $or: [
        { isPrivate: false },
        { members: userId }
      ]
    });

    if (!channel) {
      throw new Error('Access denied');
    }

    // Build query
    const query: any = {
      parentMessage: parentMessageId
    };

    if (before) {
      query.createdAt = { $lt: before };
    }

    // Get thread messages
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate(['sender', 'reactions.users']);

    return messages;
  }

  async updateMessage(messageId: string, userId: string, content: string): Promise<IMessage> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify user is the sender
    if (message.sender.toString() !== userId) {
      throw new Error('Only the sender can edit the message');
    }

    message.content = content;
    message.edited = true;
    await message.save();

    return message.populate(['sender', 'reactions.users']);
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify user is the sender
    if (message.sender.toString() !== userId) {
      throw new Error('Only the sender can delete the message');
    }

    // Delete the message and its replies
    await Message.deleteMany({
      $or: [
        { _id: messageId },
        { parentMessage: messageId }
      ]
    });
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<IMessage> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Find existing reaction with this emoji
    const existingReaction = message.reactions?.find(r => r.emoji === emoji);

    if (existingReaction) {
      // Add user to existing reaction if not already reacted
      if (!existingReaction.users.includes(new mongoose.Types.ObjectId(userId))) {
        existingReaction.users.push(new mongoose.Types.ObjectId(userId));
      }
    } else {
      // Create new reaction
      message.reactions = message.reactions || [];
      message.reactions.push({
        emoji,
        users: [new mongoose.Types.ObjectId(userId)]
      });
    }

    await message.save();
    return message.populate(['sender', 'reactions.users']);
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<IMessage> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Remove user from the reaction
    if (message.reactions) {
      message.reactions = message.reactions.map(reaction => {
        if (reaction.emoji === emoji) {
          reaction.users = reaction.users.filter(
            user => user.toString() !== userId
          );
        }
        return reaction;
      }).filter(reaction => reaction.users.length > 0);
    }

    await message.save();
    return message.populate(['sender', 'reactions.users']);
  }
}

export default new MessageService();
