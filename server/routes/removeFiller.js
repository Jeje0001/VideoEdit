import express from 'express';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { getVideoPath } from '../utils/videoUtils.js';

const execAsync = promisify(exec);
const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Filler words list
const FILLERS = ['um', 'uh', 'like', 'you know', 'i mean', 'so', 'basically', 'literally'];

function isFiller(text) {
  return FILLERS.includes(text.toLowerCase().trim());
}

router.post('/remove-filler', async (req, res) => {
  const { filename } = req.body;
  const inputPath = getVideoPath(filename);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  const transcriptPath = path.join(__dirname, '..', 'uploads', 'transcripts');
  if (!fs.existsSync(transcriptPath)) fs.mkdirSync(transcriptPath, { recursive: true });

  try {
    // Step 1: Run Whisper to generate JSON transcript
    const whisperCmd = `whisper "${inputPath}" --language English --task transcribe --output_format json --output_dir "${transcriptPath}" --word_timestamps True`;
    await execAsync(whisperCmd);

    // Find the most recent transcript file
    const transcriptFile = fs.readdirSync(transcriptPath)
        .filter(f => f.endsWith('.json'))
        .map(f => ({ name: f, time: fs.statSync(path.join(transcriptPath, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time)[0].name;


    const transcriptData = JSON.parse(fs.readFileSync(path.join(transcriptPath, transcriptFile), 'utf8'));

    // Step 2: Detect filler word timestamps
    const fillerTimestamps = [];

   for (const segment of transcriptData.segments) {
        if (!segment.words) continue;
        for (const word of segment.words) {
            console.log(`[${word.start}–${word.end}] ${word.word}`);
            if (isFiller(word.word)) {
            fillerTimestamps.push({ start: word.start, end: word.end });
            }
        }
    }



    // Optional: merge filler words that are close together
    const mergedRanges = [];
    let current = null;

    for (const filler of fillerTimestamps) {
      if (!current) {
        current = { ...filler };
      } else if (filler.start - current.end <= 0.2) { // merge if less than 200ms apart
        current.end = filler.end;
      } else {
        mergedRanges.push(current);
        current = { ...filler };
      }
    }
    if (current) mergedRanges.push(current);

    const removeRanges = mergedRanges;

    if (removeRanges.length === 0) {
      return res.json({ success: true, message: 'No filler words found.', filename });
    }

    // Step 3: Calculate keep segments
    let lastEnd = 0;
    const keepSegments = [];

    for (const { start, end } of removeRanges) {
      if (start > lastEnd) {
        keepSegments.push({ start: lastEnd, end: start });
      }
      lastEnd = end;
    }

    // Get full video duration
    const probeCmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "${inputPath}"`;
    const { stdout: durationOut } = await execAsync(probeCmd);
    const totalDuration = parseFloat(durationOut.trim());

    if (lastEnd < totalDuration) {
      keepSegments.push({ start: lastEnd, end: totalDuration });
    }

    // Step 4: Slice and concatenate non-filler segments
    const outputFile = `remove-filler-${Date.now()}-${Math.floor(Math.random() * 1e6)}.mp4`;
    const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
    const outputPath = path.join(__dirname, '..', 'uploads', 'videos', outputFile);

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const segmentFiles = [];
    for (let i = 0; i < keepSegments.length; i++) {
      const seg = keepSegments[i];
      const segPath = path.join(tempDir, `part-${i}.mp4`);
      const trimCmd = `ffmpeg -ss ${seg.start} -to ${seg.end} -i "${inputPath}" -c:v libx264 -c:a aac "${segPath}"`;
      await execAsync(trimCmd);
      segmentFiles.push(segPath);
    }

    const concatListPath = path.join(tempDir, 'concat-filler.txt');
    fs.writeFileSync(concatListPath, segmentFiles.map(f => `file '${f}'`).join('\n'));

    const concatCmd = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}"`;
    await execAsync(concatCmd);

    // Cleanup
    segmentFiles.forEach(f => fs.unlinkSync(f));
    fs.unlinkSync(concatListPath);

    return res.json({ success: true, message: 'Filler words removed.', filename: outputFile });

  } catch (err) {
    console.error('Filler removal error:', err);
    return res.status(500).json({ success: false, message: 'Filler removal failed', error: err.message });
  }
});

export default router;
