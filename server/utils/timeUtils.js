/**
 * Converts a time string (HH:MM:SS) into total seconds.
 */
export function timeToSeconds(time) {
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return (hours * 3600) + (minutes * 60) + seconds;
}

/**
 * Converts a number of seconds into a time string (HH:MM:SS).
 */
export function secondsToTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Resolves relative time expressions (like "start", "end", or "end-00:00:10") into HH:MM:SS.
 */
export function resolveRelativeTime(timeStr, videoDuration) {
  if (timeStr === "start" || timeStr === "beginning") {
    return "00:00:00";
  }

  if (timeStr === "end") {
    return secondsToTime(videoDuration);
  }

  if (timeStr.startsWith("end-")) {
    const subtractStr = timeStr.replace("end-", "");
    const subtractSeconds = timeToSeconds(subtractStr);
    const adjustedSeconds = videoDuration - subtractSeconds;
    const safeSeconds = adjustedSeconds >= 0 ? adjustedSeconds : 0;
    return secondsToTime(safeSeconds);
  }

  return timeStr;
}
