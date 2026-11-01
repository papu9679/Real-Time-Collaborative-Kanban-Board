import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CreateOrgModal } from '../organization/CreateOrgModal';
import { CreateTenantModal } from '../organization/CreateTenantModal';
import { CreateBoardModal } from '../organization/CreateBoardModal';
import { MemberManagementModal } from '../organization/MemberManagementModal';
import { ActivityDrawer } from '../activity/ActivityDrawer';
import { TaskCreateModal } from '../board/TaskCreateModal';
import { ConflictDialog } from '../common/ConflictDialog';
import { useBoard } from '../../context/BoardContext';

export const AppLayout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const { conflictState, resolveConflict, setConflictState } = useBoard();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onOpenCreateOrg={() => setIsCreateOrgOpen(true)}
        onOpenCreateTenant={() => setIsCreateTenantOpen(true)}
        onOpenCreateBoard={() => setIsCreateBoardOpen(true)}
        onOpenMembers={() => setIsMembersOpen(true)}
        onOpenActivity={() => setIsActivityOpen(true)}
      />

      <div className="lg:pl-72 flex flex-col flex-1 min-h-screen">
        <Topbar
          onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
          onOpenCreateTask={() => setIsCreateTaskOpen(true)}
        />

        <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
          {children}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <CreateOrgModal
        isOpen={isCreateOrgOpen}
        onClose={() => setIsCreateOrgOpen(false)}
      />

      <CreateTenantModal
        isOpen={isCreateTenantOpen}
        onClose={() => setIsCreateTenantOpen(false)}
      />

      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
      />

      <MemberManagementModal
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
      />

      <ActivityDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />

      <TaskCreateModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
      />

      {/* Concurrency Conflict Resolution Dialog */}
      {conflictState && (
        <ConflictDialog
          conflict={conflictState}
          onResolve={resolveConflict}
          onClose={() => setConflictState(null)}
        />
      )}
    </div>
  );
};
