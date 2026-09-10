import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { api } from './api';

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

type NavItem = {
  id: View;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const Icon = ({
  children,
  size = 20,
}: {
  children: React.ReactNode;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  {
    id: 'chat',
    label: 'Chat Workbench',
    description: 'Multi-turn AI conversations',
    icon: (
      <Icon>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        <path d="M8 10h8M8 14h5" />
      </Icon>
    ),
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'System overview & telemetry',
    icon: (
      <Icon>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </Icon>
    ),
  },
  {
    id: 'workspace',
    label: 'Quick Task',
    description: 'Execute an AI task',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </Icon>
    ),
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Knowledge base',
    icon: (
      <Icon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </Icon>
    ),
  },
  {
    id: 'rag',
    label: 'RAG Diagnostics',
    description: 'Retrieval & vector testing',
    icon: (
      <Icon>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5M10.5 7.5v6M7.5 10.5h6" />
      </Icon>
    ),
  },
  {
    id: 'models',
    label: 'Local Models',
    description: 'Manage AI models',
    icon: (
      <Icon>
        <ellipse cx="12" cy="5" rx="8.5" ry="3" />
        <path d="M3.5 5v7c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3V5" />
        <path d="M3.5 12v7c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3v-7" />
      </Icon>
    ),
  },
  {
    id: 'plugins',
    label: 'Plugins',
    description: 'Local integrations',
    icon: (
      <Icon>
        <path d="M9 3v3a3 3 0 1 0 6 0V3" />
        <path d="M15 21v-3a3 3 0 1 0-6 0v3" />
        <path d="M3 9h3a3 3 0 1 1 0 6H3" />
        <path d="M21 15h-3a3 3 0 1 1 0-6h3" />
      </Icon>
    ),
  },
  {
    id: 'outputs',
    label: 'Output Gallery',
    description: 'Generated artifacts',
    icon: (
      <Icon>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5M12 15V3" />
      </Icon>
    ),
  },
  {
    id: 'history',
    label: 'Task History',
    description: 'Previous executions',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
        <path d="M3 4v5h5" />
        <path d="M3.5 9A9 9 0 0 1 20 7" />
      </Icon>
    ),
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    description: 'Governance & activity',
    icon: (
      <Icon>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </Icon>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'System & workspace preferences',
    icon: (
      <Icon>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </Icon>
    ),
  },
];

const VIEW_TITLES: Record<
  View,
  { title: string; subtitle: string }
> = {
  chat: {
    title: 'Chat Workbench',
    subtitle: 'Private multi-turn conversations with your local models',
  },
  dashboard: {
    title: 'System Dashboard',
    subtitle: 'Monitor your local AI infrastructure and workloads',
  },
  workspace: {
    title: 'Quick Task',
    subtitle: 'Run an AI task directly against your local environment',
  },
  history: {
    title: 'Task History',
    subtitle: 'Review previous task executions and results',
  },
  documents: {
    title: 'Document Knowledge Base',
    subtitle: 'Manage documents available to your local RAG pipeline',
  },
  rag: {
    title: 'RAG Diagnostics',
    subtitle: 'Inspect retrieval quality and vector search behaviour',
  },
  models: {
    title: 'Local Model Hub',
    subtitle: 'Manage locally hosted AI models',
  },
  plugins: {
    title: 'Plugin Registry',
    subtitle: 'Configure local tools and integrations',
  },
  outputs: {
    title: 'Output Gallery',
    subtitle: 'Browse and export generated artifacts',
  },
  audit: {
    title: 'Audit & Governance',
    subtitle: 'Review system activity and governance events',
  },
  settings: {
    title: 'Settings & Telemetry',
    subtitle: 'Configure local inference, RAG thresholds, and air-gapped policies',
  },
};

function App() {
  const [view, setView] = useState<View>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sovereign_sidebar_collapsed') === 'true'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((val) => {
      const next = !val;
      localStorage.setItem('sovereign_sidebar_collapsed', String(next));
      return next;
    });
  };

  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const { toasts, addToast, removeToast } = useToasts();

  const checkStatus = useCallback(async () => {
    setCheckingStatus(true);

    try {
      const data = await api.getDashboardStats();

      setOllamaOnline(data.metrics?.ollama_online ?? false);
      setPendingCount(data.metrics?.pending_tasks ?? 0);
      setLastChecked(new Date());
    } catch {
      setOllamaOnline(false);
      setLastChecked(new Date());
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, [checkStatus]);

  const navigate = (nextView: View) => {
    setView(nextView);
    setMobileMenuOpen(false);
  };

  const currentPage = VIEW_TITLES[view];

  const renderView = () => {
    switch (view) {
      case 'chat':
        return <ChatWorkspace addToast={addToast} />;

      case 'dashboard':
        return (
          <Dashboard
            onNavigate={(v) => navigate(v as View)}
            addToast={addToast}
          />
        );

      case 'workspace':
        return (
          <TaskWorkspace
            addToast={addToast}
            onTaskComplete={() => navigate('history')}
          />
        );

      case 'history':
        return <TaskHistory addToast={addToast} />;

      case 'documents':
        return <DocumentManager addToast={addToast} />;

      case 'rag':
        return <RAGDiagnostics addToast={addToast} />;

      case 'models':
        return <ModelManager addToast={addToast} />;

      case 'plugins':
        return <PluginManager addToast={addToast} />;

      case 'outputs':
        return <OutputGallery addToast={addToast} />;

      case 'audit':
        return <AuditLogs />;

      case 'settings':
        return <Settings addToast={addToast} />;

      default:
        return null;
    }
  };

  const statusLabel =
    ollamaOnline === null
      ? 'Checking local runtime'
      : ollamaOnline
        ? 'Local runtime online'
        : 'Local runtime offline';

  return (
    <div
      className={[
        'app-shell',
        sidebarCollapsed ? 'sidebar-is-collapsed' : '',
        mobileMenuOpen ? 'mobile-menu-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Ambient background */}
      <div className="app-background" aria-hidden="true">
        <div className="background-orb background-orb-one" />
        <div className="background-orb background-orb-two" />
        <div className="background-grid" />
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ─────────────────────────────────────────────
          SIDEBAR
      ───────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-inner">
          {/* Brand */}
          <div className="brand">
            <div className="brand-mark">
              <div className="brand-mark-inner">
                <span />
                <span />
                <span />
              </div>
            </div>

            {!sidebarCollapsed && (
              <div className="brand-copy">
                <div className="brand-name">
                  SOVEREIGN
                </div>
                <div className="brand-tagline">
                  LOCAL AI WORKBENCH
                </div>
              </div>
            )}
          </div>

          {/* Collapse button */}
          <button
            className="sidebar-collapse"
            onClick={toggleSidebar}
            title={
              sidebarCollapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
            aria-label={
              sidebarCollapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
          >
            <Icon size={16}>
              {sidebarCollapsed ? (
                <>
                  <path d="m9 18 6-6-6-6" />
                </>
              ) : (
                <>
                  <path d="m15 18-6-6 6-6" />
                </>
              )}
            </Icon>
          </button>

          {/* Navigation */}
          <nav className="sidebar-nav" aria-label="Main navigation">
            {!sidebarCollapsed && (
              <div className="nav-heading">
                <span>WORKSPACE</span>
              </div>
            )}

            {NAV_ITEMS.map((item) => {
              const active = view === item.id;

              return (
                <button
                  key={item.id}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => navigate(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="nav-icon">
                    {item.icon}
                  </span>

                  {!sidebarCollapsed && (
                    <span className="nav-content">
                      <span className="nav-label">
                        {item.label}
                      </span>

                      <span className="nav-description">
                        {item.description}
                      </span>
                    </span>
                  )}

                  {item.id === 'workspace' &&
                    pendingCount > 0 && (
                      <span className="nav-badge">
                        {pendingCount > 99
                          ? '99+'
                          : pendingCount}
                      </span>
                    )}

                  {active && (
                    <span className="nav-active-indicator" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Runtime card */}
          <div
            className={`runtime-card ${sidebarCollapsed ? 'compact' : ''
              }`}
          >
            <div className="runtime-status">
              <span
                className={`runtime-dot ${ollamaOnline === true
                    ? 'online'
                    : ollamaOnline === false
                      ? 'offline'
                      : 'checking'
                  }`}
              />

              {!sidebarCollapsed && (
                <span className="runtime-label">
                  {statusLabel}
                </span>
              )}
            </div>

            {!sidebarCollapsed && (
              <>
                <div className="runtime-divider" />

                <div className="runtime-meta">
                  <span>Network</span>
                  <strong>Air-gapped</strong>
                </div>

                <div className="runtime-meta">
                  <span>Privacy</span>
                  <strong className="privacy-text">
                    100% Local
                  </strong>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!sidebarCollapsed && (
            <div className="sidebar-footer">
              <span className="footer-dot" />
              Zero Cloud Leakage
            </div>
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────
          MAIN AREA
      ───────────────────────────────────────────── */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Icon size={20}>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </Icon>
            </button>

            <div className="page-heading">
              <div className="breadcrumb">
                <span>SOVEREIGN</span>
                <span className="breadcrumb-separator">
                  /
                </span>
                <span className="breadcrumb-current">
                  {currentPage.title}
                </span>
              </div>

              <h1>{currentPage.title}</h1>

              <p>{currentPage.subtitle}</p>
            </div>
          </div>

          <div className="topbar-actions">
            {/* Local status */}
            <div
              className={`topbar-status ${ollamaOnline === true
                  ? 'online'
                  : ollamaOnline === false
                    ? 'offline'
                    : ''
                }`}
            >
              <span className="topbar-status-dot" />

              <div className="topbar-status-copy">
                <span>RUNTIME</span>
                <strong>
                  {ollamaOnline === true
                    ? 'Ollama Online'
                    : ollamaOnline === false
                      ? 'Offline'
                      : 'Connecting'}
                </strong>
              </div>
            </div>

            <div className="topbar-separator" />

            {/* Refresh */}
            <button
              className={`refresh-button ${checkingStatus ? 'loading' : ''
                }`}
              onClick={checkStatus}
              disabled={checkingStatus}
              title="Refresh system status"
              aria-label="Refresh system status"
            >
              <Icon size={17}>
                <path d="M20 11a8.1 8.1 0 0 0-14.9-4" />
                <path d="M4 4v5h5" />
                <path d="M4 13a8.1 8.1 0 0 0 14.9 4" />
                <path d="M20 20v-5h-5" />
              </Icon>

              <span className="refresh-label">
                {checkingStatus ? 'Checking' : 'Refresh'}
              </span>
            </button>

            {/* Environment */}
            <div className="environment-pill">
              <span className="environment-icon">
                <Icon size={15}>
                  <path d="M12 3a9 9 0 1 0 9 9" />
                  <path d="M12 7v5l3 2" />
                </Icon>
              </span>
              <span>LOCAL ENCLAVE</span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="content-area">
          <div className="content-container">
            {renderView()}
          </div>
        </main>

        {/* Bottom status strip */}
        <footer className="system-strip">
          <div className="system-strip-left">
            <span className="system-live-dot" />
            <span>
              System operational
            </span>

            {lastChecked && (
              <>
                <span className="system-strip-divider" />
                <span className="last-check">
                  Last checked{' '}
                  {lastChecked.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </>
            )}
          </div>

          <div className="system-strip-right">
            <span>LOCAL-FIRST</span>
            <span className="strip-separator">•</span>
            <span>NO CLOUD DEPENDENCY</span>
          </div>
        </footer>
      </div>

      {/* Toasts */}
      <ToastContainer
        toasts={toasts}
        removeToast={removeToast}
      />
    </div>
  );
}

export default App;