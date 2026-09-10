import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ToastType } from '../components/ToastContainer';

interface Props {
  addToast: (type: ToastType, title: string, message?: string) => void;
}

interface OllamaModel {
  name: string;
  available: boolean;
  type: string | null;
  enabled: boolean;
  size: number;
  modified_at: string | null;
}

const CAPABILITIES = ['general', 'reasoning', 'coding', 'vision', 'embedding'];

const CAP_COLORS: Record<string, string> = {
  general: 'badge-blue',
  reasoning: 'badge-purple',
  coding: 'badge-cyan',
  vision: 'badge-amber',
  embedding: 'badge-teal',
};

const CAP_DESCS: Record<string, string> = {
  general: 'Q&A, summarization, writing tasks',
  reasoning: 'Multi-step reasoning, math, analysis',
  coding: 'Code generation, debugging, review',
  vision: 'Image analysis, OCR, visual tasks',
  embedding: 'Document embeddings for RAG',
};

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  const gb = bytes / 1e9;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;
}

export default function ModelManager({ addToast }: Props) {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [localConfig, setLocalConfig] = useState<Record<string, string | null>>({});
  const [dirty, setDirty] = useState(false);
  const [pullInput, setPullInput] = useState('');
  const [pulling, setPulling] = useState(false);

  const handlePullModel = async (nameToPull?: string) => {
    const target = (nameToPull || pullInput).trim();
    if (!target) return;
    setPulling(true);
    try {
      addToast('info', 'Pulling model...', `Downloading weights for ${target}`);
      await api.pullModel(target);
      addToast('success', 'Model pulled successfully', `${target} is now available locally`);
      setPullInput('');
      await load();
    } catch (e: any) {
      addToast('error', 'Pull failed', e.message);
    } finally {
      setPulling(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete model '${name}' from Ollama?`)) return;
    try {
      await api.deleteModel(name);
      addToast('success', 'Model deleted', `Removed ${name}`);
      await load();
    } catch (e: any) {
      addToast('error', 'Delete failed', e.message);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getModelsV1();
      setOllamaOnline(res.ollama_online);
      setModels(res.models);
      // Build local config
      const cfg: Record<string, string | null> = {};
      res.models.forEach((m: OllamaModel) => { cfg[m.name] = m.type; });
      setLocalConfig(cfg);
      setDirty(false);
    } catch (e: any) {
      addToast('error', 'Failed to load models', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateCap = (name: string, cap: string | null) => {
    setLocalConfig(prev => ({ ...prev, [name]: cap }));
    setDirty(true);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(localConfig).map(([name, type]) => ({
        name, type: type ?? null, enabled: true,
      }));
      await api.saveModelConfig(payload);
      setDirty(false);
      addToast('success', 'Model configuration saved');
      await load();
    } catch (e: any) {
      addToast('error', 'Failed to save config', e.message);
    } finally {
      setSaving(false);
    }
  };

  const capCounts: Record<string, number> = {};
  Object.values(localConfig).forEach(c => {
    if (c) capCounts[c] = (capCounts[c] || 0) + 1;
  });

  return (
    <div>
      <div className="section-header mb-4">
        <div>
          <div className="section-title">Model Management</div>
          <div className="section-sub">
            Assign capabilities to your local Ollama models
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className={`status-dot${ollamaOnline ? ' online' : ' offline'}`} />
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Ollama {ollamaOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={load} id="btn-refresh-models">
            Refresh
          </button>
          {dirty && (
            <button
              id="btn-save-model-config"
              className="btn btn-primary"
              onClick={saveConfig}
              disabled={saving}
            >
              {saving ? (
                <><div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</>
              ) : '💾 Save Configuration'}
            </button>
          )}
        </div>
      </div>

      {/* Pull Model Bar */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
          📥 Pull Open-Source Model into Ollama
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            className="search-input"
            style={{ flex: 1 }}
            placeholder="Enter Ollama model tag (e.g. nomic-embed-text, deepseek-r1:1.5b, llava)..."
            value={pullInput}
            onChange={e => setPullInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePullModel()}
            disabled={pulling}
          />
          <button className="btn btn-primary" onClick={() => handlePullModel()} disabled={pulling || !pullInput.trim()}>
            {pulling ? 'Pulling...' : 'Pull Model'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quick pulls:</span>
          {['nomic-embed-text', 'deepseek-r1:1.5b', 'qwen2.5-coder:3b'].map(tag => (
            <button
              key={tag}
              className="badge badge-gray"
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => handlePullModel(tag)}
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Capability summary */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>

        {CAPABILITIES.map(cap => (
          <div key={cap} className="metric-card" style={{ flex: '1 1 150px', padding: '12px 14px', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`badge ${CAP_COLORS[cap]}`}>{cap}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: capCounts[cap] ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
                {capCounts[cap] ?? 0}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {CAP_DESCS[cap]}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" /><span>Discovering models…</span></div>
      ) : models.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🤖</div>
          <div className="empty-state-title">No models found</div>
          <div className="empty-state-sub">
            Start Ollama and pull a model with <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>ollama pull &lt;model&gt;</code>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {models.map(m => {
              const currentCap = localConfig[m.name];
              return (
                <div
                  key={m.name}
                  className="card"
                  style={{
                    borderColor: currentCap
                      ? `rgba(59,130,246,0.3)`
                      : 'var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono', marginBottom: 4 }}>
                        {m.name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className={`badge ${m.available ? 'badge-green' : 'badge-red'}`}>
                          {m.available ? '● Online' : '○ Offline'}
                        </span>
                        {m.size > 0 && (
                          <span className="badge badge-gray">{formatBytes(m.size)}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {currentCap && (
                        <span className={`badge ${CAP_COLORS[currentCap]}`}>{currentCap}</span>
                      )}
                      <button
                        className="btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: 12, color: 'var(--brand-red)' }}
                        title="Delete model from Ollama"
                        onClick={() => handleDelete(m.name)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>


                  <div className="form-label" style={{ marginBottom: 8 }}>Assign Capability</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className={`cap-pill${!currentCap ? ' selected general' : ''}`}
                      style={!currentCap ? { background: 'rgba(100,116,139,0.2)', color: 'var(--text-secondary)', borderColor: 'rgba(100,116,139,0.4)' } : {}}
                      onClick={() => updateCap(m.name, null)}
                      id={`cap-none-${m.name}`}
                    >
                      None
                    </button>
                    {CAPABILITIES.map(cap => (
                      <button
                        key={cap}
                        id={`cap-${cap}-${m.name}`}
                        className={`cap-pill${currentCap === cap ? ` selected ${cap}` : ''}`}
                        onClick={() => updateCap(m.name, cap)}
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {dirty && (
            <div
              style={{
                position: 'fixed',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: 'var(--shadow-xl)',
                zIndex: 500,
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Unsaved changes
              </span>
              <button className="btn btn-primary" onClick={saveConfig} disabled={saving} id="btn-save-floating">
                {saving ? 'Saving…' : '💾 Save Now'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
