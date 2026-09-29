import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});


function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  const texts = [
    "How do I reset my password?",   // the query
    "I forgot my login credentials",
    "What is the capital of France?",
    "Best pizza toppings",
  ];

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: texts,
  });
  console.log(JSON.stringify(response).slice(0, 400));

  const vectors = response.embeddings!.map(e => e.values!);
  console.log("Vector length:", vectors[0].length);



  for (let i = 1; i < texts.length; i++) {
    console.log(cosineSimilarity(vectors[0], vectors[i]).toFixed(3), "-", texts[i]);
  }

  console.log(vectors.length, vectors[0].length);
console.log(vectors[0].slice(0, 5));
}


main();