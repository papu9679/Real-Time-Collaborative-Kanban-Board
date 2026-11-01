import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { Avatar } from '../common/Avatar';

export const TaskCard = ({ task, onClick, isOverlay = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task._id,
    data: {
      type: 'Task',
      task
    }
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform)
  };

  const priorityStyles = {
    Critical: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-900',
    High: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-900',
    Medium: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-900',
    Low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  };

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={`group relative bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-subtle hover:shadow-card-hover hover:border-brand-300 dark:hover:border-brand-700 cursor-grab active:cursor-grabbing transition-all select-none ${
        isDragging ? 'opacity-30 border-dashed border-brand-500' : ''
      } ${isOverlay ? 'shadow-2xl scale-105 rotate-1 border-brand-500' : ''}`}
    >
      {/* Top Header: Priority & Version Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
            priorityStyles[task.priority] || priorityStyles.Medium
          }`}
        >
          {task.priority}
        </span>

        <span
          title={`Version ${task.version} (Optimistic Concurrency Control)`}
          className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-0.5"
        >
          <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />
          v{task.version}
        </span>
      </div>

      {/* Task Title */}
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
        {task.title}
      </h4>

      {/* Description Snippet if available */}
      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.slice(0, 3).map((lbl, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded"
            >
              #{lbl}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-[10px] text-slate-400">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer: Due Date & Assignees */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        {/* Due Date */}
        {task.dueDate ? (
          <div
            className={`flex items-center gap-1 text-[11px] font-medium ${
              isOverdue
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(task.dueDate), 'MMM d')}</span>
          </div>
        ) : (
          <div />
        )}

        {/* Assignee Avatars */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar
                key={assignee._id || assignee}
                name={assignee.name || 'Member'}
                avatar={assignee.avatar}
                size="xs"
              />
            ))}
            {task.assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center ring-1 ring-white dark:ring-slate-800">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
