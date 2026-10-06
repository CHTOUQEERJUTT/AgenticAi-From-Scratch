import 'dotenv/config';
import express from "express";
import Redis from "ioredis";
import { createHash } from "node:crypto";
import { answer } from "./rag";
import {morganMiddleware} from '../src/middleware/logger'

const app = express();
app.use(morganMiddleware)
app.use(express.json());

const redis = new Redis(); 
redis.on("error", (err) => console.error("Redis error:", err.message));

const CACHE_SECONDS = 60 * 60; 

function cacheKey(question: string): string {
  const normalized = question.trim().toLowerCase();
  return "ask:" + createHash("sha256").update(normalized).digest("hex");
}

app.post("/ask", async (req, res) => {
  const question = req.body?.question;

  if (typeof question !== "string" || question.trim() === "") {
    res.status(400).json({ error: "question is required" });
    return;
  }

  const key = cacheKey(question);

  
  try {
    const cached = await redis.get(key);
    if (cached) {
      res.json({ answer: cached, cached: true });
      return;
    }
  } catch (err) {
    console.error("Cache read failed:", err);
  }

  
  try {
    const reply = await answer(question.trim());

    try {
      await redis.set(key, reply, "EX", CACHE_SECONDS);
    } catch (err) {
      console.error("Cache write failed:", err);
    }

    res.json({ answer: reply, cached: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(3000, () => console.log("Listening on http://localhost:3000"));