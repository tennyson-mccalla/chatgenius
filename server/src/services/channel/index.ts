import mongoose from 'mongoose';
import { Channel, User } from '../../models';
import { IChannel, IPopulatedChannel } from '../../models/types';
import { CreateChannelParams, UpdateChannelParams } from './types';
import { ChannelMemberService } from './member.service';
import { ChannelAccessService } from './access.service';

export class ChannelService {
  private memberService: ChannelMemberService;
  private accessService: ChannelAccessService;
  public addMemberToChannel: typeof ChannelMemberService.prototype.addMemberToChannel;
  public removeMemberFromChannel: typeof ChannelMemberService.prototype.removeMemberFromChannel;

  constructor() {
    this.memberService = new ChannelMemberService();
    this.accessService = new ChannelAccessService();
    this.addMemberToChannel = this.memberService.addMemberToChannel.bind(this.memberService);
    this.removeMemberFromChannel = this.memberService.removeMemberFromChannel.bind(this.memberService);
  }

  async createChannel(params: CreateChannelParams): Promise<IPopulatedChannel> {
    const { name, description, isPrivate, createdBy, members = [] } = params;
    const uniqueMembers = Array.from(new Set([createdBy, ...members]));
    const memberCount = await User.countDocuments({
      _id: { $in: uniqueMembers.map(id => new mongoose.Types.ObjectId(id)) }
    });

    if (memberCount !== uniqueMembers.length) {
      throw new Error('One or more member IDs are invalid');
    }

    const channel = await Channel.create({
      name,
      description,
      isPrivate,
      isDM: false,
      members: uniqueMembers.map(id => new mongoose.Types.ObjectId(id)),
      createdBy: new mongoose.Types.ObjectId(createdBy)
    });

    return channel.populate(['members', 'createdBy']) as Promise<IPopulatedChannel>;
  }

  async getChannelById(channelId: string, userId: string) {
    try {
      let channel = await Channel.findById(channelId)
        .populate(['members', 'createdBy'])
        .lean() as unknown as IPopulatedChannel;

      if (!channel) {
        channel = await Channel.findOne({ name: channelId })
          .populate(['members', 'createdBy'])
          .lean() as unknown as IPopulatedChannel;
      }

      if (!channel) return null;

      return this.accessService.checkChannelAccess(channel, userId);
    } catch (error) {
      throw error;
    }
  }

  async getChannels(userId: string) {
    const channels = await Channel.find({ isDM: false })
      .populate(['members', 'createdBy'])
      .lean() as unknown as IPopulatedChannel[];

    return channels.map(channel => this.accessService.checkChannelAccess(channel, userId));
  }

  async updateChannel(
    channelId: string,
    userId: string,
    updates: UpdateChannelParams
  ): Promise<IChannel> {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const memberIds = channel.members.map((m: mongoose.Types.ObjectId) => m.toString());
    if (!memberIds.includes(userId)) {
      throw new Error('You do not have permission to update this channel');
    }

    if (updates.name) channel.name = updates.name;
    if (updates.description !== undefined) channel.description = updates.description;
    if (updates.isPrivate !== undefined) channel.isPrivate = updates.isPrivate;

    await channel.save();
    return channel.populate(['members', 'createdBy']);
  }
}
