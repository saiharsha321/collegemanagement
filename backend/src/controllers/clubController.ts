import { Response } from 'express';
import { Club, Department, User, Event } from '@/models';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { Op, Sequelize } from 'sequelize';
import sequelize from '@/config/database';

// Get all clubs
export const getClubs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { department_id, is_active, page = 1, limit = 20 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  // Build where clause
  let whereClause: any = {};

  if (is_active !== undefined) {
    whereClause.is_active = is_active === 'true';
  }

  // Filter by department for non-admin users
  if (currentUser.role !== 'admin' && currentUser.department_id) {
    whereClause[Op.or] = [
      { department_id: currentUser.department_id },
      { department_id: null } // Include college-wide clubs
    ];
  } else if (department_id) {
    whereClause.department_id = department_id;
  }

  const { count, rows: clubs } = await Club.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'code']
      },
      {
        model: User,
        as: 'incharge',
        attributes: ['user_id', 'name', 'email']
      }
    ],
    limit: Number(limit),
    offset,
    order: [['name', 'ASC']]
  });

  res.json({
    success: true,
    data: {
      clubs,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      }
    }
  });
});

// Create new club (Admin only)
export const createClub = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { name, description, incharge_id, department_id } = req.body;

  if (currentUser.role !== 'admin') {
    throw new AppError('Only administrators can create clubs', 403);
  }

  // Check if club name already exists
  const existingClub = await Club.findOne({ where: { name } });
  if (existingClub) {
    throw new AppError('Club with this name already exists', 409);
  }

  // Validate incharge exists and is appropriate role
  if (incharge_id) {
    const incharge = await User.findByPk(incharge_id);
    if (!incharge) {
      throw new AppError('Incharge not found', 404);
    }

    if (!['admin', 'faculty', 'hod', 'club_incharge'].includes(incharge.role)) {
      throw new AppError('Invalid incharge role', 400);
    }
  }

  // Validate department exists if specified
  if (department_id) {
    const department = await Department.findByPk(department_id);
    if (!department) {
      throw new AppError('Department not found', 404);
    }
  }

  const club = await Club.create({
    name,
    description,
    incharge_id,
    department_id
  });

  // Get the created club with associations
  const createdClub = await Club.findByPk(club.club_id, {
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'code']
      },
      {
        model: User,
        as: 'incharge',
        attributes: ['user_id', 'name', 'email']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Club created successfully',
    data: { club: createdClub }
  });
});

// Get club by ID
export const getClubById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { clubId } = req.params;
  const currentUser = req.user!;

  const club = await Club.findByPk(clubId, {
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'code']
      },
      {
        model: User,
        as: 'incharge',
        attributes: ['user_id', 'name', 'email']
      }
    ]
  });

  if (!club) {
    throw new AppError('Club not found', 404);
  }

  // Check permissions for department-specific clubs
  if (currentUser.role !== 'admin' && club.department_id) {
    if (currentUser.role === 'student' && currentUser.department_id !== club.department_id) {
      throw new AppError('Access denied', 403);
    }
    if ((currentUser.role === 'faculty' || currentUser.role === 'hod') &&
        currentUser.department_id !== club.department_id) {
      throw new AppError('Access denied', 403);
    }
  }

  // Get club statistics
  const stats = await Event.findOne({
    where: { club_id: clubId },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('event_id')), 'total_events'],
      [sequelize.fn('SUM', sequelize.literal(`CASE WHEN status = 'completed' THEN 1 ELSE 0 END`)), 'completed_events'],
      [sequelize.fn('SUM', sequelize.literal(`CASE WHEN status = 'upcoming' THEN 1 ELSE 0 END`)), 'upcoming_events']
    ],
    raw: true
  });

  res.json({
    success: true,
    data: {
      club: {
        ...club.toJSON(),
        stats: stats || {
          total_events: 0,
          completed_events: 0,
          upcoming_events: 0
        }
      }
    }
  });
});

