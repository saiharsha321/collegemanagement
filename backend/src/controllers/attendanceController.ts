import { Response } from 'express';
import { Attendance, Class, Student, Subject, Faculty, Permission, User } from '@/models';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { Op, Sequelize, QueryTypes } from 'sequelize';

// Get faculty's class schedule
export const getFacultyClasses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { date, semester, section } = req.query;

  if (currentUser.role !== 'faculty' && currentUser.role !== 'admin' && currentUser.role !== 'hod') {
    throw new AppError('Access denied', 403);
  }

  // Build where clause
  let whereClause: any = {};

  if (currentUser.role === 'faculty') {
    whereClause.faculty_id = currentUser.faculty_id;
  }

  if (date) {
    // Filter by schedule day
    const targetDate = new Date(date as string);
    const dayOfWeek = targetDate.getDay() || 7; // Convert Sunday (0) to 7
    whereClause.schedule_day = dayOfWeek;
  }

  if (semester) {
    whereClause.semester = parseInt(semester as string);
  }

  if (section) {
    whereClause.section = section;
  }

  const classes = await Class.findAll({
    where: whereClause,
    include: [
      {
        model: Subject,
        as: 'subject',
        attributes: ['subject_id', 'code', 'name', 'credits']
      },
      {
        model: Faculty,
        as: 'faculty',
        attributes: ['faculty_id'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }
        ]
      }
    ],
    order: [['schedule_day', 'ASC'], ['schedule_time', 'ASC']]
  });

  // For each class, get attendance status for the specified date
  const targetDate = date ? new Date(date as string) : new Date();
  const dateStr = targetDate.toISOString().split('T')[0];

  const classesWithAttendance = await Promise.all(
    classes.map(async (cls) => {
      const classData = cls.toJSON();

      // Check if attendance is already marked for this date
      const attendanceCount = await Attendance.count({
        where: {
          class_id: cls.class_id,
          date: dateStr
        }
      });

      // Get total students for this class
      const totalStudents = await Student.count({
        where: {
          department_id: cls.subject.department_id,
          semester: cls.semester,
          ...(cls.section && { section: cls.section })
        }
      });

      return {
        ...classData,
        attendanceMarked: attendanceCount > 0,
        totalStudents,
        attendanceRate: totalStudents > 0 ? (attendanceCount / totalStudents) * 100 : 0
      };
    })
  );

  res.json({
    success: true,
    data: {
      classes: classesWithAttendance,
      date: dateStr
    }
  });
});

// Mark attendance for a class
export const markAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { class_id, date, attendance } = req.body;

  if (!Array.isArray(attendance) || attendance.length === 0) {
    throw new AppError('Attendance data is required', 400);
  }

  // Verify class exists and faculty has permission
  const cls = await Class.findByPk(class_id, {
    include: [
      {
        model: Subject,
        as: 'subject'
      }
    ]
  });

  if (!cls) {
    throw new AppError('Class not found', 404);
  }

  // Check permissions
  if (currentUser.role === 'faculty' && cls.faculty_id !== currentUser.faculty_id) {
    throw new AppError('You can only mark attendance for your own classes', 403);
  }

  if (currentUser.role === 'hod' && cls.subject.department_id !== currentUser.department_id) {
    throw new AppError('You can only mark attendance for your department classes', 403);
  }

  const dateStr = date || new Date().toISOString().split('T')[0];

  // Get all students for this class
  const students = await Student.findAll({
    where: {
      department_id: cls.subject.department_id,
      semester: cls.semester,
      ...(cls.section && { section: cls.section })
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'name', 'email']
      }
    ]
  });

  // Check for existing attendance
  const existingAttendance = await Attendance.findAll({
    where: {
      class_id,
      date: dateStr
    }
  });

  if (existingAttendance.length > 0 && currentUser.role !== 'admin') {
    throw new AppError('Attendance already marked for this class and date', 409);
  }

  // Create attendance records
  const attendanceRecords = [];
  const studentMap = new Map(students.map(s => [s.student_id, s]));

  for (const record of attendance) {
    const student = studentMap.get(record.student_id);
    if (!student) {
      continue; // Skip if student not found in class
    }

    // Check for approved permissions
    let finalStatus = record.status;
    let permissionId = null;

    if (record.status === 'absent') {
      // Check if student has approved permission for this date
      const permission = await Permission.findOne({
        where: {
          student_id: record.student_id,
          status: 'approved',
          start_date: { [Op.lte]: dateStr },
          end_date: { [Op.gte]: dateStr }
        }
      });

      if (permission) {
        finalStatus = 'permission_granted';
        permissionId = permission.permission_id;
      }
    }

    attendanceRecords.push({
      class_id,
      student_id: record.student_id,
      date: dateStr,
      status: finalStatus,
      marked_by: currentUser.faculty_id || currentUser.user_id,
      permission_id: permissionId,
      remarks: record.remarks
    });
  }

  // Delete existing attendance if admin is updating
  if (existingAttendance.length > 0 && currentUser.role === 'admin') {
    await Attendance.destroy({
      where: {
        class_id,
        date: dateStr
      }
    });
  }

  // Bulk create attendance records
  const createdAttendance = await Attendance.bulkCreate(attendanceRecords);

  res.status(201).json({
    success: true,
    message: `Attendance marked successfully for ${createdAttendance.length} students`,
    data: {
      markedCount: createdAttendance.length,
      totalStudents: students.length,
      date: dateStr,
      class: {
        class_id: cls.class_id,
        subject: cls.subject.name,
        code: cls.subject.code
      }
    }
  });
});

