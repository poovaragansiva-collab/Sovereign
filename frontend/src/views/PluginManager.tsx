import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { ToastType } from '../components/ToastContainer';

interface Props {
  addToast: (type: ToastType, title: string, message?: string) => void;
}

interface PluginItem {
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  enabled: boolean;
}

export default function PluginManager({ addToast }: Props) {
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginItem | null>(null);
  const [actionInput, setActionInput] = useState('');
  const [paramInput, setParamInput] = useState('{}');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listPlugins();
      setPlugins(res.plugins || []);
    } catch (err: any) {
      addToast('error', 'Failed to load plugins', err.message);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const handleToggle = async (name: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    try {
      await api.togglePlugin(name, nextStatus);
      setPlugins(prev =>
        prev.map(p => (p.name === name ? { ...p, enabled: nextStatus } : p))
      );
      addToast('success', `${name} ${nextStatus ? 'Enabled' : 'Disabled'}`);
    } catch (err: any) {
      addToast('error', 'Toggle failed', err.message);
    }
  };

  const handleOpenRunner = (plugin: PluginItem) => {
    setSelectedPlugin(plugin);
    setExecutionResult(null);
    if (plugin.name === 'System Info') {
      setActionInput('status');
      setParamInput('{}');
    } else if (plugin.name === 'Data Converter') {
      setActionInput('convert');
      setParamInput(JSON.stringify({ data: 'name,role\nAlice,Admin\nBob,Engineer', from: 'csv', to: 'json' }, null, 2));
    } else if (plugin.name === 'Code Formatter & Linter') {
      setActionInput('format');
      setParamInput(JSON.stringify({ code: '{"hello":"world", "status":"ok"}', language: 'json' }, null, 2));
    } else {
      setActionInput('summarize');
      setParamInput(JSON.stringify({ file_path: 'sovereign_policy.txt' }, null, 2));
    }
  };

  const handleExecute = async () => {
    if (!selectedPlugin) return;
    setExecuting(true);
    setExecutionResult(null);
    try {
      let params = {};
      try {
        params = JSON.parse(paramInput);
      } catch (e) {
        addToast('error', 'Invalid JSON in params input');
        setExecuting(false);
        return;
      }

      const res = await api.executePlugin(selectedPlugin.name, actionInput, params);
      setExecutionResult(res.result);
      addToast('success', 'Plugin execution completed');
    } catch (err: any) {
      addToast('error', 'Execution failed', err.message);
      setExecutionResult({ error: err.message });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>Local Plugin Architecture & Sandboxed Extensions</h2>
          <p className="view-desc">
            All plugins run strictly within host boundaries with declared permissions. Undeclared access is rejected by default.
          </p>
        </div>
        <button className="btn-secondary" onClick={fetchPlugins} disabled={loading}>
          🔄 Refresh Plugins
        </button>
      </div>

      <div className="plugins-grid">
        {plugins.map(p => (
          <div key={p.name} className={`plugin-card ${p.enabled ? 'active-card' : 'disabled-card'}`}>
            <div className="plugin-header">
              <div>
                <div className="plugin-title">{p.name}</div>
                <div className="plugin-author">By {p.author} • v{p.version}</div>
              </div>
              <label className="switch-toggle" title="Enable or disable plugin">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={() => handleToggle(p.name, p.enabled)}
                />
                <span className="slider" />
              </label>
            </div>

            <p className="plugin-desc">{p.description}</p>

            <div className="plugin-permissions-section">
              <div className="permission-label">Declared Permissions:</div>
              <div className="permissions-chips">
                {p.permissions.length === 0 ? (
                  <span className="permission-pill safe">Zero Elevated Permissions</span>
                ) : (
                  p.permissions.map(perm => (
                    <span key={perm} className="permission-pill">
                      🔒 {perm}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="plugin-card-footer">
              <button
                className="btn-secondary btn-sm"
                disabled={!p.enabled}
                onClick={() => handleOpenRunner(p)}
              >
                ⚙️ Run Action
              </button>
              <span className={`status-pill ${p.enabled ? 'ready' : 'failed'}`}>
                {p.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Execution Drawer / Modal */}
      {selectedPlugin && (
        <div className="modal-backdrop" onClick={() => setSelectedPlugin(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Run Plugin: {selectedPlugin.name}</h3>
              <button className="close-btn" onClick={() => setSelectedPlugin(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Action Name</label>
                <input
                  type="text"
                  className="search-input"
                  value={actionInput}
                  onChange={e => setActionInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Parameters (JSON)</label>
                <textarea
                  className="code-textarea"
                  rows={6}
                  value={paramInput}
                  onChange={e => setParamInput(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setSelectedPlugin(null)}>Cancel</button>
                <button className="btn-primary" onClick={handleExecute} disabled={executing}>
                  {executing ? 'Executing...' : 'Execute Action'}
                </button>
              </div>

              {executionResult && (
                <div style={{ marginTop: 20 }}>
                  <div className="section-title">Execution Result:</div>
                  <pre className="context-preview-code">
                    {JSON.stringify(executionResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
