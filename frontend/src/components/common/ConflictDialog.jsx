import React from 'react';
import { AlertTriangle, RefreshCw, CheckCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { Avatar } from './Avatar';

export const ConflictDialog = ({ conflict, onResolve, onClose }) => {
  if (!conflict) return null;

  const { serverTask, localUpdates, taskId, message } = conflict;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-800/80 p-6 z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
              Concurrency Conflict Detected
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {message || 'This task was modified by another collaborator before your changes could be saved.'}
            </p>
          </div>
        </div>

        {/* Comparison Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Server Version (Newer) */}
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Current Server State
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                v{serverTask?.version}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Title:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {serverTask?.title}
                </p>
              </div>

              {serverTask?.description && (
                <div>
                  <span className="text-slate-400">Description:</span>
                  <p className="text-slate-700 dark:text-slate-300 line-clamp-2">
                    {serverTask?.description}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Priority:</span>
                <span className="font-semibold">{serverTask?.priority}</span>
              </div>

              {serverTask?.updatedBy && (
                <div className="flex items-center gap-2 pt-1 border-t border-amber-200/50 dark:border-amber-800/40">
                  <span className="text-slate-400">Modified by:</span>
                  <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                    <Avatar
                      name={serverTask.updatedBy.name || 'Collaborator'}
                      avatar={serverTask.updatedBy.avatar}
                      size="xs"
                    />
                    <span>{serverTask.updatedBy.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Your Attempted Changes */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Your Attempted Edits
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                Unsaved
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Title:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {localUpdates?.title || serverTask?.title}
                </p>
              </div>

              {localUpdates?.description && (
                <div>
                  <span className="text-slate-400">Description:</span>
                  <p className="text-slate-700 dark:text-slate-300 line-clamp-2">
                    {localUpdates.description}
                  </p>
                </div>
              )}

              {localUpdates?.priority && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Priority:</span>
                  <span className="font-semibold">{localUpdates.priority}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resolution Options */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => onResolve(taskId, 'ACCEPT_SERVER')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Discard My Edits & Reload Server Version
          </button>

          <button
            onClick={() => onResolve(taskId, 'OVERWRITE', localUpdates)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-amber-600/20 active:scale-95 transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Overwrite with My Changes (Force Update)
          </button>
        </div>
      </div>
    </div>
  );
};
