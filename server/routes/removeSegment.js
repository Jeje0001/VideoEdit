import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { getVideoPath } from '../utils/videoUtils.js';
import { trackEdit } from './undoRoutes.js';

const execAsync = promisify(exec);
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cutsDir = path.join(__dirname, '..', 'uploads', 'cuts');

if (!fs.existsSync(cutsDir)) fs.mkdirSync(cutsDir, { recursive: true });

router.post('/remove-segment', async (req, res) => {
  const { filename, start, end, user_id } = req.body;

  // 1. Validate input
  if (!filename || !start || !end) {
    return res.status(400).json({ success: false, message: 'Missing required fields: filename, start, and end.' });
  }
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ success: false, message: 'Invalid filename.' });
  }

  const inputFilePath = getVideoPath(filename);
  if (!inputFilePath) {
    return res.status(404).json({ success: false, message: 'Video file not found.' });
  }

  // 2. Normalize time keywords
  let parsedStart = start === 'start' || start === 'beginning' ? '00:00:00' : start;
  let parsedEnd = end;

  try {
    // 3. Get video duration
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputFilePath}"`);
    const durationSeconds = parseFloat(stdout.trim());
    const endOfVideo = secondsToTime(durationSeconds);

    // 4. Handle "end" or "end-HH:MM:SS"
    const endExprRegex = /^end-(\d{2}):(\d{2}):(\d{2})$/;
    if (parsedEnd === 'end') parsedEnd = endOfVideo;
    if (endExprRegex.test(parsedStart)) {
      const [, hh, mm, ss] = parsedStart.match(endExprRegex);
      parsedStart = secondsToTime(durationSeconds - (+hh * 3600 + +mm * 60 + +ss));
    }
    if (endExprRegex.test(parsedEnd)) {
      const [, hh, mm, ss] = parsedEnd.match(endExprRegex);
      parsedEnd = secondsToTime(durationSeconds - (+hh * 3600 + +mm * 60 + +ss));
    }

    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (!timeRegex.test(parsedStart) || !timeRegex.test(parsedEnd)) {
      return res.status(400).json({ success: false, message: 'Invalid time format. Use HH:MM:SS or end-relative format.' });
    }

    const startSec = timeToSeconds(parsedStart);
    const endSec = timeToSeconds(parsedEnd);
    if (endSec <= startSec) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    // 5. Generate unique names
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(filename);
    const partA = path.join(cutsDir, `keepA-${unique}${ext}`);
    const partB = path.join(cutsDir, `keepB-${unique}${ext}`);
    const listFile = path.join(cutsDir, `list-${unique}.txt`);
    const finalFile = `removed-${unique}${ext}`;
    const finalPath = path.join(__dirname, '..', 'uploads', 'videos', finalFile); // ✅ Save to /uploads/videos

    const cmds = [];

    if (startSec > 0) {
      cmds.push({
        path: partA,
        cmd: `ffmpeg -y -i "${inputFilePath}" -ss 00:00:00 -to ${parsedStart} -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k "${partA}"`
      });
    }

    if (parsedEnd !== endOfVideo) {
      cmds.push({
        path: partB,
        cmd: `ffmpeg -y -i "${inputFilePath}" -ss ${parsedEnd} -to ${endOfVideo} -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k "${partB}"`
      });
    }

    if (cmds.length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing left to keep. Aborting.' });
    }

    for (const c of cmds) {
      await execAsync(c.cmd);
    }

    // Write concat list
    fs.writeFileSync(listFile, cmds.map(c => `file '${c.path}'`).join('\n'));

    // Concat final video
    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -preset fast -crf 23 -c:a aac "${finalPath}"`;
    await execAsync(concatCmd);
    trackEdit(user_id, path.basename(finalPath));
    return res.status(200).json({
      success: true,
      message: 'Segment removed.',
      url: `/uploads/videos/${finalFile}`
    });

  } catch (e) {
    console.error("❌ Segment removal failed:", e);
    return res.status(500).json({ success: false, message: 'Processing failed.', error: e.message });
  }
});

// Helper functions
function timeToSeconds(str) {
  const [h, m, s] = str.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function secondsToTime(secs) {
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(secs % 60)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default router;
