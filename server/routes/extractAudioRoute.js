import express from 'express';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec as _exec } from 'child_process';
import { fileURLToPath } from 'url';

const exec = promisify(_exec);
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads', 'videos');
const audioDir = path.join(__dirname, '..', 'uploads', 'audio');

// Ensure downloads directory exists
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

router.post('/extract-audio', async (req, res) => {
  const { filename, format, user_id } = req.body;

  // 1. Validate filename
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ success: false, message: 'Invalid or missing filename.' });
  }

  // 2. Determine and validate format
  const allowed = ['mp3', 'wav'];
  const fmt = (format || 'mp3').toLowerCase();
  const outputFormat = allowed.includes(fmt) ? fmt : 'mp3';

  // 3. Build paths
  const inputPath = path.join(uploadsDir, filename);
  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ success: false, message: 'Video file not found.' });
  }
  const baseName = path.parse(filename).name;
  const suffix  = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const outputName = `audio-${baseName}-${suffix}.${outputFormat}`;
  const outputPath = path.join(audioDir, outputName);

  try {
    // 4. Check for audio streams
    const probeCmd = `ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "${inputPath}"`;
    const { stdout: audioStreams } = await exec(probeCmd);
    if (!audioStreams.trim()) {
      return res.status(400).json({ success: false, message: 'No audio track found in this video.' });
    }

    // 5. Build and run FFmpeg command (map audio only)
    const codec = outputFormat === 'mp3' ? 'libmp3lame' : 'pcm_s16le';
    const ffmpegCmd =
      `ffmpeg -y -i "${inputPath}" -map 0:a -c:a ${codec} "${outputPath}"`;
    console.log('🎧 Running FFmpeg:', ffmpegCmd);
    await exec(ffmpegCmd);

    // 6. Respond with the download URL
    return res.status(200).json({
      success: true,
      message: 'Audio extracted successfully.',
      url: `/uploads/audio/${outputName}`
    });
  } catch (err) {
    console.error('❌ Audio extraction error:', err.stderr || err);
    return res.status(500).json({
      success: false,
      message: 'Audio extraction failed.',
      error: err.message
    });
  }
});

export default router;
