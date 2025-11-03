import { Response } from 'express';
import { Achievement, Student, User } from '@/models';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { Op } from 'sequelize';

// Create achievement submission
export const createAchievement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const {
    title,
    type,
    level,
    organization,
    date_of_achievement,
    description
  } = req.body;

  if (currentUser.role !== 'student') {
    throw new AppError('Only students can create achievements', 403);
  }

  // Validate achievement type
  const validTypes = ['academic', 'sports', 'cultural', 'technical', 'social', 'other'];
  if (!validTypes.includes(type)) {
    throw new AppError('Invalid achievement type', 400);
  }

  // Validate achievement level
  const validLevels = ['college', 'university', 'state', 'national', 'international'];
  if (!validLevels.includes(level)) {
    throw new AppError('Invalid achievement level', 400);
  }

  // Validate date
  const achievementDate = new Date(date_of_achievement);
  const today = new Date();
  if (achievementDate > today) {
    throw new AppError('Achievement date cannot be in the future', 400);
  }

  // Get student information
  const student = await Student.findByPk(currentUser.student_id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'name', 'email']
      }
    ]
  });

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  // Create achievement
  const achievement = await Achievement.create({
    student_id: currentUser.student_id,
    title,
    type,
    level,
    organization,
    date_of_achievement: achievementDate,
    description,
    status: 'pending'
  });

  // Get the created achievement with associations
  const createdAchievement = await Achievement.findByPk(achievement.achievement_id, {
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['user_id', 'name', 'email']
          }
        ]
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Achievement submitted successfully',
    data: { achievement: createdAchievement }
  });
});

// Get achievements with filtering
export const getAchievements = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const {
    student_id,
    department_id,
    status,
    type,
    level,
    start_date,
    end_date,
    page = 1,
    limit = 20
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  // Build where clause based on user role
  let whereClause: any = {};

  if (currentUser.role === 'student') {
    // Students can only see their own achievements
    whereClause.student_id = currentUser.student_id;
  } else if (currentUser.role === 'faculty' && currentUser.department_id) {
    // Faculty can see achievements from their department
    const students = await Student.findAll({
      where: { department_id: currentUser.department_id },
      attributes: ['student_id']
    });
    const studentIds = students.map(s => s.student_id);
    whereClause.student_id = { [Op.in]: studentIds };
  } else if (currentUser.role === 'hod' && currentUser.department_id) {
    // HoD can see achievements from their department
    const students = await Student.findAll({
      where: { department_id: currentUser.department_id },
      attributes: ['student_id']
    });
    const studentIds = students.map(s => s.student_id);
    whereClause.student_id = { [Op.in]: studentIds };
  }
  else if (currentUser.role === 'admin') {
    // Admin can see all achievements
    // No filtering needed
  }

  // Apply filters
  if (status) {
    whereClause.status = status;
  }

  if (type) {
    whereClause.type = type;
  }

  if (level) {
    whereClause.level = level;
  }

  if (student_id) {
    whereClause.student_id = student_id;
  }

  if (department_id) {
    const students = await Student.findAll({
      where: { department_id: department_id },
      attributes: ['student_id']
    });
    const studentIds = students.map(s => s.student_id);
    whereClause.student_id = { [Op.in]: studentIds };
  }

  if (start_date || end_date) {
    whereClause.date_of_achievement = {};
    if (start_date) {
      whereClause.date_of achievement[Op.gte] = start_date;
    }
    if (end_date) {
      whereClause.date_of_achievement[Op.lte] = end_date;
    }
  }

  const { count, rows: achievements } = await Achievement.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['user_id', 'name', 'email']
          }
        ]
      },
      {
        model: User,
        as: 'verifiedBy',
        attributes: ['user_id', 'name', 'email'],
        required: false
      }
    ],
    limit: Number(limit),
    offset,
    order: [['created_at', 'DESC']]
  });

  res.json({
    success: true,
    data: {
      achievements,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      }
    }
  });
});

