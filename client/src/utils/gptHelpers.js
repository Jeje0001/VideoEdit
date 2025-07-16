// utils/gptHelpers.js

const SUPPORTED_ACTIONS = [
  "cut", "remove_segment", "mute_segment", "remove_filler",
  "remove_silence", "extract_audio", "add_text", "export", "undo","download", "slow_motion"
];
export async function classifyPromptType(promptText) {
  const systemMessage = {
    role: "system",
    content: `
You are an AI assistant inside a video editing app. 
Your job is to classify a user’s prompt into:
- "edit" (for commands like cut, remove, mute, etc.)
- "undo" (if the user wants to undo or fix last change)
- "greeting" (if they say hello)
- "unknown" (if you don’t understand)

If it's an edit, identify the action (like "cut", "remove_filler", etc.).

Respond ONLY in this JSON format:
{
  "type": "...",
  "action": "...", 
  "canPerform": true or false,
  "reason": "... (optional)"
}

Supported actions: ${SUPPORTED_ACTIONS.join(", ")}.
`
  };

  const userMessage = { role: "user", content: promptText };

  const res = await fetch("http://localhost:5001/api/gpt/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json" // ✅ no Authorization
    },
    body: JSON.stringify({
      messages: [systemMessage, userMessage]
    })
  });

  const json = await res.json();
  try {
    return JSON.parse(json.choices[0].message.content);
  } catch {
    return { type: "unknown", canPerform: false, reason: "Could not classify prompt." };
  }
}

export async function rewritePromptWithGPT(promptText) {
  const messages = [
    {
      role: "system",
      content: `You're a video edit assistant. Clean and rewrite the prompt clearly so it can be parsed into an edit. Keep only the instruction.`
    },
    { role: "user", content: promptText }
  ];

  const res = await fetch("http://localhost:5001/api/gpt/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() || "Sorry, could not rewrite your prompt.";
}
