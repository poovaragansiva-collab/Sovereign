import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { ToastType } from '../components/ToastContainer';

interface Props {
  addToast: (type: ToastType, title: string, message?: string) => void;
}

interface OutputItem {
  id: number;
  filename: string;
  format: string;
  file_size: number;
  task_id?: string;
  conversation_id?: string;
  created_at?: string;
}

export default function OutputGallery({ addToast }: Props) {
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [genTitle, setGenTitle] = useState('');
  const [genContent, setGenContent] = useState('');
  const [genFormat, setGenFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);

  const fetchOutputs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listOutputs();
      setOutputs(res.outputs || []);
    } catch (err: any) {
      addToast('error', 'Failed to load outputs', err.message);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchOutputs();
  }, [fetchOutputs]);

  const handleGenerate = async () => {
    if (!genTitle.trim() || !genContent.trim()) {
      addToast('warning', 'Please provide a title and content');
      return;
    }
    setGenerating(true);
    try {
      await api.generateOutput({
        title: genTitle,
        content: genContent,
        format: genFormat,
      });
      addToast('success', 'File generated successfully');
      setShowGenerator(false);
      setGenTitle('');
      setGenContent('');
      fetchOutputs();
    } catch (err: any) {
      addToast('error', 'Generation failed', err.message);
    } finally {
      setGenerating(false);
    }
  };

  const getFormatIcon = (fmt: string) => {
    const f = fmt.toLowerCase();
    if (f === 'pdf') return '📕';
    if (f === 'docx' || f === 'word') return '📘';
    if (f === 'xlsx' || f === 'excel') return '📊';
    if (f === 'pptx' || f === 'powerpoint') return '📙';
    if (f === 'json') return '🧩';
    return '📝';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>Output Gallery & Exported Artifacts</h2>
          <p className="view-desc">
            Directly browse and download generated reports, presentations, spreadsheets, and documents.
          </p>
        </div>
        <div className="view-actions">
          <button className="btn-secondary" onClick={fetchOutputs} disabled={loading}>
            🔄 Refresh
          </button>
          <button className="btn-primary" onClick={() => setShowGenerator(true)}>
            ➕ Generate New File
          </button>
        </div>
      </div>

      {/* Outputs Grid */}
      {outputs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No Generated Artifacts Yet</h3>
          <p>Generate reports, presentations, or data exports directly from tasks, conversations, or the button above.</p>
        </div>
      ) : (
        <div className="outputs-grid">
          {outputs.map(o => (
            <div key={o.id} className="output-card">
              <div className="output-card-icon">{getFormatIcon(o.format)}</div>
              <div className="output-card-info">
                <div className="output-filename" title={o.filename}>
                  {o.filename}
                </div>
                <div className="output-meta">
                  <span className="format-tag">{o.format.toUpperCase()}</span>
                  <span>{formatBytes(o.file_size)}</span>
                  {o.created_at && (
                    <span>{new Date(o.created_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <a
                href={api.getOutputDownloadUrl(o.id)}
                download={o.filename}
                className="btn-secondary btn-sm"
                title="Download artifact"
              >
                ⬇️ Download
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Generator Modal */}
      {showGenerator && (
        <div className="modal-backdrop" onClick={() => setShowGenerator(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate Export Document</h3>
              <button className="close-btn" onClick={() => setShowGenerator(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Document Title</label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="e.g. Q3 Security Audit Executive Summary"
                  value={genTitle}
                  onChange={e => setGenTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Export Format</label>
                <select
                  className="workbench-select"
                  value={genFormat}
                  onChange={e => setGenFormat(e.target.value)}
                >
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="docx">Microsoft Word (.docx)</option>
                  <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                  <option value="pptx">PowerPoint Presentation (.pptx)</option>
                  <option value="markdown">Markdown (.md)</option>
                  <option value="json">JSON File (.json)</option>
                  <option value="txt">Plain Text (.txt)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Content or Report Body</label>
                <textarea
                  className="code-textarea"
                  rows={8}
                  placeholder="Enter executive summary, bullet points, table data, or findings to render..."
                  value={genContent}
                  onChange={e => setGenContent(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowGenerator(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
                  {generating ? 'Generating Document...' : 'Generate & Download'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
