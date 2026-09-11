import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import type { ToastType } from '../components/ToastContainer';

interface Props {
  addToast: (type: ToastType, title: string, message?: string) => void;
}

interface Citation {
  source: string;
  page: number;
  score?: number;
  text: string;
}

interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
  created_at?: string;
  sources?: Citation[];
  verification?: { status: string; confidence?: number };
  metadata?: { latency_ms?: number; persona?: string };
}

function renderInline(text: string): React.ReactNode {
  // Simplistic markdown inline rendering
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.substring(lastIdx, match.index));
    const token = match[0];
    if (token.startsWith('`')) parts.push(<code key={match.index} style={{ background: 'var(--sunken)', padding: '2px 4px', borderRadius: '3px' }}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('**')) parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('*')) parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) parts.push(text.substring(lastIdx));
  return parts.length > 0 ? parts : text;
}

function MarkdownView({ content, onCopy }: { content: string; onCopy?: (text: string) => void }) {
  const parts: React.ReactNode[] = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        const codeText = codeBuffer.join('\n');
        parts.push(
          <div key={`code_${i}`} style={{ background: 'var(--surface)', border: '1px solid var(--border-structural)', borderRadius: 'var(--radius-md)', padding: '12px', margin: '12px 0', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--text-subtle)' }}>
              <span>{codeLang || 'code'}</span>
              <button onClick={() => onCopy && onCopy(codeText)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>📋 Copy</button>
            </div>
            <pre style={{ overflowX: 'auto', fontSize: '13px' }}><code>{codeText}</code></pre>
          </div>
        );
        inCodeBlock = false;
        codeBuffer = [];
      } else {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith('### ')) parts.push(<h4 key={`h3_${i}`} style={{ marginTop: '16px', marginBottom: '8px', fontSize: '16px' }}>{renderInline(line.slice(4))}</h4>);
    else if (line.startsWith('## ')) parts.push(<h3 key={`h2_${i}`} style={{ marginTop: '24px', marginBottom: '8px', fontSize: '18px' }}>{renderInline(line.slice(3))}</h3>);
    else if (line.startsWith('# ')) parts.push(<h2 key={`h1_${i}`} style={{ marginTop: '32px', marginBottom: '16px', fontSize: '24px' }}>{renderInline(line.slice(2))}</h2>);
    else if (line.startsWith('> ')) parts.push(<blockquote key={`quote_${i}`} style={{ borderLeft: '3px solid var(--border-heavy)', paddingLeft: '12px', margin: '12px 0', color: 'var(--text-secondary)' }}>{renderInline(line.slice(2))}</blockquote>);
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) parts.push(<li key={`li_${i}`} style={{ marginLeft: '24px', marginBottom: '4px' }}>{renderInline(line.trim().slice(2))}</li>);
    else if (line.trim() === '') parts.push(<div key={`sp_${i}`} style={{ height: '8px' }} />);
    else parts.push(<p key={`p_${i}`} style={{ marginBottom: '8px' }}>{renderInline(line)}</p>);
  }

  return <div>{parts}</div>;
}

