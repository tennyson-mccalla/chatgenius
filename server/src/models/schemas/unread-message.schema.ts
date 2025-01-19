import mongoose from 'mongoose';

export const unreadMessageSchema = new mongoose.Schema({
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  count: { type: Number, default: 0 },
  lastMessageAt: { type: Date }
}, {
  timestamps: true
});
