import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import { getVideoPath } from '../utils/videoUtils.js';
import { trackEdit } from './undoRoutes.js';

const execAsync = promisify(exec);
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define directories
const audioDir = path.join(__dirname, '..', 'uploads', 'audio');
const subtitlesDir = path.join(__dirname, '..', 'uploads', 'subtitles');
const cutsDir = path.join(__dirname, '..', 'uploads', 'cuts');

// Ensure directories exist
for (const dir of [audioDir, subtitlesDir, cutsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

router.post('/add-subtitles', async (req, res) => {
  const { filename, user_id } = req.body;
  console.log("📝 Add subtitles requested by user:", user_id);

  // Validate input
  if (!filename || ['..', '/', '\\'].some(char => filename.includes(char))) {
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  }
  console.log("📁 Filename received:", filename);

  const inputFilePath = getVideoPath(filename);
  if (!inputFilePath) {
    return res.status(404).json({ success: false, message: 'Video file not found.' });
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const audioFilename = `${uniqueSuffix}.mp3`;
  const audioFilePath = path.join(audioDir, audioFilename);
  const srtFilename = `subtitles-${uniqueSuffix}.srt`;
  const srtFilePath = path.join(subtitlesDir, srtFilename);
  const ext = path.extname(filename);
  const outputFilename = `subtitled-${uniqueSuffix}${ext}`;
  const outputFilePath = path.join(__dirname, '..', 'uploads', 'videos', outputFilename); // ✅ Save to /uploads/videos

  try {
    // Step 1: Extract audio
    const extractCommand = `ffmpeg -i "${inputFilePath}" -vn -acodec libmp3lame -ar 44100 -ac 2 -ab 192k "${audioFilePath}"`;
    console.log("🎧 Running:", extractCommand);
    await execAsync(extractCommand);

    // Step 2: Transcribe audio with Whisper
    const response = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: fs.createReadStream(audioFilePath),
      response_format: "srt"
    });

    const srtContent = response.text || response;
    if (!srtContent || typeof srtContent !== 'string') {
      throw new Error("No valid subtitles returned from Whisper.");
    }
    fs.writeFileSync(srtFilePath, srtContent);

    // Step 3: Burn subtitles
    const safeSrtPath = srtFilePath.replace(/\\/g, "/");
    const burnCommand = `ffmpeg -i "${inputFilePath}" -vf "subtitles='${safeSrtPath}'" -c:a copy "${outputFilePath}"`;
    console.log("🔥 Burning subtitles:", burnCommand);
    await execAsync(burnCommand);

    // Optional cleanup
    if (fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);
    if (fs.existsSync(srtFilePath)) fs.unlinkSync(srtFilePath);
    trackEdit(user_id, path.basename(outputFilename));
    
    return res.status(200).json({
      success: true,
      message: 'Subtitles added and burned into video.',
      url: `/uploads/videos/${outputFilename}`
    });

  } catch (err) {
    console.error("❌ Subtitle generation failed:", err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate and burn subtitles.',
      error: err.message
    });
  }
});

export default router;
