import { openAIService } from '../services/openai.service';
import dotenv from 'dotenv';
import path from 'path';

// Print current directory and resolved path
console.log('Current directory:', process.cwd());
const envPath = path.resolve(process.cwd(), '.env');
console.log('Looking for .env at:', envPath);

// Load environment variables from the current working directory
dotenv.config({ path: envPath });

// Verify API key is loaded
console.log('OpenAI API Key loaded:', !!process.env.OPENAI_API_KEY);

async function testEmbeddings() {
  try {
    // Initialize OpenAI service
    openAIService.initialize();

    // Test single embedding
    const text = "Hello, how can I help?";
    console.log('\nGenerating embedding for:', text);
    const embedding = await openAIService.generateEmbedding(text);
    console.log('Embedding dimension:', embedding.length);
    console.log('First few values:', embedding.slice(0, 5));

    // Test multiple embeddings
    const texts = [
      "Hello, how can I help?",
      "Let's schedule a meeting.",
      "What's the status of the project?"
    ];
    console.log('\nGenerating embeddings for multiple texts:', texts);
    const embeddings = await openAIService.generateEmbeddings(texts);
    console.log('Number of embeddings:', embeddings.length);
    console.log('Each embedding dimension:', embeddings[0].length);
    console.log('First few values of first embedding:', embeddings[0].slice(0, 5));
  } catch (error) {
    console.error('Error testing embeddings:', error);
  }
}

// Run the test
testEmbeddings();
