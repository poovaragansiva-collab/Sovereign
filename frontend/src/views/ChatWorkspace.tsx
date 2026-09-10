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

interface ConversationItem {
  id: string;
  title: string;
  selected_model?: string;
  capability?: string;
  message_count?: number;
  last_message?: string;
  updated_at?: string;
}

const PERSONAS = [
  { id: 'assistant', label: '🤖 General Assistant', desc: 'Concise, clear, and accurate help' },
  { id: 'senior_engineer', label: '💻 Senior Engineer', desc: 'Production-grade code & architecture' },
  { id: 'document_analyst', label: '📄 Document Analyst', desc: 'Rigorous citations and deep clause analysis' },
  { id: 'researcher', label: '🔬 Research Scientist', desc: 'Evidence-based objective synthesis' },
];

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<code key={match.index} className="inline-code">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

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
        const lang = codeLang || 'code';
        parts.push(
          <div key={`code_${i}`} className="code-block-container">
            <div className="code-block-header">
              <span className="code-block-lang">{lang}</span>
              <button
                className="code-copy-btn"
                onClick={() => onCopy ? onCopy(codeText) : navigator.clipboard.writeText(codeText)}
              >
                📋 Copy Code
              </button>
            </div>
            <pre className="code-block-content">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
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

    if (line.startsWith('### ')) {
      parts.push(<h4 key={`h3_${i}`} className="md-h3">{renderInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      parts.push(<h3 key={`h2_${i}`} className="md-h2">{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      parts.push(<h2 key={`h1_${i}`} className="md-h1">{renderInline(line.slice(2))}</h2>);
    } else if (line.startsWith('> ')) {
      parts.push(<blockquote key={`quote_${i}`} className="md-quote">{renderInline(line.slice(2))}</blockquote>);
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      parts.push(<li key={`li_${i}`} className="md-li">{renderInline(line.trim().slice(2))}</li>);
    } else if (/^\d+\.\s/.test(line.trim())) {
      const match = line.trim().match(/^\d+\.\s(.*)$/);
      parts.push(<li key={`nli_${i}`} className="md-li-num">{renderInline(match ? match[1] : line)}</li>);
    } else if (line.trim() === '') {
      parts.push(<div key={`sp_${i}`} style={{ height: '6px' }} />);
    } else {
      parts.push(<p key={`p_${i}`} className="md-p">{renderInline(line)}</p>);
    }
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    const codeText = codeBuffer.join('\n');
    parts.push(
      <div key="code_unclosed" className="code-block-container">
        <pre className="code-block-content">
          <code>{codeText}</code>
        </pre>
      </div>
    );
  }

  return <div className="formatted-markdown">{parts}</div>;
}

export default function ChatWorkspace({ addToast }: Props) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingToken, setStreamingToken] = useState<string | null>(null);

  // Settings
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemma3:4b');
  const [ragEnabled, setRagEnabled] = useState(true);
  const [toolsEnabled, setToolsEnabled] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('assistant');
  const [showContextInspector, setShowContextInspector] = useState(true);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load models from backend
  const loadModels = useCallback(async () => {
    try {
      const res = await api.getModelsV1();
      const modelNames = res.models?.filter((m: { available: boolean }) => m.available).map((m: { name: string }) => m.name) || [];
      if (modelNames.length > 0) {
        setModels(modelNames);
        if (!modelNames.includes(selectedModel)) {
          setSelectedModel(modelNames[0]);
        }
      }
    } catch {
      // Fallback
    }
  }, [selectedModel]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.listConversations();
      const list: ConversationItem[] = res.conversations || [];
      setConversations(list);
      if (!currentId && list.length > 0) {
        setCurrentId(list[0].id);
      }
    } catch (err: any) {
      addToast('error', 'Failed to load conversations', err.message);
    }
  }, [currentId, addToast]);

  // Load active conversation messages
  const loadActiveConversation = useCallback(async (id: string) => {
    try {
      const res = await api.getConversation(id);
      setMessages(res.messages || []);
      if (res.selected_model) setSelectedModel(res.selected_model);
      if (res.persona) setSelectedPersona(res.persona);

      // Collect citations from recent messages
      const msgs: MessageItem[] = res.messages || [];
      const recentAssistant = [...msgs].reverse().find(m => m.role === 'assistant' && m.sources && m.sources.length > 0);
      if (recentAssistant?.sources) {
        setActiveCitations(recentAssistant.sources);
      } else {
        setActiveCitations([]);
      }
      if (recentAssistant?.metadata?.latency_ms) {
        setLastLatency(recentAssistant.metadata.latency_ms);
      }
    } catch (err: any) {
      addToast('error', 'Failed to load messages', err.message);
    }
  }, [addToast]);

  useEffect(() => {
    loadModels();
    loadConversations();
  }, [loadModels, loadConversations]);

  useEffect(() => {
    if (currentId) {
      loadActiveConversation(currentId);
    }
  }, [currentId, loadActiveConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingToken]);

  // Create new conversation
  const handleNewChat = async () => {
    try {
      const res = await api.createConversation({
        title: 'New Conversation',
        selected_model: selectedModel,
        persona: selectedPersona,
      });
      setConversations(prev => [res, ...prev]);
      setCurrentId(res.id);
      setMessages([]);
      setActiveCitations([]);
      setLastLatency(null);
      addToast('success', 'New chat created');
    } catch (err: any) {
      addToast('error', 'Could not create conversation', err.message);
    }
  };

  // Delete conversation
  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await api.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentId === id) {
        const remaining = conversations.filter(c => c.id !== id);
        if (remaining.length > 0) {
          setCurrentId(remaining[0].id);
        } else {
          setCurrentId(null);
          setMessages([]);
          setActiveCitations([]);
        }
      }
      addToast('info', 'Conversation deleted');
    } catch (err: any) {
      addToast('error', 'Failed to delete', err.message);
    }
  };

  // Send message
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    let targetConvId = currentId;
    if (!targetConvId) {
      try {
        const res = await api.createConversation({
          title: text.slice(0, 30),
          selected_model: selectedModel,
          persona: selectedPersona,
        });
        setConversations(prev => [res, ...prev]);
        targetConvId = res.id;
        setCurrentId(res.id);
      } catch (err: any) {
        addToast('error', 'Error creating conversation', err.message);
        return;
      }
    }

    // Optimistically append user message
    const tempUserMsg: MessageItem = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setLoading(true);
    setStreamingToken('Thinking and retrieving context...');

    try {
      const res = await api.sendMessage(targetConvId!, {
        content: text,
        rag_enabled: ragEnabled,
        tools_enabled: toolsEnabled,
        model: selectedModel,
        persona: selectedPersona,
      });

      const asstMsg: MessageItem = {
        id: res.message_id,
        role: 'assistant',
        content: res.content,
        model_used: res.model_used,
        created_at: res.created_at,
        sources: res.sources,
        verification: res.verification,
        metadata: { latency_ms: res.latency_ms },
      };

      setMessages(prev => [...prev, asstMsg]);
      if (res.sources && res.sources.length > 0) {
        setActiveCitations(res.sources);
      }
      if (res.latency_ms) {
        setLastLatency(res.latency_ms);
      }

      // Update sidebar conversation title if changed
      setConversations(prev =>
        prev.map(c => (c.id === targetConvId ? { ...c, last_message: text.slice(0, 40), updated_at: new Date().toISOString() } : c))
      );
    } catch (err: any) {
      addToast('error', 'Inference Error', err.message);
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error executing inference: ${err.message}`,
          model_used: selectedModel,
        },
      ]);
    } finally {
      setLoading(false);
      setStreamingToken(null);
    }
  };

  // Handle Enter to send, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  // Upload file attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      addToast('info', 'Uploading document...', `Indexing ${file.name} into RAG`);
      const res = await api.uploadDocument(file);
      addToast('success', 'Document indexed', `${res.filename} ready for citation (${res.chunks_count || 1} chunks)`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      addToast('error', 'Upload failed', err.message);
    }
  };

  // Export conversation
  const handleExport = async (format: string) => {
    if (!currentId) return;
    try {
      const res = await api.exportConversation(currentId, format);
      const blob = new Blob([res.content], {
        type: format === 'json' ? 'application/json' : 'text/markdown',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || `conversation.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Export complete', `Downloaded ${res.filename}`);
    } catch (err: any) {
      addToast('error', 'Export failed', err.message);
    }
  };

  // Copy message
  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('success', 'Copied to clipboard');
  };

  const activeConv = conversations.find(c => c.id === currentId);

  return (
    <div className="chat-workbench">
      {/* ── Left Sidebar: Conversations & Config ── */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button className="btn-primary new-chat-btn" onClick={handleNewChat}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Conversation
          </button>
        </div>

        {/* Model & Persona Selectors */}
        <div className="chat-sidebar-controls">
          <div className="control-group">
            <label className="control-label">Active Model</label>
            <select
              className="workbench-select"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
            >
              {models.length > 0 ? (
                models.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              ) : (
                <option value="gemma3:4b">gemma3:4b (Local)</option>
              )}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">System Persona</label>
            <select
              className="workbench-select"
              value={selectedPersona}
              onChange={e => setSelectedPersona(e.target.value)}
            >
              {PERSONAS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sidebar-toggles">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={ragEnabled}
                onChange={e => setRagEnabled(e.target.checked)}
              />
              <span className="toggle-text">Search Local Documents (RAG)</span>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={toolsEnabled}
                onChange={e => setToolsEnabled(e.target.checked)}
              />
              <span className="toggle-text">Allow Local Tools</span>
            </label>
          </div>
        </div>

        {/* Conversations List */}
        <div className="conversations-list">
          <div className="list-heading">Recent Chats</div>
          {conversations.length === 0 ? (
            <div className="empty-chats">No conversations yet. Start one above!</div>
          ) : (
            conversations.map(c => (
              <div
                key={c.id}
                className={`conv-item ${c.id === currentId ? 'active' : ''}`}
                onClick={() => setCurrentId(c.id)}
              >
                <div className="conv-icon">💬</div>
                <div className="conv-meta">
                  <div className="conv-title">{c.title || 'Untitled'}</div>
                  <div className="conv-preview">{c.last_message || 'Empty conversation'}</div>
                </div>
                <button
                  className="conv-delete-btn"
                  title="Delete chat"
                  onClick={e => handleDeleteChat(c.id, e)}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Center: Message Stream & Input ── */}
      <main className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-title">
            <h2>{activeConv?.title || 'Chat Workspace'}</h2>
            <div className="chat-badges">
              <span className="model-badge">
                <span className="status-dot green" />
                {selectedModel}
              </span>
              {ragEnabled && <span className="rag-badge">📚 RAG Active</span>}
              <span className="persona-badge">
                {PERSONAS.find(p => p.id === selectedPersona)?.label.split(' ')[0]}
              </span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button
              className="btn-secondary btn-sm"
              title="Export Conversation"
              onClick={() => handleExport('markdown')}
            >
              Export Markdown
            </button>
            <button
              className="btn-secondary btn-sm"
              title="Export JSON"
              onClick={() => handleExport('json')}
            >
              JSON
            </button>
            <button
              className={`btn-secondary btn-sm ${showContextInspector ? 'active-panel-btn' : ''}`}
              onClick={() => setShowContextInspector(!showContextInspector)}
            >
              {showContextInspector ? 'Hide Inspector' : 'Context Inspector'}
            </button>
          </div>
        </header>

        {/* Messages Stream */}
        <div className="chat-stream">
          {messages.length === 0 && !streamingToken ? (
            <div className="chat-empty-state">
              <div className="empty-icon">🛡️</div>
              <h3>SOVEREIGN LOCAL AI WORKBENCH</h3>
              <p>
                Private, enterprise-grade AI execution entirely inside your local infrastructure.
                No cloud telemetry, no proprietary API dependencies.
              </p>
              <div className="quick-starters">
                <button
                  className="quick-chip"
                  onClick={() => setInput('Summarize the core requirements from the indexed documentation.')}
                >
                  📄 "Summarize the indexed documentation"
                </button>
                <button
                  className="quick-chip"
                  onClick={() => setInput('Draft a secure FastAPI service for local file processing.')}
                >
                  💻 "Draft a secure FastAPI service"
                </button>
                <button
                  className="quick-chip"
                  onClick={() => setInput('Analyze the system architecture and list verification guarantees.')}
                >
                  🧠 "Analyze system architecture"
                </button>
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div key={m.id || idx} className={`message-bubble-row ${m.role}`}>
                <div className="message-avatar">
                  {m.role === 'user' ? '👤' : '🛡️'}
                </div>
                <div className="message-bubble">
                  <div className="message-meta-bar">
                    <span className="message-author">
                      {m.role === 'user' ? 'You' : `Sovereign (${m.model_used || selectedModel})`}
                    </span>
                    {m.metadata?.latency_ms && (
                      <span className="message-time">⚡ {m.metadata.latency_ms}ms</span>
                    )}
                    <button
                      className="msg-action-btn"
                      title="Copy content"
                      onClick={() => copyMessage(m.content)}
                    >
                      📋 Copy
                    </button>
                  </div>

                  <div className="message-content markdown-body">
                    <MarkdownView content={m.content} onCopy={copyMessage} />
                  </div>

                  {/* Document Citation Cards */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="message-citations">
                      <div className="citations-header">Sources & Citations:</div>
                      <div className="citation-cards-grid">
                        {m.sources.map((src, sIdx) => (
                          <div key={sIdx} className="citation-card">
                            <div className="citation-source-name">
                              📄 {src.source} <span className="citation-page">— Page {src.page}</span>
                            </div>
                            <div className="citation-snippet">"{src.text}"</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verification Status */}
                  {m.verification && (
                    <div className="message-verification">
                      <span className="ver-dot green" />
                      Verification: {m.verification.status}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Live Progress / Typing indicator */}
          {streamingToken && (
            <div className="message-bubble-row assistant">
              <div className="message-avatar">🛡️</div>
              <div className="message-bubble streaming">
                <div className="message-meta-bar">
                  <span className="message-author">Sovereign is thinking...</span>
                </div>
                <div className="typing-indicator">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <div className="streaming-preview">{streamingToken}</div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-container">
          <div className="chat-input-controls-bar">
            <button
              className="attach-btn"
              title="Attach & Index Document into RAG"
              onClick={() => fileInputRef.current?.click()}
            >
              📎 Attach Document
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.docx,.txt,.md,.json,.csv,.png,.jpg"
              onChange={handleFileUpload}
            />

            <span
              className={`chip-toggle ${ragEnabled ? 'active' : ''}`}
              onClick={() => setRagEnabled(!ragEnabled)}
            >
              📚 RAG: {ragEnabled ? 'ON' : 'OFF'}
            </span>

            <span
              className={`chip-toggle ${toolsEnabled ? 'active' : ''}`}
              onClick={() => setToolsEnabled(!toolsEnabled)}
            >
              ⚙️ Tools: {toolsEnabled ? 'ON' : 'OFF'}
            </span>
          </div>

          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder="Ask a question or provide an instruction... (Press Enter to send, Shift+Enter for new line)"
              value={input}
              rows={1}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              disabled={!input.trim() || loading}
              onClick={handleSend}
            >
              {loading ? (
                <span className="spinner-sm" />
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* ── Right Panel: Context Inspector ── */}
      {showContextInspector && (
        <aside className="context-inspector">
          <div className="inspector-header">
            <h3>Context Inspector</h3>
            <button className="close-panel-btn" onClick={() => setShowContextInspector(false)}>
              ✕
            </button>
          </div>

          <div className="inspector-content">
            <div className="inspector-section">
              <div className="section-title">Telemetry & Metrics</div>
              <div className="metrics-grid">
                <div className="metric-box">
                  <span className="metric-label">Inference Model</span>
                  <span className="metric-val">{selectedModel}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Execution Latency</span>
                  <span className="metric-val">{lastLatency ? `${lastLatency} ms` : '—'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">RAG Retrieval</span>
                  <span className="metric-val">{ragEnabled ? 'Enabled' : 'Bypassed'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Turn Count</span>
                  <span className="metric-val">{messages.length}</span>
                </div>
              </div>
            </div>

            <div className="inspector-section">
              <div className="section-title">
                Retrieved Context Chunks ({activeCitations.length})
              </div>
              {activeCitations.length === 0 ? (
                <div className="inspector-empty">
                  No reference chunks retrieved for the current turn. Ask a question about your uploaded documents!
                </div>
              ) : (
                activeCitations.map((c, i) => (
                  <div key={i} className="chunk-preview-box">
                    <div className="chunk-meta">
                      <span className="chunk-source">📄 {c.source}</span>
                      <span className="chunk-page">Page {c.page}</span>
                      {c.score !== undefined && (
                        <span className="chunk-score">Score: {c.score}</span>
                      )}
                    </div>
                    <div className="chunk-text">"{c.text}"</div>
                  </div>
                ))
              )}
            </div>

            <div className="inspector-section">
              <div className="section-title">Active Persona Prompt</div>
              <div className="prompt-preview">
                {PERSONAS.find(p => p.id === selectedPersona)?.desc}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
