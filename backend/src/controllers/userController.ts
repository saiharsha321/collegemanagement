import { Response } from 'express';
import { User, Student, Faculty, Department, sequelize } from '@/models';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { Op, Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';

// Get users with filtering and pagination
export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const {
    page = 1,
    limit = 20,
    role,
    department_id,
    search
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  // Build where clause based on user role and filters
  let whereClause: any = { is_active: true };

  // Apply role filter
  if (role) {
    whereClause.role = role;
  }

  // Apply search filter
  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }

  // Apply department-based filtering for non-admin users
  let departmentFilter: any = {};
  if (currentUser.role !== 'admin' && currentUser.department_id) {
    departmentFilter.department_id = currentUser.department_id;
  } else if (department_id && currentUser.role === 'admin') {
    departmentFilter.department_id = department_id;
  }

  // Find users with their role-specific profiles
  const { count, rows: users } = await User.findAndCountAll({
    where: whereClause,
    include: [
      ...(whereClause.role === 'student' || !role ? [{
        model: Student,
        as: 'studentProfile',
        where: Object.keys(departmentFilter).length > 0 ? departmentFilter : undefined,
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name', 'code']
          }
        ]
      }] : []),
      ...(whereClause.role === 'faculty' || whereClause.role === 'hod' || !role ? [{
        model: Faculty,
        as: 'facultyProfile',
        where: Object.keys(departmentFilter).length > 0 ? departmentFilter : undefined,
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name', 'code']
          }
        ]
      }] : [])
    ],
    limit: Number(limit),
    offset,
    order: [['created_at', 'DESC']],
    attributes: ['user_id', 'name', 'email', 'role', 'phone', 'created_at']
  });

  // Format user data
  const formattedUsers = users.map(user => {
    const userData: any = user.toJSON();

    if (userData.studentProfile) {
      userData.student_id = userData.studentProfile.student_id;
      userData.roll_number = userData.studentProfile.roll_number;
      userData.semester = userData.studentProfile.semester;
      userData.section = userData.studentProfile.section;
      userData.batch_year = userData.studentProfile.batch_year;
      userData.department = userData.studentProfile.department;
      delete userData.studentProfile;
    } else if (userData.facultyProfile) {
      userData.faculty_id = userData.facultyProfile.faculty_id;
      userData.employee_id = userData.facultyProfile.employee_id;
      userData.designation = userData.facultyProfile.designation;
      userData.department = userData.facultyProfile.department;
      delete userData.facultyProfile;
    }

    return userData;
  });

  res.json({
    success: true,
    data: {
      users: formattedUsers,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
        hasNext: offset + Number(limit) < count,
        hasPrev: Number(page) > 1
      }
    }
  });
});

// Get user by ID
export const getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const currentUser = req.user!;

  // Find user with role-specific profiles
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Student,
        as: 'studentProfile',
        include: [{ model: Department, as: 'department' }]
      },
      {
        model: Faculty,
        as: 'facultyProfile',
        include: [{ model: Department, as: 'department' }]
      }
    ]
  });

  if (!user || !user.is_active) {
    throw new AppError('User not found', 404);
  }

  // Check access permissions
  if (currentUser.role !== 'admin') {
    // Students can only view their own profile
    if (currentUser.role === 'student' && currentUser.user_id !== userId) {
      throw new AppError('Access denied', 403);
    }

    // HoD and Faculty can only view users from their department
    if ((currentUser.role === 'hod' || currentUser.role === 'faculty') &&
        currentUser.department_id &&
        user.role !== 'admin') {

      const userDepartment = user.studentProfile?.department_id ||
                           user.facultyProfile?.department_id;

      if (userDepartment !== currentUser.department_id) {
        throw new AppError('Access denied', 403);
      }
    }
  }

  // Format user data
  const userData: any = user.toJSON();

  if (userData.studentProfile) {
    userData.student_id = userData.studentProfile.student_id;
    userData.roll_number = userData.studentProfile.roll_number;
    userData.semester = userData.studentProfile.semester;
    userData.section = userData.studentProfile.section;
    userData.batch_year = userData.studentProfile.batch_year;
    userData.admission_number = userData.studentProfile.admission_number;
    userData.department = userData.studentProfile.department;
    delete userData.studentProfile;
  } else if (userData.facultyProfile) {
    userData.faculty_id = userData.facultyProfile.faculty_id;
    userData.employee_id = userData.facultyProfile.employee_id;
    userData.designation = userData.facultyProfile.designation;
    userData.specialization = userData.facultyProfile.specialization;
    userData.department = userData.facultyProfile.department;
    delete userData.facultyProfile;
  }

  res.json({
    success: true,
    data: { user: userData }
  });
});

