// ============================
// Imports & Setup
// ============================
import dotenv from 'dotenv';
dotenv.config();

import openai from './utils/openaiClient.js';


import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { PassThrough } from 'stream';
import { initializeDirectories } from './utils/Directories.js';
import {upload,uploadDir} from './utils/mutlerConfig.js'
import { timeToSeconds, secondsToTime, resolveRelativeTime } from './utils/timeUtils.js';
import {getVideoPath,getVideoDuration,getPositionXY,generateDrawtextCommand} from './utils/videoUtils.js';
import { parseOverlayPrompt, parseEndExpression } from './utils/promptUtils.js';
import uploadRoutes from './routes/uploadRoutes.js';
import promptRoutes from './routes/promptRoutes.js';
import editRoutes from './routes/cutRoutes.js';
import overlayRoutes from './routes/overlay.js';
import downloadRoutes from './routes/downloadRoutes.js';
import slowMotionRoutes from './routes/slowMotionRoutes.js';
import extractAudioRoute from './routes/extractAudioRoute.js';
import subtitlesRouter from './routes/subtitles.js';
import removeSegmentRouter from './routes/removeSegment.js';
import exportRouter from './routes/export.js';
import undoRoutes from './routes/undoRoutes.js';
import cutSilenceRoutes from './routes/removesilence.js'; 
import removeFiller from './routes/removeFiller.js';
import mutesegment from './routes/mute-segment.js'
import transcribeRoutes from './routes/transcribe.js';
import openaiProxy from './routes/openaiProxy.js';

const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT || 5001;

// ============================
// Init App + Directory Setup
// ============================
const app = express();
initializeDirectories();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadPath = path.join(__dirname, 'uploads/videos');
fs.mkdirSync(uploadPath, { recursive: true });

// ============================
// Middleware
// ============================
app.use(cors({
  origin: BASE_URL, 
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use('/uploads/videos', express.static(uploadDir));
app.use('/uploads/audio', express.static(path.join(__dirname, 'uploads/audio')));
app.use('/uploads/cuts', express.static(path.join(__dirname, 'uploads/cuts')));
app.use('/uploads/videos', express.static(path.join(__dirname, 'uploads/videos')));

app.use('/uploads/subtitles', express.static(path.join(__dirname, 'uploads/subtitles')));
const cutsPath = path.join(__dirname, 'uploads/cuts');
if (!fs.existsSync(cutsPath)) {
  fs.mkdirSync(cutsPath, { recursive: true });
}
// ============================
// Routes 
// ============================
app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.use('/api', uploadRoutes);
app.use('/api', promptRoutes);
app.use('/api', editRoutes);
app.use('/api', overlayRoutes);
app.use('/api', downloadRoutes);
app.use('/api', slowMotionRoutes);
app.use('/api', extractAudioRoute);
app.use('/api', subtitlesRouter);
app.use('/api', removeSegmentRouter);
app.use('/api', exportRouter);
app.use('/api', undoRoutes);
app.use('/api', cutSilenceRoutes)
app.use('/api',removeFiller)
app.use('/api',mutesegment)
app.use('/api', transcribeRoutes);
app.use('/api/gpt', openaiProxy);

app.get('/download/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads/audio', filename);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.download(filePath); // triggers browser download
  } else {
    res.status(404).send('File not found');
  }
});

// ============================
// Start Server
// ============================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
