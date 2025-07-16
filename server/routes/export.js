import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { getVideoPath } from '../utils/videoUtils.js';
import fs from 'fs';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cutsDir = path.join(__dirname, '..', 'uploads', 'cuts');

if (!fs.existsSync(cutsDir)) fs.mkdirSync(cutsDir, { recursive: true });

router.post('/export', (req, res) => {
  const { filename, targetFormat, newName, user_id } = req.body;

  // 1. Validate and locate file
  const inputFilePath = getVideoPath(filename);
  if (!inputFilePath) {
    return res.status(404).json({
      success: false,
      message: 'Video file not found.'
    });
  }

  // 2. Determine export name
  let baseName = `exported-${Date.now()}`;
  if (typeof newName === 'string' && newName.trim() !== '') {
    baseName = newName.trim().replace(/\s+/g, '_');
  }

  // 3. Set extension
  let extension = 'mp4';
  if (typeof targetFormat === 'string' && targetFormat.trim() !== '') {
    extension = targetFormat.trim();
  }

  const outputFilename = `${baseName}.${extension}`;
  const outputPath = path.join(__dirname, '..', 'uploads', 'videos', outputFilename);

  // 4. FFmpeg config
  const ffmpegArgs = [
    '-y',
    '-i', inputFilePath,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    outputPath
  ];

  console.log("🚀 Exporting with FFmpeg:", ffmpegArgs.join(' '));

  // 5. Run FFmpeg
  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  ffmpeg.stderr.on('data', (data) => {
    console.log(`📼 FFmpeg stderr: ${data}`);
  });

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Export finished successfully');
      return res.status(200).json({
        success: true,
        message: 'Export complete.',
        url: `/uploads/videos/${outputFilename}`
      });
    }

    console.error('❌ FFmpeg exited with code:', code);
    return res.status(500).json({
      success: false,
      message: 'Export failed.',
      code: code
    });
  });

  ffmpeg.on('error', (err) => {
    console.error('🚨 FFmpeg error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to start FFmpeg.',
      error: err.message
    });
  });
});

export default router;
