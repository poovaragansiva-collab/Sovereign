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
    total_conversations?: number;
    configured_models: number;
    detected_models: number;
    ollama_online: boolean;
    rag_vectorstore?: string;
    rag_indexed_chunks?: number;
    plugins_installed?: number;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Local Air-Gapped Sovereign Status Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 25, 40, 0.95), rgba(15, 20, 32, 0.95))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            🛡️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
                SOVEREIGN Local-First Security Enclave
              </span>
              <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                100% Local Inference
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '3px' }}>
              Zero cloud telemetry or data leakage. Ollama engine running on localhost with safe SQLite persistence.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '13px'
          }}>
            <span style={{ color: '#94a3b8' }}>Ollama Engine: </span>
            <strong style={{ color: m?.ollama_online ? 'var(--brand-green)' : 'var(--brand-red)' }}>
              {m?.ollama_online ? 'Connected' : 'Offline'}
            </strong>
          </div>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '13px'
          }}>
            <span style={{ color: '#94a3b8' }}>RAG Engine: </span>
            <strong style={{ color: '#38bdf8' }}>{m?.rag_vectorstore ?? 'chromadb'}</strong>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('chat')}>
          <div className="metric-icon blue">💬</div>
          <div className="metric-label">Conversations</div>
          <div className="metric-value">{m?.total_conversations ?? 0}</div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('history')}>
          <div className="metric-icon green">✓</div>
          <div className="metric-label">Completed Tasks</div>
          <div className="metric-value">{m?.completed_tasks ?? 0}</div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('documents')}>
          <div className="metric-icon purple">📄</div>
          <div className="metric-label">Documents</div>
          <div className="metric-value">{m?.total_documents ?? 0}</div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('rag')}>
          <div className="metric-icon cyan">🧩</div>
          <div className="metric-label">RAG Chunks</div>
          <div className="metric-value">{m?.rag_indexed_chunks ?? 0}</div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('models')}>
          <div className="metric-icon teal">🤖</div>
          <div className="metric-label">Local Models</div>
          <div className="metric-value">{m?.detected_models ?? 0}</div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('plugins')}>
          <div className="metric-icon amber">🔌</div>
          <div className="metric-label">Local Plugins</div>
          <div className="metric-value">{m?.plugins_installed ?? 4}</div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          id="dashboard-open-chat"
          className="btn btn-primary"
          onClick={() => onNavigate('chat')}
          style={{ padding: '9px 18px' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Open Chat Workbench
        </button>
        <button
          id="dashboard-new-task"
          className="btn btn-secondary"
          onClick={() => onNavigate('workspace')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          New Quick Task
        </button>
        <button
          id="dashboard-rag-diagnostics"
          className="btn btn-secondary"
          onClick={() => onNavigate('rag')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          RAG Diagnostics
        </button>
        <button
          id="dashboard-output-gallery"
          className="btn btn-secondary"
          onClick={() => onNavigate('outputs')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Output Gallery
        </button>
        <button
          id="dashboard-plugins"
          className="btn btn-secondary"
          onClick={() => onNavigate('plugins')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <path d="M12 2v6m0 8v6M2 12h6m8 0h6" />
          </svg>
          Plugins
        </button>
        <button
          id="dashboard-upload-doc"
          className="btn btn-secondary"
          onClick={() => onNavigate('documents')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
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
          style={{ marginLeft: 'auto' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Recent Tasks */}
      <div className="section-header" style={{ marginTop: '10px' }}>
        <div>
          <div className="section-title">Recent Tasks</div>
          <div className="section-sub">Latest AI task executions and outcomes</div>
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
            <div className="empty-state-sub">Run your first AI task or start a chat to see activity here</div>
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

