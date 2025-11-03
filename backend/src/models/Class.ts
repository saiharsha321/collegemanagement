import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface ClassAttributes {
  class_id: string;
  subject_id: string;
  faculty_id: string;
  semester: number;
  section?: string;
  schedule_day?: number;
  schedule_time?: string;
  room_number?: string;
  created_at: Date;
}

export interface ClassCreationAttributes extends Optional<ClassAttributes, 'class_id' | 'section' | 'schedule_day' | 'schedule_time' | 'room_number' | 'created_at'> {}

class Class extends Model<ClassAttributes, ClassCreationAttributes> implements ClassAttributes {
  public class_id!: string;
  public subject_id!: string;
  public faculty_id!: string;
  public semester!: number;
  public section?: string;
  public schedule_day?: number;
  public schedule_time?: string;
  public room_number?: string;
  public created_at!: Date;
}

Class.init({
  class_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  subject_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'subjects',
      key: 'subject_id'
    }
  },
  faculty_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'faculty',
      key: 'faculty_id'
    }
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 8,
      isInt: true
    }
  },
  section: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      len: [1, 10],
      is: /^[A-Z0-9]+$/
    }
  },
  schedule_day: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 7,
      isInt: true
    }
  },
  schedule_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  room_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      len: [1, 50]
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Class',
  tableName: 'classes',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Class;