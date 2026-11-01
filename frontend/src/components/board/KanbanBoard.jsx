import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, Layout } from 'lucide-react';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { useBoard } from '../../context/BoardContext';
import { useWorkspace } from '../../context/WorkspaceContext';

export const KanbanBoard = ({ onTaskClick, onAddTaskToColumn }) => {
  const { board, columns, filteredTasks, moveTask, createColumn } = useBoard();
  const { isTenantAdmin } = useWorkspace();

  const [activeTask, setActiveTask] = useState(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Sensors with distance constraint to prevent accidental drags on clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'Task') {
      setActiveTask(active.data.current.task);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id;
    const overId = over.id;

    if (activeTaskId === overId) return;

    // Check if dropped over a Column or over another Task
    let targetColumnId = null;
    let newPosition = 0;

    const overData = over.data.current;
    if (overData?.type === 'Column') {
      targetColumnId = overData.column._id;
      // Put at end of target column
      const tasksInTarget = filteredTasks.filter((t) => t.columnId === targetColumnId);
      newPosition = tasksInTarget.length;
    } else if (overData?.type === 'Task') {
      targetColumnId = overData.task.columnId;
      newPosition = overData.task.position;
    } else {
      // Direct ID check
      const isCol = columns.some((c) => c._id === overId);
      if (isCol) {
        targetColumnId = overId;
        const tasksInTarget = filteredTasks.filter((t) => t.columnId === targetColumnId);
        newPosition = tasksInTarget.length;
      }
    }

    if (!targetColumnId) return;

    // Trigger optimistic move with server sync and OCC check
    await moveTask(activeTaskId, targetColumnId, newPosition);
  };

  const handleCreateColumnSubmit = async (e) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    await createColumn(newColumnName.trim());
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-x-auto pb-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-start gap-5 flex-1 min-w-max h-full">
          {columns.map((column) => {
            const columnTasks = filteredTasks
              .filter((task) => task.columnId === column._id)
              .sort((a, b) => a.position - b.position);

            return (
              <Column
                key={column._id}
                column={column}
                tasks={columnTasks}
                onTaskClick={onTaskClick}
                onAddTaskToColumn={onAddTaskToColumn}
              />
            );
          })}

          {/* Add Column Button / Form */}
          {isTenantAdmin && (
            <div className="w-80 shrink-0">
              {isAddingColumn ? (
                <form
                  onSubmit={handleCreateColumnSubmit}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-card"
                >
                  <input
                    type="text"
                    placeholder="Enter column name..."
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    autoFocus
                    className="w-full text-sm font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                    >
                      Add Column
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingColumn(false)}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-500 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 font-semibold text-sm transition-all bg-slate-50/50 dark:bg-slate-900/30"
                >
                  <Plus className="w-4 h-4" />
                  Add Column
                </button>
              )}
            </div>
          )}
        </div>

        {/* Drag Overlay for active card preview */}
        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onClick={() => {}} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
