import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";

const ai = new GoogleGenAI({});
const client = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

export async function retrieve(question: string): Promise<string[]> {
  const res = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: question,
  });
  const qVec = res.embeddings![0].values!;

  const result = await client.query("faq", {
    query: qVec,
    limit: 3,
    with_payload: true,
  });

  return result.points.map(p => String(p.payload?.text));
}

async function generate(question: string, chunks: string[]): Promise<string> {
  const context = chunks.join("\n\n");

  const prompt = `
    You answer questions using ONLY the context below.
    If the answer is not in the context, reply exactly: "I don't know based on the provided documents."

    CONTEXT:
    ${context}

    QUESTION:
    ${question}
    `;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify({ model: "gemini-3.5-flash-lite", input: prompt }),
  });

  if (!response.ok) {
    throw new Error(`${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  return data.steps?.find((s: any) => s.type === "model_output")?.content?.[0]?.text ?? "";
}

export async function answer(question: string): Promise<string> {
  const chunks = await retrieve(question);
  return generate(question, chunks);
}