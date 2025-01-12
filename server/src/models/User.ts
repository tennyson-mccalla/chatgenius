import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email?: string;
  password?: string;
  isGuest: boolean;
  oauthProviders?: {
    google?: string;
    github?: string;
    apple?: string;
  };
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, sparse: true, unique: true },
  password: { type: String },
  isGuest: { type: Boolean, default: false },
  oauthProviders: {
    google: { type: String },
    github: { type: String },
    apple: { type: String }
  },
  avatar: { type: String },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  lastSeen: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ username: 1 });
userSchema.index({ 'oauthProviders.google': 1 }, { sparse: true });
userSchema.index({ 'oauthProviders.github': 1 }, { sparse: true });
userSchema.index({ 'oauthProviders.apple': 1 }, { sparse: true });

export const User = mongoose.model<IUser>('User', userSchema);
