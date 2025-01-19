import { IPopulatedChannel } from '../../models/types';

export class ChannelAccessService {
  checkChannelAccess(channel: IPopulatedChannel, userId: string) {
    const isCreator = channel.createdBy._id.toString() === userId;
    const isMember = channel.members.some(m => m._id.toString() === userId);

    if (channel.isDM) {
      if (!isMember) return null;
      return {
        ...channel,
        isPrivate: false,
        hasAccess: true
      };
    }

    const hasAccess = isCreator || !channel.isPrivate || isMember;

    if (channel.isPrivate && !hasAccess) {
      return {
        ...channel,
        hasAccess: false,
        members: [],
        messages: []
      };
    }

    return {
      ...channel,
      hasAccess: true
    };
  }
}
