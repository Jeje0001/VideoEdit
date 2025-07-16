import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initializeDirectories() {
  const uploadDir = path.join(__dirname, 'uploads', 'videos');
  const cutsDir = path.join(__dirname, 'uploads', 'cuts');
  const audioDir = path.join(__dirname, 'uploads', 'audio');
  const subtitlesDir = path.join(__dirname, 'uploads', 'subtitles');

  [uploadDir, cutsDir, audioDir, subtitlesDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}
