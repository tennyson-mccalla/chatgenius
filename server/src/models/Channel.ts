import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IChannel extends Document {
  name: string;
  description?: string;
  isPrivate: boolean;
  isDM: boolean;
  members: mongoose.Types.ObjectId[] | IUser[];
  createdBy: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Date;
}

const channelSchema = new Schema<IChannel>({
  name: { type: String, required: true },
  description: { type: String },
  isPrivate: { type: Boolean, default: false },
  isDM: { type: Boolean, default: false },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMessage: { type: Date }
}, {
  timestamps: true
});

// Compound index for faster channel lookups
channelSchema.index({ isDM: 1, members: 1 });
channelSchema.index({ isPrivate: 1, name: 1 });

// Ensure unique DM channels between the same users
channelSchema.index(
  { isDM: 1, members: 1 },
  {
    unique: true,
    partialFilterExpression: { isDM: true }
  }
);

export const Channel = mongoose.model<IChannel>('Channel', channelSchema);
