import { ActivityLog } from '../models/ActivityLog.js';

export const logActivity = async ({
  organizationId,
  tenantId,
  boardId = null,
  actorId,
  action,
  resourceType,
  resourceId = null,
  metadata = {},
  io = null
}) => {
  try {
    const activity = await ActivityLog.create({
      organizationId,
      tenantId,
      boardId,
      actorId,
      action,
      resourceType,
      resourceId,
      metadata
    });

    const populated = await ActivityLog.findById(activity._id)
      .populate('actorId', 'name email avatar');

    // Broadcast to tenant or board room via Socket.IO if io instance is provided
    if (io) {
      if (boardId) {
        io.to(`board:${boardId}`).emit('activity:created', populated);
      }
      io.to(`tenant:${tenantId}`).emit('tenant:activity', populated);
    }

    return populated;
  } catch (error) {
    console.error('[ActivityLog Error]: Failed to log activity', error);
    // Don't throw to avoid interrupting the main business transaction
    return null;
  }
};
