import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IChannel } from './Channel';

export interface IMessage extends Document {
  content: string;
  channel: mongoose.Types.ObjectId | IChannel;
  sender: mongoose.Types.ObjectId | IUser;
  parentMessage?: mongoose.Types.ObjectId | IMessage; // For thread replies
  reactions?: {
    emoji: string;
    users: (mongoose.Types.ObjectId | IUser)[];
  }[];
  attachments?: {
    url: string;
    type: string;
    name: string;
  }[];
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
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
    emoji: String,
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  attachments: [{
    url: String,
    type: String,
    name: String
  }],
  edited: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ parentMessage: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
