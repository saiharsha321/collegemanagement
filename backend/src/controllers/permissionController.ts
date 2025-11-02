import { Response } from 'express';
import { Permission, Student, User, Attendance } from '@/models';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { Op } from 'sequelize';
import sequelize from '@/config/database';

// Create permission request
export const createPermission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { reason, start_date, end_date } = req.body;

  if (currentUser.role !== 'student') {
    throw new AppError('Only students can create permission requests', 403);
  }

  // Validate date range
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    throw new AppError('Start date cannot be in the past', 400);
  }

  if (endDate < startDate) {
    throw new AppError('End date must be after start date', 400);
  }

  // Check for overlapping permissions
  const existingPermission = await Permission.findOne({
    where: {
      student_id: currentUser.student_id,
      status: { [Op.in]: ['pending', 'approved'] },
      [Op.or]: [
        {
          start_date: { [Op.lte]: start_date },
          end_date: { [Op.gte]: start_date }
        },
        {
          start_date: { [Op.lte]: end_date },
          end_date: { [Op.gte]: end_date }
        },
        {
          start_date: { [Op.gte]: start_date },
          end_date: { [Op.lte]: end_date }
        }
      ]
    }
  });

  if (existingPermission) {
    throw new AppError('You already have a permission request for this period', 409);
  }

  // Create permission request
  const permission = await Permission.create({
    student_id: currentUser.student_id,
    reason,
    start_date: startDate,
    end_date: endDate,
    status: 'pending'
  });

  // Get student details for response
  const student = await Student.findByPk(currentUser.student_id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['name', 'email']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Permission request created successfully',
    data: {
      permission: {
        ...permission.toJSON(),
        student: student?.user
      }
    }
  });
});

// Get permission requests with filtering
export const getPermissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const {
    status,
    student_id,
    start_date,
    end_date,
    for_approval,
    page = 1,
    limit = 20
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  // Build where clause based on user role and filters
  let whereClause: any = {};

  // Apply status filter
  if (status) {
    whereClause.status = status;
  }

  // Apply date range filter
  if (start_date || end_date) {
    whereClause[Op.and] = [];
    if (start_date) {
      whereClause[Op.and].push({
        start_date: { [Op.gte]: start_date }
      });
    }
    if (end_date) {
      whereClause[Op.and].push({
        end_date: { [Op.lte]: end_date }
      });
    }
  }

  // Apply role-based filtering
  if (currentUser.role === 'student') {
    // Students can only see their own permissions
    whereClause.student_id = currentUser.student_id;
  } else if (currentUser.role === 'faculty' || currentUser.role === 'hod' || currentUser.role === 'admin') {
    // Faculty/HoD/Admin can filter by student
    if (student_id) {
      whereClause.student_id = student_id;
    }

    // If for_approval is true, only show pending permissions
    if (for_approval === 'true') {
      whereClause.status = 'pending';

      // Faculty can only see permissions from their department
      if (currentUser.role === 'faculty' && currentUser.department_id) {
        const students = await Student.findAll({
          where: { department_id: currentUser.department_id },
          attributes: ['student_id']
        });
        const studentIds = students.map(s => s.student_id);
        whereClause.student_id = { [Op.in]: studentIds };
      }

      // HoD can only see permissions from their department
      if (currentUser.role === 'hod' && currentUser.department_id) {
        const students = await Student.findAll({
          where: { department_id: currentUser.department_id },
          attributes: ['student_id']
        });
        const studentIds = students.map(s => s.student_id);
        whereClause.student_id = { [Op.in]: studentIds };
      }
    }
  }

  const { count, rows: permissions } = await Permission.findAndCountAll({
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
        as: 'approvedBy',
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
      permissions,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      }
    }
  });
});

