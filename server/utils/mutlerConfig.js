import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads/videos');

// ✅ Ensure folder exists before use
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `video-${uniqueSuffix}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /mp4|mov|avi|mkv/;
    const allowedMimeTypes = /video\/.*/;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'));
    }
  }
});

export { uploadDir };
