import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface EventAttributes {
  event_id: string;
  club_id: string;
  title: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  location?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  participant_list_file?: string;
  created_by: string;
  created_at: Date;
}

export interface EventCreationAttributes extends Optional<EventAttributes, 'event_id' | 'description' | 'location' | 'participant_list_file' | 'created_at'> {}

class Event extends Model<EventAttributes, EventCreationAttributes> implements EventAttributes {
  public event_id!: string;
  public club_id!: string;
  public title!: string;
  public description?: string;
  public start_date!: Date;
  public end_date!: Date;
  public location?: string;
  public status!: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  public participant_list_file?: string;
  public created_by!: string;
  public created_at!: Date;
}

Event.init({
  event_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  club_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'clubs',
      key: 'club_id'
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isFuture(value: Date) {
        if (value < new Date()) {
          throw new Error('Start date must be in the future');
        }
      }
    }
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfterStart(value: Date) {
        if (value <= this.start_date) {
          throw new Error('End date must be after start date');
        }
      }
    }
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      len: [1, 255]
    }
  },
  status: {
    type: DataTypes.ENUM('upcoming', 'ongoing', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'upcoming',
    validate: {
      isIn: [['upcoming', 'ongoing', 'completed', 'cancelled']]
    }
  },
  participant_list_file: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Event',
  tableName: 'events',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Event;