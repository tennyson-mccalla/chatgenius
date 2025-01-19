import mongoose from 'mongoose';

export const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function(this: any) {
      // Password is required only if not using OAuth and not a guest
      return !this.oauthProvider && !this.isGuest;
    }
  },
  avatar: { type: String },
  status: { type: String, default: 'offline' },
  isGuest: { type: Boolean, default: false },
  lastSeen: { type: Date },
  oauthProvider: { type: String }, // 'google', 'github', etc.
  oauthId: { type: String }
});
