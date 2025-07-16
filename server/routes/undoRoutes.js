import express from 'express';
import path from 'path';

const router = express.Router();

// In-memory stack for each user: { user_id: [filename1, filename2, ...] }
const userStacks = {};

// ============
// Undo Endpoint
// ============
router.post('/undo-edit', (req, res) => {
  const { user_id } = req.body;

  if (!user_id || !userStacks[user_id] || userStacks[user_id].length < 2) {
    return res.status(400).json({ success: false, message: 'No previous version to undo to.' });
  }

  // Remove the most recent edit
  userStacks[user_id].pop();

  const previous = userStacks[user_id][userStacks[user_id].length - 1];

  return res.status(200).json({
    success: true,
    message: 'Undo successful.',
    url: `/uploads/cuts/${previous}`
  });
});

// ============
// Tracking Utility
// ============
export function trackEdit(user_id, filename) {
  if (!userStacks[user_id]) {
    userStacks[user_id] = [];
  }
  userStacks[user_id].push(filename);
}

export default router;
