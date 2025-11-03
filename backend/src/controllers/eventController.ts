import { Response } from 'express';
import { Event, Club, Student, EventParticipant, User } from '@/models';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { Op } from 'sequelize';

// Create new event
export const createEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const {
    club_id,
    title,
    description,
    start_date,
    end_date,
    location,
    participant_list
  } = req.body;

  // Check permissions
  const canCreate = currentUser.role === 'admin' ||
                   currentUser.role === 'club_incharge';

  if (!canCreate) {
    throw new AppError('Access denied', 403);
  }

  // Validate club exists and user has permission
  const club = await Club.findByPk(club_id, {
    include: [
      {
        model: User,
        as: 'incharge',
        attributes: ['user_id', 'name', 'email']
      }
    ]
  });

  if (!club) {
    throw new AppError('Club not found', 404);
  }

  // Check if user can create events for this club
  if (currentUser.role === 'club_incharge' && club.incharge_id !== currentUser.user_id) {
    throw new AppError('You can only create events for clubs you manage', 403);
  }

  // Validate dates
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const now = new Date();

  if (startDate < now) {
    throw new AppError('Start date cannot be in the past', 400);
  }

  if (endDate < startDate) {
    throw new AppError('End date must be after start date', 400);
  }

  // Create event
  const event = await Event.create({
    club_id,
    title,
    description,
    start_date: startDate,
    end_date: endDate,
    location,
    created_by: currentUser.user_id
  });

  // If participants are provided, add them to the event
  if (participant_list && Array.isArray(participant_list) && participant_list.length > 0) {
    await addParticipantsToEvent(event.event_id, participant_list, currentUser.user_id);
  }

  // Get the created event with associations
  const createdEvent = await Event.findByPk(event.event_id, {
    include: [
      {
        model: Club,
        as: 'club',
        attributes: ['club_id', 'name'],
        include: [
          {
            model: User,
            as: 'incharge',
            attributes: ['user_id', 'name', 'email']
          }
        ]
      },
      {
        model: User,
        as: 'creator',
        attributes: ['user_id', 'name', 'email']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: { event: createdEvent }
  });
});

// Get events with filtering
export const getEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const {
    club_id,
    status,
    start_date,
    end_date,
    page = 1,
    limit = 20
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  // Build where clause
  let whereClause: any = {};

  if (club_id) {
    whereClause.club_id = club_id;
  }

  if (status) {
    whereClause.status = status;
  }

  if (start_date || end_date) {
    whereClause[Op.and] = [];
    if (start_date) {
      whereClause[Op.and].push({
        start_date: { [Op.gte]: start_date }
      });
    }
    if (end_date) {
      whereClause[Op.and].push({
        end_date: { [Op.lte]: end_date }
      });
    }
  }

  // For non-admin users, filter by accessible clubs
  if (currentUser.role !== 'admin') {
    let accessibleClubIds: string[] = [];

    if (currentUser.role === 'club_incharge') {
      // Club incharges can see events for clubs they manage
      const clubs = await Club.findAll({
        where: { incharge_id: currentUser.user_id },
        attributes: ['club_id']
      });
      accessibleClubIds = clubs.map(c => c.club_id);
    } else if (currentUser.department_id) {
      // Department users can see events from their department
      const clubs = await Club.findAll({
        where: {
          [Op.or]: [
            { department_id: currentUser.department_id },
            { department_id: null }
          ]
        },
        attributes: ['club_id']
      });
      accessibleClubIds = clubs.map(c => c.club_id);
    }

    if (accessibleClubIds.length > 0) {
      if (whereClause.club_id) {
        if (!accessibleClubIds.includes(whereClause.club_id as string)) {
          throw new AppError('Access denied', 403);
        }
      } else {
        whereClause.club_id = { [Op.in]: accessibleClubIds };
      }
    }
  }

  const { count, rows: events } = await Event.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Club,
        as: 'club',
        attributes: ['club_id', 'name']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['user_id', 'name', 'email']
      }
    ],
    limit: Number(limit),
    offset,
    order: [['start_date', 'ASC']]
  });

  res.json({
    success: true,
    data: {
      events,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      }
    }
  });
});

