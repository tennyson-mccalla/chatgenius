import { Channel } from '../models';
import mongoose from 'mongoose';

export async function ensureDefaultChannels() {
  console.log('Ensuring default channels exist...');

  // Check if #general exists
  const generalExists = await Channel.findOne({ name: 'general' });
  if (!generalExists) {
    console.log('Creating #general channel...');
    await Channel.create({
      name: 'general',
      description: 'General discussion',
      isPrivate: false,
      isDM: false,
      members: [],
      createdBy: new mongoose.Types.ObjectId('000000000000000000000000') // System user
    });
    console.log('#general channel created');
  }

  // Add more default channels here if needed
}
