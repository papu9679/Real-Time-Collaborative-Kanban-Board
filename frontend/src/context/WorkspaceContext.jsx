import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [userRole, setUserRole] = useState('member');
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setOrganizations([]);
      setCurrentOrg(null);
      setCurrentTenant(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/organizations');
      const orgs = res.data.organizations || [];
      setOrganizations(orgs);

      if (orgs.length > 0) {
        // Choose existing or first org
        const activeOrgId = localStorage.getItem('flowspace_active_org_id');
        const selectedOrg = orgs.find(o => o._id === activeOrgId) || orgs[0];
        setCurrentOrg(selectedOrg);
        localStorage.setItem('flowspace_active_org_id', selectedOrg._id);

        // Determine tenant in active org
        const branches = selectedOrg.tenants || [];
        const activeTenantId = localStorage.getItem('flowspace_active_tenant_id');
        const selectedTenant = branches.find(t => t._id === activeTenantId) || branches[0] || null;
        setCurrentTenant(selectedTenant);
        if (selectedTenant) {
          localStorage.setItem('flowspace_active_tenant_id', selectedTenant._id);
        }

        // Determine role
        setUserRole(selectedOrg.role || 'member');
      } else {
        setCurrentOrg(null);
        setCurrentTenant(null);
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchOrganization = (orgId) => {
    const org = organizations.find(o => o._id === orgId);
    if (!org) return;

    setCurrentOrg(org);
    localStorage.setItem('flowspace_active_org_id', org._id);

    const firstTenant = (org.tenants && org.tenants[0]) || null;
    setCurrentTenant(firstTenant);
    if (firstTenant) {
      localStorage.setItem('flowspace_active_tenant_id', firstTenant._id);
    } else {
      localStorage.removeItem('flowspace_active_tenant_id');
    }

    setUserRole(org.role || 'member');
  };

  const switchTenant = (tenantId) => {
    if (!currentOrg || !currentOrg.tenants) return;
    const tenant = currentOrg.tenants.find(t => t._id === tenantId);
    if (!tenant) return;

    setCurrentTenant(tenant);
    localStorage.setItem('flowspace_active_tenant_id', tenant._id);
  };

  const createOrganization = async (name, slug) => {
    const res = await api.post('/organizations', { name, slug });
    await fetchWorkspaces();
    return res.data;
  };

  const createTenant = async (name) => {
    if (!currentOrg) return;
    const res = await api.post(`/organizations/${currentOrg._id}/tenants`, { name });
    await fetchWorkspaces();
    return res.data;
  };

  const isOrgAdmin = currentOrg?.isOrgAdmin || userRole === 'org_admin';
  const isTenantAdmin = isOrgAdmin || userRole === 'tenant_admin';

  return (
    <WorkspaceContext.Provider
      value={{
        organizations,
        currentOrg,
        currentTenant,
        userRole,
        isOrgAdmin,
        isTenantAdmin,
        loading,
        switchOrganization,
        switchTenant,
        createOrganization,
        createTenant,
        refreshWorkspace: fetchWorkspaces
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
};