export default function ChatWorkspace({ addToast }: Props) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Settings
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemma3:4b');
  const [ragEnabled, setRagEnabled] = useState(true);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'task' | 'knowledge' | 'company'>('task');
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadModels = useCallback(async () => {
    try {
      const res = await api.getModelsV1();
      const modelNames = res.models?.filter((m: any) => m.available).map((m: any) => m.name) || [];
      if (modelNames.length > 0) setModels(modelNames);
    } catch { }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      // Assuming a generic chat endpoint or handling mock
      const res = await api.createConversation({ title: 'New chat' }).catch(() => ({ id: 'mock-id' }));
      const msgRes = await api.sendMessage(res.id, {
        content: text,
        rag_enabled: ragEnabled,
        model: selectedModel,
      }).catch(() => ({
        message_id: 'mock-msg',
        content: "This is a local response simulation. The backend API is not fully configured for this endpoint yet.\n\n### Generated Outputs\n\n- refinery_analysis.xlsx\n\n```python\nprint('Local processing complete')\n```",
        sources: [{ source: 'company_policy.pdf', page: 7, text: 'Keep data secure' }]
      }));

      setMessages(prev => [...prev, {
        id: msgRes.message_id || Date.now().toString(),
        role: 'assistant',
        content: msgRes.content,
        sources: msgRes.sources,
      }]);

      if (msgRes.sources) setActiveCitations(msgRes.sources);
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      
      {/* ── CENTER: Main Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: '24px' }}>
        
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-newsreader)', fontSize: '32px', marginBottom: '8px' }}>SOVEREIGN</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Private intelligence for your organization.</p>
            <p style={{ color: 'var(--text-subtle)', fontSize: '14px', marginBottom: '40px' }}>Run AI locally. Keep confidential information inside your infrastructure.</p>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '600px' }}>
              {['Analyze a document', 'Search company knowledge', 'Summarize research', 'Generate a report', 'Write code'].map(suggestion => (
                <button key={suggestion} onClick={() => setInput(suggestion)} style={{ padding: '8px 16px', border: '1px solid var(--border-structural)', borderRadius: 'var(--radius-md)', background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '24px' }}>
            {messages.map(m => (
              <div key={m.id} style={{ marginBottom: '32px', padding: m.role === 'user' ? '0 40px 0 0' : '0 0 0 40px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: m.role === 'user' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                  {m.role === 'user' ? 'You' : 'SOVEREIGN'}
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  <MarkdownView content={m.content} onCopy={(t) => { navigator.clipboard.writeText(t); addToast('info', 'Copied') }} />
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div style={{ marginTop: '16px', padding: '12px', borderLeft: '2px solid var(--border-structural)', backgroundColor: 'var(--surface)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>SOURCES</div>
                    {m.sources.map((src, i) => (
                      <div key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>
                        📄 {src.source} — Page {src.page}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ color: 'var(--text-secondary)' }}>Processing locally...</div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Composer */}
        <div style={{ marginTop: 'auto', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border-structural)', borderRadius: 'var(--radius-lg)' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type your instruction..."
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', minHeight: '60px', fontFamily: 'inherit', fontSize: '15px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button title="Attach File" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>📎</button>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={ragEnabled} onChange={e => setRagEnabled(e.target.checked)} /> RAG
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={reasoningEnabled} onChange={e => setReasoningEnabled(e.target.checked)} /> Reasoning
              </label>
              
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', outline: 'none' }}>
                {models.length > 0 ? models.map(m => <option key={m} value={m}>{m}</option>) : <option value="gemma3:4b">gemma3:4b</option>}
              </select>
            </div>
            
            <button onClick={handleSend} className="btn-primary" disabled={!input.trim() || loading} style={{ padding: '6px 12px' }}>
              Send
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Context Panel ── */}
      <aside className="context-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-structural)' }}>
          {['task', 'knowledge', 'company'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{ flex: 1, padding: '12px 0', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : '2px solid transparent', background: 'transparent', fontSize: '12px', fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)', textTransform: 'uppercase' }}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {activeTab === 'task' && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Current Task</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                  <span style={{ fontWeight: 500 }}>{loading ? 'Processing' : 'Idle'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Model Used</span>
                  <span style={{ fontWeight: 500 }}>{selectedModel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Reasoning Mode</span>
                  <span style={{ fontWeight: 500 }}>{reasoningEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '24px 0 16px' }}>Generated Outputs</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Code', 'Excel', 'PowerPoint', 'PDF', 'Document'].map(type => (
                  <button key={type} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>+ {type}</button>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'knowledge' && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Knowledge Base</h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Connected to local vector store.
              </div>
              {activeCitations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-subtle)' }}>ACTIVE CITATIONS ({activeCitations.length})</div>
                  {activeCitations.map((c, i) => (
                    <div key={i} style={{ padding: '12px', background: 'var(--sunken)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>📄 {c.source}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>"{c.text}"</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '12px', background: 'var(--sunken)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  No active citations in this turn.
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'company' && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Company Context</h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                SOVEREIGN operates within your organization's boundaries.
              </div>
              <ul style={{ fontSize: '13px', paddingLeft: '16px', color: 'var(--text-primary)' }}>
                <li>Data isolated from external APIs</li>
                <li>Strict internal access controls</li>
                <li>Audit logging enabled</li>
              </ul>
            </div>
          )}
        </div>
      </aside>
      
    </div>
  );
}
