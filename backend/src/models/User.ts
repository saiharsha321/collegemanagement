import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import bcrypt from 'bcryptjs';

export interface UserAttributes {
  user_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'faculty' | 'hod' | 'student' | 'club_incharge';
  phone?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'user_id' | 'phone' | 'is_active' | 'created_at' | 'updated_at'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public user_id!: string;
  public name!: string;
  public email!: string;
  public password_hash!: string;
  public role!: 'admin' | 'faculty' | 'hod' | 'student' | 'club_incharge';
  public phone?: string;
  public is_active!: boolean;
  public created_at!: Date;
  public updated_at!: Date;

  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash);
  }

  public toJSON(): Partial<UserAttributes> {
    const values = Object.assign({}, this.get()) as UserAttributes;
    delete values.password_hash;
    return values;
  }
}

User.init({
  user_id: {
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
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255]
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'faculty', 'hod', 'student', 'club_incharge'),
    allowNull: false,
    validate: {
      isIn: [['admin', 'faculty', 'hod', 'student', 'club_incharge']]
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[+]?[\d\s\-\(\)]+$/
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user: User) => {
      if (user.password_hash) {
        const salt = await bcrypt.genSalt(12);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    },
    beforeUpdate: async (user: User) => {
      if (user.changed('password_hash')) {
        const salt = await bcrypt.genSalt(12);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    }
  }
});

export default User;