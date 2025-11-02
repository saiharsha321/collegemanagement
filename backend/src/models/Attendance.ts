import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface AttendanceAttributes {
  attendance_id: string;
  class_id: string;
  student_id: string;
  date: Date;
  status: 'present' | 'absent' | 'permission_granted' | 'late';
  marked_by?: string;
  permission_id?: string;
  remarks?: string;
  created_at: Date;
}

export interface AttendanceCreationAttributes extends Optional<AttendanceAttributes, 'attendance_id' | 'marked_by' | 'permission_id' | 'remarks' | 'created_at'> {}

class Attendance extends Model<AttendanceAttributes, AttendanceCreationAttributes> implements AttendanceAttributes {
  public attendance_id!: string;
  public class_id!: string;
  public student_id!: string;
  public date!: Date;
  public status!: 'present' | 'absent' | 'permission_granted' | 'late';
  public marked_by?: string;
  public permission_id?: string;
  public remarks?: string;
  public created_at!: Date;
}

Attendance.init({
  attendance_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  class_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'classes',
      key: 'class_id'
    }
  },
  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'student_id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'permission_granted', 'late'),
    allowNull: false,
    validate: {
      isIn: [['present', 'absent', 'permission_granted', 'late']]
    }
  },
  marked_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'faculty',
      key: 'faculty_id'
    }
  },
  permission_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'permissions',
      key: 'permission_id'
    }
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Attendance',
  tableName: 'attendance',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['class_id', 'student_id', 'date'],
      name: 'attendance_unique_class_student_date'
    }
  ]
});

export default Attendance;