// Get achievement by ID
export const getAchievementById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { achievementId } = req.params;
  const currentUser = req.user!;

  const achievement = await Achievement.findByPk(achievementId, {
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['user_id', 'name', 'email']
          }
        ]
      },
      {
        model: User,
        as: 'verifiedBy',
        attributes: ['user_id', 'name', 'email'],
        required: false
      }
    ]
  });

  if (!achievement) {
    throw new AppError('Achievement not found', 404);
  }

  // Check permissions
  const canView =
    currentUser.role === 'admin' ||
    currentUser.role === 'hod' ||
    (currentUser.role === 'faculty' && achievement.student?.student?.department_id === currentUser.department_id) ||
    (currentUser.role === 'student' && achievement.student_id === currentUser.student_id);

  if (!canView) {
    throw new AppError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { achievement }
  });
});

// Verify or reject achievement
export const verifyAchievement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { achievementId } = req.params;
  const currentUser = req.user!;
  const { status, remarks } = req.body;

  if (!['verified', 'rejected'].includes(status)) {
    throw new AppError('Status must be either verified or rejected', 400);
  }

  // Check permissions
  const canVerify =
    currentUser.role === 'admin' ||
    currentUser.role === 'hod' ||
    (currentUser.role === 'faculty');

  if (!canVerify) {
    throw new AppError('Only Admin, HoD, and Faculty can verify achievements', 403);
  }

  const achievement = await Achievement.findByPk(achievementId);

  if (!achievement) {
    throw new AppError('Achievement not found', 404);
  }

  if (achievement.status !== 'pending') {
    throw new AppError('Achievement has already been processed', 409);
  }

  // Update achievement
  await achievement.update({
    status,
    verified_by: currentUser.user_id,
    verification_remarks: remarks,
    verified_date: new Date()
  });

  // Get updated achievement with associations
  const updatedAchievement = await Achievement.findByPk(achievementId, {
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['user_id', 'name', 'email']
          }
        ]
      },
      {
        model: User,
        as: 'verifiedBy',
        attributes: ['user_id', 'name', 'email']
      }
    ]
  });

  res.json({
    success: true,
    message: `Achievement ${status} successfully`,
    data: { achievement: updatedAchievement }
  });
});

// Get achievement statistics
export const getAchievementStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;

  // Build where clause based on user role
  let whereClause: any = {};

  if (currentUser.role === 'student') {
    whereClause.student_id = currentUser.student_id;
  } else if (currentUser.role === 'faculty' && currentUser.department_id) {
    const students = await Student.findAll({
      where: { department_id: currentUser.department_id },
      attributes: ['student_id']
    });
    const studentIds = students.map(s => s.student_id);
    whereClause.student_id = { [Op.in]: studentIds };
  } else if (currentUser.role === 'hod' && currentUser.department_id) {
    const students = await Student.findAll({
      where: { department_id: currentUser.department_id },
      attributes: ['student_id']
    });
    const studentIds = students.map(s => s.student_id);
    whereClause.student_id = { [Op.in]: studentIds };
  }

  const stats = await Achievement.findAll({
    where: whereClause,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('achievement_id')), 'count'],
      [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN type = 'academic' THEN 1 ELSE 0 END`)), 'academic_count'],
      [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN level = 'college' THEN 1 ELSE 0 END`)), 'college_count'],
      [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN level = 'university' THEN 1 ELSE 0 END`)), 'university_count'],
      [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN level = 'state' THEN 1 ELSE 0 END`)), 'state_count'],
      [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN level = 'national' THEN 1 ELSE 0 END`)), 'national_count'],
      [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN level = 'international' THEN 1 ELSE 0 END`)), 'international_count']
    ],
    group: ['status', 'type', 'level'],
    raw: true
  });

  const formattedStats = stats.reduce((acc: any, stat: any) => {
    acc[`${stat.status}_${stat.type}_${stat.level}`] = parseInt(stat.count);
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      stats: {
        pending: formattedStats.pending_pending || 0,
        verified: formattedStats.verified_verified || 0,
        rejected: formattedStats.rejected_rejected || 0,
        total: Object.values(formattedStats).reduce((sum, count) => sum + count, 0),
        by_type: {
          academic: formattedStats.academic_count || 0,
          sports: formattedStats.sports_count || 0,
          cultural: formattedStats.cultural_count || 0,
          technical: formattedStats.technical_count || 0,
          social: formattedStats.social_count || 0,
          other: formattedStats.other_count || 0
        },
        by_level: {
          college: formattedStats.college_count || 0,
          university: formattedStats.university_count || 0,
          state: formattedStats.state_count || 0,
          national: formattedStats.national_count || 0,
          international: formattedStats.international_count || 0
        }
      }
    }
  });
});

