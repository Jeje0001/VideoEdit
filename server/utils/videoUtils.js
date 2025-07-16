import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads/videos');
const cutsDir = path.join(__dirname, '../uploads/cuts');

/**
 * Finds the video path by checking both uploads and cuts directories.
 */
export function getVideoPath(filename) {
  const searchDirs = [uploadDir, cutsDir];
  for (const dir of searchDirs) {
    const fullPath = path.join(dir, filename);
    console.log("🔎 Checking:", fullPath);

    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  console.warn("❌ File not found:", filename);
  return null;
}

/**
 * Gets the duration of a video file in seconds using ffprobe.
 */
export function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;

    exec(cmd, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = parseFloat(stdout.trim());
      resolve(duration);
    });
  });
}

/**
 * Returns the x and y coordinates based on a named position.
 */
export function getPositionXY(position) {
  const positions = {
    "top-left": { x: 20, y: 20 },
    "top-center": { x: "(main_w-text_w)/2", y: 20 },
    "top-right": { x: "main_w-text_w-20", y: 20 },
    "bottom-left": { x: 20, y: "main_h-text_h-20" },
    "bottom-center": { x: "(main_w-text_w)/2", y: "main_h-text_h-20" },
    "bottom-right": { x: "main_w-text_w-20", y: "main_h-text_h-20" },
    "center": { x: "(main_w-text_w)/2", y: "(main_h-text_h)/2" }
  };

  if (position in positions) {
    return positions[position];
  }

  return positions["center"];
}

/**
 * Generates the drawtext FFmpeg command from structured overlay data.
 */
export function generateDrawtextCommand(data) {
  const pos = getPositionXY(data.position);
  const x = pos.x;
  const y = pos.y;

  const start = data.start_time;
  let end = start;

  if (start !== "END") {
    end = start + data.duration;
  }

  let fontFile = "";
  if (data.bold === true) {
    fontFile = ":fontfile=/System/Library/Fonts/Supplemental/Arial Bold.ttf";
  }

  let fontsize = 36;
  if (data.fontsize) {
    fontsize = data.fontsize;
  }

  const drawtext =
    "drawtext=text='" +
    data.text +
    "':x=" + x +
    ":y=" + y +
    ":fontsize=" + fontsize +
    ":fontcolor=" + data.color +
    fontFile +
    ":enable='between(t," + start + "," + end + ")'";

  console.log("🎬 FFmpeg drawtext command:", drawtext);

  return drawtext;
}
