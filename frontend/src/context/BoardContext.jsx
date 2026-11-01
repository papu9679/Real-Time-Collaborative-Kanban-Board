import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useSocket } from './SocketContext';
import { useWorkspace } from './WorkspaceContext';

const BoardContext = createContext(null);

export const BoardProvider = ({ children }) => {
  const { socket, joinBoard, leaveBoard } = useSocket();
  const { currentTenant } = useWorkspace();

  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Optimistic Concurrency Conflict state
  const [conflictState, setConflictState] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    priority: 'ALL',
    assigneeId: 'ALL',
    label: 'ALL'
  });

  const activeBoardId = board?._id;

  // Load board data
  const loadBoard = useCallback(async (boardId) => {
    if (!boardId) return;
    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/boards/${boardId}`);
      const { board: loadedBoard, columns: loadedCols, tasks: loadedTasks } = res.data;

      setBoard(loadedBoard);
      setColumns(loadedCols || []);
      setTasks(loadedTasks || []);

      // Join real-time room
      joinBoard(boardId);
    } catch (err) {
      console.error('Error loading board:', err);
      setError(err.response?.data?.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [joinBoard]);

  // Handle Socket.IO events for live collaboration
  useEffect(() => {
    if (!socket || !activeBoardId) return;

    const handleTaskCreated = (newTask) => {
      setTasks((prev) => {
        if (prev.some((t) => t._id === newTask._id)) return prev;
        return [...prev, newTask];
      });
    };

    const handleTaskUpdated = (updatedTask) => {
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
    };

    const handleTaskMoved = ({ task, sourceColumnId, targetColumnId, newPosition }) => {
      setTasks((prev) => {
        const withoutTask = prev.filter((t) => t._id !== task._id);
        return [...withoutTask, task].sort((a, b) => a.position - b.position);
      });
    };

    const handleTaskDeleted = ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    };

    const handleColumnCreated = (newCol) => {
      setColumns((prev) => {
        if (prev.some((c) => c._id === newCol._id)) return prev;
        return [...prev, newCol].sort((a, b) => a.position - b.position);
      });
    };

    const handleColumnUpdated = (updatedCol) => {
      setColumns((prev) =>
        prev.map((c) => (c._id === updatedCol._id ? updatedCol : c)).sort((a, b) => a.position - b.position)
      );
    };

    const handleColumnDeleted = ({ columnId }) => {
      setColumns((prev) => prev.filter((c) => c._id !== columnId));
      setTasks((prev) => prev.filter((t) => t.columnId !== columnId));
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('column:created', handleColumnCreated);
    socket.on('column:updated', handleColumnUpdated);
    socket.on('column:deleted', handleColumnDeleted);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('column:created', handleColumnCreated);
      socket.off('column:updated', handleColumnUpdated);
      socket.off('column:deleted', handleColumnDeleted);
    };
  }, [socket, activeBoardId]);

  // Optimistic Task Move with Undo/Redo & Conflict Detection
  const moveTask = async (taskId, targetColumnId, newPosition, recordUndo = true) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    const sourceColumnId = task.columnId;
    const oldPosition = task.position;
    const expectedVersion = task.version;

    // Snapshot previous tasks for rollback
    const prevTasksSnapshot = [...tasks];

    // Optimistic UI update
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t._id === taskId) {
          return { ...t, columnId: targetColumnId, position: newPosition };
        }
        return t;
      });
      return updated;
    });

    try {
      const res = await api.post(`/tasks/${taskId}/move`, {
        sourceColumnId,
        targetColumnId,
        newPosition,
        expectedVersion
      });

      const confirmedTask = res.data.task;

      // Update state with confirmed version
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? confirmedTask : t))
      );

      // Push to undo stack
      if (recordUndo) {
        setUndoStack((prev) => [
          ...prev,
          {
            type: 'MOVE_TASK',
            taskId,
            sourceColumnId: targetColumnId,
            targetColumnId: sourceColumnId,
            newPosition: oldPosition,
            version: confirmedTask.version
          }
        ]);
        setRedoStack([]); // Clear redo on fresh manual action
      }
    } catch (err) {
      console.warn('Move task error:', err);
      // Revert optimistic changes
      setTasks(prevTasksSnapshot);

      if (err.response?.status === 409) {
        setConflictState({
          isOpen: true,
          taskId,
          serverTask: err.response.data.serverTask,
          message: err.response.data.message || 'Another user recently moved or modified this task.'
        });
      } else {
        alert(err.response?.data?.message || 'Failed to move task. Reverted changes.');
      }
    }
  };

  // Undo action
  const undo = async () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    if (action.type === 'MOVE_TASK') {
      const currentTask = tasks.find((t) => t._id === action.taskId);
      if (currentTask) {
        setRedoStack((prev) => [
          ...prev,
          {
            type: 'MOVE_TASK',
            taskId: action.taskId,
            sourceColumnId: currentTask.columnId,
            targetColumnId: action.targetColumnId,
            newPosition: currentTask.position,
            version: currentTask.version
          }
        ]);
      }
      await moveTask(action.taskId, action.targetColumnId, action.newPosition, false);
    }
  };

  // Redo action
  const redo = async () => {
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));

    if (action.type === 'MOVE_TASK') {
      await moveTask(action.taskId, action.targetColumnId, action.newPosition, false);
    }
  };

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, tasks]);

  // Update Task with OCC
  const updateTask = async (taskId, updates) => {
    const currentTask = tasks.find((t) => t._id === taskId);
    const expectedVersion = currentTask?.version;

    try {
      const res = await api.patch(`/tasks/${taskId}`, {
        ...updates,
        expectedVersion
      });

      const updated = res.data.task;
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
      return { success: true, task: updated };
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictState({
          isOpen: true,
          taskId,
          localUpdates: updates,
          serverTask: err.response.data.serverTask,
          message: err.response.data.message
        });
        return { success: false, conflict: true, serverTask: err.response.data.serverTask };
      }
      throw err;
    }
  };

  // Force overwrite in case of conflict resolution
  const resolveConflict = async (taskId, resolutionChoice, customUpdates = null) => {
    if (resolutionChoice === 'ACCEPT_SERVER') {
      // Reload task from server
      const res = await api.get(`/tasks/${taskId}`);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data.task : t)));
      setConflictState(null);
    } else if (resolutionChoice === 'OVERWRITE') {
      // Fetch latest server version to get fresh version number, then apply local edits
      const freshRes = await api.get(`/tasks/${taskId}`);
      const latestServerTask = freshRes.data.task;
      const edits = customUpdates || conflictState?.localUpdates || {};

      const overwriteRes = await api.patch(`/tasks/${taskId}`, {
        ...edits,
        expectedVersion: latestServerTask.version
      });

      setTasks((prev) => prev.map((t) => (t._id === taskId ? overwriteRes.data.task : t)));
      setConflictState(null);
    }
  };

  // Create Task
  const createTask = async (taskPayload) => {
    if (!activeBoardId) return;
    const res = await api.post(`/boards/${activeBoardId}/tasks`, taskPayload);
    const newTask = res.data.task;
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  };

  // Delete Task
  const deleteTask = async (taskId) => {
    await api.delete(`/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  };

  // Columns CRUD
  const createColumn = async (name) => {
    if (!activeBoardId) return;
    const res = await api.post(`/boards/${activeBoardId}/columns`, { name });
    const newCol = res.data.column;
    setColumns((prev) => [...prev, newCol]);
    return newCol;
  };

  const updateColumn = async (columnId, updates) => {
    const res = await api.patch(`/columns/${columnId}`, updates);
    const updated = res.data.column;
    setColumns((prev) => prev.map((c) => (c._id === columnId ? updated : c)));
    return updated;
  };

  const deleteColumn = async (columnId) => {
    await api.delete(`/columns/${columnId}`);
    setColumns((prev) => prev.filter((c) => c._id !== columnId));
    setTasks((prev) => prev.filter((t) => t.columnId !== columnId));
  };

  // Filtered tasks computation
  const filteredTasks = tasks.filter((task) => {
    // Search query (case-insensitive in title or description)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    // Priority filter
    if (filters.priority !== 'ALL' && task.priority !== filters.priority) {
      return false;
    }
    // Assignee filter
    if (filters.assigneeId !== 'ALL') {
      const hasAssignee = task.assignees?.some((a) => (a._id || a) === filters.assigneeId);
      if (!hasAssignee) return false;
    }
    // Label filter
    if (filters.label !== 'ALL') {
      const hasLabel = task.labels?.includes(filters.label);
      if (!hasLabel) return false;
    }
    return true;
  });

  return (
    <BoardContext.Provider
      value={{
        board,
        columns,
        tasks,
        filteredTasks,
        loading,
        error,
        filters,
        setFilters,
        loadBoard,
        moveTask,
        updateTask,
        createTask,
        deleteTask,
        createColumn,
        updateColumn,
        deleteColumn,
        undo,
        redo,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        conflictState,
        setConflictState,
        resolveConflict
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const useBoard = () => {
  const context = useContext(BoardContext);
  if (!context) throw new Error('useBoard must be used within a BoardProvider');
  return context;
};
