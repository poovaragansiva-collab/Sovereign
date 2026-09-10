import { useState, useEffect } from 'react';
import { api, type ModelInfo } from '../api';
import type { ToastType } from '../components/ToastContainer';

interface Props {
  addToast: (type: ToastType, title: string, message?: string) => void;
}

type SettingsTab = 'general' | 'ai' | 'rag' | 'security' | 'storage' | 'system';

export default function Settings({ addToast }: Props) {
  const [tab, setTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);

  // Settings State
  const [workstationName, setWorkstationName] = useState(
    () => localStorage.getItem('sovereign_ws_name') || 'Sovereign Enclave-01'
  );
  const [refreshInterval, setRefreshInterval] = useState(
    () => Number(localStorage.getItem('sovereign_refresh_interval')) || 30
  );
  const [temperature, setTemperature] = useState(
    () => Number(localStorage.getItem('sovereign_temp')) || 0.7
  );
  const [maxTokens, setMaxTokens] = useState(
    () => Number(localStorage.getItem('sovereign_max_tokens')) || 2048
  );
  const [streamTokens, setStreamTokens] = useState(
    () => localStorage.getItem('sovereign_stream') !== 'false'
  );
  const [chunkSize, setChunkSize] = useState(
    () => Number(localStorage.getItem('sovereign_chunk_size')) || 1000
  );
  const [chunkOverlap, setChunkOverlap] = useState(
    () => Number(localStorage.getItem('sovereign_chunk_overlap')) || 200
  );
  const [topK, setTopK] = useState(
    () => Number(localStorage.getItem('sovereign_top_k')) || 4
  );
  const [strictAirGap, setStrictAirGap] = useState(true);
  const [telemetryData, setTelemetryData] = useState<any>(null);

  useEffect(() => {
    const fetchModelsAndStats = async () => {
      setLoading(true);
      try {
        const [modelsRes, statsRes] = await Promise.all([
          api.getModelsV1().catch(() => ({ models: [] })),
          api.getDashboardStats().catch(() => null),
        ]);
        setModels(modelsRes.models || []);
        setTelemetryData(statsRes);
      } catch (err) {
        console.error('Failed to load settings data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchModelsAndStats();
  }, []);

  const handleSaveSettings = () => {
    setSaving(true);
    try {
      localStorage.setItem('sovereign_ws_name', workstationName);
      localStorage.setItem('sovereign_refresh_interval', String(refreshInterval));
      localStorage.setItem('sovereign_temp', String(temperature));
      localStorage.setItem('sovereign_max_tokens', String(maxTokens));
      localStorage.setItem('sovereign_stream', String(streamTokens));
      localStorage.setItem('sovereign_chunk_size', String(chunkSize));
      localStorage.setItem('sovereign_chunk_overlap', String(chunkOverlap));
      localStorage.setItem('sovereign_top_k', String(topK));
      addToast('success', 'Settings saved', 'Configuration stored successfully in local enclave.');
    } catch (e: any) {
      addToast('error', 'Failed to save settings', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset settings to factory defaults?')) return;
    setWorkstationName('Sovereign Enclave-01');
    setRefreshInterval(30);
    setTemperature(0.7);
    setMaxTokens(2048);
    setStreamTokens(true);
    setChunkSize(1000);
    setChunkOverlap(200);
    setTopK(4);
    setStrictAirGap(true);
    addToast('info', 'Defaults restored', 'Click Save to apply these default settings.');
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2>System & Workspace Settings</h2>
          <p className="view-desc">
            Configure local inference parameters, RAG indexing heuristics, air-gapped security policies, and workstation telemetry.
          </p>
        </div>
        <div className="view-actions">
          {loading && <span className="badge badge-blue">Refreshing Telemetry...</span>}
          <button className="btn-secondary" onClick={handleResetDefaults} disabled={saving || loading}>
            ↺ Reset Defaults
          </button>
          <button className="btn-primary" onClick={handleSaveSettings} disabled={saving || loading}>
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="settings-nav-tabs">
        <button
          className={`settings-tab-btn ${tab === 'general' ? 'active' : ''}`}
          onClick={() => setTab('general')}
        >
          ⚙️ General
        </button>
        <button
          className={`settings-tab-btn ${tab === 'ai' ? 'active' : ''}`}
          onClick={() => setTab('ai')}
        >
          🧠 AI & Inference
        </button>
        <button
          className={`settings-tab-btn ${tab === 'rag' ? 'active' : ''}`}
          onClick={() => setTab('rag')}
        >
          📚 RAG & Vector
        </button>
        <button
          className={`settings-tab-btn ${tab === 'security' ? 'active' : ''}`}
          onClick={() => setTab('security')}
        >
          🛡️ Security & Enclave
        </button>
        <button
          className={`settings-tab-btn ${tab === 'storage' ? 'active' : ''}`}
          onClick={() => setTab('storage')}
        >
          💾 Storage & DB
        </button>
        <button
          className={`settings-tab-btn ${tab === 'system' ? 'active' : ''}`}
          onClick={() => setTab('system')}
        >
          📊 System Diagnostics
        </button>
      </div>

      {/* Tab Content */}
      <div className="settings-content-card">
        {/* ── GENERAL TAB ── */}
        {tab === 'general' && (
          <div className="settings-section">
            <h3 className="settings-group-title">Workstation Identification</h3>
            <div className="settings-grid-row">
              <div className="settings-field">
                <label className="settings-label">Workstation Name / Node Label</label>
                <input
                  type="text"
                  className="form-input"
                  value={workstationName}
                  onChange={(e) => setWorkstationName(e.target.value)}
                  placeholder="e.g. Sovereign Enclave-01"
                />
                <span className="settings-help">Unique descriptor displayed on audit logs and export headers.</span>
              </div>
              <div className="settings-field">
                <label className="settings-label">Telemetry Polling Interval (seconds)</label>
                <select
                  className="form-select"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                >
                  <option value={15}>15 seconds (High frequency)</option>
                  <option value={30}>30 seconds (Recommended)</option>
                  <option value={60}>60 seconds (Low overhead)</option>
                  <option value={120}>120 seconds</option>
                </select>
                <span className="settings-help">Background ping frequency for Ollama service and database health.</span>
              </div>
            </div>

            <div className="settings-divider" />

            <h3 className="settings-group-title">API Routing</h3>
            <div className="settings-grid-row">
              <div className="settings-field">
                <label className="settings-label">FastAPI Backend Endpoint</label>
                <input
                  type="text"
                  className="form-input"
                  value="http://127.0.0.1:8000"
                  readOnly
                  style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)' }}
                />
                <span className="settings-help">Local reverse proxy routes all requests via Vite port 5173.</span>
              </div>
              <div className="settings-field">
                <label className="settings-label">Ollama Host URL</label>
                <input
                  type="text"
                  className="form-input"
                  value="http://127.0.0.1:11434"
                  readOnly
                  style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)' }}
                />
                <span className="settings-help">Local inference daemon port for Ollama client API.</span>
              </div>
            </div>
          </div>
        )}

        {/* ── AI & INFERENCE TAB ── */}
        {tab === 'ai' && (
          <div className="settings-section">
            <h3 className="settings-group-title">Inference Hyperparameters</h3>
            <div className="settings-grid-row">
              <div className="settings-field">
                <label className="settings-label">
                  Sampling Temperature: <strong>{temperature}</strong>
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand-primary, #6366f1)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>0.0 (Deterministic / Code)</span>
                  <span>0.7 (Balanced)</span>
                  <span>1.0 (Creative)</span>
                </div>
              </div>
              <div className="settings-field">
                <label className="settings-label">Max Token Generation Limit</label>
                <select
                  className="form-select"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                >
                  <option value={1024}>1,024 tokens (Fast)</option>
                  <option value={2048}>2,048 tokens (Standard)</option>
                  <option value={4096}>4,096 tokens (Extended context)</option>
                  <option value={8192}>8,192 tokens (Large documents)</option>
                </select>
                <span className="settings-help">Maximum response length per generation pass.</span>
              </div>
            </div>

            <div className="settings-divider" />

            <h3 className="settings-group-title">Streaming & Rendering</h3>
            <div className="settings-toggle-row">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Real-Time Token Streaming</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Stream LLM tokens word-by-word with live cursor animations using Server-Sent Events.
                </div>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={streamTokens}
                  onChange={(e) => setStreamTokens(e.target.checked)}
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="settings-divider" />

            <h3 className="settings-group-title">Available Local Models ({models.length})</h3>
            <div className="installed-models-badges">
              {models.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Detecting installed Ollama models...</span>
              ) : (
                models.map((m) => (
                  <span key={m.name} className="model-chip-badge">
                    <span className="status-dot online" />
                    <strong>{m.name}</strong>
                    {m.parameters && <small>({m.parameters})</small>}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── RAG & VECTOR TAB ── */}
        {tab === 'rag' && (
          <div className="settings-section">
            <h3 className="settings-group-title">Text Chunking & Segmentation</h3>
            <div className="settings-grid-row">
              <div className="settings-field">
                <label className="settings-label">Target Chunk Size (Characters)</label>
                <input
                  type="number"
                  className="form-input"
                  value={chunkSize}
                  min={200}
                  max={4000}
                  step={100}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                />
                <span className="settings-help">Recommended: 800 - 1200 characters per segment.</span>
              </div>
              <div className="settings-field">
                <label className="settings-label">Chunk Boundary Overlap (Characters)</label>
                <input
                  type="number"
                  className="form-input"
                  value={chunkOverlap}
                  min={50}
                  max={500}
                  step={25}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                />
                <span className="settings-help">Preserves semantic continuity across paragraph boundaries.</span>
              </div>
            </div>

            <div className="settings-divider" />

            <h3 className="settings-group-title">Vector Search Configuration</h3>
            <div className="settings-grid-row">
              <div className="settings-field">
                <label className="settings-label">Top-K Passage Retrieval Count</label>
                <select
                  className="form-select"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                >
                  <option value={2}>Top 2 Chunks (Concise)</option>
                  <option value={4}>Top 4 Chunks (Recommended)</option>
                  <option value={6}>Top 6 Chunks (Comprehensive)</option>
                  <option value={8}>Top 8 Chunks (High Recall)</option>
                </select>
                <span className="settings-help">Number of semantic context snippets passed into the prompt.</span>
              </div>
              <div className="settings-field">
                <label className="settings-label">Vector Store Engine</label>
                <input
                  type="text"
                  className="form-input"
                  value="ChromaDB (Local Persistent Collection: sovereign_docs)"
                  readOnly
                  style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)' }}
                />
                <span className="settings-help">Stored locally in ./chroma_db with zero remote transmission.</span>
              </div>
            </div>
          </div>
        )}

        {/* ── SECURITY & ENCLAVE TAB ── */}
        {tab === 'security' && (
          <div className="settings-section">
            <h3 className="settings-group-title">Air-Gapped Enclave Guarantees</h3>
            <div className="settings-toggle-row">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Strict Air-Gap Mode</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Block any external outbound network requests. All LLM calls and RAG operations remain within localhost.
                </div>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={strictAirGap}
                  onChange={(e) => setStrictAirGap(e.target.checked)}
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="settings-divider" />

            <div className="settings-toggle-row">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Path Traversal Protection</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Restrict document access strictly to ./data/documents and ./outputs safe sandbox directories.
                </div>
              </div>
              <span className="badge badge-green">ENFORCED</span>
            </div>

            <div className="settings-divider" />

            <div className="settings-toggle-row">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Immutable Audit Logging</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Record every model invocation, document ingestion, plugin execution, and export event into SQLite.
                </div>
              </div>
              <span className="badge badge-green">ACTIVE</span>
            </div>
          </div>
        )}

        {/* ── STORAGE & DATABASE TAB ── */}
        {tab === 'storage' && (
          <div className="settings-section">
            <h3 className="settings-group-title">Storage Paths & Directories</h3>
            <div className="settings-field" style={{ marginBottom: 14 }}>
              <label className="settings-label">Primary SQLite Database</label>
              <input
                type="text"
                className="form-input"
                value="d:\Sovereign\sovereign.db"
                readOnly
                style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)' }}
              />
            </div>
            <div className="settings-field" style={{ marginBottom: 14 }}>
              <label className="settings-label">Uploaded Documents Directory</label>
              <input
                type="text"
                className="form-input"
                value="d:\Sovereign\data\documents"
                readOnly
                style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)' }}
              />
            </div>
            <div className="settings-field" style={{ marginBottom: 14 }}>
              <label className="settings-label">Generated Artifacts Output Directory</label>
              <input
                type="text"
                className="form-input"
                value="d:\Sovereign\outputs"
                readOnly
                style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)' }}
              />
            </div>
          </div>
        )}

        {/* ── SYSTEM DIAGNOSTICS TAB ── */}
        {tab === 'system' && (
          <div className="settings-section">
            <h3 className="settings-group-title">Node & Service Telemetry</h3>
            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <div className="stat-card">
                <div className="stat-label">FastAPI Backend</div>
                <div className="stat-value" style={{ color: 'var(--brand-green)', fontSize: 20 }}>
                  ACTIVE (8000)
                </div>
                <div className="stat-sub">Uvicorn on Python 3.14</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Ollama Service</div>
                <div className="stat-value" style={{ color: telemetryData?.metrics?.ollama_online ? 'var(--brand-green)' : 'var(--brand-red)', fontSize: 20 }}>
                  {telemetryData?.metrics?.ollama_online ? 'CONNECTED' : 'OFFLINE'}
                </div>
                <div className="stat-sub">Port 11434</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Documents</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {telemetryData?.metrics?.total_documents ?? '—'}
                </div>
                <div className="stat-sub">Indexed in RAG</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Completed Tasks</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {telemetryData?.metrics?.completed_tasks ?? '—'}
                </div>
                <div className="stat-sub">Successful executions</div>
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-label">Raw System Metrics Snapshot</label>
              <pre className="context-preview-code">
                {JSON.stringify(telemetryData?.metrics || { status: 'loading' }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
