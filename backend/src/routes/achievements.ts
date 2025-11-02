import express from 'express';
import { authenticate, authorize } from '@/middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Achievement routes (to be implemented with controllers)
router.post('/', authorize('student'), (req, res) => {
  res.json({ success: false, message: 'Achievement routes - Coming soon' });
});

router.get('/', (req, res) => {
  res.json({ success: false, message: 'Achievement routes - Coming soon' });
});

router.put('/:achievementId/verify', authorize('faculty', 'hod', 'admin'), (req, res) => {
  res.json({ success: false, message: 'Achievement routes - Coming soon' });
});

router.get('/export', authorize('hod', 'admin'), (req, res) => {
  res.json({ success: false, message: 'Achievement routes - Coming soon' });
});

export default router;