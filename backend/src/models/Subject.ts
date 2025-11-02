import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface SubjectAttributes {
  subject_id: string;
  code: string;
  name: string;
  department_id: string;
  semester: number;
  credits: number;
  created_at: Date;
}

export interface SubjectCreationAttributes extends Optional<SubjectAttributes, 'subject_id' | 'created_at'> {}

class Subject extends Model<SubjectAttributes, SubjectCreationAttributes> implements SubjectAttributes {
  public subject_id!: string;
  public code!: string;
  public name!: string;
  public department_id!: string;
  public semester!: number;
  public credits!: number;
  public created_at!: Date;
}

Subject.init({
  subject_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 20],
      is: /^[A-Z0-9_]+$/
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
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
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 8,
      isInt: true
    }
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
      isInt: true
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Subject',
  tableName: 'subjects',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Subject;