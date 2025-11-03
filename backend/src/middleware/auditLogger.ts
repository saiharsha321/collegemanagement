import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '@/models';

export const auditLogger = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  // Override res.send to capture response
  res.send = function (body) {
    res.locals.responseBody = body;
    return originalSend.call(this, body);
  };

  // Continue to next middleware
  res.on('finish', async () => {
    try {
      // Only log certain types of requests
      const skipLogging = [
        '/health',
        '/api/auth/login',
        '/api/auth/refresh'
      ].some(path => req.url.startsWith(path));

      if (skipLogging) {
        return;
      }

      // Only log successful requests or specific failures
      const shouldLog = res.statusCode < 500 || req.method !== 'GET';

      if (shouldLog && req.user) {
        await AuditLog.create({
          user_id: (req.user as any).user_id,
          action: `${req.method} ${req.url}`,
          resource_type: req.baseUrl?.replace('/api/', '') || 'API',
          resource_id: req.params.id || req.params.user_id || req.params.student_id,
          new_values: {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
      }
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  });

  next();
};