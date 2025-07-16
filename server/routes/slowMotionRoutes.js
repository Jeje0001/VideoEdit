import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { getVideoDuration, getVideoPath } from '../utils/videoUtils.js';
import util from 'util';

const router = express.Router();
const cutsDir = path.resolve('uploads/cuts');
const execPromise = util.promisify(exec);

// 🔄 Detect original rotation
async function getRotation(filePath) {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -select_streams v:0 -show_entries stream_tags=rotate -of csv=p=0 "${filePath}"`
    );
    const rot = parseInt(stdout.trim());
    if ([0, 90, 180, 270].includes(rot)) return rot;
    return 0;
  } catch {
    return 0;
  }
}

router.post('/slow-motion', async (req, res) => {
  const { filename, start, end, speed, user_id } = req.body;

  if (!filename || !start || !end || !speed) {
    return res.status(400).json({ success: false, message: 'Missing filename, start, end or speed.' });
  }

  const inputPath = getVideoPath(filename);
  if (!inputPath) {
    return res.status(404).json({ success: false, message: 'Video not found.' });
  }

  let fullDur;
  try {
    fullDur = await getVideoDuration(inputPath);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not probe duration.' });
  }

  const normalizeTime = (t) => {
    if (t === 'start') return '00:00:00';
    if (t === 'end') return secondsToTime(fullDur);
    if (t.startsWith('end-')) {
      const subtract = timeToSeconds(t.replace('end-', ''));
      return secondsToTime(Math.max(0, fullDur - subtract));
    }
    return t;
  };

  const sHH = normalizeTime(start);
  const eHH = normalizeTime(end);
  const sSec = timeToSeconds(sHH);
  const eSec = timeToSeconds(eHH);

  if (sSec >= eSec || eSec > fullDur) {
    return res.status(400).json({ success: false, message: 'Invalid time range.' });
  }

  const sp = parseFloat(speed);
  if (isNaN(sp) || sp <= 0 || sp > 5) {
    return res.status(400).json({ success: false, message: 'Speed must be between 0.1 and 5.' });
  }

  const origLen = eSec - sSec;
  const slowLen = origLen / sp;

  const ext = path.extname(filename);
  const uid = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const partA = start === 'start' ? null : path.join(cutsDir, `pre-${uid}${ext}`);
  const partB = path.join(cutsDir, `slow-${uid}${ext}`);
  const partC = end === 'end' ? null : path.join(cutsDir, `post-${uid}${ext}`);
  const listTxt = path.join(cutsDir, `list-${uid}.txt`);
  const outputFinal = path.join('uploads/videos', `slowmo-${uid}${ext}`);

  // 🔄 Detect rotation and build transpose filter
  const rotation = await getRotation(inputPath);
  let transposeFilter = '';
  if (rotation === 90) transposeFilter = 'transpose=1,';
  else if (rotation === 180) transposeFilter = 'transpose=1,transpose=1,';
  else if (rotation === 270) transposeFilter = 'transpose=2,';

  const cmds = [];

  if (partA) {
    cmds.push({
      path: partA,
      cmd: `ffmpeg -y -ss 0 -i "${inputPath}" -t ${sSec} -vf "${transposeFilter}scale=iw:ih" -c:v libx264 -c:a aac "${partA}"`
    });
  }

  cmds.push({
    path: partB,
    cmd:
      `ffmpeg -y -ss ${sSec} -i "${inputPath}" -t ${origLen} ` +
      `-filter_complex "[0:v]${transposeFilter}scale=iw:ih,setpts=${1 / sp}*PTS[v];[0:a]atempo=${sp}[a]" ` +
      `-map "[v]" -map "[a]" -t ${slowLen} "${partB}"`
  });

  if (partC) {
    cmds.push({
      path: partC,
      cmd: `ffmpeg -y -ss ${eSec} -i "${inputPath}" -vf "${transposeFilter}scale=iw:ih" -c:v libx264 -c:a aac "${partC}"`
    });
  }

  try {
    for (const item of cmds) {
      await new Promise((ok, fail) => {
        exec(item.cmd, err => err ? fail(err) : ok());
      });

      if (!fs.existsSync(item.path) || fs.statSync(item.path).size < 100000) {
        console.warn(`⚠️ Skipping broken segment: ${item.path}`);
        fs.existsSync(item.path) && fs.unlinkSync(item.path);
        item.skip = true;
      }
    }

    const validParts = cmds.filter(i => !i.skip);
    if (validParts.length === 0) {
      return res.status(500).json({ success: false, message: 'All segments failed or were empty.' });
    }

    const lines = validParts.map(i => `file '${i.path}'`).join('\n') + '\n';
    fs.writeFileSync(listTxt, lines);

    await new Promise((ok, fail) => {
      exec(
        `ffmpeg -y -f concat -safe 0 -i "${listTxt}" -c:v libx264 -preset fast -crf 23 -c:a aac "${outputFinal}"`,
        err => err ? fail(err) : ok()
      );
    });

    validParts.forEach(i => fs.existsSync(i.path) && fs.unlinkSync(i.path));
    fs.unlinkSync(listTxt);

    return res.json({ success: true, url: `/uploads/videos/${path.basename(outputFinal)}` });

  } catch (err) {
    console.error('💥 Slow-motion failed:', err);
    return res.status(500).json({ success: false, message: 'Processing failed.', error: err.message });
  }

  function timeToSeconds(ts) {
    const [H, M, S] = ts.split(':').map(Number);
    return H * 3600 + M * 60 + S;
  }

  function secondsToTime(sec) {
    const H = Math.floor(sec / 3600).toString().padStart(2, '0');
    const M = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const S = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${H}:${M}:${S}`;
  }
});

export default router;
