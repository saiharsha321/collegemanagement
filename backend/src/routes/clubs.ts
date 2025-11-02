import express from 'express';
import { authenticate, authorize } from '@/middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Club routes (to be implemented with controllers)
router.get('/', (req, res) => {
  res.json({ success: false, message: 'Club routes - Coming soon' });
});

router.post('/', authorize('admin'), (req, res) => {
  res.json({ success: false, message: 'Club routes - Coming soon' });
});

router.get('/:clubId', (req, res) => {
  res.json({ success: false, message: 'Club routes - Coming soon' });
});

router.put('/:clubId', authorize('admin', 'club_incharge'), (req, res) => {
  res.json({ success: false, message: 'Club routes - Coming soon' });
});

export default router;