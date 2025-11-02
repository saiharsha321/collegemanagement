import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, Student, Faculty, Department } from '@/models';
import { AppError } from '@/middleware/errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    role: string;
    name: string;
    department_id?: string;
    student_id?: string;
    faculty_id?: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AppError('Access token required', 401);
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get user from database
    const user = await User.findByPk(decoded.user_id, {
      attributes: ['user_id', 'name', 'email', 'role', 'is_active']
    });

    if (!user || !user.is_active) {
      throw new AppError('User not found or inactive', 401);
    }

    // Get additional role-based information
    let additionalInfo: any = {};

    if (user.role === 'student') {
      const student = await Student.findOne({
        where: { user_id: user.user_id },
        attributes: ['student_id', 'department_id']
      });
      if (student) {
        additionalInfo = {
          student_id: student.student_id,
          department_id: student.department_id
        };
      }
    } else if (user.role === 'faculty' || user.role === 'hod') {
      const faculty = await Faculty.findOne({
        where: { user_id: user.user_id },
        attributes: ['faculty_id', 'department_id']
      });
      if (faculty) {
        additionalInfo = {
          faculty_id: faculty.faculty_id,
          department_id: faculty.department_id
        };
      }
    }

    req.user = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name,
      ...additionalInfo
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

export const departmentAuthorize = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Admin can access any department
    if (req.user.role === 'admin') {
      return next();
    }

    // HoD can access their own department
    if (req.user.role === 'hod' && req.user.department_id) {
      return next();
    }

    // Faculty can access their own department
    if (req.user.role === 'faculty' && req.user.department_id) {
      return next();
    }

    // Students can only access their own data
    if (req.user.role === 'student') {
      const requestedStudentId = req.params.studentId || req.params.id;
      if (requestedStudentId && requestedStudentId !== req.user.student_id) {
        return next(new AppError('Access denied', 403));
      }
      return next();
    }

    next(new AppError('Insufficient permissions', 403));
  } catch (error) {
    next(error);
  }
};