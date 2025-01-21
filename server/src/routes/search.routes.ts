import express from 'express';
import { SearchController } from '../controllers/search.controller';

const router = express.Router();
const searchController = new SearchController();

router.post('/', (req, res) => {
  searchController.searchMessages(req.body, res).catch(error => {
    console.error('Search route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
});

export default router;
