import { openAIService } from '../services/openai.service';
import { pineconeService } from '../services/pinecone.service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

async function testPineconeStorage() {
  try {
    // Initialize services
    await pineconeService.initialize();

    // Test messages
    const messages = [
      "Hello, how can I help?",
      "Let's schedule a meeting.",
      "What's the status of the project?"
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

    // Test query
    console.log('\nTesting query...');
    const queryText = "What's the project status?";
    console.log('Query text:', queryText);
    const queryEmbedding = await openAIService.generateEmbedding(queryText);
    const results = await pineconeService.query(queryEmbedding);

    console.log('\nQuery results:');
    if (!results.matches || results.matches.length === 0) {
      console.log('No matches found');
    } else {
      results.matches.forEach((match, i) => {
        console.log(`${i + 1}. Score: ${match.score?.toFixed(4)}, Text: "${match.metadata?.text}"`);
      });
    }

  } catch (error) {
    console.error('Error testing Pinecone storage:', error);
  }
}

// Run the test
testPineconeStorage();
