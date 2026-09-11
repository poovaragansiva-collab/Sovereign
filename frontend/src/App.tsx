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
  
  // Left Sidebar State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
          
          {/* Brand */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {!sidebarCollapsed && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>SOVEREIGN</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>LOCAL AI WORKBENCH</div>
              </div>
            )}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          </div>

          {!sidebarCollapsed && (
            <button className="btn-primary" style={{ marginBottom: '24px', width: '100%' }} onClick={() => navigate('chat')}>
              + New Chat
            </button>
          )}

          <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-subtle)', marginBottom: '8px', marginTop: '8px' }}>
              {!sidebarCollapsed && 'WORKSPACE'}
            </div>
            {[
              { id: 'chat', label: 'Conversations' },
              { id: 'documents', label: 'Knowledge Base' },
              { id: 'workspace', label: 'Tasks' },
              { id: 'history', label: 'History' },
              { id: 'outputs', label: 'Outputs' },
            ].map(item => (
              <button 
                key={item.id} 
                onClick={() => navigate(item.id as View)}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: view === item.id ? 'var(--sunken)' : 'transparent',
                  color: view === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: view === item.id ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                {!sidebarCollapsed ? item.label : item.label[0]}
              </button>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-structural)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'models', label: 'Models' },
              { id: 'plugins', label: 'Plugins' },
              { id: 'settings', label: 'Settings' },
            ].map(item => (
              <button 
                key={item.id} 
                onClick={() => navigate(item.id as View)}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: view === item.id ? 'var(--sunken)' : 'transparent',
                  color: view === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {!sidebarCollapsed ? item.label : item.label[0]}
              </button>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '8px', backgroundColor: 'var(--sunken)', borderRadius: 'var(--radius-sm)' }}>
              {!sidebarCollapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', color: 'var(--canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{user?.username}</span>
                </div>
              )}
              <button onClick={() => logout()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Sign out">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
            
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-subtle)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: ollamaOnline ? '#10b981' : '#ef4444' }} />
                {ollamaOnline ? 'RUNTIME ONLINE' : 'RUNTIME OFFLINE'}
              </div>
            )}
          </div>

        </div>
      </aside>

      {/* ─────────────────────────────────────────────
          MAIN AREA (CENTER + RIGHT)
      ───────────────────────────────────────────── */}
      <div className="main-area">
        {renderView()}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;