import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface PermissionAttributes {
  permission_id: string;
  student_id: string;
  reason: string;
  start_date: Date;
  end_date: Date;
  proof_file?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approval_remarks?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PermissionCreationAttributes extends Optional<PermissionAttributes, 'permission_id' | 'proof_file' | 'approved_by' | 'approval_remarks' | 'created_at' | 'updated_at'> {}

class Permission extends Model<PermissionAttributes, PermissionCreationAttributes> implements PermissionAttributes {
  public permission_id!: string;
  public student_id!: string;
  public reason!: string;
  public start_date!: Date;
  public end_date!: Date;
  public proof_file?: string;
  public status!: 'pending' | 'approved' | 'rejected';
  public approved_by?: string;
  public approval_remarks?: string;
  public created_at!: Date;
  public updated_at!: Date;
}

Permission.init({
  permission_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'student_id'
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 1000]
    }
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isAfterStart(value: Date) {
        if (value <= this.start_date) {
          throw new Error('End date must be after start date');
        }
      }
    }
  },
  proof_file: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'approved', 'rejected']]
    }
  },
  approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  approval_remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Permission',
  tableName: 'permissions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Permission;