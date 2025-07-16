import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const downloadsDir = path.join(__dirname, '..', 'downloads');

router.get('/force-download/:filename', (req, res) => {
  const { filename } = req.params;

  // Validate filename to avoid directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).send('Invalid filename');
  }

  const filePath = path.join(downloadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  return res.download(filePath, (err) => {
    if (err) {
      console.error('Download error:', err);
      return res.status(500).send('Failed to download file');
    }
  });
});

export default router;
