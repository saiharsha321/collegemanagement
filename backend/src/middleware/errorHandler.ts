import { Request, Response, NextFunction } from 'express';
import { ValidationError, DatabaseError, UniqueConstraintError, AssociationError } from 'sequelize';
import { AuditLog } from '@/models';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = async (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let details: any = undefined;

  // Log audit error
  try {
    if (req.user) {
      await AuditLog.create({
        user_id: (req.user as any).user_id,
        action: 'ERROR_OCCURRED',
        resource_type: 'API_ERROR',
        new_values: {
          error: message,
          statusCode: statusCode,
          url: req.url,
          method: req.method
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
    }
  } catch (auditError) {
    console.error('Failed to log error audit:', auditError);
  }

  // Handle specific error types
  if (error instanceof ValidationError) {
    statusCode = 400;
    message = 'Validation Error';
    details = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
  } else if (error instanceof UniqueConstraintError) {
    statusCode = 409;
    message = 'Duplicate Entry';
    details = error.errors.map(err => ({
      field: err.path,
      message: `${err.path} already exists`,
      value: err.value
    }));
  } else if (error instanceof DatabaseError) {
    statusCode = 500;
    message = 'Database Error';
    console.error('Database Error:', error);
  } else if (error instanceof AssociationError) {
    statusCode = 400;
    message = 'Invalid Relationship';
    details = { error: error.message };
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid Token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token Expired';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    if (error.message.includes('File too large')) {
      message = 'File size too large';
    } else if (error.message.includes('Unexpected field')) {
      message = 'Invalid file field';
    } else {
      message = 'File upload error';
    }
  }

  // Don't expose stack trace in production
  const stack = process.env.NODE_ENV === 'development' ? error.stack : undefined;

  const response: any = {
    success: false,
    error: message,
    ...(details && { details }),
    ...(stack && { stack })
  };

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};