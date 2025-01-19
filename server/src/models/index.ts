import mongoose from 'mongoose';
import { IChannel, IMessage, IPasswordReset, IUnreadMessage, IUser } from './types';
import { channelSchema } from './schemas/channel.schema';
import { userSchema } from './schemas/user.schema';
import { messageSchema } from './schemas/message.schema';
import { unreadMessageSchema } from './schemas/unread-message.schema';
import { passwordResetSchema } from './schemas/password-reset.schema';

// Create models only if they haven't been compiled
export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export const Channel = mongoose.models.Channel || mongoose.model<IChannel>('Channel', channelSchema);
export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);
export const UnreadMessage = mongoose.models.UnreadMessage || mongoose.model<IUnreadMessage>('UnreadMessage', unreadMessageSchema);
export const PasswordReset = mongoose.models.PasswordReset || mongoose.model<IPasswordReset>('PasswordReset', passwordResetSchema);
