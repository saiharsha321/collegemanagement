import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { deleteUploadedFile, getFileInfo } from '@/middleware/upload';

// Upload file
export const uploadFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const { type, entity_id } = req.body;
  const currentUser = req.user!;

  // Validate file type based on user role and context
  const allowedTypes = getUserAllowedFileTypes(currentUser.role);
  if (!allowedTypes.includes(req.file.mimetype)) {
    // Delete the uploaded file
    deleteUploadedFile(req.file.path);
    throw new AppError(`File type ${req.file.mimetype} is not allowed for your role`, 400);
  }

  // Create file record in database (if needed)
  const fileInfo = {
    file_id: req.file.filename, // Using filename as ID for simplicity
    original_name: req.file.originalname,
    file_path: req.file.path,
    file_size: req.file.size,
    mime_type: req.file.mimetype,
    upload_date: new Date(),
    uploaded_by: currentUser.user_id,
    type: type || 'general',
    entity_id: entity_id || null
  };

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: fileInfo
  });
});

// Download file
export const downloadFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const currentUser = req.user!;

  // Construct file path
  const possiblePaths = [
    path.join('uploads', 'permissions', fileId),
    path.join('uploads', 'achievements', fileId),
    path.join('uploads', 'events', fileId),
    path.join('uploads', 'exports', fileId),
    path.join('uploads', fileId)
  ];

  let filePath = '';
  let found = false;

  for (const possiblePath of possiblePaths) {
    const info = getFileInfo(possiblePath);
    if (info.exists) {
      filePath = possiblePath;
      found = true;
      break;
    }
  }

  if (!found) {
    throw new AppError('File not found', 404);
  }

  // Check if user has permission to access this file
  // In a real implementation, you would check file ownership and permissions
  // For now, we'll allow all authenticated users to download

  // Set appropriate headers
  const filename = path.basename(filePath);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  // Send file
  res.sendFile(path.resolve(filePath), (err) => {
    if (err) {
      console.error('Error sending file:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error downloading file'
        });
      }
    }
  });
});

// Delete file
export const deleteFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const currentUser = req.user!;

  // Construct possible file paths
  const possiblePaths = [
    path.join('uploads', 'permissions', fileId),
    path.join('uploads', 'achievements', fileId),
    path.join('uploads', 'events', fileId),
    path.join('uploads', 'exports', fileId),
    path.join('uploads', fileId)
  ];

  let deleted = false;
  let deletedPath = '';

  for (const possiblePath of possiblePaths) {
    if (deleteUploadedFile(possiblePath)) {
      deleted = true;
      deletedPath = possiblePath;
      break;
    }
  }

  if (!deleted) {
    throw new AppError('File not found', 404);
  }

  // In a real implementation, you would also delete the file record from database
  // and check if the user has permission to delete this file

  res.json({
    success: true,
    message: 'File deleted successfully'
  });
});

// Get file information
export const getFileInfo = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const currentUser = req.user!;

  // Construct possible file paths
  const possiblePaths = [
    path.join('uploads', 'permissions', fileId),
    path.join('uploads', 'achievements', fileId),
    path.join('uploads', 'events', fileId),
    path.join('uploads', 'exports', fileId),
    path.join('uploads', fileId)
  ];

  let fileInfo = null;
  let filePath = '';

  for (const possiblePath of possiblePaths) {
    const info = getFileInfo(possiblePath);
    if (info.exists) {
      filePath = possiblePath;
      fileInfo = {
        file_id: fileId,
        file_path: possiblePath,
        file_size: info.size,
        created: info.created,
        modified: info.modified,
        mime_type: getMimeType(filePath)
      };
      break;
    }
  }

  if (!fileInfo) {
    throw new AppError('File not found', 404);
  }

  // Check if user has permission to access this file
  // In a real implementation, you would check file ownership and permissions

  res.json({
    success: true,
    data: { file: fileInfo }
  });
});

// Helper function to get allowed file types by user role
function getUserAllowedFileTypes(role: string): string[] {
  const baseTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ];

  switch (role) {
    case 'admin':
      return [
        ...baseTypes,
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
    case 'faculty':
    case 'hod':
      return [
        ...baseTypes,
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
    case 'student':
      return baseTypes;
    case 'club_incharge':
      return [
        ...baseTypes,
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
    default:
      return baseTypes;
  }
}

// Helper function to get MIME type from file extension
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.csv': 'text/csv',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}