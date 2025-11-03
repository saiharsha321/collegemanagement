import express from 'express';
import { authenticate } from '@/middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Notification routes (to be implemented with controllers)
router.get('/', (req, res) => {
  res.json({ success: false, message: 'Notification routes - Coming soon' });
});

router.put('/:notificationId/read', (req, res) => {
  res.json({ success: false, message: 'Notification routes - Coming soon' });
});

router.post('/send', (req, res) => {
  res.json({ success: false, message: 'Notification routes - Coming soon' });
});

export default router;