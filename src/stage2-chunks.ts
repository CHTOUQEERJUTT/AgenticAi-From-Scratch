import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

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

const document = `Refunds: You can request a refund within 30 days of purchase. Refunds go back to the original payment method and take 5-7 business days.

Shipping: We ship worldwide. Standard delivery takes 7-14 days. Express delivery takes 2-4 days and costs extra.

Password reset: Click "Forgot password" on the login page. We email you a reset link that expires after 1 hour.

Support hours: Our support team is available Monday to Friday, 9am to 6pm. We do not offer weekend support.

Account deletion: Go to Settings, then Privacy, then Delete account. This cannot be undone.`;

async function chunkText(text: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 0,
  });
  return await splitter.splitText(text);
}

async function embedAll(texts: string[]): Promise<number[][]> {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001", // Note: you can also upgrade to "gemini-embedding-2"
    contents: texts,
  });
  return response.embeddings!.map(e => e.values!);
}

async function main() {
  // FIX: Added 'await' here
  const chunks = await chunkText(document);
  console.log("Chunks:", chunks.length);

  const question = "How long do I have to get my money back?";
  const [qVec, wholeVec, ...chunkVecs] = await embedAll([question, document, ...chunks]);

  console.log("\nQuestion vs WHOLE document:", cosineSimilarity(qVec, wholeVec).toFixed(3));
  console.log("\nQuestion vs each chunk:");
  chunkVecs.forEach((v, i) =>
    console.log(cosineSimilarity(qVec, v).toFixed(3), "-", chunks[i].slice(0, 40))
  );
}

main();