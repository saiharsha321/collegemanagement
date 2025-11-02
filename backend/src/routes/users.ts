import express from 'express';
import { query } from 'express-validator';
import { validate } from '@/middleware/validate';
import { authenticate, authorize, departmentAuthorize } from '@/middleware/auth';
import * as userController from '@/controllers/userController';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Validation rules
const getUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('role')
    .optional()
    .isIn(['admin', 'faculty', 'hod', 'student', 'club_incharge'])
    .withMessage('Invalid role'),
  query('department_id')
    .optional()
    .isUUID()
    .withMessage('Invalid department ID'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

// Routes

// Get users (filtered by role and department)
// Admin: Can access all users
// HoD: Can access users from their department
// Faculty: Limited access to students in their classes
router.get('/', getUsersValidation, validate, userController.getUsers);

// Get user by ID
router.get('/:userId', userController.getUserById);

// Update user
router.put('/:userId', userController.updateUser);

// Deactivate user (Admin only)
router.delete('/:userId', authorize('admin'), userController.deactivateUser);

// Create users (Admin only)
router.post('/', authorize('admin'), userController.createUser);

// Get user statistics
router.get('/stats/dashboard', userController.getUserStats);

export default router;