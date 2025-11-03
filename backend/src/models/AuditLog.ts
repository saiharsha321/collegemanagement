import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface AuditLogAttributes {
  log_id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'log_id' | 'user_id' | 'resource_type' | 'resource_id' | 'old_values' | 'new_values' | 'ip_address' | 'user_agent' | 'created_at'> {}

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public log_id!: string;
  public user_id?: string;
  public action!: string;
  public resource_type?: string;
  public resource_id?: string;
  public old_values?: any;
  public new_values?: any;
  public ip_address?: string;
  public user_agent?: string;
  public created_at!: Date;
}

AuditLog.init({
  log_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  resource_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      len: [1, 50]
    }
  },
  resource_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  old_values: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  new_values: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default AuditLog;