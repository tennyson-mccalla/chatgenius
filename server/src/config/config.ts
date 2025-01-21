import { jwtConfig } from './jwt.config';
import dotenv from 'dotenv';

// Ensure environment variables are loaded before creating config
dotenv.config();

console.log('Creating config object with env vars:', {
  PINECONE_API_KEY: process.env.PINECONE_API_KEY ? 'exists' : 'missing',
  PINECONE_INDEX: process.env.PINECONE_INDEX ? 'exists' : 'missing'
});

interface Config {
  env: string;
  port: number;
  mongoUri: string;
  pinecone: {
    apiKey: string;
    indexName: string;
  };
  openai: {
    apiKey: string;
  };
  jwt: typeof jwtConfig;
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/chatgenius',
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    indexName: process.env.PINECONE_INDEX || 'chatgenius'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
  },
  jwt: jwtConfig
};
