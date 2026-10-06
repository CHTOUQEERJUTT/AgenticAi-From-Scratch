import * as z from "zod";
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";

// ---------- PIECE 1: STATE ----------
// The shape of the data that travels through the graph.
// Every node can read all of it, but only updates what it returns.
const State = new StateSchema({
  ticket: z.string(),      // the customer's message (input)
  category: z.string(),    // filled in by classify
  confidence: z.number(),  // 0 to 1, filled in by classify
  outcome: z.string(),     // filled in by autoHandle or escalate
});

// ---------- PIECE 2: NODES ----------
// A node = a plain function. Takes the state, returns the fields to change.

// Fake classifier for now. In step 2 an LLM replaces this function.
const classify = (state: any) => {
  const text = state.ticket.toLowerCase();
  if (text.includes("refund")) return { category: "billing", confidence: 0.9 };
  if (text.includes("password")) return { category: "account", confidence: 0.9 };
  return { category: "unknown", confidence: 0.3 };
};

// Runs when we're confident enough to handle the ticket automatically.
const autoHandle = (state: any) => ({
  outcome: `Auto-handled as ${state.category}`,
});

// Runs when we're NOT confident. A human takes over.
const escalate = (state: any) => ({
  outcome: "Escalated to a human",
});

// ---------- PIECES 3 + 4: EDGES ----------
const graph = new StateGraph(State)
  .addNode("classify", classify)
  .addNode("autoHandle", autoHandle)
  .addNode("escalate", escalate)

  // Edge: the graph always begins at classify
  .addEdge(START, "classify")

  // Conditional edge: after classify, a function READS the state
  // and returns the NAME of the next node.
  // The third argument lists every node it is allowed to return.
  .addConditionalEdges(
    "classify",
    (state: any) => {
      // YOUR 20%:
      // return "autoHandle" if state.confidence is high enough,
      // otherwise return "escalate". Pick the threshold yourself.
      if (state.confidence > 0.6) {
        return "autoHandle"
      }else{

        return "escalate";
      }
    },
    ["autoHandle", "escalate"]
  )

  // Edges: both handlers finish the workflow
  .addEdge("autoHandle", END)
  .addEdge("escalate", END)

  // Turns the description above into something we can run
  .compile();

async function main() {
  const tickets = [
    "I want a refund for my last order",
    "I forgot my password",
    "My package arrived broken and I am very upset",
  ];

  for (const ticket of tickets) {
    // invoke = run the graph once, starting from this initial state
    const result = await graph.invoke({
      ticket,
      category: "",
      confidence: 0,
      outcome: "",
    });
    console.log("\nTicket:", ticket);
    console.log("Category:", result.category, "| Confidence:", result.confidence);
    console.log("Outcome:", result.outcome);
  }
}

main();