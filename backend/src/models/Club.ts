import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface ClubAttributes {
  club_id: string;
  name: string;
  description?: string;
  incharge_id?: string;
  department_id?: string;
  is_active: boolean;
  created_at: Date;
}

export interface ClubCreationAttributes extends Optional<ClubAttributes, 'club_id' | 'description' | 'incharge_id' | 'department_id' | 'created_at'> {}

class Club extends Model<ClubAttributes, ClubCreationAttributes> implements ClubAttributes {
  public club_id!: string;
  public name!: string;
  public description?: string;
  public incharge_id?: string;
  public department_id?: string;
  public is_active!: boolean;
  public created_at!: Date;
}

Club.init({
  club_id: {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  incharge_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'department_id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Club',
  tableName: 'clubs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Club;