import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { api } from './api';
import { useAuth } from './context/AuthContext';

import Dashboard from './views/Dashboard';
import ChatWorkspace from './views/ChatWorkspace';
import TaskWorkspace from './views/TaskWorkspace';
import TaskHistory from './views/TaskHistory';
import DocumentManager from './views/DocumentManager';
import ModelManager from './views/ModelManager';
import RAGDiagnostics from './views/RAGDiagnostics';
import PluginManager from './views/PluginManager';
import OutputGallery from './views/OutputGallery';
import AuditLogs from './views/AuditLogs';
import Settings from './views/Settings';

import ToastContainer, { useToasts } from './components/ToastContainer';

type View =
  | 'chat'
  | 'dashboard'
  | 'workspace'
  | 'documents'
  | 'rag'
  | 'models'
  | 'plugins'
  | 'outputs'
  | 'history'
  | 'audit'
  | 'settings';

function App() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('chat');

  // Status State
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  
  const { toasts, addToast, removeToast } = useToasts();

  const checkStatus = useCallback(async () => {
    try {
      const data = await api.getDashboardStats();
      setOllamaOnline(data.metrics?.ollama_online ?? false);
    } catch {
      setOllamaOnline(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const navigate = (nextView: View) => {
    setView(nextView);
  };

  const renderView = () => {
    switch (view) {
      case 'chat': return <ChatWorkspace addToast={addToast} />;
      case 'dashboard': return <Dashboard onNavigate={(v) => navigate(v as View)} addToast={addToast} />;
      case 'workspace': return <TaskWorkspace addToast={addToast} onTaskComplete={() => navigate('history')} />;
      case 'history': return <TaskHistory addToast={addToast} />;
      case 'documents': return <DocumentManager addToast={addToast} />;
      case 'rag': return <RAGDiagnostics addToast={addToast} />;
      case 'models': return <ModelManager addToast={addToast} />;
      case 'plugins': return <PluginManager addToast={addToast} />;
      case 'outputs': return <OutputGallery addToast={addToast} />;
      case 'audit': return <AuditLogs />;
      case 'settings': return <Settings addToast={addToast} />;
      default: return null;
    }
  };

  return (
    <div className="app-shell">
      {/* ─────────────────────────────────────────────
          LEFT SIDEBAR
      ───────────────────────────────────────────── */}
      <aside className="sidebar fixed-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', padding: '12px' }}>
          
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--border-structural)', marginBottom: '12px' }}>
            <div style={{ width: '24px', height: '24px', backgroundColor: 'var(--text-primary)', borderRadius: '4px' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-newsreader)', fontSize: '18px', fontWeight: 500, lineHeight: 1, color: 'var(--text-primary)' }}>
                SOVEREIGN
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
                v2.4 on-prem
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '12px' }} onClick={() => navigate('chat')}>
              New Chat <span style={{ color: 'rgba(255,255,255,0.7)' }}>[⌘N]</span>
            </button>
          </div>

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Nav Group 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="nav-group-title">
                Core Platform
              </span>
              {[
                { id: 'chat', label: 'Conversations' },
                { id: 'documents', label: 'Knowledge Base' },
                { id: 'workspace', label: 'Task Execution' },
              ].map(item => (
                <button 
                  key={item.id} 
                  onClick={() => navigate(item.id as View)}
                  className={`nav-item ${view === item.id ? 'active' : ''}`}
                >
                  <span className="nav-item-text">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Nav Group 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="nav-group-title">
                Telemetry & Logs
              </span>
              {[
                { id: 'history', label: 'Task History' },
                { id: 'outputs', label: 'Output Artifacts' },
                { id: 'audit', label: 'Audit Logs' },
              ].map(item => (
                <button 
                  key={item.id} 
                  onClick={() => navigate(item.id as View)}
                  className={`nav-item ${view === item.id ? 'active' : ''}`}
                >
                  <span className="nav-item-text">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="status-indicator">
            <div className={`status-dot ${ollamaOnline ? 'online' : 'offline'}`}></div>
            <span className="status-text">
              {ollamaOnline ? 'Ollama Air-Gapped' : 'Runtime Offline'}
            </span>
          </div>

          <div className="user-profile">
            <div className="user-avatar">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">
                {user?.username}
              </span>
              <span className="user-role">Operator</span>
            </div>
          </div>

          <div className="footer-actions">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="footer-btn primary" onClick={() => navigate('settings')} title="Settings">Settings</button>
              <button className="footer-btn primary" onClick={() => navigate('models')} title="Models">Models</button>
            </div>
            <button className="footer-btn secondary" onClick={() => logout()} title="Sign out">
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────
          MAIN AREA (CENTER)
      ───────────────────────────────────────────── */}
      <div className="main-area" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: 'calc(100vw - 240px)' }}>
        <header style={{ height: '56px', borderBottom: '1px solid var(--border-structural)', display: 'flex', alignItems: 'center', padding: '0 24px', backgroundColor: 'var(--canvas)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--sunken)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-structural)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                Local • Air-Gapped • Secure
              </span>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {renderView()}
        </main>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;