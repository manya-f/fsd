import mongoose from 'mongoose';
import { config } from './config.js';
export async function connectDatabase(){
  if(!config.mongoUri)throw new Error('MONGODB_URI is required');
  await mongoose.connect(config.mongoUri,{serverSelectionTimeoutMS:10000});
  console.log('MongoDB connected');
}
