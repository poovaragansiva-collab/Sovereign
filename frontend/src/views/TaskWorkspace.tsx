import { useState, useRef } from 'react';
import { api } from '../api';
import type { ToastType } from '../components/ToastContainer';

interface Props {
  addToast: (type: ToastType, title: string, message?: string) => void;
  onTaskComplete?: () => void;
}

type Capability = 'general' | 'reasoning' | 'coding' | 'vision';
type OutputFormat = 'markdown' | 'txt' | 'json' | 'pdf' | 'docx' | 'xlsx' | 'pptx';

interface Intelligence {
  capability: string;
  task_type: string;
  output_format: string | null;
  tools_required: string[];
}

interface TaskResult {
  task_id?: string;
  status: string;
  answer?: string;
  model_used?: string;
  verification?: { status: string; confidence: number } | null;
  errors?: string[];
  files?: Array<{ filename: string; format: string; path?: string }>;
  outputs?: Array<{ id: number; filename: string; format: string; file_path: string }>;
}

const CAPS: { id: Capability; label: string; desc: string }[] = [
  { id: 'general', label: '💬 General', desc: 'Q&A, summarization, writing' },
  { id: 'reasoning', label: '🧠 Reasoning', desc: 'Analysis, math, multi-step' },
  { id: 'coding', label: '💻 Coding', desc: 'Code gen, debugging, review' },
  { id: 'vision', label: '👁️ Vision', desc: 'Image analysis, OCR' },
];

const FORMATS: { id: OutputFormat; label: string }[] = [
  { id: 'markdown', label: 'Markdown (.md)' },
  { id: 'txt', label: 'Text (.txt)' },
  { id: 'json', label: 'JSON (.json)' },
  { id: 'pdf', label: 'PDF Document' },
  { id: 'docx', label: 'Word (.docx)' },
  { id: 'pptx', label: 'PowerPoint (.pptx)' },
  { id: 'xlsx', label: 'Excel (.xlsx)' },
];

function VerificationBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const cls = pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verification Confidence</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 70 ? 'var(--brand-green)' : pct >= 40 ? 'var(--brand-amber)' : 'var(--brand-red)' }}>
          {pct}%
        </span>
      </div>
      <div className="verification-bar-container">
        <div className={`verification-bar ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function TaskWorkspace({ addToast, onTaskComplete }: Props) {
  const [task, setTask] = useState('');
  const [capability, setCapability] = useState<Capability>('general');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('markdown');
  const [files, setFiles] = useState<File[]>([]);
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Task intelligence preview (debounced)
  const handleTaskChange = (val: string) => {
    setTask(val);
    // Simple client-side intelligence preview
    if (val.length > 20) {
      const lower = val.toLowerCase();
      let cap: Capability = 'general';
      if (/code|function|debug|program|script|class|implement/.test(lower)) cap = 'coding';
      else if (/analyze|reason|calculate|math|formula|proof|step/.test(lower)) cap = 'reasoning';
      else if (/image|photo|ocr|scan|picture|visual/.test(lower)) cap = 'vision';
      setCapability(cap);

      let fmt: OutputFormat = 'markdown';
      if (/pdf/.test(lower)) fmt = 'pdf';
      else if (/word|docx/.test(lower)) fmt = 'docx';
      else if (/excel|xlsx|spreadsheet/.test(lower)) fmt = 'xlsx';
      else if (/json/.test(lower)) fmt = 'json';
      setOutputFormat(fmt);

      setIntelligence({
        capability: cap,
        task_type: 'generate',
        output_format: fmt,
        tools_required: /calculat|formula|math/.test(lower) ? ['calculator'] : [],
      });
    } else {
      setIntelligence(null);
    }
  };

  const handleExecute = async () => {
    if (!task.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      // Upload files first
      const uploadedPaths: string[] = [];
      for (const f of files) {
        try {
          const up = await api.uploadFile(f);
          if (up.path) uploadedPaths.push(up.path);
        } catch {
          addToast('error', `Failed to upload ${f.name}`);
        }
      }

      const res = await api.executeTaskDirect({
        task: task.trim(),
        capability,
        task_type: 'generate',
        files: uploadedPaths,
        options: { output_format: outputFormat, format: outputFormat },
        metadata: {},
      });

      setResult(res);
      addToast('success', 'Task completed', `Status: ${res.status}`);
      if (onTaskComplete && res.status === 'completed') {
        setTimeout(onTaskComplete, 2000);
      }
    } catch (e: any) {
      const errMsg = e.message || 'Execution failed';
      setResult({ status: 'failed', errors: [errMsg] });
      addToast('error', 'Task failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setTask('');
    setFiles([]);
    setResult(null);
    setIntelligence(null);
    setCapability('general');
    setOutputFormat('markdown');
  };

  return (
    <div>
      <div className="workspace-header">
        <div className="workspace-title">New AI Task</div>
        <div className="workspace-sub">Describe your task — the AI Engine handles the rest locally.</div>
      </div>

      <div className="workspace-grid">
        {/* Left: Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Prompt */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="form-label" style={{ marginBottom: 8 }}>Task Prompt</div>
            </div>
            <textarea
              id="task-prompt"
              className="form-textarea"
              style={{
                borderRadius: 0,
                border: 'none',
                minHeight: 160,
                padding: '14px 16px',
                resize: 'vertical',
                background: 'transparent',
              }}
              placeholder="Describe your task in natural language…&#10;&#10;Examples:&#10;• Summarize this document and output as PDF&#10;• Write a Python function to parse JSON&#10;• Analyze this image and extract text"
              value={task}
              onChange={e => handleTaskChange(e.target.value)}
            />
          </div>

          {/* Intelligence Preview */}
          {intelligence && (
            <div className="intelligence-panel">
              <div className="intelligence-panel-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l3 3" />
                </svg>
                Task Intelligence Analysis
              </div>
              <div className="intelligence-tags">
                <span className="badge badge-blue">Capability: {intelligence.capability}</span>
                <span className="badge badge-purple">Type: {intelligence.task_type}</span>
                {intelligence.output_format && (
                  <span className="badge badge-cyan">Output: {intelligence.output_format}</span>
                )}
                {intelligence.tools_required.map(t => (
                  <span key={t} className="badge badge-amber">Tool: {t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Capability */}
          <div className="card">
            <div className="form-label" style={{ marginBottom: 10 }}>Capability</div>
            <div className="capability-pills">
              {CAPS.map(c => (
                <button
                  key={c.id}
                  id={`cap-${c.id}`}
                  className={`cap-pill${capability === c.id ? ` selected ${c.id}` : ''}`}
                  onClick={() => setCapability(c.id)}
                  title={c.desc}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Output Format */}
          <div className="card">
            <div className="form-label" style={{ marginBottom: 10 }}>Output Format</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  id={`fmt-${f.id}`}
                  className={`cap-pill${outputFormat === f.id ? ' selected general' : ''}`}
                  onClick={() => setOutputFormat(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* File Attachment */}
          <div className="card">
            <div className="form-label" style={{ marginBottom: 10 }}>Attach Files</div>
            <div
              className={`dropzone${files.length ? '' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const dropped = Array.from(e.dataTransfer.files);
                setFiles(prev => [...prev, ...dropped]);
              }}
            >
              <div className="dropzone-icon">📎</div>
              <div className="dropzone-label">Drop files here or click to browse</div>
              <div className="dropzone-sub">PDF, DOCX, TXT, PNG, JPG supported</div>
              <input
                ref={fileRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.csv"
                onChange={handleFileChange}
              />
            </div>
            {files.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {files.map((f, i) => (
                  <div key={i} className="file-chip">
                    📄 {f.name}
                    <button onClick={() => removeFile(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              id="btn-execute-task"
              className="btn btn-primary btn-lg"
              style={{ flex: 1 }}
              onClick={handleExecute}
              disabled={loading || !task.trim()}
            >
              {loading ? (
                <>
                  <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Executing…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Execute Task
                </>
              )}
            </button>
            <button id="btn-clear-task" className="btn btn-secondary" onClick={clearAll} disabled={loading}>
              Clear
            </button>
          </div>
        </div>

        {/* Right: Result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading && (
            <div className="card">
              <div className="output-executing">
                <div className="loading-spinner" />
                AI Engine executing task locally…
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 20px 16px' }}>
                Running through: Task Intelligence → Model Router → LangGraph → {capability === 'vision' ? 'OCR/Vision' : capability === 'coding' ? 'Code Agent' : 'RAG'} → Verifier
              </div>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Status */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="form-label">Result</div>
                  <span className={`status-badge ${result.status}`}>{result.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <div className="detail-meta-item">
                    <div className="detail-meta-label">Model Used</div>
                    <div className="detail-meta-value" style={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                      {result.model_used ?? '—'}
                    </div>
                  </div>
                  <div className="detail-meta-item">
                    <div className="detail-meta-label">Task ID</div>
                    <div className="detail-meta-value" style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
                      {result.task_id?.slice(0, 8) ?? '—'}…
                    </div>
                  </div>
                </div>
                {result.verification && (
                  <VerificationBar confidence={result.verification.confidence ?? 1} />
                )}
              </div>

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <div className="error-block">
                  {result.errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
                </div>
              )}

              {/* Answer */}
              {result.answer && (
                <div className="card">
                  <div className="form-label" style={{ marginBottom: 10 }}>AI Response</div>
                  <div className="answer-block">{result.answer}</div>
                </div>
              )}

              {/* Generated Files */}
              {((result.files && result.files.length > 0) || (result.outputs && result.outputs.length > 0)) && (
                <div className="card">
                  <div className="form-label" style={{ marginBottom: 10 }}>Generated Files</div>
                  {(result.outputs ?? result.files ?? []).map((f: any, i: number) => (
                    <a
                      key={i}
                      href={api.getFileDownloadUrl(result.task_id ?? '', f.format)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ display: 'flex', marginBottom: 6 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download {f.filename ?? `${result.task_id?.slice(0, 8)}.${f.format}`}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && !result && (
            <div className="card">
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <div className="empty-state-icon">⚡</div>
                <div className="empty-state-title">Ready to Execute</div>
                <div className="empty-state-sub">
                  Enter a task prompt and click Execute. All AI processing happens locally.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
