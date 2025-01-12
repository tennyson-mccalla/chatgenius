import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IChannel } from './Channel';

interface IReaction {
  emoji: string;
  users: mongoose.Types.ObjectId[] | IUser[];
}

export interface IMessage extends Document {
  content: string;
  channel: mongoose.Types.ObjectId | IChannel;
  sender: mongoose.Types.ObjectId | IUser;
  parentMessage?: mongoose.Types.ObjectId | IMessage;
  reactions: IReaction[];
  attachments?: {
    url: string;
    type: string;
    name: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

const messageSchema = new Schema<IMessage>({
  content: { type: String, required: true },
  channel: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    emoji: { type: String, required: true },
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  attachments: [{
    url: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: true }
  }],
  isEdited: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes for faster queries
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ parentMessage: 1, createdAt: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });

// Full-text search index
messageSchema.index({ content: 'text' });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
