import { Injectable } from '@nestjs/common';
import { openAIService } from './openai.service';
import { pineconeConfig } from '../config/pinecone';
import Logger from '../utils/logger';

export interface SearchResult {
  score: number;
  metadata: {
    messageId: string;
    channelId: string;
    text: string;
    createdAt: string;
    userId: string;
    [key: string]: string;
  };
}

@Injectable()
export class SearchService {
  private static instance: SearchService | null = null;

  private constructor() {}

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  async searchMessages(query: string, topK: number = 5): Promise<SearchResult[]> {
    try {
      Logger.info('Starting search request', {
        context: 'SearchService',
        data: { query, topK }
      });

      // Generate embedding for the search query
      Logger.info('Generating embedding', {
        context: 'SearchService',
        data: { query }
      });
      const embedding = await openAIService.generateEmbedding(query);

      // Search in Pinecone
      Logger.info('Querying Pinecone', {
        context: 'SearchService',
        data: { embeddingLength: embedding.length }
      });

      const index = pineconeConfig.getClient().index('chatgenius');
      const results = await index.query({
        vector: embedding,
        topK,
        includeMetadata: true
      });

      // Format results
      const formattedResults = results.matches?.map(match => ({
        score: match.score || 0,
        metadata: match.metadata as SearchResult['metadata']
      })) || [];

      Logger.info('Search completed', {
        context: 'SearchService',
        data: { resultCount: formattedResults.length }
      });

      return formattedResults;

    } catch (error) {
      Logger.error('Failed to search messages', {
        context: 'SearchService',
        data: { error, query, topK }
      });
      throw error;
    }
  }
}

export const searchService = SearchService.getInstance();
