import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const ai = new GoogleGenAI({});
export const qdrant_ApiKey=process.env.QDRANT_API_KEY;
const client = new QdrantClient({
    url: 'https://d39d15d3-ea22-4603-ac78-624775bec24e.eu-central-1-0.aws.cloud.qdrant.io:6333',
    apiKey: qdrant_ApiKey
});
const COLLECTION = "faq";

const document = `Refunds: You can request a refund within 30 days of purchase. Refunds go back to the original payment method and take 5-7 business days.

Shipping: We ship worldwide. Standard delivery takes 7-14 days. Express delivery takes 2-4 days and costs extra.

Password reset: Click "Forgot password" on the login page. We email you a reset link that expires after 1 hour.

Support hours: Our support team is available Monday to Friday, 9am to 6pm. We do not offer weekend support.

Account deletion: Go to Settings, then Privacy, then Delete account. This cannot be undone.`;

async function main() {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 200, chunkOverlap: 0 });
  const chunks = await splitter.splitText(document);

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: chunks,
  });
  const vectors = response.embeddings!.map(e => e.values!);

  // Create the collection only if it doesn't exist yet
  const { collections } = await client.getCollections();
  if (!collections.some(c => c.name === COLLECTION)) {
    await client.createCollection(COLLECTION, {
      vectors: { size: vectors[0].length, distance: "Cosine" },
    });
  }

  await client.upsert(COLLECTION, {
    wait: true,
    points: chunks.map((text, i) => ({
      id: i + 1,
      vector: vectors[i],
      payload: { text },
    })),
  });

  console.log(`Stored ${chunks.length} chunks. Vector size: ${vectors[0].length}`);
}

main();



