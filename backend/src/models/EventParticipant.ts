import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface EventParticipantAttributes {
  event_participant_id: string;
  event_id: string;
  student_id: string;
  status: 'registered' | 'attended' | 'absent';
  certificate_earned: boolean;
  created_at: Date;
}

export interface EventParticipantCreationAttributes extends Optional<EventParticipantAttributes, 'event_participant_id' | 'certificate_earned' | 'created_at'> {}

class EventParticipant extends Model<EventParticipantAttributes, EventParticipantCreationAttributes> implements EventParticipantAttributes {
  public event_participant_id!: string;
  public event_id!: string;
  public student_id!: string;
  public status!: 'registered' | 'attended' | 'absent';
  public certificate_earned!: boolean;
  public created_at!: Date;
}

EventParticipant.init({
  event_participant_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  event_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'events',
      key: 'event_id'
    }
  },
  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'student_id'
    }
  },
  status: {
    type: DataTypes.ENUM('registered', 'attended', 'absent'),
    allowNull: false,
    defaultValue: 'registered',
    validate: {
      isIn: [['registered', 'attended', 'absent']]
    }
  },
  certificate_earned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'EventParticipant',
  tableName: 'event_participants',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['event_id', 'student_id'],
      name: 'event_participant_unique_event_student'
    }
  ]
});

export default EventParticipant;