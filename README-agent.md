# Tool-Calling Agent (no framework)

A small agent built on the raw Gemini Interactions API, with no agent framework. The model decides when to call tools, my code runs them, and the loop continues until the model gives a final answer.

## Tools

| Tool | What it does |
|---|---|
| `search_faq` | Retrieves the closest FAQ chunks from Qdrant (the RAG pipeline from the previous project) |
| `get_current_time` | Returns the current date and time in a given IANA timezone |

## How the loop works

1. Send the user question and the tool declarations to the model
2. If the response contains `function_call` steps, run those functions in my code
3. Append the model's steps and my `function_result` steps to the history, then call the model again
4. Repeat until the model answers without calling a tool, with a hard limit of 5 turns

The loop runs in stateless mode (`store: false`): the full conversation history is kept client-side and resent on every turn.

## Run

```bash
# Qdrant must be running and the FAQ ingested (see the RAG project)
npx tsx src/agent.ts
```

Example questions the script runs:
- "How long do I have to get a refund, and what time is it right now in Karachi?" (uses both tools)
- "What is 2 plus 2?" (uses no tools)
- "Do you sell gift cards?" (searches the FAQ, finds nothing, says so)

## Lessons learned

- **Tool output must be unambiguous.** My first time tool returned a `dd/mm/yyyy` date, and the model read it as month/day. Returning the weekday and the month spelled out fixed it.
- **The model decides when to use tools; my code only executes them.** Tool descriptions are the main way to steer that decision.
- **An agent needs the same guardrails as a RAG bot.** Without an explicit "answer only from the FAQ" rule, the agent sometimes invented a policy that the FAQ never stated. A prompt rule made this much less likely, but I can't guarantee it never happens.
- **Every agent loop needs a hard turn limit** so a failing tool can't cause an endless loop.

## Limitations

- Only 2 tools, and the second is a simple utility
- Tested manually on a handful of questions, with no automated evals
- Model output is non-deterministic, so behavior can vary between runs
