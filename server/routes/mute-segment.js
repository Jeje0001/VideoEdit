import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getVideoPath } from '../utils/videoUtils.js';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to convert HH:MM:SS to seconds
function timeToSeconds(t) {
  const [hh, mm, ss] = t.split(":").map(Number);
  return hh * 3600 + mm * 60 + ss;
}

router.post('/mute-segment', async (req, res) => {
  const { filename, start, end } = req.body;
  const inputPath = getVideoPath(filename);

  if (!filename || !start || !end) {
    return res.status(400).json({ success: false, message: 'Missing filename, start, or end' });
  }

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ success: false, message: 'Video file not found' });
  }

  try {
    // Convert start time
    const ffmpegStart = start === "start" ? 0 : timeToSeconds(start);

    // Convert end time
    let ffmpegEnd;
    if (end === "end") {
      const probeCmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "${inputPath}"`;
      const { stdout } = await execAsync(probeCmd);
      ffmpegEnd = parseFloat(stdout.trim());
    } else if (end.startsWith("end-")) {
      const offset = timeToSeconds(end.replace("end-", ""));
      const probeCmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "${inputPath}"`;
      const { stdout } = await execAsync(probeCmd);
      const totalDuration = parseFloat(stdout.trim());
      ffmpegEnd = totalDuration - offset;
    } else {
      ffmpegEnd = timeToSeconds(end);
    }

    const outputFile = `muted-${Date.now()}-${Math.floor(Math.random() * 1e6)}.mp4`;
    const outputPath = path.join(__dirname, '..', 'uploads', 'videos', outputFile);

    const muteCmd = `ffmpeg -i "${inputPath}" -af "volume=enable='between(t,${ffmpegStart},${ffmpegEnd})':volume=0" -c:v copy -c:a aac "${outputPath}"`;
    await execAsync(muteCmd);

    return res.json({ success: true, message: 'Segment muted', filename: outputFile });

  } catch (err) {
    console.error('Mute segment error:', err);
    return res.status(500).json({ success: false, message: 'Mute operation failed', error: err.message });
  }
});

export default router;
