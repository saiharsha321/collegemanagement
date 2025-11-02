import express from 'express';
import { body, query } from 'express-validator';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import * as eventController from '@/controllers/eventController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation rules
const createEventValidation = [
  body('club_id')
    .isUUID()
    .withMessage('Invalid club ID'),
  body('title')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Event title must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
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
    }),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  body('participant_list')
    .optional()
    .isArray()
    .withMessage('Participant list must be an array')
];

const getEventsValidation = [
  query('club_id')
    .optional()
    .isUUID()
    .withMessage('Invalid club ID'),
  query('status')
    .optional()
    .isIn(['upcoming', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const addParticipantsValidation = [
  body('participants')
    .isArray({ min: 1 })
    .withMessage('Participants must be a non-empty array'),
  body('participants.*')
    .isUUID()
    .withMessage('Invalid participant ID')
];

const updateEventStatusValidation = [
  body('status')
    .isIn(['upcoming', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid status')
];

// Event routes
router.post('/', authorize('club_incharge', 'admin'), createEventValidation, validate, eventController.createEvent);
router.get('/', getEventsValidation, validate, eventController.getEvents);
router.get('/:eventId', eventController.getEventById);
router.post('/:eventId/participants', authorize('club_incharge', 'admin'), addParticipantsValidation, validate, eventController.addParticipantsToEvent);
router.get('/:eventId/participants', getEventsValidation, validate, eventController.getEventParticipants);
router.put('/:eventId/status', updateEventStatusValidation, validate, eventController.updateEventStatus);

export default router;