// Get student attendance history
export const getStudentAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { studentId } = req.params;
  const currentUser = req.user!;
  const { start_date, end_date, subject_id, page = 1, limit = 50 } = req.query;

  // Check permissions
  if (currentUser.role === 'student' && currentUser.student_id !== studentId) {
    throw new AppError('Access denied', 403);
  }

  const offset = (Number(page) - 1) * Number(limit);

  // Build where clause
  let whereClause: any = {
    student_id: studentId
  };

  if (start_date || end_date) {
    whereClause.date = {};
    if (start_date) whereClause.date[Op.gte] = start_date;
    if (end_date) whereClause.date[Op.lte] = end_date;
  }

  // Include subject filter if provided
  let includeClause: any = [
    {
      model: Student,
      as: 'student',
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email']
        }
      ]
    },
    {
      model: Class,
      as: 'class',
      include: [
        {
          model: Subject,
          as: 'subject',
          ...(subject_id && { where: { subject_id } })
        }
      ]
    }
  ];

  const { count, rows: attendanceRecords } = await Attendance.findAndCountAll({
    where: whereClause,
    include: includeClause,
    limit: Number(limit),
    offset,
    order: [['date', 'DESC']]
  });

  // Calculate statistics
  const stats = await Attendance.findOne({
    where: {
      student_id,
      ...(start_date && end_date && {
        date: {
          [Op.between]: [start_date, end_date]
        }
      })
    },
    attributes: [
      [
        Sequelize.fn('COUNT', Sequelize.col('attendance_id')),
        'totalClasses'
      ],
      [
        Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN status = 'present' THEN 1 ELSE 0 END`)),
        'presentCount'
      ],
      [
        Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN status = 'absent' THEN 1 ELSE 0 END`)),
        'absentCount'
      ],
      [
        Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN status = 'permission_granted' THEN 1 ELSE 0 END`)),
        'permissionCount'
      ],
      [
        Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN status = 'late' THEN 1 ELSE 0 END`)),
        'lateCount'
      ]
    ],
    raw: true
  });

  const statistics = stats as any;
  const totalClasses = parseInt(statistics.totalClasses) || 0;
  const presentCount = parseInt(statistics.presentCount) || 0;
  const attendancePercentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

  res.json({
    success: true,
    data: {
      attendance: attendanceRecords,
      statistics: {
        totalClasses,
        presentCount,
        absentCount: parseInt(statistics.absentCount) || 0,
        permissionCount: parseInt(statistics.permissionCount) || 0,
        lateCount: parseInt(statistics.lateCount) || 0,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100
      },
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      }
    }
  });
});

