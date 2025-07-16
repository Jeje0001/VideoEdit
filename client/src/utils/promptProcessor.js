const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export async function parsePrompt(promptText) {
  try {
    const response = await fetch(`${BASE_URL}/api/parse-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptText }),
    });

    const data = await response.json();
    return normalizeActions(data, promptText);
  } catch (error) {
    console.error("❌ Failed to parse prompt:", error);
    return { error: "Failed to parse prompt." };
  }
}

function normalizeActions(parsed, originalPrompt) {
  let actions = [];

  if (Array.isArray(parsed.actions)) {
    actions = parsed.actions;
  } else if (parsed.actions?.actions) {
    actions = parsed.actions.actions;
  } else {
    return { error: "Could not understand AI response." };
  }

  const cleaned = [];

  for (let action of actions) {
    const invalidTimePattern = /HH:MM:SS|null|placeholder/i;
    if (invalidTimePattern.test(action.start) || invalidTimePattern.test(action.end)) {
      continue;
    }

    // Normalize time trimming from end
    if (
      action.action === "remove_segment" &&
      originalPrompt.toLowerCase().includes("remove") &&
      originalPrompt.toLowerCase().includes("seconds") &&
      originalPrompt.toLowerCase().includes("from the end")
    ) {
      const seconds = extractSeconds(originalPrompt);
      if (seconds && seconds <= 300) {
        const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
        const ss = String(seconds % 60).padStart(2, "0");
        action.start = `end-00:${mm}:${ss}`;
        action.end = "end";
      }
    }

    cleaned.push(action);
  }

  return { actions: cleaned };
}

function extractSeconds(text) {
  const words = text.toLowerCase().split(" ");
  for (let i = 0; i < words.length; i++) {
    if (words[i] === "remove" && i + 1 < words.length) {
      const seconds = parseInt(words[i + 1]);
      if (!isNaN(seconds)) return seconds;
    }
  }
  return null;
}

// Sanitize actions (basic version, you can improve later)
export function sanitizeActions(actions, promptText) {
  if (!Array.isArray(actions)) return [];

  return actions.filter(action => {
    const invalidTimePattern = /HH:MM:SS|null|placeholder/i;
    return !invalidTimePattern.test(action.start || "") &&
           !invalidTimePattern.test(action.end || "");
  });
}

// Map action types to backend endpoints
export function resolveBackendEndpoint(action) {
  const map = {
    cut: '/api/cut-video',
    remove_segment: '/api/remove-segment',
    add_subtitles: '/api/add-subtitles',
    export: '/api/export',
    add_overlay: '/api/add-overlay',
    extract_audio: '/api/extract-audio',
    slow_motion: '/api/slow-motion',
    remove_silence: '/api/cut-silence',
    remove_filler:'/api/remove-filler',
    mute_segment:'/api/mute-segment'
  };
  return map[action.action] || null;
}

// Build backend request payload
export function buildRequestBody(action, filename, userId, videoUrl) {
  const body = { filename, user_id: userId };

  if (action.start) body.start = action.start;
  if (action.end) body.end = action.end;
  if (action.format) body.targetFormat = action.format;
  else if (action.action === "export") body.targetFormat = "mp4";
  if (action.name) body.newName = action.name;
  if (action.action === "add_overlay") body.prompt = action.prompt;
  if (action.speed) body.speed = action.speed;

  return body;
}
