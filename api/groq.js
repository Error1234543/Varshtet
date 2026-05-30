// api/groq.js — Vercel Serverless Function
// Reads GROQ_API_KEY_1 and GROQ_API_KEY_2 from Vercel Environment Variables
// Rotates between both keys to avoid rate limits

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Pick a key: alternate based on timestamp (roughly round-robin)
function pickApiKey() {
  const key1 = process.env.GROQ_API_KEY_1;
  const key2 = process.env.GROQ_API_KEY_2;

  if (!key1 && !key2) {
    throw new Error("Vercel environment variables GROQ_API_KEY_1 and GROQ_API_KEY_2 are not set.");
  }
  if (!key1) return key2;
  if (!key2) return key1;

  // Rotate every 10 seconds based on server time
  return Math.floor(Date.now() / 10000) % 2 === 0 ? key1 : key2;
}

export default async function handler(req, res) {
  // Allow CORS from same origin (Vercel handles this, but just in case)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  let apiKey;
  try {
    apiKey = pickApiKey();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const { model, messages, max_tokens, temperature } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request: 'messages' array is required." });
  }

  try {
    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "llama-3.3-70b-versatile",
        max_tokens: max_tokens || 4096,
        temperature: temperature || 0.65,
        messages,
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      // If this key hit rate limit, try the other key automatically
      if (groqRes.status === 429) {
        const allKeys = [process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2].filter(Boolean);
        const otherKey = allKeys.find(k => k !== apiKey);

        if (otherKey) {
          const retryRes = await fetch(GROQ_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${otherKey}`,
            },
            body: JSON.stringify({
              model: model || "llama-3.3-70b-versatile",
              max_tokens: max_tokens || 4096,
              temperature: temperature || 0.65,
              messages,
            }),
          });
          const retryData = await retryRes.json();
          if (retryRes.ok) {
            return res.status(200).json(retryData);
          }
          return res.status(retryRes.status).json(retryData);
        }
      }

      return res.status(groqRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: `Server error: ${e.message}` });
  }
}
