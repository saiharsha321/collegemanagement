import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, Student, Faculty, Department } from '@/models';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { Op } from 'sequelize';

// Generate JWT tokens
const generateTokens = (user: any) => {
  const accessToken = jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    {
      user_id: user.user_id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

// Register user
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, phone, additionalInfo } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Validate role
  const validRoles = ['student', 'faculty'];
  if (!validRoles.includes(role)) {
    throw new AppError('Invalid role specified', 400);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password_hash: password, // Will be hashed by model hook
    role,
    phone
  });

  // Create role-specific profile
  if (role === 'student') {
    const { department_id, roll_number, semester, section, batch_year, admission_number } = additionalInfo;

    // Validate department exists
    const department = await Department.findByPk(department_id);
    if (!department) {
      throw new AppError('Department not found', 404);
    }

    // Check for existing roll number
    const existingRollNumber = await Student.findOne({ where: { roll_number } });
    if (existingRollNumber) {
      throw new AppError('Roll number already exists', 409);
    }

    await Student.create({
      user_id: user.user_id,
      department_id,
      roll_number,
      semester,
      section,
      batch_year,
      admission_number
    });
  } else if (role === 'faculty') {
    const { department_id, employee_id, designation, specialization } = additionalInfo;

    // Validate department exists
    const department = await Department.findByPk(department_id);
    if (!department) {
      throw new AppError('Department not found', 404);
    }

    // Check for existing employee ID
    const existingEmployeeId = await Faculty.findOne({ where: { employee_id } });
    if (existingEmployeeId) {
      throw new AppError('Employee ID already exists', 409);
    }

    await Faculty.create({
      user_id: user.user_id,
      department_id,
      employee_id,
      designation,
      specialization
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Get user profile
  const userProfile = await getUserProfile(user.user_id, role);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: userProfile,
      tokens: {
        accessToken,
        refreshToken
      }
    }
  });
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user with role-specific profile
  const user = await User.findOne({
    where: { email, is_active: true },
    include: [
      {
        model: Student,
        as: 'studentProfile',
        include: [{ model: Department, as: 'department', attributes: ['department_id', 'name', 'code'] }]
      },
      {
        model: Faculty,
        as: 'facultyProfile',
        include: [{ model: Department, as: 'department', attributes: ['department_id', 'name', 'code'] }]
      }
    ]
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check password
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Get user profile
  const userProfile = await getUserProfile(user.user_id, user.role);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userProfile,
      tokens: {
        accessToken,
        refreshToken
      }
    }
  });
});

// Refresh token
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token required', 400);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token', 401);
    }

    // Find user
    const user = await User.findByPk(decoded.user_id, {
      where: { is_active: true }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens }
    });
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
});

// Get current user profile
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  const userProfile = await getUserProfile(user.user_id, user.role);

  res.json({
    success: true,
    data: { user: userProfile }
  });
});

// Update profile
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, phone } = req.body;

  // Update user
  const userData: any = {};
  if (name) userData.name = name;
  if (phone !== undefined) userData.phone = phone;

  await User.update(userData, {
    where: { user_id: user.user_id }
  });

  // Get updated profile
  const userProfile = await getUserProfile(user.user_id, user.role);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: userProfile }
  });
});

// Change password
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body;

  // Find user with password
  const userRecord = await User.findByPk(user.user_id);
  if (!userRecord) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isValidPassword = await userRecord.comparePassword(currentPassword);
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update password
  userRecord.password_hash = newPassword; // Will be hashed by model hook
  await userRecord.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// Logout (client-side token removal)
export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Helper function to get user profile
const getUserProfile = async (userId: string, role: string) => {
  const user = await User.findByPk(userId, {
    attributes: ['user_id', 'name', 'email', 'role', 'phone', 'created_at'],
    include: [
      ...(role === 'student' ? [{
        model: Student,
        as: 'studentProfile',
        include: [{ model: Department, as: 'department', attributes: ['department_id', 'name', 'code'] }]
      }] : []),
      ...(role === 'faculty' || role === 'hod' ? [{
        model: Faculty,
        as: 'facultyProfile',
        include: [{ model: Department, as: 'department', attributes: ['department_id', 'name', 'code'] }]
      }] : [])
    ]
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userProfile: any = user.toJSON();

  // Add role-specific information
  if (role === 'student' && userProfile.studentProfile) {
    userProfile.student_id = userProfile.studentProfile.student_id;
    userProfile.department_id = userProfile.studentProfile.department_id;
    userProfile.roll_number = userProfile.studentProfile.roll_number;
    userProfile.semester = userProfile.studentProfile.semester;
    userProfile.section = userProfile.studentProfile.section;
    userProfile.batch_year = userProfile.studentProfile.batch_year;
    userProfile.admission_number = userProfile.studentProfile.admission_number;
    userProfile.department = userProfile.studentProfile.department;
    delete userProfile.studentProfile;
  } else if ((role === 'faculty' || role === 'hod') && userProfile.facultyProfile) {
    userProfile.faculty_id = userProfile.facultyProfile.faculty_id;
    userProfile.department_id = userProfile.facultyProfile.department_id;
    userProfile.employee_id = userProfile.facultyProfile.employee_id;
    userProfile.designation = userProfile.facultyProfile.designation;
    userProfile.specialization = userProfile.facultyProfile.specialization;
    userProfile.department = userProfile.facultyProfile.department;
    delete userProfile.facultyProfile;
  }

  return userProfile;
};