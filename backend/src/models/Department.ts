import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface DepartmentAttributes {
  department_id: string;
  name: string;
  code: string;
  hod_id?: string;
  description?: string;
  created_at: Date;
}

export interface DepartmentCreationAttributes extends Optional<DepartmentAttributes, 'department_id' | 'hod_id' | 'description' | 'created_at'> {}

class Department extends Model<DepartmentAttributes, DepartmentCreationAttributes> implements DepartmentAttributes {
  public department_id!: string;
  public name!: string;
  public code!: string;
  public hod_id?: string;
  public description?: string;
  public created_at!: Date;
}

Department.init({
  department_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 50],
      is: /^[A-Z0-9_]+$/
    }
  },
  hod_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Department',
  tableName: 'departments',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Department;