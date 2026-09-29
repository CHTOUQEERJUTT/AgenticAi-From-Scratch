import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in .env file");
  process.exit(1);
}

const url = "https://generativelanguage.googleapis.com/v1beta/interactions";

async function callGemini() {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key":`${apiKey}`,
      },
      body: JSON.stringify({
      model: "gemini-3.5-flash-lite",
      input: "Explain what an LLM token is in one short sentence.",
    })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    

    const outputStep = data.steps?.find((s: any) => s.type === "model_output");
    const textOutput = outputStep?.content?.[0]?.text;

    console.log("\n--- Model Response ---");
    // console.log(JSON.stringify(data, null, 2));
    console.log(data?.usage);
    
    

  } catch (error) {
    console.error("Failed to fetch:", error);
  }
}

callGemini();