// Approve or reject permission request
export const updatePermissionStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { permissionId } = req.params;
  const { status, remarks } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('Status must be either approved or rejected', 400);
  }

  // Find permission
  const permission = await Permission.findByPk(permissionId, {
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

  if (!permission) {
    throw new AppError('Permission not found', 404);
  }

  if (permission.status !== 'pending') {
    throw new AppError('Permission has already been processed', 409);
  }

  // Check permissions
  if (currentUser.role === 'student') {
    throw new AppError('Students cannot approve permissions', 403);
  }

  // Faculty can only approve permissions from their department
  if (currentUser.role === 'faculty' && currentUser.department_id) {
    if (permission.student.department_id !== currentUser.department_id) {
      throw new AppError('You can only approve permissions from your department', 403);
    }
  }

  // HoD can only approve permissions from their department
  if (currentUser.role === 'hod' && currentUser.department_id) {
    if (permission.student.department_id !== currentUser.department_id) {
      throw new AppError('You can only approve permissions from your department', 403);
    }
  }

  // Update permission
  await permission.update({
    status,
    approved_by: currentUser.user_id,
    approval_remarks: remarks,
    updated_at: new Date()
  });

  // If approved, update attendance records
  if (status === 'approved') {
    await updateAttendanceForApprovedPermission(permission);
  }

  res.json({
    success: true,
    message: `Permission ${status} successfully`,
    data: {
      permission: {
        ...permission.toJSON(),
        approvedBy: {
          user_id: currentUser.user_id,
          name: currentUser.name
        }
      }
    }
  });
});

// Upload permission proof document
export const uploadPermissionProof = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { permissionId } = req.params;

  if (currentUser.role !== 'student') {
    throw new AppError('Only students can upload permission proofs', 403);
  }

  // Find permission
  const permission = await Permission.findByPk(permissionId);

  if (!permission) {
    throw new AppError('Permission not found', 404);
  }

  if (permission.student_id !== currentUser.student_id) {
    throw new AppError('You can only upload proofs for your own permissions', 403);
  }

  if (permission.status !== 'pending') {
    throw new AppError('Proofs can only be uploaded for pending permissions', 409);
  }

  // Handle file upload
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  // In a real implementation, you would save the file to storage
  // For now, we'll just update the database with the file path
  const filePath = `/uploads/permissions/${req.file.filename}`;

  await permission.update({
    proof_file: filePath,
    updated_at: new Date()
  });

  res.json({
    success: true,
    message: 'Proof uploaded successfully',
    data: {
      proof_file: filePath
    }
  });
});

// Get permission statistics
export const getPermissionStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;

  // Build where clause based on user role
  let whereClause: any = {};

  if (currentUser.role === 'student') {
    whereClause.student_id = currentUser.student_id;
  } else if (currentUser.role === 'faculty' || currentUser.role === 'hod') {
    if (currentUser.department_id) {
      const students = await Student.findAll({
        where: { department_id: currentUser.department_id },
        attributes: ['student_id']
      });
      const studentIds = students.map(s => s.student_id);
      whereClause.student_id = { [Op.in]: studentIds };
    }
  }

  const stats = await Permission.findAll({
    where: whereClause,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('permission_id')), 'count']
    ],
    group: ['status'],
    raw: true
  });

  const formattedStats = stats.reduce((acc: any, stat: any) => {
    acc[stat.status] = parseInt(stat.count);
    return acc;
  }, {});

  // Get recent trends (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trends = await Permission.findAll({
    where: {
      ...whereClause,
      created_at: { [Op.gte]: thirtyDaysAgo }
    },
    attributes: [
      [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
      [sequelize.fn('COUNT', sequelize.col('permission_id')), 'count']
    ],
    group: [sequelize.fn('DATE', sequelize.col('created_at'))],
    order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
    limit: 30,
    raw: true
  });

  res.json({
    success: true,
    data: {
      stats: {
        pending: formattedStats.pending || 0,
        approved: formattedStats.approved || 0,
        rejected: formattedStats.rejected || 0,
        total: Object.values(formattedStats).reduce((sum: number, count: number) => sum + count, 0)
      },
      trends
    }
  });
});

// Helper function to update attendance for approved permissions
async function updateAttendanceForApprovedPermission(permission: any) {
  const transaction = await sequelize.transaction();

  try {
    // Get classes that fall within the permission date range
    const classes = await sequelize.query(`
      SELECT DISTINCT c.class_id, c.date
      FROM classes c
      WHERE c.date BETWEEN :start_date AND :end_date
    `, {
      replacements: {
        start_date: permission.start_date,
        end_date: permission.end_date
      },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    // Update or create attendance records
    for (const cls of classes) {
      await Attendance.findOrCreate({
        where: {
          class_id: cls.class_id,
          student_id: permission.student_id,
          date: cls.date
        },
        defaults: {
          status: 'permission_granted',
          permission_id: permission.permission_id,
          remarks: `Permission granted: ${permission.reason.substring(0, 100)}`
        },
        transaction
      });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating attendance for permission:', error);
  }
}