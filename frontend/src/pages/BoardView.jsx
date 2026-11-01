import React, { useState, useEffect } from 'react';
import { useBoard } from '../context/BoardContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { FilterBar } from '../components/board/FilterBar';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { TaskDetailModal } from '../components/board/TaskDetailModal';
import { TaskCreateModal } from '../components/board/TaskCreateModal';
import { Layout, AlertCircle } from 'lucide-react';
import api from '../services/api';

export const BoardView = () => {
  const { board, columns, tasks, loading, error } = useBoard();
  const { currentTenant } = useWorkspace();

  const [selectedTask, setSelectedTask] = useState(null);
  const [createTaskColumnId, setCreateTaskColumnId] = useState(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [tenantMembers, setTenantMembers] = useState([]);

  // Fetch tenant members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentTenant?._id) return;
      try {
        const res = await api.get(`/tenants/${currentTenant._id}/members`);
        setTenantMembers(res.data.members || []);
      } catch (err) {
        console.warn('Failed to load members for board view:', err);
      }
    };
    fetchMembers();
  }, [currentTenant?._id]);

  // Keep selectedTask in sync with live updates from BoardContext
  useEffect(() => {
    if (selectedTask) {
      const refreshed = tasks.find((t) => t._id === selectedTask._id);
      if (refreshed) {
        setSelectedTask(refreshed);
      } else {
        setSelectedTask(null); // was deleted
      }
    }
  }, [tasks]);

  const handleAddTaskToColumn = (columnId) => {
    setCreateTaskColumnId(columnId);
    setIsCreateTaskOpen(true);
  };

  if (loading && !board) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading collaborative board...</p>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Active Board Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
          {error || 'Select a board from the sidebar or create a new board to start organizing tasks.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Board Header Info */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {board.name}
            </h1>
            {board.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {board.description}
              </p>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span>
              <strong className="text-slate-900 dark:text-slate-100">{columns.length}</strong> Columns
            </span>
            <span>•</span>
            <span>
              <strong className="text-slate-900 dark:text-slate-100">{tasks.length}</strong> Tasks
            </span>
          </div>
        </div>
      </div>

      {/* Task Filters */}
      <FilterBar members={tenantMembers} />

      {/* Draggable Kanban Board */}
      <KanbanBoard
        onTaskClick={(task) => setSelectedTask(task)}
        onAddTaskToColumn={handleAddTaskToColumn}
      />

      {/* Task Detail Slide-over */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          members={tenantMembers}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Quick Add Task Modal */}
      <TaskCreateModal
        isOpen={isCreateTaskOpen}
        initialColumnId={createTaskColumnId}
        onClose={() => {
          setIsCreateTaskOpen(false);
          setCreateTaskColumnId(null);
        }}
      />
    </div>
  );
};
