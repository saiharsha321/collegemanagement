import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface FacultyAttributes {
  faculty_id: string;
  user_id: string;
  department_id: string;
  employee_id: string;
  designation?: string;
  specialization?: string;
  created_at: Date;
}

export interface FacultyCreationAttributes extends Optional<FacultyAttributes, 'faculty_id' | 'designation' | 'specialization' | 'created_at'> {}

class Faculty extends Model<FacultyAttributes, FacultyCreationAttributes> implements FacultyAttributes {
  public faculty_id!: string;
  public user_id!: string;
  public department_id!: string;
  public employee_id!: string;
  public designation?: string;
  public specialization?: string;
  public created_at!: Date;
}

Faculty.init({
  faculty_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'department_id'
    }
  },
  employee_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  designation: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: [1, 100]
    }
  },
  specialization: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Faculty',
  tableName: 'faculty',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Faculty;