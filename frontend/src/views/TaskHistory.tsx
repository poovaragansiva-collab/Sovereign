import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ToastType } from '../components/ToastContainer';

interface Props {
  addToast: (type: ToastType, title: string, message?: string) => void;
}

interface Task {
  task_id: string;
  task: string;
  task_type: string;
  capability: string;
  status: string;
  model_used: string | null;
  verification_status: string | null;
  verification_confidence: number | null;
  error: string | null;
  created_time: string | null;
  completed_time: string | null;
}

interface TaskDetail extends Task {
  answer: string | null;
  files: Array<{ id: number; filename: string; file_path: string; size: number }>;
  outputs: Array<{ id: number; filename: string; file_path: string; format: string }>;
  verification: { status: string; confidence: number } | null;
}

function capBadge(cap: string) {
  const cls: Record<string, string> = {
    general: 'badge-blue', reasoning: 'badge-purple',
    coding: 'badge-cyan', vision: 'badge-amber',
  };
  return <span className={`badge ${cls[cap] || 'badge-gray'}`}>{cap}</span>;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function formatRelative(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TaskHistory({ addToast }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCap, setFilterCap] = useState('');
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.listTasks({
        status: filterStatus || undefined,
        capability: filterCap || undefined,
        limit: 100,
      });
      setTasks(res.tasks);
    } catch (e: any) {
      addToast('error', 'Failed to load tasks', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, [filterStatus, filterCap]);

  const openDetail = async (taskId: string) => {
    setDetailLoading(true);
    try {
      const d = await api.getTask(taskId);
      setDetail(d);
    } catch (e: any) {
      addToast('error', 'Failed to load task details', e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task and all its data?')) return;
    setDeleting(taskId);
    try {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.task_id !== taskId));
      if (detail?.task_id === taskId) setDetail(null);
      addToast('success', 'Task deleted');
    } catch (e: any) {
      addToast('error', 'Failed to delete task', e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="section-header mb-4">
        <div>
          <div className="section-title">Task History</div>
          <div className="section-sub">{tasks.length} task{tasks.length !== 1 ? 's' : ''} found</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            id="filter-status"
            className="form-select"
            style={{ width: 140, padding: '7px 12px' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
            <option value="executing">Executing</option>
          </select>
          <select
            id="filter-capability"
            className="form-select"
            style={{ width: 140, padding: '7px 12px' }}
            value={filterCap}
            onChange={e => setFilterCap(e.target.value)}
          >
            <option value="">All Capabilities</option>
            <option value="general">General</option>
            <option value="reasoning">Reasoning</option>
            <option value="coding">Coding</option>
            <option value="vision">Vision</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={loadTasks} id="btn-refresh-tasks">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" /><span>Loading tasks…</span></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🕐</div>
          <div className="empty-state-title">No tasks found</div>
          <div className="empty-state-sub">Run a task from the workspace to see it here.</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Capability</th>
                <th>Status</th>
                <th>Model</th>
                <th>Verification</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.task_id} style={{ cursor: 'pointer' }}>
                  <td
                    style={{ maxWidth: 260 }}
                    onClick={() => openDetail(t.task_id)}
                  >
                    <span className="truncate" style={{ display: 'block', fontSize: 13 }}>
                      {t.task}
                    </span>
                    <span className="td-mono" style={{ fontSize: 10, opacity: 0.5 }}>
                      {t.task_id.slice(0, 8)}
                    </span>
                  </td>
                  <td onClick={() => openDetail(t.task_id)}>{capBadge(t.capability)}</td>
                  <td onClick={() => openDetail(t.task_id)}>
                    <span className={`status-badge ${t.status}`}>{t.status}</span>
                  </td>
                  <td className="td-mono" onClick={() => openDetail(t.task_id)}>
                    {t.model_used ?? '—'}
                  </td>
                  <td onClick={() => openDetail(t.task_id)}>
                    {t.verification_confidence != null ? (
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: t.verification_confidence >= 0.7
                          ? 'var(--brand-green)'
                          : t.verification_confidence >= 0.4
                          ? 'var(--brand-amber)'
                          : 'var(--brand-red)',
                      }}>
                        {Math.round(t.verification_confidence * 100)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="td-muted" onClick={() => openDetail(t.task_id)}>
                    {formatRelative(t.created_time)}
                  </td>
                  <td>
                    <div className="td-actions">
                      <button
                        id={`btn-view-${t.task_id.slice(0,8)}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => openDetail(t.task_id)}
                      >
                        View
                      </button>
                      <button
                        id={`btn-delete-${t.task_id.slice(0,8)}`}
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteTask(t.task_id)}
                        disabled={deleting === t.task_id}
                      >
                        {deleting === t.task_id ? '…' : '✕'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Panel */}
      {(detail || detailLoading) && (
        <>
          <div className="overlay" onClick={() => setDetail(null)} />
          <div className="detail-panel">
            <div className="detail-panel-header">
              <div className="detail-panel-title">
                {detailLoading ? 'Loading…' : 'Task Details'}
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDetail(null)}
                id="btn-close-detail"
              >
                ✕ Close
              </button>
            </div>

            {detailLoading ? (
              <div className="loading-overlay"><div className="loading-spinner" /></div>
            ) : detail ? (
              <div className="detail-panel-body">
                {/* Status row */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  <span className={`status-badge ${detail.status}`}>{detail.status}</span>
                  {capBadge(detail.capability)}
                  <span className="badge badge-gray">{detail.task_type}</span>
                </div>

                {/* Prompt */}
                <div className="detail-section">
                  <div className="detail-section-title">Prompt</div>
                  <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                  }}>
                    {detail.task}
                  </div>
                </div>

                {/* Meta */}
                <div className="detail-section">
                  <div className="detail-section-title">Metadata</div>
                  <div className="detail-meta-grid">
                    <div className="detail-meta-item">
                      <div className="detail-meta-label">Task ID</div>
                      <div className="detail-meta-value" style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
                        {detail.task_id}
                      </div>
                    </div>
                    <div className="detail-meta-item">
                      <div className="detail-meta-label">Model Used</div>
                      <div className="detail-meta-value" style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>
                        {detail.model_used ?? '—'}
                      </div>
                    </div>
                    <div className="detail-meta-item">
                      <div className="detail-meta-label">Created</div>
                      <div className="detail-meta-value" style={{ fontSize: 12 }}>{formatDate(detail.created_time)}</div>
                    </div>
                    <div className="detail-meta-item">
                      <div className="detail-meta-label">Completed</div>
                      <div className="detail-meta-value" style={{ fontSize: 12 }}>{formatDate(detail.completed_time)}</div>
                    </div>
                  </div>
                </div>

                {/* Verification */}
                {detail.verification && (
                  <div className="detail-section">
                    <div className="detail-section-title">Verification</div>
                    <div className="detail-meta-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          Status: <strong>{detail.verification.status}</strong>
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: detail.verification.confidence >= 0.7 ? 'var(--brand-green)' : 'var(--brand-amber)' }}>
                          {Math.round(detail.verification.confidence * 100)}%
                        </span>
                      </div>
                      <div className="verification-bar-container">
                        <div
                          className={`verification-bar ${detail.verification.confidence >= 0.7 ? 'high' : detail.verification.confidence >= 0.4 ? 'medium' : 'low'}`}
                          style={{ width: `${Math.round(detail.verification.confidence * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {detail.error && (
                  <div className="detail-section">
                    <div className="detail-section-title">Error</div>
                    <div className="error-block">{detail.error}</div>
                  </div>
                )}

                {/* Answer */}
                {detail.answer && (
                  <div className="detail-section">
                    <div className="detail-section-title">AI Response</div>
                    <div className="answer-block">{detail.answer}</div>
                  </div>
                )}

                {/* Generated outputs */}
                {detail.outputs && detail.outputs.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">Generated Files</div>
                    {detail.outputs.map(o => (
                      <a
                        key={o.id}
                        href={api.getFileDownloadUrl(detail.task_id, o.format)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ display: 'flex', marginBottom: 6 }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {o.filename}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
