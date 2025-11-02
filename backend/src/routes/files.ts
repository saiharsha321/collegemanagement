import express from 'express';
import { body } from 'express-validator';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { uploadSingle } from '@/middleware/upload';
import * as fileController from '@/controllers/fileController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation rules
const uploadValidation = [
  body('type')
    .optional()
    .isIn(['permission', 'achievement', 'event', 'export', 'general'])
    .withMessage('Invalid file type'),
  body('entity_id')
    .optional()
    .isUUID()
    .withMessage('Invalid entity ID')
];

// File management routes
router.post('/upload', uploadSingle('file'), uploadValidation, validate, fileController.uploadFile);
router.get('/:fileId', fileController.getFileInfo);
router.get('/:fileId/download', fileController.downloadFile);
router.delete('/:fileId', fileController.deleteFile);

export default router;