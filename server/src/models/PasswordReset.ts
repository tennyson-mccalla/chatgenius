import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IPasswordReset extends Document {
  user: IUser['_id'];
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, {
  timestamps: true
});

// Index for faster queries and automatic deletion of expired tokens
passwordResetSchema.index({ token: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = mongoose.model<IPasswordReset>('PasswordReset', passwordResetSchema);