// Get student achievements
export const getStudentAchievements = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { studentId } = req.params;
  const currentUser = req.user!;

  // Check permissions
  const canView =
    currentUser.role === 'admin' ||
    currentUser.role === 'hod' ||
    (currentUser.role === 'faculty' && studentId === currentUser.student_id) ||
    (currentUser.role === 'student' && studentId === currentUser.student_id);

  if (!canView) {
    throw new AppError('Access denied', 403);
  }

  const { page = 1, limit = 20 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  const { count, rows: achievements } = await Achievement.findAndCountAll({
    where: { student_id: studentId },
    include: [
      {
        model: User,
        as: 'verifiedBy',
        attributes: ['user_id', 'name', 'email'],
        required: false
      }
    ],
    limit: Number(limit),
    offset,
    order: [['created_at', 'DESC']]
  });

  res.json({
    success: true,
    data: {
      achievements,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      }
    }
  });
});

// Export achievements data
export const exportAchievements = asyncHandler(async (req: AuthenticatedRequest, res: Request, res) => {
  const currentUser = req.user!;
  const { format = 'excel', department_id, date_range, filters } = req.query;

  // Check permissions (Admin and HoD only)
  const canExport = currentUser.role === 'admin' || currentUser.role === 'hod';

  if (!canExport) {
    throw new AppError('Only Admin and HoD can export achievements', 403);
  }

  // Build where clause
  let whereClause: any = {};

  if (department_id) {
    whereClause.department_id = department_id;
  }

  if (date_range) {
    const { start_date, end_date } = date_range;
    whereClause.date_of_achievement = {
      [Op.gte]: start_date,
      [Op.lte]: end_date
    };
  }

  // If filters provided, parse and apply them
  if (filters) {
    const filtersObj = typeof filters === 'string' ? JSON.parse(filters) : filters;

    if (filtersObj.status) {
      whereClause.status = filtersObj.status;
    }
    if (filtersObj.type) {
      whereClause.type = filtersObj.type;
    }
    if (filtersObj.level) {
      whereClause.level = filtersObj.level;
    }
  }

  const achievements = await Achievement.findAll({
    where: whereClause,
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['user_id', 'name', 'email']
          }
        ]
      },
      {
        model: User,
        as: 'verifiedBy',
        attributes: ['user_id', 'name', 'email'],
        required: false
      }
    ],
    order: [['created_at', 'DESC']]
  });

  // Filter by student if user is student
  let filteredAchievements = achievements;
  if (currentUser.role === 'student') {
    filteredAchievements = achievements.filter(
      achievement => achievement.student_id === currentUser.student_id
    );
  }

  // TODO: Implement actual export functionality
  // For now, return mock data structure
  const exportData = filteredAchievements.map(achievement => ({
    achievement_id: achievement.achievement_id,
    student_name: achievement.student?.user?.name || 'Unknown',
    roll_number: achievement.student?.roll_number || 'Unknown',
    title: achievement.title,
    type: achievement.type,
    level: achievement.level,
    organization: achievement.organization,
    date_of_achievement: achievement.date_of_achievement,
    description: achievement.description,
    status: achievement.status,
    verified_by: achievement.verifiedBy?.name || 'Not verified',
    verified_date: achievement.verified_date || null
  }));

  // Add file download URL if proof file exists
  filteredAchievements = filteredAchievements.map(achievement => ({
    ...achievement,
    proof_url: achievement.proof_file ? `http://localhost:3001/files/${achievement.proof_file}` : null
  }));

  res.json({
    success: true,
    message: 'Achievements exported successfully',
    data: {
      format,
      filename: `achievements_${format}_${new Date().toISOString().split('T')[0]}.${format}`,
      achievements: exportData,
      total: exportData.length
    }
  });
});