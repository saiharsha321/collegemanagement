import express from 'express';
import { body, query } from 'express-validator';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import * as clubController from '@/controllers/clubController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation rules
const createClubValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Club name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('incharge_id')
    .optional()
    .isUUID()
    .withMessage('Invalid incharge ID'),
  body('department_id')
    .optional()
    .isUUID()
    .withMessage('Invalid department ID')
];

const updateClubValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Club name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('incharge_id')
    .optional()
    .isUUID()
    .withMessage('Invalid incharge ID'),
  body('department_id')
    .optional()
    .isUUID()
    .withMessage('Invalid department ID'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be boolean')
];

const getClubsValidation = [
  query('department_id')
    .optional()
    .isUUID()
    .withMessage('Invalid department ID'),
  query('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be boolean'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Club routes
router.get('/', getClubsValidation, validate, clubController.getClubs);
router.post('/', authorize('admin'), createClubValidation, validate, clubController.createClub);
router.get('/stats', clubController.getClubStats);
router.get('/:clubId', clubController.getClubById);
router.put('/:clubId', updateClubValidation, validate, clubController.updateClub);
router.delete('/:clubId', authorize('admin'), clubController.deleteClub);

export default router;