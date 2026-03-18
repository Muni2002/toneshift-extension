// Import api.js functions via message passing
document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("api-key-input");
  const saveKeyBtn = document.getElementById("save-key-btn");
  const rewriteBtn = document.getElementById("rewrite-btn");
  const inputText = document.getElementById("input-text");
  const outputText = document.getElementById("output-text");
  const outputSection = document.getElementById("output-section");
  const copyBtn = document.getElementById("copy-btn");
  const statusMsg = document.getElementById("status-msg");
  const toneBtns = document.querySelectorAll(".tone-btn");

  let selectedTone = "formal";

  // Load saved API key
  chrome.storage.local.get(["groq_api_key"], (result) => {
    if (result.groq_api_key) {
      apiKeyInput.value = result.groq_api_key;
    }
  });

  // Check for pending rewrite from context menu
  chrome.storage.local.get(["pending_rewrite"], (result) => {
    if (result.pending_rewrite && result.pending_rewrite.status === "pending") {
      inputText.value = result.pending_rewrite.text;
      selectedTone = result.pending_rewrite.tone;
      toneBtns.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tone === selectedTone);
      });
      chrome.storage.local.remove("pending_rewrite");
      // Auto rewrite
      handleRewrite();
    }
  });

  // Tone selection
  toneBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      toneBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedTone = btn.dataset.tone;
    });
  });

  // Save API key
  saveKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      showStatus("Please enter an API key", true);
      return;
    }
    chrome.storage.local.set({ groq_api_key: key }, () => {
      showStatus("API key saved!");
    });
  });

  // Rewrite button
  rewriteBtn.addEventListener("click", handleRewrite);

  async function handleRewrite() {
    const text = inputText.value.trim();
    if (!text) {
      showStatus("Please enter some text first", true);
      return;
    }

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus("Please add your Groq API key first", true);
      return;
    }

    rewriteBtn.disabled = true;
    rewriteBtn.textContent = "✨ Rewriting...";
    showStatus("");

    try {
      const result = await callGroqAPI(text, selectedTone, apiKey);
      outputText.value = result;
      outputSection.style.display = "block";
      showStatus("Done!");
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      rewriteBtn.disabled = false;
      rewriteBtn.textContent = "✨ Rewrite";
    }
  }

  // Copy to clipboard
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(outputText.value).then(() => {
      copyBtn.textContent = "✅ Copied!";
      setTimeout(() => {
        copyBtn.textContent = "📋 Copy to Clipboard";
      }, 2000);
    });
  });

  function showStatus(msg, isError = false) {
    statusMsg.textContent = msg;
    statusMsg.className = "status" + (isError ? " error" : "");
  }
});

async function callGroqAPI(text, tone, apiKey) {
  const prompt = `Rewrite the following text in a ${tone} tone.
Return ONLY the rewritten text, nothing else. No explanations, no quotes.

Original text: ${text}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "API call failed");
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}