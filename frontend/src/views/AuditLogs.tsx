import { useEffect, useState } from 'react';
import { api } from '../api';

interface LogEntry {
  id: number;
  task_id: string | null;
  action: string;
  details: string | null;
  created_at: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  TASK_CREATED: 'rgba(59,130,246,0.15)',
  TASK_EXECUTED: 'rgba(16,185,129,0.15)',
  TASK_DELETED: 'rgba(239,68,68,0.12)',
  DOCUMENT_UPLOADED: 'rgba(139,92,246,0.15)',
  DOCUMENT_DELETED: 'rgba(245,158,11,0.12)',
  MODEL_CONFIG_UPDATED: 'rgba(6,182,212,0.15)',
};

const ACTION_TEXT: Record<string, string> = {
  TASK_CREATED: '#60a5fa',
  TASK_EXECUTED: '#10b981',
  TASK_DELETED: '#ef4444',
  DOCUMENT_UPLOADED: '#a78bfa',
  DOCUMENT_DELETED: '#f59e0b',
  MODEL_CONFIG_UPDATED: '#06b6d4',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
}

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);
  const [filter, setFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.listAuditLogs(limit);
      setLogs(res.logs);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [limit]);

  const filtered = filter
    ? logs.filter(l =>
        l.action.toLowerCase().includes(filter.toLowerCase()) ||
        l.details?.toLowerCase().includes(filter.toLowerCase()) ||
        l.task_id?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  return (
    <div>
      <div className="section-header mb-4">
        <div>
          <div className="section-title">Audit Logs</div>
          <div className="section-sub">
            Showing {filtered.length} of {logs.length} entries
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="audit-search"
            className="form-input"
            style={{ width: 220, padding: '7px 12px' }}
            placeholder="🔍 Filter logs…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <select
            id="audit-limit"
            className="form-select"
            style={{ width: 110, padding: '7px 12px' }}
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={load} id="btn-refresh-audit">
            Refresh
          </button>
        </div>
      </div>

      {/* Action type legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.entries(ACTION_TEXT).map(([action, color]) => (
          <div
            key={action}
            className="audit-action-tag"
            style={{
              background: ACTION_COLORS[action] || 'rgba(100,116,139,0.1)',
              color,
              cursor: 'pointer',
              border: filter === action ? `1px solid ${color}` : '1px solid transparent',
            }}
            onClick={() => setFilter(filter === action ? '' : action)}
          >
            {action}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Loading audit logs…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No log entries found</div>
          <div className="empty-state-sub">Audit events appear here as you use SOVEREIGN.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0 20px' }}>
            {filtered.map(log => (
              <div key={log.id} className="audit-entry">
                <div
                  className="audit-action-tag"
                  style={{
                    background: ACTION_COLORS[log.action] || 'rgba(100,116,139,0.1)',
                    color: ACTION_TEXT[log.action] || 'var(--text-secondary)',
                  }}
                >
                  {log.action}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="audit-details">{log.details ?? '—'}</div>
                  {log.task_id && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                      task: {log.task_id.slice(0, 16)}…
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="audit-time">{formatRelative(log.created_at)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 2 }}>
                    {formatTime(log.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
