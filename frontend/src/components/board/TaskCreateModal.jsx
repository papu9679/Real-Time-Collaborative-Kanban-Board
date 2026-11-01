import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, UserCheck, Tag, AlertTriangle } from 'lucide-react';
import { useBoard } from '../../context/BoardContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Avatar } from '../common/Avatar';
import api from '../../services/api';

export const TaskCreateModal = ({ isOpen, onClose, initialColumnId = null }) => {
  const { createTask, columns, board } = useBoard();
  const { currentTenant } = useWorkspace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState('');
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [tenantMembers, setTenantMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default column when opened
  useEffect(() => {
    if (isOpen) {
      if (initialColumnId) {
        setColumnId(initialColumnId);
      } else if (columns.length > 0) {
        setColumnId(columns[0]._id);
      }
    }
  }, [isOpen, initialColumnId, columns]);

  // Fetch tenant members for assignees
  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentTenant?._id || !isOpen) return;
      try {
        const res = await api.get(`/tenants/${currentTenant._id}/members`);
        setTenantMembers(res.data.members || []);
      } catch (err) {
        console.warn('Failed to load members for task create:', err);
      }
    };
    fetchMembers();
  }, [currentTenant?._id, isOpen]);

  if (!isOpen) return null;

  const handleAddLabel = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = labelInput.trim().replace(/^#/, '');
      if (val && !labels.includes(val)) {
        setLabels([...labels, val]);
      }
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (tag) => {
    setLabels(labels.filter((l) => l !== tag));
  };

  const handleToggleAssignee = (userId) => {
    if (assigneeIds.includes(userId)) {
      setAssigneeIds(assigneeIds.filter((id) => id !== userId));
    } else {
      setAssigneeIds([...assigneeIds, userId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !columnId) return;

    setIsSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        columnId,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labels,
        assignees: assigneeIds
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setDueDate('');
      setLabels([]);
      setAssigneeIds([]);
      onClose();
    } catch (err) {
      console.error('Failed to create task:', err);
      alert(err.response?.data?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Create New Task</h3>
              <p className="text-xs text-slate-400">Add a task to {board?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement OAuth2 Refresh Token Rotation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full text-sm font-medium px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Column & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Column
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
              >
                {columns.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
              >
                <option value="Critical">🔴 Critical</option>
                <option value="High">🟠 High</option>
                <option value="Medium">🔵 Medium</option>
                <option value="Low">⚪ Low</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" /> Labels
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {labels.map((lbl) => (
                <span
                  key={lbl}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded"
                >
                  #{lbl}
                  <button type="button" onClick={() => handleRemoveLabel(lbl)}>
                    <X className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add labels (press Enter)..."
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={handleAddLabel}
              className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Assignees */}
          {tenantMembers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Assign To
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                {tenantMembers.map((m) => {
                  const isSelected = assigneeIds.includes(m.user._id);
                  return (
                    <button
                      key={m.user._id}
                      type="button"
                      onClick={() => handleToggleAssignee(m.user._id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950 dark:border-brand-700 dark:text-brand-300'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      <Avatar name={m.user.name} avatar={m.user.avatar} size="xs" />
                      <span>{m.user.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Task details and deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