// Update user
export const updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const currentUser = req.user!;
  const { name, email, phone, role, department_id, additionalInfo } = req.body;

  // Find user
  const user = await User.findByPk(userId);
  if (!user || !user.is_active) {
    throw new AppError('User not found', 404);
  }

  // Check permissions
  if (currentUser.role !== 'admin') {
    // Users can only update their own profile (limited fields)
    if (currentUser.user_id !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Non-admin users cannot change role or department
    if (role || department_id || additionalInfo) {
      throw new AppError('Cannot change role or department', 403);
    }
  }

  // Check for duplicate email if email is being changed
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already exists', 409);
    }
  }

  // Update user
  const userData: any = {};
  if (name) userData.name = name;
  if (email) userData.email = email;
  if (phone !== undefined) userData.phone = phone;
  if (role && currentUser.role === 'admin') userData.role = role;

  await User.update(userData, { where: { user_id: userId } });

  // Update role-specific profile if admin and additional info provided
  if (currentUser.role === 'admin' && additionalInfo) {
    if (user.role === 'student') {
      await Student.update(
        {
          roll_number: additionalInfo.roll_number,
          semester: additionalInfo.semester,
          section: additionalInfo.section,
          batch_year: additionalInfo.batch_year,
          admission_number: additionalInfo.admission_number,
          department_id: department_id || additionalInfo.department_id
        },
        { where: { user_id: userId } }
      );
    } else if (user.role === 'faculty') {
      await Faculty.update(
        {
          employee_id: additionalInfo.employee_id,
          designation: additionalInfo.designation,
          specialization: additionalInfo.specialization,
          department_id: department_id || additionalInfo.department_id
        },
        { where: { user_id: userId } }
      );
    }
  }

  // Get updated user data
  const updatedUser = await User.findByPk(userId, {
    include: [
      {
        model: Student,
        as: 'studentProfile',
        include: [{ model: Department, as: 'department' }]
      },
      {
        model: Faculty,
        as: 'facultyProfile',
        include: [{ model: Department, as: 'department' }]
      }
    ]
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user: updatedUser }
  });
});

// Deactivate user (Admin only)
export const deactivateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const currentUser = req.user!;

  // Prevent self-deactivation
  if (currentUser.user_id === userId) {
    throw new AppError('Cannot deactivate your own account', 400);
  }

  const user = await User.findByPk(userId);
  if (!user || !user.is_active) {
    throw new AppError('User not found', 404);
  }

  await User.update({ is_active: false }, { where: { user_id: userId } });

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
});

// Create user (Admin only)
export const createUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { name, email, password, role, phone, additionalInfo } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password_hash: password,
    role,
    phone
  });

  // Create role-specific profile
  if (role === 'student' && additionalInfo) {
    await Student.create({
      user_id: user.user_id,
      ...additionalInfo
    });
  } else if ((role === 'faculty' || role === 'hod') && additionalInfo) {
    await Faculty.create({
      user_id: user.user_id,
      ...additionalInfo
    });
  }

  // Get created user data
  const createdUser = await User.findByPk(user.user_id, {
    include: [
      {
        model: Student,
        as: 'studentProfile',
        include: [{ model: Department, as: 'department' }]
      },
      {
        model: Faculty,
        as: 'facultyProfile',
        include: [{ model: Department, as: 'department' }]
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user: createdUser }
  });
});

// Get user statistics
export const getUserStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;

  let whereClause: any = { is_active: true };

  // Apply department filter for non-admin users
  if (currentUser.role !== 'admin' && currentUser.department_id) {
    whereClause[Op.or] = [
      {
        '$studentProfile.department_id$': currentUser.department_id
      },
      {
        '$facultyProfile.department_id$': currentUser.department_id
      }
    ];
  }

  const stats = await User.findAll({
    where: whereClause,
    attributes: [
      'role',
      [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']
    ],
    include: [
      {
        model: Student,
        as: 'studentProfile',
        attributes: []
      },
      {
        model: Faculty,
        as: 'facultyProfile',
        attributes: []
      }
    ],
    group: ['role'],
    raw: true
  });

  const formattedStats = stats.reduce((acc: any, stat: any) => {
    acc[stat.role] = parseInt(stat.count);
    return acc;
  }, {});

  res.json({
    success: true,
    data: { stats: formattedStats }
  });
});