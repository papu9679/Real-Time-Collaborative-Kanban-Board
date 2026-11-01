import { Board } from '../models/Board.js';
import { Column } from '../models/Column.js';
import { Task } from '../models/Task.js';
import { NotFoundError } from '../utils/errors.js';
import { logActivity } from '../services/activityService.js';

export const createBoard = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { name, description } = req.body;

    const board = await Board.create({
      name,
      description: description || '',
      organizationId: req.organizationId,
      tenantId,
      createdBy: req.user._id
    });

    // Default 5 columns
    const defaultColumnNames = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
    const columns = await Promise.all(
      defaultColumnNames.map((colName, index) =>
        Column.create({
          name: colName,
          boardId: board._id,
          tenantId,
          position: index
        })
      )
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('board:created', { board, columns });
    }

    await logActivity({
      organizationId: req.organizationId,
      tenantId,
      boardId: board._id,
      actorId: req.user._id,
      action: 'BOARD_CREATED',
      resourceType: 'board',
      resourceId: board._id,
      metadata: { boardName: board.name },
      io
    });

    res.status(201).json({
      status: 'success',
      board,
      columns
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantBoards = async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    // Strict tenant isolation: filter by tenantId
    const boards = await Board.find({ tenantId })
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });

    // Also get task count for each board
    const boardStats = await Promise.all(
      boards.map(async (board) => {
        const taskCount = await Task.countDocuments({ boardId: board._id, tenantId });
        return {
          ...board.toObject(),
          taskCount
        };
      })
    );

    res.json({
      status: 'success',
      boards: boardStats
    });
  } catch (error) {
    next(error);
  }
};

export const getBoardById = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    // Strict tenant isolation: verify board belongs to user's authorized tenant
    const board = req.board || (await Board.findOne({ _id: boardId, tenantId: req.tenant._id }));
    if (!board) {
      return next(new NotFoundError('Board not found in this branch'));
    }

    const columns = await Column.find({ boardId: board._id, tenantId: req.tenant._id }).sort({ position: 1 });
    const tasks = await Task.find({ boardId: board._id, tenantId: req.tenant._id })
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar')
      .sort({ position: 1 });

    res.json({
      status: 'success',
      board,
      columns,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { name, description } = req.body;

    const board = await Board.findOneAndUpdate(
      { _id: boardId, tenantId: req.tenant._id },
      { ...(name && { name }), ...(description !== undefined && { description }) },
      { new: true, runValidators: true }
    );

    if (!board) {
      return next(new NotFoundError('Board not found in this branch'));
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('board:updated', board);
      io.to(`tenant:${req.tenant._id}`).emit('board:updated', board);
    }

    res.json({
      status: 'success',
      board
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    const board = await Board.findOneAndDelete({ _id: boardId, tenantId: req.tenant._id });
    if (!board) {
      return next(new NotFoundError('Board not found in this branch'));
    }

    // Cascade delete columns and tasks scoped to this tenant and board
    await Column.deleteMany({ boardId, tenantId: req.tenant._id });
    await Task.deleteMany({ boardId, tenantId: req.tenant._id });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('board:deleted', { boardId });
      io.to(`tenant:${req.tenant._id}`).emit('board:deleted', { boardId });
    }

    res.json({
      status: 'success',
      message: 'Board and all associated tasks deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
