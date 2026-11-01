import { Column } from '../models/Column.js';
import { Task } from '../models/Task.js';
import { NotFoundError } from '../utils/errors.js';
import { logActivity } from '../services/activityService.js';

export const createColumn = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { name, position } = req.body;

    let colPosition = position;
    if (colPosition === undefined) {
      const lastCol = await Column.findOne({ boardId, tenantId: req.tenant._id }).sort({ position: -1 });
      colPosition = lastCol ? lastCol.position + 1 : 0;
    }

    const column = await Column.create({
      name,
      boardId,
      tenantId: req.tenant._id,
      position: colPosition
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('column:created', column);
    }

    await logActivity({
      organizationId: req.organizationId,
      tenantId: req.tenant._id,
      boardId,
      actorId: req.user._id,
      action: 'COLUMN_CREATED',
      resourceType: 'column',
      resourceId: column._id,
      metadata: { columnName: column.name },
      io
    });

    res.status(201).json({
      status: 'success',
      column
    });
  } catch (error) {
    next(error);
  }
};

export const updateColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const { name, position } = req.body;

    const column = await Column.findOneAndUpdate(
      { _id: columnId, tenantId: req.tenant._id },
      { ...(name && { name }), ...(position !== undefined && { position }) },
      { new: true, runValidators: true }
    );

    if (!column) {
      return next(new NotFoundError('Column not found in this branch'));
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${column.boardId}`).emit('column:updated', column);
    }

    res.json({
      status: 'success',
      column
    });
  } catch (error) {
    next(error);
  }
};

export const deleteColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;

    const column = await Column.findOneAndDelete({ _id: columnId, tenantId: req.tenant._id });
    if (!column) {
      return next(new NotFoundError('Column not found in this branch'));
    }

    // Delete tasks inside column scoped to tenant
    await Task.deleteMany({ columnId, tenantId: req.tenant._id });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${column.boardId}`).emit('column:deleted', { columnId, boardId: column.boardId });
    }

    await logActivity({
      organizationId: req.organizationId,
      tenantId: req.tenant._id,
      boardId: column.boardId,
      actorId: req.user._id,
      action: 'COLUMN_DELETED',
      resourceType: 'column',
      resourceId: column._id,
      metadata: { columnName: column.name },
      io
    });

    res.json({
      status: 'success',
      message: 'Column and its tasks deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
