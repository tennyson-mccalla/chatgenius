import { searchService } from '../services/search.service';
import Logger from '../utils/logger';

export class SearchController {
  async searchMessages(body: { query: string; topK?: number }, res: any) {
    try {
      if (!body.query?.trim()) {
        return res.status(400).json({ error: 'Search query cannot be empty' });
      }

      const results = await searchService.searchMessages(body.query, body.topK);

      Logger.info('Search request processed', {
        context: 'SearchController',
        data: { query: body.query, resultCount: results.length }
      });

      return res.json({ results });
    } catch (error) {
      Logger.error('Failed to process search request', {
        context: 'SearchController',
        data: { error, query: body.query }
      });

      return res.status(400).json({ error: 'Failed to process search request' });
    }
  }
}