// Get event by ID
export const getEventById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const currentUser = req.user!;

  const event = await Event.findByPk(eventId, {
    include: [
      {
        model: Club,
        as: 'club',
        attributes: ['club_id', 'name'],
        include: [
          {
            model: User,
            as: 'incharge',
            attributes: ['user_id', 'name', 'email']
          }
        ]
      },
      {
        model: User,
        as: 'creator',
        attributes: ['user_id', 'name', 'email']
      }
    ]
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check permissions
  const canView = currentUser.role === 'admin' ||
                 (currentUser.role === 'club_incharge' && event.club.incharge_id === currentUser.user_id) ||
                 (currentUser.department_id && event.club.department_id === currentUser.department_id);

  if (!canView) {
    throw new AppError('Access denied', 403);
  }

  // Get participant count
  const participantCount = await EventParticipant.count({
    where: { event_id: eventId }
  });

  res.json({
    success: true,
    data: {
      event: {
        ...event.toJSON(),
        participant_count: participantCount
      }
    }
  });
});

// Add participants to event
export const addParticipantsToEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const { participants } = req.body;
  const currentUser = req.user!;

  if (!Array.isArray(participants) || participants.length === 0) {
    throw new AppError('Participants array is required', 400);
  }

  // Get event and check permissions
  const event = await Event.findByPk(eventId, {
    include: [
      {
        model: Club,
        as: 'club',
        include: [
          {
            model: User,
            as: 'incharge',
            attributes: ['user_id']
          }
        ]
      }
    ]
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const canManage = currentUser.role === 'admin' ||
                   (currentUser.role === 'club_incharge' && event.club.incharge_id === currentUser.user_id);

  if (!canManage) {
    throw new AppError('Access denied', 403);
  }

  // Add participants
  const addedParticipants = await addParticipantsToEvent(eventId, participants, currentUser.user_id);

  res.json({
    success: true,
    message: `Successfully added ${addedParticipants.length} participants to the event`,
    data: {
      participants_added: addedParticipants.length
    }
  });
});

// Get event participants
export const getEventParticipants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const currentUser = req.user!;
  const { page = 1, limit = 50, status } = req.query;

  // Get event and check permissions
  const event = await Event.findByPk(eventId, {
    include: [
      {
        model: Club,
        as: 'club',
        include: [
          {
            model: User,
            as: 'incharge',
            attributes: ['user_id']
          }
        ]
      }
    ]
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const canView = currentUser.role === 'admin' ||
                 (currentUser.role === 'club_incharge' && event.club.incharge_id === currentUser.user_id) ||
                 (currentUser.department_id && event.club.department_id === currentUser.department_id);

  if (!canView) {
    throw new AppError('Access denied', 403);
  }

  const offset = (Number(page) - 1) * Number(limit);

  // Build where clause
  let whereClause: any = { event_id: eventId };
  if (status) {
    whereClause.status = status;
  }

  const { count, rows: participants } = await EventParticipant.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['user_id', 'name', 'email']
          }
        ]
      }
    ],
    limit: Number(limit),
    offset,
    order: [['created_at', 'ASC']]
  });

  res.json({
    success: true,
    data: {
      participants,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      }
    }
  });
});

// Update event status
export const updateEventStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const { status } = req.body;
  const currentUser = req.user!;

  if (!['upcoming', 'ongoing', 'completed', 'cancelled'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const event = await Event.findByPk(eventId, {
    include: [
      {
        model: Club,
        as: 'club',
        include: [
          {
            model: User,
            as: 'incharge',
            attributes: ['user_id']
          }
        ]
      }
    ]
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const canUpdate = currentUser.role === 'admin' ||
                   (currentUser.role === 'club_incharge' && event.club.incharge_id === currentUser.user_id);

  if (!canUpdate) {
    throw new AppError('Access denied', 403);
  }

  await event.update({ status });

  // If event is completed, mark attended participants
  if (status === 'completed') {
    await EventParticipant.update(
      { status: 'attended' },
      {
        where: {
          event_id: eventId,
          status: 'registered'
        }
      }
    );
  }

  res.json({
    success: true,
    message: `Event status updated to ${status}`,
    data: { event }
  });
});

// Helper function to add participants to event
async function addParticipantsToEvent(eventId: string, participantIds: string[], addedBy: string) {
  const participants = [];

  for (const studentId of participantIds) {
    try {
      // Check if student exists
      const student = await Student.findByPk(studentId);
      if (!student) {
        continue; // Skip invalid student IDs
      }

      // Check if already a participant
      const existing = await EventParticipant.findOne({
        where: {
          event_id: eventId,
          student_id: studentId
        }
      });

      if (!existing) {
        await EventParticipant.create({
          event_id: eventId,
          student_id: studentId,
          status: 'registered'
        });
        participants.push(studentId);
      }
    } catch (error) {
      console.error(`Error adding participant ${studentId}:`, error);
    }
  }

  return participants;
}