import React from 'react';
import { Search, Filter, X, Tag, UserCheck, AlertTriangle } from 'lucide-react';
import { useBoard } from '../../context/BoardContext';

export const FilterBar = ({ members = [] }) => {
  const { filters, setFilters, tasks } = useBoard();

  // Extract all unique labels present in the board's tasks
  const allLabels = Array.from(
    new Set(tasks.flatMap((t) => t.labels || []).filter(Boolean))
  );

  const hasActiveFilters =
    filters.search ||
    filters.priority !== 'ALL' ||
    filters.assigneeId !== 'ALL' ||
    filters.label !== 'ALL';

  const resetFilters = () => {
    setFilters({
      search: '',
      priority: 'ALL',
      assigneeId: 'ALL',
      label: 'ALL'
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-6 shadow-subtle flex flex-wrap items-center gap-3 justify-between">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter tasks by title or keyword..."
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className="w-full pl-9 pr-8 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
        />
        {filters.search && (
          <button
            onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Select Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Priority Filter */}
        <div className="relative">
          <select
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
            className="pl-3 pr-8 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer appearance-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">🔴 Critical</option>
            <option value="High">🟠 High</option>
            <option value="Medium">🔵 Medium</option>
            <option value="Low">⚪ Low</option>
          </select>
          <AlertTriangle className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Assignee Filter */}
        <div className="relative">
          <select
            value={filters.assigneeId}
            onChange={(e) => setFilters((prev) => ({ ...prev, assigneeId: e.target.value }))}
            className="pl-3 pr-8 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer appearance-none"
          >
            <option value="ALL">All Assignees</option>
            {members.map((m) => (
              <option key={m.user._id} value={m.user._id}>
                {m.user.name}
              </option>
            ))}
          </select>
          <UserCheck className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Label Filter */}
        {allLabels.length > 0 && (
          <div className="relative">
            <select
              value={filters.label}
              onChange={(e) => setFilters((prev) => ({ ...prev, label: e.target.value }))}
              className="pl-3 pr-8 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer appearance-none"
            >
              <option value="ALL">All Labels</option>
              {allLabels.map((lbl) => (
                <option key={lbl} value={lbl}>
                  {lbl}
                </option>
              ))}
            </select>
            <Tag className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};