// Update club
export const updateClub = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { clubId } = req.params;
  const currentUser = req.user!;
  const { name, description, incharge_id, department_id, is_active } = req.body;

  const club = await Club.findByPk(clubId);
  if (!club) {
    throw new AppError('Club not found', 404);
  }

  // Check permissions
  const canEdit = currentUser.role === 'admin' ||
                 (currentUser.role === 'club_incharge' && club.incharge_id === currentUser.user_id) ||
                 (currentUser.role === 'hod' && club.department_id === currentUser.department_id);

  if (!canEdit) {
    throw new AppError('Access denied', 403);
  }

  // Check for duplicate name if being changed
  if (name && name !== club.name) {
    const existingClub = await Club.findOne({ where: { name } });
    if (existingClub) {
      throw new AppError('Club with this name already exists', 409);
    }
  }

  // Validate incharge if being changed
  if (incharge_id && incharge_id !== club.incharge_id) {
    const incharge = await User.findByPk(incharge_id);
    if (!incharge) {
      throw new AppError('Incharge not found', 404);
    }

    if (!['admin', 'faculty', 'hod', 'club_incharge'].includes(incharge.role)) {
      throw new AppError('Invalid incharge role', 400);
    }
  }

  // Validate department if being changed
  if (department_id && department_id !== club.department_id) {
    const department = await Department.findByPk(department_id);
    if (!department) {
      throw new AppError('Department not found', 404);
    }
  }

  // Update club
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (incharge_id !== undefined) updateData.incharge_id = incharge_id;
  if (department_id !== undefined) updateData.department_id = department_id;
  if (is_active !== undefined) updateData.is_active = is_active;

  await club.update(updateData);

  // Get updated club with associations
  const updatedClub = await Club.findByPk(clubId, {
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'code']
      },
      {
        model: User,
        as: 'incharge',
        attributes: ['user_id', 'name', 'email']
      }
    ]
  });

  res.json({
    success: true,
    message: 'Club updated successfully',
    data: { club: updatedClub }
  });
});

// Delete club (Admin only)
export const deleteClub = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { clubId } = req.params;
  const currentUser = req.user!;

  if (currentUser.role !== 'admin') {
    throw new AppError('Only administrators can delete clubs', 403);
  }

  const club = await Club.findByPk(clubId);
  if (!club) {
    throw new AppError('Club not found', 404);
  }

  // Check if club has events
  const eventCount = await Event.count({ where: { club_id: clubId } });
  if (eventCount > 0) {
    throw new AppError('Cannot delete club with existing events', 400);
  }

  await club.destroy();

  res.json({
    success: true,
    message: 'Club deleted successfully'
  });
});

// Get club statistics
export const getClubStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;

  // Build where clause based on user role
  let whereClause: any = {};

  if (currentUser.role !== 'admin') {
    if (currentUser.department_id) {
      whereClause[Op.or] = [
        { department_id: currentUser.department_id },
        { department_id: null }
      ];
    }
  }

  const stats = await Club.findAll({
    where: whereClause,
    attributes: [
      'is_active',
      [sequelize.fn('COUNT', sequelize.col('club_id')), 'count']
    ],
    group: ['is_active'],
    raw: true
  });

  const formattedStats = stats.reduce((acc: any, stat: any) => {
    acc[stat.is_active ? 'active' : 'inactive'] = parseInt(stat.count);
    return acc;
  }, {});

  // Get department-wise stats
  const departmentStats = await Club.findAll({
    where: whereClause,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name']
      }
    ],
    attributes: [
      'department_id',
      [sequelize.fn('COUNT', sequelize.col('club_id')), 'count']
    ],
    group: ['department_id', 'department.department_id'],
    raw: true
  });

  res.json({
    success: true,
    data: {
      stats: {
        active: formattedStats.active || 0,
        inactive: formattedStats.inactive || 0,
        total: (formattedStats.active || 0) + (formattedStats.inactive || 0)
      },
      departmentStats
    }
  });
});