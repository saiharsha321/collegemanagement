import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface StudentAttributes {
  student_id: string;
  user_id: string;
  department_id: string;
  roll_number: string;
  semester: number;
  section?: string;
  batch_year: number;
  admission_number?: string;
  created_at: Date;
}

export interface StudentCreationAttributes extends Optional<StudentAttributes, 'student_id' | 'section' | 'admission_number' | 'created_at'> {}

class Student extends Model<StudentAttributes, StudentCreationAttributes> implements StudentAttributes {
  public student_id!: string;
  public user_id!: string;
  public department_id!: string;
  public roll_number!: string;
  public semester!: number;
  public section?: string;
  public batch_year!: number;
  public admission_number?: string;
  public created_at!: Date;
}

Student.init({
  student_id: {
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
  roll_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 50]
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
  batch_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 2000,
      max: new Date().getFullYear() + 1,
      isInt: true
    }
  },
  admission_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    validate: {
      len: [1, 100]
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Student',
  tableName: 'students',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Student;