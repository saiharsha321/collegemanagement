import express from 'express';
import { body, query } from 'express-validator';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import * as permissionController from '@/controllers/permissionController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation rules
const createPermissionValidation = [
  body('reason')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Reason must be between 10 and 1000 characters'),
  body('start_date')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('end_date')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

const updatePermissionValidation = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks must be less than 500 characters')
];

const getPermissionsValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid status'),
  query('student_id')
    .optional()
    .isUUID()
    .withMessage('Invalid student ID'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('for_approval')
    .optional()
    .isBoolean()
    .withMessage('for_approval must be boolean'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Permission routes
router.post('/', authorize('student'), createPermissionValidation, validate, permissionController.createPermission);
router.get('/', getPermissionsValidation, validate, permissionController.getPermissions);
router.put('/:permissionId/approve', authorize('faculty', 'hod', 'admin'), updatePermissionValidation, validate, permissionController.updatePermissionStatus);
router.post('/:permissionId/proof', authorize('student'), permissionController.uploadPermissionProof);
router.get('/stats', permissionController.getPermissionStats);

export default router;