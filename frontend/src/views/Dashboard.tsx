import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ToastType } from '../components/ToastContainer';

interface Props {
  onNavigate: (view: string) => void;
  addToast: (type: ToastType, title: string, message?: string) => void;
}

interface DashboardData {
  metrics: {
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    pending_tasks: number;
    total_documents: number;
    configured_models: number;
    detected_models: number;
    ollama_online: boolean;
  };
  recent_tasks: Array<{
    task_id: string;
    task: string;
    capability: string;
    status: string;
    model_used: string | null;
    created_at: string | null;
    completed_at: string | null;
  }>;
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

function statusBadge(status: string) {
  return <span className={`status-badge ${status}`}>{status}</span>;
}

function capBadge(cap: string) {
  const cls: Record<string, string> = {
    general: 'badge-blue',
    reasoning: 'badge-purple',
    coding: 'badge-cyan',
    vision: 'badge-amber',
    embedding: 'badge-gray',
  };
  return <span className={`badge ${cls[cap] || 'badge-gray'}`}>{cap}</span>;
}

export default function Dashboard({ onNavigate, addToast }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const d = await api.getDashboardStats();
      setData(d);
    } catch (e: any) {
      addToast('error', 'Failed to load dashboard', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  const m = data?.metrics;

  return (
    <div>
      {/* Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon blue">⚡</div>
          <div className="metric-label">Total Tasks</div>
          <div className="metric-value">{m?.total_tasks ?? 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon green">✓</div>
          <div className="metric-label">Completed</div>
          <div className="metric-value">{m?.completed_tasks ?? 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon red">✗</div>
          <div className="metric-label">Failed</div>
          <div className="metric-value">{m?.failed_tasks ?? 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon amber">◷</div>
          <div className="metric-label">Pending</div>
          <div className="metric-value">{m?.pending_tasks ?? 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon purple">📄</div>
          <div className="metric-label">Documents</div>
          <div className="metric-value">{m?.total_documents ?? 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon teal">🤖</div>
          <div className="metric-label">Models Active</div>
          <div className="metric-value">{m?.configured_models ?? 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon cyan">🔍</div>
          <div className="metric-label">Ollama Models</div>
          <div className="metric-value">{m?.detected_models ?? 0}</div>
        </div>
        <div className="metric-card" style={{ cursor: 'default' }}>
          <div className={`metric-icon ${m?.ollama_online ? 'green' : 'red'}`}>
            {m?.ollama_online ? '🟢' : '🔴'}
          </div>
          <div className="metric-label">Ollama Status</div>
          <div
            className="metric-value"
            style={{
              fontSize: 16,
              color: m?.ollama_online ? 'var(--brand-green)' : 'var(--brand-red)',
            }}
          >
            {m?.ollama_online ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6">
        <button
          id="dashboard-new-task"
          className="btn btn-primary"
          onClick={() => onNavigate('workspace')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          New Task
        </button>
        <button
          id="dashboard-upload-doc"
          className="btn btn-secondary"
          onClick={() => onNavigate('documents')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Document
        </button>
        <button
          id="dashboard-refresh"
          className="btn btn-secondary"
          onClick={load}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Recent Tasks */}
      <div className="section-header">
        <div>
          <div className="section-title">Recent Tasks</div>
          <div className="section-sub">Last 10 AI executions</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('history')}>
          View All →
        </button>
      </div>

      <div className="table-wrapper">
        {!data?.recent_tasks?.length ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <div className="empty-state-title">No tasks yet</div>
            <div className="empty-state-sub">Run your first AI task to see it here</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Capability</th>
                <th>Status</th>
                <th>Model</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_tasks.map(t => (
                <tr key={t.task_id}>
                  <td style={{ maxWidth: 280 }}>
                    <span className="truncate" style={{ display: 'block' }}>
                      {t.task}
                    </span>
                  </td>
                  <td>{capBadge(t.capability)}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td className="td-mono">{t.model_used ?? '—'}</td>
                  <td className="td-muted">{formatRelative(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
