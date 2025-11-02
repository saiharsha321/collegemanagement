import sequelize from '@/config/database';
import User from './User';
import Department from './Department';
import Student from './Student';
import Faculty from './Faculty';
import Subject from './Subject';
import Class from './Class';
import Attendance from './Attendance';
import Permission from './Permission';
import Club from './Club';
import Event from './Event';
import EventParticipant from './EventParticipant';
import Achievement from './Achievement';
import AuditLog from './AuditLog';
import Notification from './Notification';

// Define model relationships

// User relationships
User.hasOne(Student, { foreignKey: 'user_id', as: 'studentProfile' });
User.hasOne(Faculty, { foreignKey: 'user_id', as: 'facultyProfile' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

// Department relationships
Department.belongsTo(User, { foreignKey: 'hod_id', as: 'hod' });
Department.hasMany(Student, { foreignKey: 'department_id', as: 'students' });
Department.hasMany(Faculty, { foreignKey: 'department_id', as: 'faculty' });
Department.hasMany(Subject, { foreignKey: 'department_id', as: 'subjects' });
Department.hasMany(Club, { foreignKey: 'department_id', as: 'clubs' });

// Student relationships
Student.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Student.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Student.hasMany(Attendance, { foreignKey: 'student_id', as: 'attendanceRecords' });
Student.hasMany(Permission, { foreignKey: 'student_id', as: 'permissions' });
Student.hasMany(Achievement, { foreignKey: 'student_id', as: 'achievements' });

// Faculty relationships
Faculty.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Faculty.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Faculty.hasMany(Class, { foreignKey: 'faculty_id', as: 'classes' });
Faculty.hasMany(Attendance, { foreignKey: 'marked_by', as: 'markedAttendance' });

// Subject relationships
Subject.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Subject.hasMany(Class, { foreignKey: 'subject_id', as: 'classes' });

// Class relationships
Class.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Class.belongsTo(Faculty, { foreignKey: 'faculty_id', as: 'faculty' });
Class.hasMany(Attendance, { foreignKey: 'class_id', as: 'attendanceRecords' });

// Attendance relationships
Attendance.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Attendance.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Attendance.belongsTo(Faculty, { foreignKey: 'marked_by', as: 'markedByFaculty' });
Attendance.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });

// Permission relationships
Permission.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Permission.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedBy' });
Permission.hasMany(Attendance, { foreignKey: 'permission_id', as: 'attendanceRecords' });

// Club relationships
Club.belongsTo(User, { foreignKey: 'incharge_id', as: 'incharge' });
Club.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Club.hasMany(Event, { foreignKey: 'club_id', as: 'events' });

// Event relationships
Event.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });
Event.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Achievement relationships
Achievement.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Achievement.belongsTo(User, { foreignKey: 'verified_by', as: 'verifiedBy' });

// Database connection and sync
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync all models with database
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

export {
  sequelize,
  connectDatabase,
  User,
  Department,
  Student,
  Faculty,
  Subject,
  Class,
  Attendance,
  Permission,
  Club,
  Event,
  Achievement,
  AuditLog,
  Notification,
};