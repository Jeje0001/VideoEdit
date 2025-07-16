import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { getVideoPath } from '../utils/videoUtils.js';
import { getVideoDuration } from '../utils/videoUtils.js'; 
import { parseOverlayPrompt } from '../utils/promptUtils.js';
import { generateDrawtextCommand } from '../utils/videoUtils.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { trackEdit } from './undoRoutes.js';

const router = express.Router();

const cutsDir = path.resolve('uploads/cuts');
if (!fs.existsSync(cutsDir)) fs.mkdirSync(cutsDir, { recursive: true });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post('/add-overlay', async (req, res) => {
  const { prompt, filename, user_id } = req.body;

  if (!prompt || !filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ success: false, message: 'Invalid prompt or filename.' });
  }

  const inputFilePath = getVideoPath(filename);
  if (!inputFilePath) {
    return res.status(404).json({ success: false, message: 'Video file not found.' });
  }

  const overlayData = parseOverlayPrompt(prompt);

  if (overlayData.start_time === 'END') {
    try {
      const durationSeconds = await getVideoDuration(inputFilePath);
      overlayData.start_time = Math.floor(durationSeconds - overlayData.duration);
    } catch (err) {
      console.error("Failed to get duration:", err);
      return res.status(500).json({ success: false, message: 'Failed to get video duration.', error: err.message });
    }
  }

  const drawtextCommand = generateDrawtextCommand(overlayData);
  const outputFilename = `overlay-${Date.now()}-${Math.floor(Math.random() * 1e9)}${path.extname(filename)}`;
  const outputFilePath = path.join(__dirname, '..', 'uploads', 'videos', outputFilename);

  const ffmpegArgs = [
    '-y', '-i', inputFilePath,
    '-vf', drawtextCommand,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'copy',
    outputFilePath
  ];

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  ffmpeg.stderr.on('data', data => {
    console.log(`📼 FFmpeg stderr: ${data}`);
  });
  trackEdit(user_id, path.basename(outputFilePath));


  ffmpeg.on('close', code => {
    if (code === 0) {
      return res.status(200).json({
        success: true,
        message: 'Overlay added.',
        url: `/uploads/videos/${outputFilename}`
      });
    } else {
      return res.status(500).json({ success: false, message: 'Overlay failed.', code });
    }
  });

  ffmpeg.on('error', err => {
    return res.status(500).json({ success: false, message: 'Failed to start FFmpeg.', error: err.message });
  });
});

export default router;
