import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Shield, UserX } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Avatar } from '../common/Avatar';
import api from '../../services/api';

export const MemberManagementModal = ({ isOpen, onClose }) => {
  const { currentTenant, isTenantAdmin } = useWorkspace();
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchMembers = async () => {
    if (!currentTenant?._id) return;
    try {
      setLoading(true);
      const res = await api.get(`/tenants/${currentTenant._id}/members`);
      setMembers(res.data.members || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, currentTenant?._id]);

  if (!isOpen) return null;

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!email.trim() || !currentTenant?._id) return;

    setIsAdding(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post(`/tenants/${currentTenant._id}/members`, {
        email: email.trim(),
        role
      });
      setEmail('');
      setSuccessMsg('Member added successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (membershipId, newRole) => {
    if (!currentTenant?._id || !membershipId) return;
    try {
      await api.patch(`/tenants/${currentTenant._id}/members/${membershipId}`, {
        role: newRole
      });
      await fetchMembers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (membershipId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this branch?`)) return;
    try {
      await api.delete(`/tenants/${currentTenant._id}/members/${membershipId}`);
      await fetchMembers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Team & Branch Members</h3>
              <p className="text-xs text-slate-400">{currentTenant?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-900">
            {successMsg}
          </div>
        )}

        {/* Invite Member Section (Tenant Admins & Org Admins) */}
        {isTenantAdmin && (
          <form onSubmit={handleAddMember} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 mb-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <UserPlus className="w-3.5 h-3.5 text-brand-500" />
              <span>Invite Member to {currentTenant?.name}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                placeholder="collaborator@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="text-xs px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="member">Member</option>
                <option value="tenant_admin">Branch Admin</option>
              </select>
              <button
                type="submit"
                disabled={isAdding || !email.trim()}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-all shrink-0"
              >
                {isAdding ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Active Members ({members.length})
          </h4>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {members.map((m) => (
              <div
                key={m.user._id}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={m.user.name} avatar={m.user.avatar} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {m.user.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{m.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {m.isOrgAdmin ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Org Admin
                    </span>
                  ) : isTenantAdmin ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.membershipId, e.target.value)}
                      className="text-[11px] font-medium py-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                    >
                      <option value="member">Member</option>
                      <option value="tenant_admin">Branch Admin</option>
                    </select>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500 capitalize">
                      {m.role === 'tenant_admin' ? 'Branch Admin' : 'Member'}
                    </span>
                  )}

                  {isTenantAdmin && !m.isOrgAdmin && (
                    <button
                      onClick={() => handleRemoveMember(m.membershipId, m.user.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Remove member"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {members.length === 0 && !loading && (
              <p className="text-xs text-slate-400 text-center py-4">No members assigned to this branch.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
