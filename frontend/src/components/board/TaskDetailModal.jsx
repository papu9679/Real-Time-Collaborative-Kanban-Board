import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  UserCheck,
  Tag,
  Clock,
  ShieldCheck,
  Trash2,
  Save,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { useBoard } from '../../context/BoardContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Avatar } from '../common/Avatar';
import api from '../../services/api';

export const TaskDetailModal = ({ task, onClose, members = [] }) => {
  const { updateTask, deleteTask, columns } = useBoard();
  const { isTenantAdmin } = useWorkspace();

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [columnId, setColumnId] = useState(task?.columnId || '');
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''
  );
  const [labels, setLabels] = useState(task?.labels || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [assigneeIds, setAssigneeIds] = useState(
    (task?.assignees || []).map((a) => (a._id || a).toString())
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [taskActivities, setTaskActivities] = useState([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setColumnId(task.columnId || '');
      setPriority(task.priority || 'Medium');
      setDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
      setLabels(task.labels || []);
      setAssigneeIds((task.assignees || []).map((a) => (a._id || a).toString()));

      // Fetch task-related activities
      const fetchHistory = async () => {
        try {
          const res = await api.get(`/boards/${task.boardId}/activity`);
          const allActs = res.data.activities || [];
          const forThisTask = allActs.filter(
            (a) => a.resourceId === task._id || a.metadata?.taskTitle === task.title
          );
          setTaskActivities(forThisTask);
        } catch (err) {
          console.warn('Failed to load activity for task:', err);
        }
      };
      fetchHistory();
    }
  }, [task]);

  if (!task) return null;

  const handleAddLabel = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = newTagInput.trim().replace(/^#/, '');
      if (trimmed && !labels.includes(trimmed)) {
        setLabels([...labels, trimmed]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveLabel = (tagToRemove) => {
    setLabels(labels.filter((l) => l !== tagToRemove));
  };

  const handleToggleAssignee = (userId) => {
    if (assigneeIds.includes(userId)) {
      setAssigneeIds(assigneeIds.filter((id) => id !== userId));
    } else {
      setAssigneeIds([...assigneeIds, userId]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const result = await updateTask(task._id, {
        title: title.trim(),
        description: description.trim(),
        columnId,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labels,
        assignees: assigneeIds
      });

      if (result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      alert(err.response?.data?.message || 'Error updating task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      await deleteTask(task._id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
              title="Optimistic Concurrency Control Version"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              v{task.version}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Task Details
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Title input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-base font-bold text-slate-900 dark:text-slate-100 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Task title..."
            />
          </div>

          {/* Grid properties */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status Column */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Column Status
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
              >
                {columns.map((col) => (
                  <option key={col._id} value={col._id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
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
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Assignees
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {members.map((m) => {
                const isSelected = assigneeIds.includes(m.user._id);
                return (
                  <button
                    key={m.user._id}
                    type="button"
                    onClick={() => handleToggleAssignee(m.user._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/80 dark:border-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Avatar name={m.user.name} avatar={m.user.avatar} size="xs" />
                    <span>{m.user.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Labels / Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" /> Labels
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {labels.map((lbl) => (
                <span
                  key={lbl}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  #{lbl}
                  <button
                    onClick={() => handleRemoveLabel(lbl)}
                    className="hover:text-rose-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Type label and press Enter..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleAddLabel}
              className="w-full text-sm px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add detailed task description..."
              className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Task History Timeline */}
          {taskActivities.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Task Activity History
              </label>
              <div className="space-y-2.5">
                {taskActivities.slice(0, 5).map((act) => (
                  <div
                    key={act._id}
                    className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400"
                  >
                    <Avatar
                      name={act.actorId?.name || 'User'}
                      avatar={act.actorId?.avatar}
                      size="xs"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {act.actorId?.name || 'Someone'}
                      </span>{' '}
                      performed <span className="font-mono text-brand-600">{act.action}</span>
                      <p className="text-[10px] text-slate-400">
                        {format(new Date(act.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Last updated: {task.updatedAt ? format(new Date(task.updatedAt), 'MMM d, h:mm a') : 'Recently'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all ${
                saveSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-brand-600 hover:bg-brand-700 active:scale-95'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
