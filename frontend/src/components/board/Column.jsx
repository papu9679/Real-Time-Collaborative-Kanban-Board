import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, MoreHorizontal, Edit2, Trash2, Check, X } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { useBoard } from '../../context/BoardContext';
import { useWorkspace } from '../../context/WorkspaceContext';

export const Column = ({ column, tasks = [], onTaskClick, onAddTaskToColumn }) => {
  const { updateColumn, deleteColumn } = useBoard();
  const { isTenantAdmin } = useWorkspace();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);

  // Droppable hook for column container
  const { setNodeRef, isOver } = useDroppable({
    id: column._id,
    data: {
      type: 'Column',
      column
    }
  });

  const taskIds = tasks.map((t) => t._id);

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === column.name) {
      setIsEditingName(false);
      return;
    }
    await updateColumn(column._id, { name: editedName.trim() });
    setIsEditingName(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete column "${column.name}" and its tasks?`)) {
      await deleteColumn(column._id);
    }
  };

  return (
    <div className="w-80 shrink-0 flex flex-col max-h-full bg-slate-100/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 select-none">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          {isEditingName ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="w-full text-sm font-semibold px-2 py-0.5 bg-white dark:bg-slate-800 border border-brand-500 rounded focus:outline-none"
              />
              <button onClick={handleSaveName} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsEditingName(false)} className="p-1 text-slate-400 hover:bg-slate-200 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                {column.name}
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                {tasks.length}
              </span>
            </>
          )}
        </div>

        {/* Quick Add & Column Menu */}
        <div className="flex items-center gap-0.5 relative">
          <button
            onClick={() => onAddTaskToColumn(column._id)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Add task to this column"
          >
            <Plus className="w-4 h-4" />
          </button>

          {isTenantAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-30 py-1 text-xs">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsEditingName(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      Rename Column
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleDelete();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Column
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task Cards Droppable Area */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto space-y-2.5 min-h-[150px] p-1 rounded-xl transition-colors ${
          isOver ? 'bg-brand-50/60 dark:bg-brand-950/30 ring-2 ring-brand-400 ring-dashed' : ''
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
            <span>Drop tasks here</span>
            <button
              onClick={() => onAddTaskToColumn(column._id)}
              className="mt-1 text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
              + Create task
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
