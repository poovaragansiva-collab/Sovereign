import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { api } from './api';
import Dashboard from './views/Dashboard';
import TaskWorkspace from './views/TaskWorkspace';
import TaskHistory from './views/TaskHistory';
import DocumentManager from './views/DocumentManager';
import ModelManager from './views/ModelManager';
import AuditLogs from './views/AuditLogs';
import ToastContainer, { useToasts } from './components/ToastContainer';

type View = 'dashboard' | 'workspace' | 'history' | 'documents' | 'models' | 'audit';

const NAV_ITEMS: { id: View; label: string; icon: React.ReactElement }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'workspace',
    label: 'New Task',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'Task History',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'models',
    label: 'Models',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const { toasts, addToast, removeToast } = useToasts();

  // Check Ollama status periodically
  const checkStatus = useCallback(async () => {
    try {
      const data = await api.getDashboardStats();
      setOllamaOnline(data.metrics?.ollama_online ?? false);
      setPendingCount(data.metrics?.pending_tasks ?? 0);
    } catch {
      setOllamaOnline(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const viewTitles: Record<View, string> = {
    dashboard: 'Dashboard',
    workspace: 'New Task',
    history: 'Task History',
    documents: 'Document Manager',
    models: 'Model Management',
    audit: 'Audit Logs',
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-title">SOVEREIGN</div>
          <div className="logo-sub">Local AI Workbench</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item${view === item.id ? ' active' : ''}`}
              onClick={() => setView(item.id)}
              id={`nav-${item.id}`}
            >
              {item.icon}
              {item.label}
              {item.id === 'workspace' && pendingCount > 0 && (
                <span className="badge">{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator">
            <div className={`status-dot ${ollamaOnline === true ? 'online' : ollamaOnline === false ? 'offline' : ''}`} />
            <span>
              {ollamaOnline === null
                ? 'Checking Ollama...'
                : ollamaOnline
                ? 'Ollama Online'
                : 'Ollama Offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{viewTitles[view]}</span>
          <div className="topbar-right">
            <button
              className="btn btn-secondary btn-sm"
              onClick={checkStatus}
              id="btn-refresh-status"
              title="Refresh status"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        <main className="content-area">
          {view === 'dashboard' && (
            <Dashboard
              onNavigate={(v) => setView(v as View)}
              addToast={addToast}
            />
          )}
          {view === 'workspace' && (
            <TaskWorkspace addToast={addToast} onTaskComplete={() => setView('history')} />
          )}
          {view === 'history' && (
            <TaskHistory addToast={addToast} />
          )}
          {view === 'documents' && (
            <DocumentManager addToast={addToast} />
          )}
          {view === 'models' && (
            <ModelManager addToast={addToast} />
          )}
          {view === 'audit' && (
            <AuditLogs />
          )}
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
