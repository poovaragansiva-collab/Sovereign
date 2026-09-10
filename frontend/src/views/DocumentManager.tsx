import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import type { ToastType } from '../components/ToastContainer';

interface Props {
  addToast: (type: ToastType, title: string, message?: string) => void;
}

interface Doc {
  id: number;
  filename: string;
  file_path: string;
  size: number;
  mime_type: string | null;
  indexed: boolean;
  chunks_count?: number;
  page_count?: number;
  ocr_applied?: boolean;
  status?: string;
  created_at: string | null;
}


function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function fileIcon(mime: string | null): string {
  if (!mime) return '📄';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('word') || mime.includes('docx')) return '📘';
  if (mime.includes('excel') || mime.includes('xlsx') || mime.includes('spreadsheet')) return '📗';
  if (mime.includes('image')) return '🖼️';
  if (mime.includes('text')) return '📃';
  if (mime.includes('json')) return '🔧';
  return '📄';
}

export default function DocumentManager({ addToast }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDocs = async (q?: string) => {
    try {
      setLoading(true);
      const res = await api.listDocuments(q);
      setDocs(res.documents);
    } catch (e: any) {
      addToast('error', 'Failed to load documents', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    let successCount = 0;
    for (const file of arr) {
      try {
        await api.uploadDocument(file);
        successCount++;
      } catch (e: any) {
        addToast('error', `Upload failed: ${file.name}`, e.message);
      }
    }
    if (successCount > 0) {
      addToast('success', `${successCount} document${successCount > 1 ? 's' : ''} uploaded`);
      await loadDocs(search || undefined);
    }
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    uploadFiles(e.dataTransfer.files);
  };

  const deleteDoc = async (id: number, filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return;
    setDeleting(id);
    try {
      await api.deleteDocument(id);
      setDocs(prev => prev.filter(d => d.id !== id));
      addToast('success', `"${filename}" deleted`);
    } catch (e: any) {
      addToast('error', 'Delete failed', e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    loadDocs(val || undefined);
  };

  return (
    <div>
      <div className="section-header mb-4">
        <div>
          <div className="section-title">Document Manager</div>
          <div className="section-sub">{docs.length} document{docs.length !== 1 ? 's' : ''} in repository</div>
        </div>
        <button
          id="btn-upload-doc"
          className="btn btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Uploading…</>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.csv,.json,.md"
          onChange={handleFileChange}
        />
      </div>

      {/* Dropzone */}
      <div
        className={`dropzone${dragging ? ' active' : ''}`}
        style={{ marginBottom: 20 }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="dropzone-icon">{dragging ? '📂' : '📁'}</div>
        <div className="dropzone-label">
          {dragging ? 'Drop files to upload' : 'Drag & drop files here, or click to browse'}
        </div>
        <div className="dropzone-sub">
          PDF, DOCX, TXT, PNG, JPG, XLSX, CSV, JSON, MD
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          id="doc-search"
          className="form-input"
          placeholder="🔍 Search documents by name…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" /><span>Loading documents…</span></div>
      ) : docs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <div className="empty-state-title">No documents yet</div>
          <div className="empty-state-sub">Upload documents to use them as context in AI tasks via RAG.</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Size</th>
                <th>Pages</th>
                <th>Chunks</th>
                <th>OCR</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{fileIcon(d.mime_type)}</span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{d.filename}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                          id:{d.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-gray">{d.mime_type?.split('/')[1] ?? 'unknown'}</span>
                  </td>
                  <td className="td-muted">{formatBytes(d.size)}</td>
                  <td>{d.page_count ?? 1}</td>
                  <td>
                    <span className="badge badge-cyan">{d.chunks_count ?? 0}</span>
                  </td>
                  <td>
                    {d.ocr_applied ? (
                      <span className="badge badge-amber">OCR</span>
                    ) : (
                      <span className="td-muted">—</span>
                    )}
                  </td>
                  <td>
                    {d.indexed
                      ? <span className="badge badge-green">✓ Indexed</span>
                      : <span className="badge badge-gray">Pending</span>}
                  </td>
                  <td className="td-muted">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button
                      id={`btn-delete-doc-${d.id}`}
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteDoc(d.id, d.filename)}
                      disabled={deleting === d.id}
                    >
                      {deleting === d.id ? '…' : '🗑 Delete'}

                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
