import 'dotenv/config';
import { z } from 'zod';

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

// 1. Define the exact shape of data our backend expects
const userProfileSchema = z.object({
  name: z.string(),
  age: z.number().nullable(),
  skills: z.array(z.string()),
});

const messyInput = "Hey there, my name is Touqeer Ali. I'm 25 years old. I've been coding a lot lately, mostly working with Node.js, Express, and I just started learning Redis queues.";

async function extractData() {
  try {
    // 2. The Engineered Prompt
    const engineeredPrompt = `
      You are a precise data extraction agent.
      Your task is to extract the user's name, age, and technical skills from the text below.

      CONSTRAINTS:
    - Return ONLY a raw, valid JSON object.
    - Do NOT wrap the JSON in markdown code blocks.
    - If the age is not stated in the text, return null. Never guess.
    - For skills, keep only the tool name.

    The JSON must match this structure:
    {
      "name": "string",
      "age": number or null,
      "skills": ["string", "string"]
    }

      TEXT TO EXTRACT FROM:
      "${messyInput}"
      `;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.5-flash-lite",
          input: engineeredPrompt
        }),
      });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const textOutput = data?.steps?.find((s: any) => s.type === "model_output")?.content?.[0]?.text;
    
    if (!textOutput) throw new Error("No text returned");

    console.log("--- 1. Raw LLM Output ---");
    console.log(textOutput);

    
    const untrustedObject = JSON.parse(textOutput);
    
    
    const validatedData = userProfileSchema.safeParse(untrustedObject);

    if (validatedData&& validatedData.success===true) {
      console.log("\n--- 2. Validated Data (Safe for DB) ---",validatedData);
      
    }
    
    

    
    

  } catch (error) {
    console.error("Pipeline Failed:", error);
  }
}


extractData();  

  
  

