import { Task } from '../models/Task.js';
import { Column } from '../models/Column.js';
import { Board } from '../models/Board.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { logActivity } from '../services/activityService.js';

export const createTask = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { title, description, columnId, priority, assignees, labels, dueDate, position } = req.body;

    // Verify column belongs to this board & tenant
    const column = await Column.findOne({ _id: columnId, boardId, tenantId: req.tenant._id });
    if (!column) {
      return next(new BadRequestError('Target column not found on this board'));
    }

    // Determine position if not provided
    let taskPosition = position;
    if (taskPosition === undefined) {
      const lastTask = await Task.findOne({ columnId, boardId, tenantId: req.tenant._id }).sort({ position: -1 });
      taskPosition = lastTask ? lastTask.position + 1 : 0;
    }

    const task = await Task.create({
      title,
      description: description || '',
      boardId,
      columnId,
      tenantId: req.tenant._id,
      priority: priority || 'Medium',
      assignees: assignees || [],
      labels: labels || [],
      dueDate: dueDate || null,
      position: taskPosition,
      version: 1,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('task:created', populatedTask);
    }

    await logActivity({
      organizationId: req.organizationId,
      tenantId: req.tenant._id,
      boardId,
      actorId: req.user._id,
      action: 'TASK_CREATED',
      resourceType: 'task',
      resourceId: task._id,
      metadata: {
        taskTitle: task.title,
        columnName: column.name,
        priority: task.priority
      },
      io
    });

    res.status(201).json({
      status: 'success',
      task: populatedTask
    });
  } catch (error) {
    next(error);
  }
};