// Get class attendance for specific date
export const getClassAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { classId, date } = req.params;
  const currentUser = req.user!;

  // Verify class exists and check permissions
  const cls = await Class.findByPk(classId, {
    include: [
      {
        model: Subject,
        as: 'subject',
        include: [
          {
            model: Department,
            as: 'department'
          }
        ]
      },
      {
        model: Faculty,
        as: 'faculty',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }
        ]
      }
    ]
  });

  if (!cls) {
    throw new AppError('Class not found', 404);
  }

  // Check permissions
  if (currentUser.role === 'faculty' && cls.faculty_id !== currentUser.faculty_id) {
    throw new AppError('Access denied', 403);
  }

  if (currentUser.role === 'hod' && cls.subject.department_id !== currentUser.department_id) {
    throw new AppError('Access denied', 403);
  }

  // Get all students for this class
  const students = await Student.findAll({
    where: {
      department_id: cls.subject.department_id,
      semester: cls.semester,
      ...(cls.section && { section: cls.section })
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'name', 'email']
      }
    ],
    order: [['roll_number', 'ASC']]
  });

  // Get attendance records for the specified date
  const attendanceRecords = await Attendance.findAll({
    where: {
      class_id: classId,
      date: date
    },
    include: [
      {
        model: Permission,
        as: 'permission',
        attributes: ['permission_id', 'reason', 'start_date', 'end_date', 'status']
      }
    ]
  });

  // Create attendance map
  const attendanceMap = new Map(
    attendanceRecords.map(record => [record.student_id, record])
  );

  // Combine student data with attendance
  const studentsWithAttendance = students.map(student => {
    const attendance = attendanceMap.get(student.student_id);
    return {
      student_id: student.student_id,
      roll_number: student.roll_number,
      name: student.user.name,
      email: student.user.email,
      status: attendance?.status || 'not_marked',
      remarks: attendance?.remarks,
      markedAt: attendance?.created_at,
      permission: attendance?.permission
    };
  });

  // Calculate summary statistics
  const summary = {
    total: studentsWithAttendance.length,
    present: studentsWithAttendance.filter(s => s.status === 'present').length,
    absent: studentsWithAttendance.filter(s => s.status === 'absent').length,
    permission_granted: studentsWithAttendance.filter(s => s.status === 'permission_granted').length,
    late: studentsWithAttendance.filter(s => s.status === 'late').length,
    not_marked: studentsWithAttendance.filter(s => s.status === 'not_marked').length
  };

  res.json({
    success: true,
    data: {
      class: {
        class_id: cls.class_id,
        subject: cls.subject,
        faculty: cls.faculty.user.name,
        schedule: {
          day: cls.schedule_day,
          time: cls.schedule_time,
          room: cls.room_number
        }
      },
      date,
      students: studentsWithAttendance,
      summary
    }
  });
});

// Get attendance analytics for faculty
export const getAttendanceAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { start_date, end_date, subject_id } = req.query;

  if (currentUser.role !== 'faculty' && currentUser.role !== 'hod' && currentUser.role !== 'admin') {
    throw new AppError('Access denied', 403);
  }

  // Build faculty filter
  let facultyFilter = '';
  if (currentUser.role === 'faculty') {
    facultyFilter = `AND c.faculty_id = '${currentUser.faculty_id}'`;
  } else if (currentUser.role === 'hod') {
    facultyFilter = `AND s.department_id = '${currentUser.department_id}'`;
  }

  // Build date filter
  let dateFilter = '';
  if (start_date && end_date) {
    dateFilter = `AND a.date BETWEEN '${start_date}' AND '${end_date}'`;
  }

  // Build subject filter
  let subjectFilter = '';
  if (subject_id) {
    subjectFilter = `AND c.subject_id = '${subject_id}'`;
  }

  // Get attendance trends over time
  const trendsQuery = `
    SELECT
      a.date,
      COUNT(*) as total_classes,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN a.status = 'permission_granted' THEN 1 ELSE 0 END) as permission_count,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
      ROUND(
        (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
      ) as attendance_percentage
    FROM attendance a
    JOIN classes c ON a.class_id = c.class_id
    JOIN subjects s ON c.subject_id = s.subject_id
    WHERE 1=1 ${dateFilter} ${facultyFilter} ${subjectFilter}
    GROUP BY a.date
    ORDER BY a.date DESC
    LIMIT 30
  `;

  const trends = await sequelize.query(trendsQuery, {
    type: QueryTypes.SELECT
  });

  // Get subject-wise attendance
  const subjectQuery = `
    SELECT
      s.subject_id,
      s.code,
      s.name,
      COUNT(*) as total_classes,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN a.status = 'permission_granted' THEN 1 ELSE 0 END) as permission_count,
      ROUND(
        (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
      ) as attendance_percentage
    FROM attendance a
    JOIN classes c ON a.class_id = c.class_id
    JOIN subjects s ON c.subject_id = s.subject_id
    WHERE 1=1 ${dateFilter} ${facultyFilter}
    GROUP BY s.subject_id, s.code, s.name
    ORDER BY attendance_percentage DESC
  `;

  const subjectStats = await sequelize.query(subjectQuery, {
    type: QueryTypes.SELECT
  });

  // Get overall statistics
  const overallQuery = `
    SELECT
      COUNT(*) as total_classes,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN a.status = 'permission_granted' THEN 1 ELSE 0 END) as permission_count,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
      COUNT(DISTINCT a.student_id) as unique_students,
      COUNT(DISTINCT a.class_id) as unique_classes,
      ROUND(
        (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
      ) as overall_attendance_percentage
    FROM attendance a
    JOIN classes c ON a.class_id = c.class_id
    JOIN subjects s ON c.subject_id = s.subject_id
    WHERE 1=1 ${dateFilter} ${facultyFilter}
  `;

  const overallStats = await sequelize.query(overallQuery, {
    type: QueryTypes.SELECT
  });

  res.json({
    success: true,
    data: {
      trends,
      subjectStats,
      overall: overallStats[0] || {}
    }
  });
});