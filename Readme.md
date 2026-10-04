# RAG FAQ API

A small Retrieval-Augmented Generation (RAG) API built with raw `fetch` calls and no agent framework. It answers questions using only the content of a FAQ document and says "I don't know" when the answer isn't there.

## How it works

**Ingestion (run once):**
1. Split the FAQ into chunks (`@langchain/textsplitters`)
2. Embed each chunk with `gemini-embedding-001`
3. Store each chunk in Qdrant as a point: `id`, `vector`, and `payload` (the original text)

**Each question:**
1. Check Redis for a cached answer
2. On a miss, embed the question and search Qdrant for the top 3 closest chunks
3. Put those chunks into a prompt and ask Gemini to answer using only that context
4. Cache the answer in Redis for 1 hour and return it

## Stack

- Node.js, TypeScript, Express
- Gemini API (embeddings and generation), called with plain `fetch`
- Qdrant (vector database)
- Redis via `ioredis` (cache)
- Docker (Qdrant and Redis)

## Setup

```bash
npm install
```

Create a `.env` file (never commit it):

```
GEMINI_API_KEY=your_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key
```

Start Redis:

```bash
docker run -d --name redis -p 6379:6379 redis
```

Ingest the document once, then start the server:

```bash
npx tsx src/stage3-ingest.ts
npx tsx src/server.ts
```

## Usage

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"How long do I have to get my money back?"}'
```

Response:

```json
{ "answer": "You can request a refund within 30 days of purchase.", "cached": false }
```

## Limitations

- The knowledge base is a tiny hard-coded FAQ, used to learn the pipeline.
- The cache matches the exact question text only, ignoring case and spaces. A rephrased question is a cache miss.
- No streaming, no authentication, and no rate limiting yet.

## What I learned

- An embedding and a vector are the same thing: a list of numbers representing meaning.
- Chunk size controls retrieval quality. Too large and topics blur together, too small and answers get cut in half.
- The prompt rule "answer only from the context, otherwise say you don't know" is the main protection against made-up answers.