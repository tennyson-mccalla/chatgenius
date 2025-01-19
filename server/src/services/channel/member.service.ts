import mongoose from 'mongoose';
import { Channel, User } from '../../models';
import { IChannel } from '../../models/types';

export class ChannelMemberService {
  async addMemberToChannel(channelId: string, userId: string, addedBy: string): Promise<IChannel> {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if the user adding is a member
    const memberIds = channel.members.map((m: mongoose.Types.ObjectId) => m.toString());
    if (!memberIds.includes(addedBy)) {
      throw new Error('You do not have permission to add members to this channel');
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Add member if not already in the channel
    if (!memberIds.includes(userId)) {
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
    const memberIds = channel.members.map((m: mongoose.Types.ObjectId) => m.toString());
    if (!memberIds.includes(removedBy)) {
      throw new Error('You do not have permission to remove members from this channel');
    }

    // Cannot remove the last member
    if (channel.members.length <= 1) {
      throw new Error('Cannot remove the last member from a channel');
    }

    // Remove member
    channel.members = channel.members.filter(
      (memberId: mongoose.Types.ObjectId) => memberId.toString() !== userId
    );

    await channel.save();
    return channel.populate(['members', 'createdBy']);
  }
}
