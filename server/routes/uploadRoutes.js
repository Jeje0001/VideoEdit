import express from 'express';
import { upload } from '../utils/mutlerConfig.js';

const router = express.Router();

router.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const fileUrl = `/uploads/videos/${req.file.filename}`;
  return res.status(200).json({
    success: true,
    filename: req.file.filename,
    url: fileUrl
  });
});

export default router;
