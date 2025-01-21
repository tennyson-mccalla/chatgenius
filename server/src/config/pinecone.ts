import { Pinecone } from '@pinecone-database/pinecone';
import { config } from './config';
import Logger from '../utils/logger';

class PineconeConfig {
  private static instance: PineconeConfig;
  private client: Pinecone | null = null;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): PineconeConfig {
    if (!PineconeConfig.instance) {
      PineconeConfig.instance = new PineconeConfig();
    }
    return PineconeConfig.instance;
  }

  public async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Debug the config values
      console.log('Pinecone Config:', {
        apiKey: config.pinecone.apiKey ? 'exists' : 'missing',
        indexName: config.pinecone.indexName,
        directEnvApiKey: process.env.PINECONE_API_KEY ? 'exists' : 'missing'
      });

      // Try using the environment variable directly
      const apiKey = process.env.PINECONE_API_KEY;
      if (!apiKey) {
        throw new Error('PINECONE_API_KEY environment variable is required');
      }

      this.client = new Pinecone({
        apiKey
      });

      this.initialized = true;
      Logger.info('Pinecone initialized successfully', {
        context: 'PineconeConfig',
        data: { indexName: config.pinecone.indexName }
      });
    } catch (error) {
      Logger.error('Failed to initialize Pinecone', {
        context: 'PineconeConfig',
        data: { error }
      });
      throw error;
    }
  }

  public getClient(): Pinecone {
    if (!this.initialized || !this.client) {
      throw new Error('Pinecone client not initialized');
    }
    return this.client;
  }
}

export const pineconeConfig = PineconeConfig.getInstance();
