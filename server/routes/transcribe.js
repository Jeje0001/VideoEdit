import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { getVideoPath } from '../utils/videoUtils.js';

const execAsync = promisify(exec);
const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === /api/transcribe ===
router.post('/transcribe', async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required' });
  }

  const inputPath = getVideoPath(filename);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ success: false, message: 'Video file not found' });
  }

  try {
    const baseName = path.basename(filename, path.extname(filename));
    const transcriptDir = path.join(__dirname, '..', 'uploads', 'transcripts');
    const transcriptPath = path.join(transcriptDir, `${baseName}-transcript.json`);

    // Check if already exists
    if (fs.existsSync(transcriptPath) && !force) {
      const data = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));
      return res.json({ success: true, transcript: data.segments || [], fromCache: true });
    }

    // Ensure transcript folder exists
    fs.mkdirSync(transcriptDir, { recursive: true });

    // Run whisper using CLI with word timestamps output
    const whisperCmd = `whisper "${inputPath}" --model base --output_dir "${transcriptDir}" --output_format json --word_timestamps True`;
    await execAsync(whisperCmd);

    // Whisper outputs to baseName.json
    const whisperOutputPath = path.join(transcriptDir, `${baseName}.json`);
    if (!fs.existsSync(whisperOutputPath)) {
      throw new Error('Transcription file not found after whisper execution');
    }

    // Rename to `-transcript.json` format for consistency
    fs.renameSync(whisperOutputPath, transcriptPath);

    const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));

    return res.json({ success: true, transcript: transcript.segments || [], fromCache: false });
  } catch (err) {
    console.error('❌ Transcription error:', err);
    return res.status(500).json({ success: false, message: 'Transcription failed', error: err.message });
  }
});

export default router;
