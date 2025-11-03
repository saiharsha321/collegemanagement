import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface AchievementAttributes {
  achievement_id: string;
  student_id: string;
  title: string;
  type: 'academic' | 'sports' | 'cultural' | 'technical' | 'social' | 'other';
  level: 'college' | 'university' | 'state' | 'national' | 'international';
  organization: string;
  date_of_achievement: Date;
  description?: string;
  proof_file?: string;
  status: 'pending' | 'verified' | 'rejected';
  verified_by?: string;
  verification_remarks?: string;
  verified_date?: Date;
  created_at: Date;
}

export interface AchievementCreationAttributes extends Optional<AchievementAttributes, 'achievement_id' | 'description' | 'proof_file' | 'verified_by' | 'verification_remarks' | 'verified_date' | 'created_at'> {}

class Achievement extends Model<AchievementAttributes, AchievementCreationAttributes> implements AchievementAttributes {
  public achievement_id!: string;
  public student_id!: string;
  public title!: string;
  public type!: 'academic' | 'sports' | 'cultural' | 'technical' | 'social' | 'other';
  public level!: 'college' | 'university' | 'state' | 'national' | 'international';
  public organization!: string;
  public date_of_achievement!: Date;
  public description?: string;
  public proof_file?: string;
  public status!: 'pending' | 'verified' | 'rejected';
  public verified_by?: string;
  public verification_remarks?: string;
  public verified_date?: Date;
  public created_at!: Date;
}

Achievement.init({
  achievement_id: {
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
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  type: {
    type: DataTypes.ENUM('academic', 'sports', 'cultural', 'technical', 'social', 'other'),
    allowNull: false,
    validate: {
      isIn: [['academic', 'sports', 'cultural', 'technical', 'social', 'other']]
    }
  },
  level: {
    type: DataTypes.ENUM('college', 'university', 'state', 'national', 'international'),
    allowNull: false,
    validate: {
      isIn: [['college', 'university', 'state', 'national', 'international']]
    }
  },
  organization: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  date_of_achievement: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isNotFuture(value: Date) {
        if (value > new Date()) {
          throw new Error('Date of achievement cannot be in the future');
        }
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  proof_file: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'verified', 'rejected']]
    }
  },
  verified_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  verification_remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verified_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Achievement',
  tableName: 'achievements',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Achievement;