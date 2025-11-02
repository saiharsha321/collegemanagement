import express from 'express';
import { authenticate, authorize } from '@/middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Event routes (to be implemented with controllers)
router.post('/', authorize('club_incharge', 'admin'), (req, res) => {
  res.json({ success: false, message: 'Event routes - Coming soon' });
});

router.get('/', (req, res) => {
  res.json({ success: false, message: 'Event routes - Coming soon' });
});

router.get('/:eventId', (req, res) => {
  res.json({ success: false, message: 'Event routes - Coming soon' });
});

router.post('/:eventId/participants', authorize('club_incharge'), (req, res) => {
  res.json({ success: false, message: 'Event routes - Coming soon' });
});

router.get('/:eventId/participants', authorize('club_incharge', 'admin'), (req, res) => {
  res.json({ success: false, message: 'Event routes - Coming soon' });
});

export default router;