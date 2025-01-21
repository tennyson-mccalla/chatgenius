import { openAIService } from '../services/openai.service';
import { pineconeService } from '../services/pinecone.service';
import { searchService } from '../services/search.service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

async function testSearch() {
  try {
    // Initialize services
    await pineconeService.initialize();

    // Test messages with more realistic content
    const messages = [
      "The new feature deployment is scheduled for next Tuesday at 2 PM EST.",
      "Can someone review my pull request for the authentication module?",
      "The database migration script needs to be updated before deployment.",
      "Team standup is at 10 AM tomorrow in the main Zoom room.",
      "I've updated the API documentation with the new endpoints."
    ];

    console.log('\nGenerating embeddings for messages:', messages);
    const embeddings = await openAIService.generateEmbeddings(messages);
    console.log('Generated embeddings with dimension:', embeddings[0].length);

    // Create test metadata
    const vectors = messages.map((text, index) => ({
      id: `test-msg-${index}`,
      values: embeddings[index],
      metadata: {
        messageId: `test-msg-${index}`,
        channelId: 'test-channel',
        text,
        createdAt: new Date().toISOString(),
        userId: 'test-user'
      }
    }));

    // Store in Pinecone
    console.log('\nStoring vectors in Pinecone...');
    await pineconeService.upsertVectors(vectors);
    console.log('Successfully stored vectors');

    // Test various search queries
    const queries = [
      "When is the deployment happening?",
      "Need code review",
      "Meeting schedule",
      "Documentation updates"
    ];

    for (const query of queries) {
      console.log('\nTesting search query:', query);
      const results = await searchService.searchMessages(query);

      console.log('Search results:');
      results.forEach((match, i) => {
        console.log(`${i + 1}. Score: ${match.score.toFixed(4)}, Text: "${match.metadata.text}"`);
      });
    }

  } catch (error) {
    console.error('Error testing search:', error);
  }
}

// Run the test
testSearch();
