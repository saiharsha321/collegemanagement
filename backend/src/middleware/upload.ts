import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from './errorHandler';

// Create upload directories if they don't exist
const uploadDir = 'uploads';
const subdirs = ['permissions', 'achievements', 'events', 'exports'];

subdirs.forEach(subdir => {
  const dirPath = path.join(uploadDir, subdir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = req.body.type || 'general';
    let subdir = 'general';

    switch (fileType) {
      case 'permission':
        subdir = 'permissions';
        break;
      case 'achievement':
        subdir = 'achievements';
        break;
      case 'event':
        subdir = 'events';
        break;
      case 'export':
        subdir = 'exports';
        break;
      default:
        subdir = 'general';
    }

    const uploadPath = path.join(uploadDir, subdir);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedTypes = {
    'image/jpeg': true,
    'image/png': true,
    'image/jpg': true,
    'application/pdf': true,
    'text/csv': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
    'application/vnd.ms-excel': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} is not allowed`));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 5 // Maximum 5 files at once
  }
});

// Upload middleware for single file
export const uploadSingle = (fieldName: string = 'file') => {
  return (req: any, res: any, next: any) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('File size too large', 400));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new AppError('Too many files', 400));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new AppError('Unexpected file field', 400));
          }
        }
        return next(err);
      }
      next();
    });
  };
};

// Upload middleware for multiple files
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => {
  return (req: any, res: any, next: any) => {
    upload.array(fieldName, maxCount)(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('File size too large', 400));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new AppError(`Maximum ${maxCount} files allowed`, 400));
          }
        }
        return next(err);
      }
      next();
    });
  };
};

// Helper function to delete uploaded file
export const deleteUploadedFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper function to get file info
export const getFileInfo = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile()
      };
    }
    return { exists: false };
  } catch (error) {
    console.error('Error getting file info:', error);
    return { exists: false };
  }
};

export default upload;