export const getBoardTasks = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    const tasks = await Task.find({ boardId, tenantId: req.tenant._id })
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar')
      .sort({ position: 1 });

    res.json({
      status: 'success',
      tasks
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOne({ _id: taskId, tenantId: req.tenant._id })
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar');

    if (!task) {
      return next(new NotFoundError('Task not found in this branch'));
    }

    res.json({
      status: 'success',
      task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task with Optimistic Concurrency Control (OCC).
 * Rejects with 409 Conflict if expectedVersion !== task.version.
 */
export const updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const {
      title,
      description,
      columnId,
      priority,
      assignees,
      labels,
      dueDate,
      position,
      expectedVersion
    } = req.body;

    // Check if task exists within the tenant
    const existingTask = await Task.findOne({ _id: taskId, tenantId: req.tenant._id })
      .populate('assignees', 'name email avatar')
      .populate('updatedBy', 'name email avatar');

    if (!existingTask) {
      return next(new NotFoundError('Task not found in this branch'));
    }

    // Optimistic Concurrency Check: If client specified an expectedVersion, verify it matches
    if (expectedVersion !== undefined && existingTask.version !== expectedVersion) {
      const io = req.app.get('io');
      if (io) {
        io.to(`board:${existingTask.boardId}`).emit('conflict:detected', {
          taskId,
          currentVersion: existingTask.version,
          attemptedVersion: expectedVersion,
          modifiedBy: existingTask.updatedBy
        });
      }

      return res.status(409).json({
        status: 'fail',
        error: 'Conflict: Task was modified by another user',
        message: 'This task was modified by another collaborator since you loaded it. Please review the updated version.',
        currentVersion: existingTask.version,
        serverTask: existingTask
      });
    }

    // Build update object
    const updateData = {
      updatedBy: req.user._id,
      $inc: { version: 1 }
    };

    const setFields = {};
    if (title !== undefined) setFields.title = title;
    if (description !== undefined) setFields.description = description;
    if (columnId !== undefined) setFields.columnId = columnId;
    if (priority !== undefined) setFields.priority = priority;
    if (assignees !== undefined) setFields.assignees = assignees;
    if (labels !== undefined) setFields.labels = labels;
    if (dueDate !== undefined) setFields.dueDate = dueDate;
    if (position !== undefined) setFields.position = position;

    updateData.$set = setFields;

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, tenantId: req.tenant._id, version: existingTask.version },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar');

    if (!updatedTask) {
      // Race condition occurred between findOne and findOneAndUpdate
      const raceCheck = await Task.findById(taskId)
        .populate('assignees', 'name email avatar')
        .populate('updatedBy', 'name email avatar');

      return res.status(409).json({
        status: 'fail',
        error: 'Conflict: Concurrent update conflict',
        message: 'A simultaneous update was completed by another user. Your changes were not applied.',
        currentVersion: raceCheck ? raceCheck.version : null,
        serverTask: raceCheck
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${updatedTask.boardId}`).emit('task:updated', updatedTask);
    }

    await logActivity({
      organizationId: req.organizationId,
      tenantId: req.tenant._id,
      boardId: updatedTask.boardId,
      actorId: req.user._id,
      action: 'TASK_UPDATED',
      resourceType: 'task',
      resourceId: updatedTask._id,
      metadata: {
        taskTitle: updatedTask.title,
        version: updatedTask.version,
        changes: Object.keys(setFields)
      },
      io
    });

    res.json({
      status: 'success',
      task: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move a task between columns or reorder within the same column.
 */
export const moveTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { sourceColumnId, targetColumnId, newPosition, expectedVersion } = req.body;

    const existingTask = await Task.findOne({ _id: taskId, tenantId: req.tenant._id });
    if (!existingTask) {
      return next(new NotFoundError('Task not found in this branch'));
    }

    // Check version if provided
    if (expectedVersion !== undefined && existingTask.version !== expectedVersion) {
      const serverTask = await Task.findById(taskId).populate('assignees', 'name email avatar');
      return res.status(409).json({
        status: 'fail',
        error: 'Conflict: Task was moved or updated by another user',
        message: 'The task position could not be saved because newer changes exist on the server.',
        currentVersion: existingTask.version,
        serverTask
      });
    }

    // Update target tasks positions if needed
    if (sourceColumnId === targetColumnId) {
      // Reorder within same column
      const oldPos = existingTask.position;
      if (newPosition > oldPos) {
        await Task.updateMany(
          { columnId: targetColumnId, tenantId: req.tenant._id, position: { $gt: oldPos, $lte: newPosition } },
          { $inc: { position: -1 } }
        );
      } else if (newPosition < oldPos) {
        await Task.updateMany(
          { columnId: targetColumnId, tenantId: req.tenant._id, position: { $gte: newPosition, $lt: oldPos } },
          { $inc: { position: 1 } }
        );
      }
    } else {
      // Moved to another column
      // Shift down positions in target column
      await Task.updateMany(
        { columnId: targetColumnId, tenantId: req.tenant._id, position: { $gte: newPosition } },
        { $inc: { position: 1 } }
      );
      // Shift up positions in source column
      await Task.updateMany(
        { columnId: sourceColumnId, tenantId: req.tenant._id, position: { $gt: existingTask.position } },
        { $inc: { position: -1 } }
      );
    }

    // Update the task itself
    existingTask.columnId = targetColumnId;
    existingTask.position = newPosition;
    existingTask.version += 1;
    existingTask.updatedBy = req.user._id;
    await existingTask.save();

    const populatedTask = await Task.findById(taskId)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${existingTask.boardId}`).emit('task:moved', {
        task: populatedTask,
        sourceColumnId,
        targetColumnId,
        newPosition,
        movedBy: {
          _id: req.user._id,
          name: req.user.name
        }
      });
    }

    await logActivity({
      organizationId: req.organizationId,
      tenantId: req.tenant._id,
      boardId: existingTask.boardId,
      actorId: req.user._id,
      action: 'TASK_MOVED',
      resourceType: 'task',
      resourceId: existingTask._id,
      metadata: {
        taskTitle: existingTask.title,
        sourceColumnId,
        targetColumnId,
        newPosition
      },
      io
    });

    res.json({
      status: 'success',
      task: populatedTask
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOneAndDelete({ _id: taskId, tenantId: req.tenant._id });
    if (!task) {
      return next(new NotFoundError('Task not found in this branch'));
    }

    // Reorder remaining tasks in the column
    await Task.updateMany(
      { columnId: task.columnId, tenantId: req.tenant._id, position: { $gt: task.position } },
      { $inc: { position: -1 } }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${task.boardId}`).emit('task:deleted', {
        taskId: task._id,
        boardId: task.boardId,
        columnId: task.columnId
      });
    }

    await logActivity({
      organizationId: req.organizationId,
      tenantId: req.tenant._id,
      boardId: task.boardId,
      actorId: req.user._id,
      action: 'TASK_DELETED',
      resourceType: 'task',
      resourceId: task._id,
      metadata: { taskTitle: task.title },
      io
    });

    res.json({
      status: 'success',
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
