import express from 'express';
import { query } from 'express-validator';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import * as attendanceController from '@/controllers/attendanceController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation rules
const getClassesValidation = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  query('semester')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  query('section')
    .optional()
    .isAlphanumeric()
    .withMessage('Section must be alphanumeric')
];

const getStudentAttendanceValidation = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('subject_id')
    .optional()
    .isUUID()
    .withMessage('Invalid subject ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Attendance routes
router.get('/classes', getClassesValidation, validate, attendanceController.getFacultyClasses);
router.post('/mark', authorize('faculty', 'admin'), attendanceController.markAttendance);
router.get('/student/:studentId', getStudentAttendanceValidation, validate, attendanceController.getStudentAttendance);
router.get('/class/:classId/:date', authorize('faculty', 'hod', 'admin'), attendanceController.getClassAttendance);
router.get('/analytics', getStudentAttendanceValidation, validate, attendanceController.getAttendanceAnalytics);

export default router;