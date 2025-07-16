export function parseOverlayPrompt(prompt) {
  const result = {
    text: '',
    start_time: 0,
    duration: 3,
    color: 'white',
    position: 'center',
    bold: false,
    fontsize: 48
  };

  const lower = prompt.toLowerCase();

  // === Font size
  const fontSizeMap = {
    "small": 24,
    "medium": 36,
    "large": 48,
    "big": 48,
    "huge": 60,
    "extra large": 80
  };
  const fontSizeMatch = lower.match(/(extra large|huge|big|large|medium|small)/i);
  if (fontSizeMatch) {
    const sizeKey = fontSizeMatch[1];
    result.fontsize = fontSizeMap[sizeKey];
  }

  // === Color
  const knownColors = ['red', 'blue', 'green', 'white', 'black', 'yellow', 'purple', 'orange', 'pink', 'gray'];
  const colorMatch = lower.match(/(?:in|color)\s+(red|blue|green|white|black|yellow|purple|orange|pink|gray)/);
  if (colorMatch) result.color = colorMatch[1];

  // === Position
  if (lower.includes('bottom left')) result.position = 'bottom-left';
else if (lower.includes('bottom right')) result.position = 'bottom-right';
else if (lower.includes('top left')) result.position = 'top-left';
else if (lower.includes('top right')) result.position = 'top-right';
else if (lower.includes('top center')) result.position = 'top-center';
else if (lower.includes('bottom center')) result.position = 'bottom-center';
else if (lower.includes('top')) result.position = 'top-center';
else if (lower.includes('bottom')) result.position = 'bottom-center';
else if (lower.includes('center')) result.position = 'center';

  // === Time
  // Time range first
// Handle "from X till Y" duration
const rangeMatch = prompt.match(/from\s*(\d{1,2}):(\d{2})\s*(?:to|till|until)\s*(\d{1,2}):(\d{2})/i);
if (rangeMatch) {
  const startMin = parseInt(rangeMatch[1], 10);
  const startSec = parseInt(rangeMatch[2], 10);
  const endMin = parseInt(rangeMatch[3], 10);
  const endSec = parseInt(rangeMatch[4], 10);
  
  result.start_time = (startMin * 60) + startSec;
  const end_time = (endMin * 60) + endSec;
  result.duration = Math.max(1, end_time - result.start_time);
} else {
  // Fallback to single point-in-time like "at 0:20"
  const timeMatch = prompt.match(/(?:at|minute)\s*(\d{1,2}):(\d{2}):(\d{2})/i) || prompt.match(/(?:at|minute)\s*(\d{1,2}):?(\d{2})?/i);
  const endMatch = /at (the end|end of the video)/i.test(prompt);
  const startMatch = /at (the start|start of the video)/i.test(prompt);

  if (timeMatch) {
      if (timeMatch.length === 4) {
    const hh = parseInt(timeMatch[1], 10);
    const mm = parseInt(timeMatch[2], 10);
    const ss = parseInt(timeMatch[3], 10);
    result.start_time = hh * 3600 + mm * 60 + ss;
    } else {
      const minutes = parseInt(timeMatch[1], 10);
      const seconds = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      result.start_time = (minutes * 60) + seconds;
    }
  } else if (endMatch) {
    result.start_time = "END";
  } else if (startMatch) {
    result.start_time = 0;
  }
}

  // === Duration
  const durationMatch = lower.match(/for\s+(\d+)\s+seconds?/);
  if (durationMatch) {
    result.duration = parseInt(durationMatch[1]);
  }

  // === Bold
  if (lower.includes("bold")) result.bold = true;

  // === Text
  // Option 1: quoted
  const quoteMatch = prompt.match(/['"](.+?)['"]/);
  if (quoteMatch) {
    result.text = quoteMatch[1];
  } else {
    // Option 2: remove known phrases and clean up
    let cleaned = prompt
      .replace(/add|put|show|display/i, '')
      .replace(/to the (top|bottom) (left|right)/gi, '')
      .replace(/at\s+\d+:\d{2}/, '')
      .replace(/at (start|end|the end|the start)/gi, '')
      .replace(/in\s+(red|blue|green|white|black|yellow|purple|orange|pink|gray)/i, '')
      .replace(/color\s+(red|blue|green|white|black|yellow|purple|orange|pink|gray)/i, '')
      .replace(/for\s+\d+\s+seconds?/i, '')
      .replace(/bold|font\s*size\s*\d+/i, '')
      .replace(/["']/g, '')
      .trim();

    // Extract only the first 4–6 words to avoid extra instruction text
    const words = cleaned.split(/\s+/).slice(0, 6);
    result.text = words.join(' ');
  }

  console.log("🧠 Parsed Overlay:", result);
  return result;
}

/**
 * Parses expressions like "end-00:00:05" and returns the resolved time in seconds.
 */
export function parseEndExpression(expression, durationSeconds) {
  if (!expression) {
    return null;
  }

  if (expression === 'end') {
    return durationSeconds;
  }

  const match = expression.match(/^end-(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const hh = parseInt(match[1], 10);
    const mm = parseInt(match[2], 10);
    const ss = parseInt(match[3], 10);
    const offset = (hh * 3600) + (mm * 60) + ss;
    return durationSeconds - offset;
  }

  return expression;
}
