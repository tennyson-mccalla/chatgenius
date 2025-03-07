import OpenAI from 'openai';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, getDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

// Initialize OpenAI client with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // For frontend use only
});

/**
 * Creates embeddings for a document
 * @param {string} text - The text to create embeddings for
 * @param {string} fileId - The ID of the file in Firestore
 */
export const createEmbeddings = async (text, fileId) => {
  try {
    // Create embeddings
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    
    const embedding = response.data[0].embedding;
    
    // Store the embedding in Firestore
    await updateDoc(doc(db, "files", fileId), {
      embedding: embedding,
      processedAt: serverTimestamp(),
      status: "processed"
    });
    
    return embedding;
  } catch (error) {
    console.error("Error creating embeddings:", error);
    
    // Update file status to error
    await updateDoc(doc(db, "files", fileId), {
      status: "error",
      error: error.message
    });
    
    throw error;
  }
};

/**
 * Process a text document for RAG
 * @param {string} text - Document content
 * @param {string} fileName - Name of the file
 * @param {string} fileId - Firestore ID of the file
 */
export const processDocument = async (text, fileName, fileId) => {
  try {
    // Update file status
    await updateDoc(doc(db, "files", fileId), {
      status: "processing"
    });
    
    // Create chunks of text (simple implementation - can be improved)
    const chunks = chunkText(text, 1000, 200);
    
    // Store each chunk with its embedding
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Create embedding for chunk
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });
      
      const embedding = response.data[0].embedding;
      
      // Store chunk with embedding
      await addDoc(collection(db, "document_chunks"), {
        fileId,
        fileName,
        content: chunk,
        embedding,
        chunkIndex: i,
        createdAt: serverTimestamp()
      });
    }
    
    // Update file status to processed
    await updateDoc(doc(db, "files", fileId), {
      chunksCount: chunks.length,
      status: "processed",
      processedAt: serverTimestamp()
    });
    
    return { success: true, chunksCount: chunks.length };
  } catch (error) {
    console.error("Error processing document:", error);
    
    // Update file status to error
    await updateDoc(doc(db, "files", fileId), {
      status: "error",
      error: error.message
    });
    
    throw error;
  }
};

/**
 * Query documents with a question
 * @param {string} question - The user's question
 * @param {Array<string>} fileIds - Optional array of file IDs to search within
 */
export const queryDocuments = async (question, fileIds = []) => {
  try {
    // Generate embedding for the question
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });
    
    const questionEmbedding = response.data[0].embedding;
    
    // Get relevant chunks based on embedding similarity
    // In a real app, this would use a vector database like Pinecone
    // For now, we'll use a simpler approach by storing and retrieving from Firestore
    
    // Query all document chunks or filter by fileIds
    const chunksRef = collection(db, "document_chunks");
    let chunksQuery;
    
    if (fileIds.length > 0) {
      chunksQuery = query(chunksRef, where("fileId", "in", fileIds));
    } else {
      chunksQuery = chunksRef;
    }
    
    const chunksSnapshot = await getDocs(chunksQuery);
    
    // Calculate similarity between question and each chunk (cosine similarity)
    const chunks = [];
    chunksSnapshot.forEach(doc => {
      const chunkData = doc.data();
      if (chunkData.embedding) {
        const similarity = calculateCosineSimilarity(questionEmbedding, chunkData.embedding);
        chunks.push({
          ...chunkData,
          id: doc.id,
          similarity
        });
      }
    });
    
    // Sort by similarity and take top 3 chunks
    chunks.sort((a, b) => b.similarity - a.similarity);
    const topChunks = chunks.slice(0, 3);
    
    // Build context from top chunks
    const context = topChunks.map(chunk => chunk.content).join("\n\n");
    
    // Use OpenAI to answer the question based on context
    const completionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that answers questions based on the provided document context. If the answer cannot be found in the context, say 'I don't have enough information to answer that.'"
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    const answer = completionResponse.choices[0].message.content;
    
    // Save the query and result to Firestore
    await addDoc(collection(db, "document_queries"), {
      question,
      answer,
      topChunks: topChunks.map(chunk => ({
        id: chunk.id,
        fileId: chunk.fileId,
        fileName: chunk.fileName,
        chunkIndex: chunk.chunkIndex,
        similarity: chunk.similarity
      })),
      createdAt: serverTimestamp()
    });
    
    return {
      answer,
      sources: topChunks.map(chunk => ({
        fileName: chunk.fileName,
        fileId: chunk.fileId,
        similarity: chunk.similarity
      }))
    };
  } catch (error) {
    console.error("Error querying documents:", error);
    throw error;
  }
};

/**
 * Helper function to chunk text into smaller pieces
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let i = 0;
  
  while (i < text.length) {
    let chunk = text.slice(i, i + chunkSize);
    chunks.push(chunk);
    i += (chunkSize - overlap);
  }
  
  return chunks;
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}