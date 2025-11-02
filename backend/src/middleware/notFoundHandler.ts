import { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.url}`,
    availableRoutes: [
      '/api/auth',
      '/api/users',
      '/api/attendance',
      '/api/permissions',
      '/api/clubs',
      '/api/events',
      '/api/achievements',
      '/api/analytics',
      '/api/files',
      '/api/notifications',
      '/health'
    ]
  });
};