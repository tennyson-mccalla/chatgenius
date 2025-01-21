import OpenAI from 'openai';
import Logger from '../utils/logger';

class OpenAIService {
  private static instance: OpenAIService | null = null;
  private client: OpenAI | null = null;

  private constructor() {}

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  public initialize() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const config: { apiKey: string; organization?: string } = {
      apiKey: apiKey
    };

    // Add organization if specified
    const organization = process.env.OPENAI_ORGANIZATION;
    if (organization) {
      config.organization = organization;
    }

    this.client = new OpenAI(config);
  }

  private ensureInitialized() {
    if (!this.client) {
      this.initialize();
    }
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      this.ensureInitialized();
      const response = await this.client!.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float"
      });

      return response.data[0].embedding;
    } catch (error) {
      Logger.error('Failed to generate embedding', {
        context: 'OpenAIService',
        data: { error, text: text.slice(0, 100) + '...' }
      });
      throw error;
    }
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      this.ensureInitialized();
      const response = await this.client!.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
        encoding_format: "float"
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      Logger.error('Failed to generate embeddings', {
        context: 'OpenAIService',
        data: { error, textCount: texts.length }
      });
      throw error;
    }
  }
}

export const openAIService = OpenAIService.getInstance();
