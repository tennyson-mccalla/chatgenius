import { Pinecone } from '@pinecone-database/pinecone';
import Logger from '../utils/logger';

interface PineconeMetadata {
  [key: string]: string;  // Index signature for string keys
  messageId: string;
  channelId: string;
  text: string;
  createdAt: string;
  userId: string;
}

class PineconeService {
  private static instance: PineconeService | null = null;
  private client: Pinecone | null = null;
  private indexName: string | null = null;

  private constructor() {}

  public static getInstance(): PineconeService {
    if (!PineconeService.instance) {
      PineconeService.instance = new PineconeService();
    }
    return PineconeService.instance;
  }

  public async initialize() {
    if (this.client && this.indexName) {
      return;
    }

    try {
      const apiKey = process.env.PINECONE_API_KEY;
      const indexName = process.env.PINECONE_INDEX;

      if (!apiKey || !indexName) {
        throw new Error('Missing Pinecone configuration');
      }

      this.client = new Pinecone({ apiKey });
      this.indexName = indexName;

      Logger.info('Pinecone initialized successfully', {
        context: 'PineconeService',
        data: { indexName }
      });
    } catch (error) {
      Logger.error('Failed to initialize Pinecone', {
        context: 'PineconeService',
        data: { error }
      });
      throw error;
    }
  }

  private ensureInitialized() {
    if (!this.client || !this.indexName) {
      throw new Error('Pinecone service not initialized');
    }
  }

  public async upsertVector(
    id: string,
    vector: number[],
    metadata: PineconeMetadata
  ) {
    try {
      this.ensureInitialized();
      const index = this.client!.index(this.indexName!);

      await index.upsert([
        {
          id,
          values: vector,
          metadata
        }
      ]);

      Logger.info('Vector upserted successfully', {
        context: 'PineconeService',
        data: { id }
      });
    } catch (error) {
      Logger.error('Failed to upsert vector', {
        context: 'PineconeService',
        data: { error, id }
      });
      throw error;
    }
  }

  public async upsertVectors(
    vectors: Array<{
      id: string;
      values: number[];
      metadata: PineconeMetadata;
    }>
  ) {
    try {
      this.ensureInitialized();
      const index = this.client!.index(this.indexName!);

      await index.upsert(vectors);

      Logger.info('Vectors upserted successfully', {
        context: 'PineconeService',
        data: { count: vectors.length }
      });
    } catch (error) {
      Logger.error('Failed to upsert vectors', {
        context: 'PineconeService',
        data: { error, count: vectors.length }
      });
      throw error;
    }
  }

  public async query(
    vector: number[],
    topK: number = 5,
    includeMetadata: boolean = true
  ) {
    try {
      this.ensureInitialized();
      const index = this.client!.index(this.indexName!);

      const results = await index.query({
        vector,
        topK,
        includeMetadata
      });

      return results;
    } catch (error) {
      Logger.error('Failed to query vectors', {
        context: 'PineconeService',
        data: { error, topK }
      });
      throw error;
    }
  }
}

export const pineconeService = PineconeService.getInstance();
