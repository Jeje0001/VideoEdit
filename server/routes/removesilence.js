import express from 'express';
import path from 'path';
import fs from 'fs';
import { getVideoPath } from '../utils/videoUtils.js';
import { promisify } from 'util';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🧠 Step 1: Parse silence segments from FFmpeg log
function parseSilenceSegments(stderrOutput) {
  const lines = stderrOutput.split('\n');
  const silenceSegments = [];
  let currentStart = null;

  for (const line of lines) {
    const startMatch = line.match(/silence_start: ([\d.]+)/);
    if (startMatch) {
      currentStart = parseFloat(startMatch[1]);
      continue;
    }

    const endMatch = line.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/);
    if (endMatch && currentStart !== null) {
      const end = parseFloat(endMatch[1]);
      silenceSegments.push({ start: currentStart, end });
      currentStart = null;
    }
  }

  return silenceSegments;
}

// 🧠 Step 2: Get non-silent segments by inverting silence segments
function getNonSilentSegments(silenceSegments, duration) {
  const segments = [];
  let lastEnd = 0;

  for (const { start, end } of silenceSegments) {
    if (start > lastEnd) {
      segments.push({ start: lastEnd, end: start });
    }
    lastEnd = end;
  }

  if (lastEnd < duration) {
    segments.push({ start: lastEnd, end: duration });
  }

  return segments;
}

router.post("/cut-silence", async (req, res) => {
  const { filename, user_id } = req.body;

  if (!filename) {
    return res.status(400).json({ success: false, message: "There is no file" });
  }
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ success: false, message: 'Invalid filename.' });
  }

  const inputFilePath = getVideoPath(filename);
  if (!fs.existsSync(inputFilePath)) {
    return res.status(400).json({ success: false, message: "File can't be found" });
  }

  const fileextension = path.extname(filename);
  const outputFilename = `remove-silence-${Date.now()}-${Math.round(Math.random() * 1e6)}${fileextension}`;
  const outputFilePath = path.join(__dirname, '..', 'uploads', 'videos', outputFilename);

  try {
    // Step 1: Detect silence
    const detectCmd = `ffmpeg -i "${inputFilePath}" -af silencedetect=noise=-40dB:d=0.5 -f null -`;
    const { stderr } = await execAsync(detectCmd);
    const silenceSegments = parseSilenceSegments(stderr);

    // Step 2: Get total duration
    const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputFilePath}"`;
    const { stdout: durationOut } = await execAsync(probeCmd);
    const totalDuration = parseFloat(durationOut.trim());

    let nonSilentSegments = getNonSilentSegments(silenceSegments, totalDuration);

    // Step 3: Filter out micro-segments
    const filteredSegments = nonSilentSegments.filter(({ start, end }) => {
      return end - start >= 0.3;
    });

    if (filteredSegments.length === 0) {
      return res.status(400).json({ success: false, message: "No usable non-silent content after filtering." });
    }

    // Step 4: Create temp folder
    const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Step 5: Slice non-silent segments
    const segmentFiles = [];
    for (let i = 0; i < filteredSegments.length; i++) {
      const { start, end } = filteredSegments[i];
      const segPath = path.join(tempDir, `part-${i}.mp4`);
      const trimCmd = `ffmpeg -ss ${start} -to ${end} -i "${inputFilePath}" -c:v libx264 -c:a aac -strict experimental -y "${segPath}"`;
      await execAsync(trimCmd);
      segmentFiles.push(segPath);
    }

    // Step 6: Create concat list file
    const concatListPath = path.join(tempDir, 'concat.txt');
    const concatText = segmentFiles.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(concatListPath, concatText);

    // Step 7: Concatenate parts
    const concatCmd = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${outputFilePath}"`;
    await execAsync(concatCmd);

    // Step 8: Cleanup temp files
    for (const file of segmentFiles) fs.unlinkSync(file);
    fs.unlinkSync(concatListPath);

    // ✅ Done
    return res.json({
      success: true,
      message: 'Silence removed and video shortened',
      filename: outputFilename
    });

  } catch (err) {
    console.error("ffmpeg error", err);
    return res.status(500).json({
      success: false,
      message: "Failed to remove silence",
      error: err.message
    });
  }
});

export default router;
