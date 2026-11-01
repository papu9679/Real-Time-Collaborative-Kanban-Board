import React, { useState, useEffect } from 'react';
import {
  Kanban,
  Building2,
  GitBranch,
  Plus,
  Users,
  Activity,
  LogOut,
  ChevronDown,
  Layout,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useBoard } from '../../context/BoardContext';
import { Avatar } from '../common/Avatar';
import api from '../../services/api';

export const Sidebar = ({
  onOpenCreateOrg,
  onOpenCreateTenant,
  onOpenCreateBoard,
  onOpenMembers,
  onOpenActivity,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { user, logout } = useAuth();
  const {
    organizations,
    currentOrg,
    currentTenant,
    userRole,
    isOrgAdmin,
    isTenantAdmin,
    switchOrganization,
    switchTenant
  } = useWorkspace();
  const { board, loadBoard } = useBoard();

  const [boards, setBoards] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(
    () => document.documentElement.classList.contains('dark') || false
  );

  // Load boards when active tenant changes
  useEffect(() => {
    const fetchTenantBoards = async () => {
      if (!currentTenant?._id) {
        setBoards([]);
        return;
      }
      try {
        const res = await api.get(`/tenants/${currentTenant._id}/boards`);
        setBoards(res.data.boards || []);
        // If no active board or active board doesn't belong to current tenant, select first board
        if (res.data.boards && res.data.boards.length > 0) {
          if (!board || board.tenantId !== currentTenant._id) {
            loadBoard(res.data.boards[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch boards for tenant:', err);
      }
    };
    fetchTenantBoards();
  }, [currentTenant?._id, loadBoard]);

  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Kanban className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Flowspace
              </span>
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 rounded border border-brand-200/50 dark:border-brand-800/50">
                SaaS
              </span>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Workspace Selectors */}
        <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Organization Selector */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-500" />
                Organization
              </span>
              <button
                onClick={onOpenCreateOrg}
                className="text-brand-600 hover:text-brand-700 dark:text-brand-400 text-[11px] flex items-center gap-0.5 hover:underline"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
            <div className="relative">
              <select
                value={currentOrg?._id || ''}
                onChange={(e) => switchOrganization(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-200 appearance-none cursor-pointer"
              >
                {organizations.map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name} {org.isOrgAdmin ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Tenant (Branch) Switcher */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                Branch / Tenant
              </span>
              {isOrgAdmin && (
                <button
                  onClick={onOpenCreateTenant}
                  className="text-brand-600 hover:text-brand-700 dark:text-brand-400 text-[11px] flex items-center gap-0.5 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Branch
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={currentTenant?._id || ''}
                onChange={(e) => switchTenant(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-200 appearance-none cursor-pointer"
              >
                {(currentOrg?.tenants || []).map((tenant) => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Boards Section */}
          <div>
            <div className="px-2 flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Kanban Boards
              </span>
              <button
                onClick={onOpenCreateBoard}
                className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Create new board in this branch"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {boards.map((b) => {
                const isActive = board?._id === b._id;
                return (
                  <button
                    key={b._id}
                    onClick={() => {
                      loadBoard(b._id);
                      setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 shadow-sm border border-brand-200/60 dark:border-brand-800/60'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Layout
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{b.name}</span>
                    </div>
                    {b.taskCount !== undefined && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isActive
                            ? 'bg-brand-200/70 text-brand-800 dark:bg-brand-900 dark:text-brand-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {b.taskCount}
                      </span>
                    )}
                  </button>
                );
              })}

              {boards.length === 0 && (
                <div className="text-center py-6 px-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <p className="text-xs text-slate-400">No boards in this branch yet.</p>
                  <button
                    onClick={onOpenCreateBoard}
                    className="mt-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    + Create First Board
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Workspace Tools */}
          <div>
            <div className="px-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Workspace Tools
              </span>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  onOpenMembers();
                  setIsMobileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg transition-colors"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>Team & Members</span>
              </button>

              <button
                onClick={() => {
                  onOpenActivity();
                  setIsMobileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg transition-colors"
              >
                <Activity className="w-4 h-4 text-slate-400" />
                <span>Activity Timeline</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Card & Sign Out */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user?.name || 'User'} avatar={user?.avatar} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user?.name}
                </p>
                <span className="inline-block text-[10px] font-medium text-slate-500 dark:text-slate-400 capitalize">
                  {isOrgAdmin ? 'Org Admin' : isTenantAdmin ? 'Branch Admin' : 'Member'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
