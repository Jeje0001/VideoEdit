import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { timeToSeconds, secondsToTime, resolveRelativeTime } from '../utils/timeUtils.js';

import { getVideoPath } from '../utils/videoUtils.js';
import { trackEdit } from './undoRoutes.js';

const router = express.Router();

const outputDir = path.resolve('uploads/videos');

/**
 * POST /api/cut-video
 */
router.post('/cut-video', async (req, res) => {
  const { filename, start, end, user_id } = req.body;

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

  exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputFilePath}"`, (error, stdout) => {
    if (error) {
      console.error("ffprobe error:", error);
      return res.status(500).json({ success: false, message: 'Failed to analyze video duration.', error: error.message });
    }

    const videoDuration = parseFloat(stdout);
    const resolvedStart = resolveRelativeTime(start, videoDuration);
    const resolvedEnd = resolveRelativeTime(end, videoDuration);

    const timeFormatRegex = /^([0-1]?\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeFormatRegex.test(resolvedStart) || !timeFormatRegex.test(resolvedEnd)) {
      return res.status(400).json({ success: false, message: 'Invalid time format. Use HH:MM:SS.' });
    }

    const startSeconds = timeToSeconds(resolvedStart);
    const endSeconds = timeToSeconds(resolvedEnd);

    if (endSeconds <= startSeconds) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    let adjustedEnd = resolvedEnd;
    if (endSeconds > videoDuration) {
      adjustedEnd = secondsToTime(videoDuration);
    }

    const uniqueSuffix = Date.now() + '-' + Math.floor(Math.random() * 1e9);
    const extension = path.extname(filename);
    const outputFilename = `cut-${uniqueSuffix}${extension}`;

    const outputFilePath = path.join(outputDir, outputFilename);

    const duration = endSeconds - startSeconds;
    const command = `ffmpeg -ss ${resolvedStart} -i "${inputFilePath}" -t ${duration} -map 0 -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k "${outputFilePath}"`;

    exec(command, (err) => {
      if (err) {
        console.error("FFmpeg error:", err);
        return res.status(500).json({ success: false, message: 'Failed to cut video.', error: err.message });
      }

      const fileUrl = `/uploads/videos/${outputFilename}`;
      trackEdit(user_id, outputFilename);
      return res.status(200).json({
        success: true,
        message: 'Video cut successfully.',
        url: fileUrl
      });
    });
  });
});

export default router;
