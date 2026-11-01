import React, { useState, useEffect } from 'react';
import { X, Activity, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useBoard } from '../../context/BoardContext';
import { Avatar } from '../common/Avatar';
import api from '../../services/api';

export const ActivityDrawer = ({ isOpen, onClose }) => {
  const { currentTenant } = useWorkspace();
  const { board } = useBoard();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = async () => {
    if (!currentTenant?._id) return;
    try {
      setLoading(true);
      const res = await api.get(`/tenants/${currentTenant._id}/activity?limit=40`);
      setActivities(res.data.activities || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen, currentTenant?._id]);

  if (!isOpen) return null;

  const formatActionMessage = (act) => {
    const actor = act.actorId?.name || 'Collaborator';
    const meta = act.metadata || {};

    switch (act.action) {
      case 'TASK_CREATED':
        return (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span> created task{' '}
            <span className="font-medium text-brand-600 dark:text-brand-400">"{meta.taskTitle}"</span>
          </>
        );
      case 'TASK_MOVED':
        return (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span> moved task{' '}
            <span className="font-medium text-brand-600 dark:text-brand-400">"{meta.taskTitle}"</span>
          </>
        );
      case 'TASK_UPDATED':
        return (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span> updated task{' '}
            <span className="font-medium text-brand-600 dark:text-brand-400">"{meta.taskTitle}"</span>
          </>
        );
      case 'TASK_DELETED':
        return (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span> deleted task{' '}
            <span className="font-medium text-slate-600 dark:text-slate-400">"{meta.taskTitle}"</span>
          </>
        );
      case 'COLUMN_CREATED':
        return (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span> added column{' '}
            <span className="font-medium text-brand-600 dark:text-brand-400">"{meta.columnName}"</span>
          </>
        );
      case 'COLUMN_DELETED':
        return (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span> deleted column{' '}
            <span className="font-medium text-slate-600 dark:text-slate-400">"{meta.columnName}"</span>
          </>
        );
      case 'BOARD_CREATED':
        return (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span> created new board{' '}
            <span className="font-medium text-brand-600 dark:text-brand-400">"{meta.boardName}"</span>
          </>
        );
      case 'MEMBER_ADDED':
        return (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span> added member{' '}
            <span className="font-medium text-brand-600 dark:text-brand-400">{meta.addedUserName || meta.addedUserEmail}</span>
          </>
        );
      case 'MEMBER_REMOVED':
        return (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span> removed a branch member
          </>
        );
      default:
        return (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span> performed action {act.action}
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Activity Timeline</h3>
              <p className="text-[11px] text-slate-400">{currentTenant?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchActivities}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activities.map((act) => (
            <div key={act._id} className="flex items-start gap-3 text-xs">
              <Avatar
                name={act.actorId?.name || 'User'}
                avatar={act.actorId?.avatar}
                size="sm"
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {formatActionMessage(act)}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{format(new Date(act.createdAt), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            </div>
          ))}

          {activities.length === 0 && !loading && (
            <p className="text-center text-xs text-slate-400 py-8">
              No recent activity recorded in this branch.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
