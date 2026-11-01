import React from 'react';
import {
  Menu,
  RotateCcw,
  RotateCw,
  Plus,
  Wifi,
  WifiOff,
  Users2
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useBoard } from '../../context/BoardContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../common/Avatar';

export const Topbar = ({ onOpenCreateTask, onToggleMobileMenu }) => {
  const { currentOrg, currentTenant } = useWorkspace();
  const { board, undo, redo, canUndo, canRedo } = useBoard();
  const { isConnected, boardPresence } = useSocket();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 lg:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
            {currentOrg?.name || 'Organization'}
          </span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            {currentTenant?.name || 'Branch'}
          </span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[160px] sm:max-w-[240px]">
            {board?.name || 'Kanban Board'}
          </span>
        </div>
      </div>

      {/* Right: Presence, Undo/Redo, Connection Status, Add Task */}
      <div className="flex items-center gap-3">
        {/* Real-time Presence Avatars */}
        {boardPresence.length > 0 && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/80 rounded-full border border-slate-200 dark:border-slate-700">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 hidden md:inline">
              {boardPresence.length} online
            </span>
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {boardPresence.slice(0, 4).map((pUser) => (
                <Avatar
                  key={pUser.id}
                  name={pUser.name}
                  avatar={pUser.avatar}
                  size="xs"
                  className="hover:scale-110 transition-transform cursor-pointer"
                />
              ))}
              {boardPresence.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  +{boardPresence.length - 4}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Undo / Redo controls */}
        <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-colors ${
              canUndo
                ? 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-sm'
                : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title="Undo task movement (Ctrl+Z)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-colors ${
              canRedo
                ? 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-sm'
                : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title="Redo task movement (Ctrl+Y)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Live Socket Status */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
          }`}
          title={isConnected ? 'Real-time WebSocket connected' : 'Reconnecting to collaboration server...'}
        >
          {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden xl:inline">{isConnected ? 'Live' : 'Reconnecting'}</span>
        </div>

        {/* Add Task Button */}
        <button
          onClick={onOpenCreateTask}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-brand-500/20 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Task</span>
        </button>
      </div>
    </header>
  );
};
