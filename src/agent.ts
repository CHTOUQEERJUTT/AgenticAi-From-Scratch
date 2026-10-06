import 'dotenv/config';
import { retrieve } from "./rag";

const URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODEL = "gemini-3.5-flash-lite";

const tools = [
  {
    type: "function",
    name: "search_faq",
    description:
      "Searches the company FAQ (refunds, shipping, password reset, support hours, account deletion). Use for any question about company policies.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for" },
      },
      required: ["query"],
    },
  },
  {
    type: "function",
    name: "get_current_time",
    description: "Returns the current date and time in a given timezone.",
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "IANA timezone name, e.g. Asia/Karachi. Defaults to UTC.",
        },
      },
      required: [],
    },
  },
];

async function runTool(name: string, args: any): Promise<string> {
  try {
    if (name === "search_faq") {
      const chunks = await retrieve(String(args.query));
      return JSON.stringify(chunks);
    }
    if (name === "get_current_time") {
      const tz = args?.timezone ?? "UTC";
      return new Date().toLocaleString("en-GB", {
      timeZone: tz,
      dateStyle: "full",
      timeStyle: "long",
    });
    }
    return `Unknown tool: ${name}`;
  } catch (err) {
    return `Tool error: ${(err as Error).message}`;
  }
}

async function callApi(history: any[]): Promise<any> {
  const response = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
      "Api-Revision": "2026-05-20",
    },
    body: JSON.stringify({ model: MODEL, store: false, input: history, tools }),
  });

  if (!response.ok) {
    throw new Error(`${response.status} - ${await response.text()}`);
  }
  return response.json();
}

async function runAgent(question: string): Promise<string> {
  
  const rules = `You are a support assistant. For company policy questions, use search_faq and answer ONLY from what it returns. If the FAQ does not cover the question, say "I couldn't find that in our FAQ." Never state that the company does or does not offer something unless the FAQ says so.`
  const history: any[] = [
    { type: "user_input", content: [{ type: "text", text: rules + question }] },
  ];

  for (let turn = 0; turn < 5; turn++) {
    const data = await callApi(history);

    // Keep every step the model returned, exactly as received
    history.push(...data.steps);

    const calls = data.steps.filter((s: any) => s.type === "function_call");

    if (calls.length === 0) {
      const out = data.steps.find((s: any) => s.type === "model_output");
      return out?.content?.[0]?.text ?? "";
    }

    for (const call of calls) {
      console.log(`[tool] ${call.name}(${JSON.stringify(call.arguments)})`);
      const output = await runTool(call.name, call.arguments);
      history.push({
        type: "function_result",
        name: call.name,
        call_id: call.id,
        result: [{ type: "text", text: output }],
      });
    }
  }

  throw new Error("Agent did not finish within 5 turns");
}

async function main() {
  const questions = [
    "How long do I have to get a refund, and what time is it right now in Karachi?",
    "What is 2 plus 2?",
    "Do you sell gift cards?",
  ];

  for (const q of questions) {
    console.log("\nQ:", q);
    console.log("A:", await runAgent(q));
  }
}

main();