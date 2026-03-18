const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function rewriteWithTone(text, tone) {
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    throw new Error("No API key found. Please add your Groq API key.");
  }

  const prompt = `Rewrite the following text in a ${tone} tone. 
Return ONLY the rewritten text, nothing else. No explanations, no quotes.

Original text: ${text}`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["groq_api_key"], (result) => {
      resolve(result.groq_api_key || null);
    });
  });
}

async function saveApiKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ groq_api_key: key }, resolve);
  });
}