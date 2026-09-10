import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { ToastType } from '../components/ToastContainer';

interface Props {
  addToast: (type: ToastType, title: string, message?: string) => void;
}

interface RAGStatus {
  status: string;
  documents: { total: number; indexed: number; failed: number };
  vector_store: string;
  collection_name: string;
  total_chunks: number;
  embedding_model: string;
  ocr_available: boolean;
}

interface TestChunk {
  id: string;
  text: string;
  source: string;
  page: number;
  score?: number;
  ocr_applied?: boolean;
}

export default function RAGDiagnostics({ addToast }: Props) {
  const [status, setStatus] = useState<RAGStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [topK, setTopK] = useState(4);
  const [testResults, setTestResults] = useState<{
    query: string;
    chunks_retrieved_count: number;
    sources: string[];
    chunks: TestChunk[];
    final_context_preview: string;
  } | null>(null);
  const [reindexing, setReindexing] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRagStatus();
      setStatus(data);
    } catch (err: any) {
      addToast('error', 'Failed to fetch RAG status', err.message);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleTestQuery = async () => {
    if (!testQuery.trim()) return;
    try {
      const res = await api.testRagRetrieval(testQuery, topK);
      setTestResults(res);
      addToast('success', 'Retrieval test complete', `Found ${res.chunks_retrieved_count} chunks`);
    } catch (err: any) {
      addToast('error', 'Retrieval query failed', err.message);
    }
  };

  const handleReindexAll = async () => {
    if (!confirm('Reindex all documents in the database?')) return;
    setReindexing(true);
    try {
      const res = await api.reindexDocuments();
      addToast('success', 'Reindex completed', res.message);
      fetchStatus();
    } catch (err: any) {
      addToast('error', 'Reindexing failed', err.message);
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>RAG Diagnostics & Inspection Sandbox</h2>
          <p className="view-desc">
            Monitor local document chunking, embeddings, vector store health, and test semantic retrieval in real-time.
          </p>
        </div>
        <div className="view-actions">
          <button className="btn-secondary" onClick={fetchStatus} disabled={loading}>
            🔄 Refresh Status
          </button>
          <button className="btn-primary" onClick={handleReindexAll} disabled={reindexing}>
            {reindexing ? 'Reindexing...' : '⚡ Reindex All Documents'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">RAG Pipeline Status</div>
          <div className="stat-value" style={{ color: status?.status === 'ready' ? 'var(--brand-green)' : 'var(--brand-amber)' }}>
            {status?.status?.toUpperCase() || 'CHECKING'}
          </div>
          <div className="stat-sub">Local vectorstore initialized</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Indexed Chunks</div>
          <div className="stat-value">{status?.total_chunks ?? '—'}</div>
          <div className="stat-sub">Across {status?.documents?.indexed ?? 0} active documents</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Embedding Provider</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {status?.embedding_model || 'Local Embed'}
          </div>
          <div className="stat-sub">Ollama Native / Hash Vectorizer</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Local OCR Support</div>
          <div className="stat-value" style={{ color: 'var(--brand-green)' }}>
            AVAILABLE
          </div>
          <div className="stat-sub">Pytesseract & PIL enabled</div>
        </div>
      </div>

      {/* Retrieval Sandbox */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Semantic Retrieval Sandbox</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          Enter a test query to preview raw retrieved chunks, similarity distances, and source pages exactly as fed into local LLMs.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input
            type="text"
            className="search-input"
            style={{ flex: 1 }}
            placeholder="e.g. What are the key safety requirements? / What is the 2FA deadline?"
            value={testQuery}
            onChange={e => setTestQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTestQuery()}
          />
          <select
            className="workbench-select"
            style={{ width: 120 }}
            value={topK}
            onChange={e => setTopK(Number(e.target.value))}
          >
            <option value={2}>Top 2</option>
            <option value={4}>Top 4</option>
            <option value={8}>Top 8</option>
          </select>
          <button className="btn-primary" onClick={handleTestQuery}>
            Run Retrieval
          </button>
        </div>

        {testResults && (
          <div className="retrieval-results-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Retrieved {testResults.chunks_retrieved_count} chunks for "{testResults.query}"
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {testResults.sources.map((s, i) => (
                  <span key={i} className="source-pill">
                    📄 {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="chunks-list">
              {testResults.chunks.map((c, i) => (
                <div key={i} className="test-chunk-item">
                  <div className="test-chunk-header">
                    <span className="chunk-badge">Chunk #{i + 1}</span>
                    <span className="chunk-source-tag">Source: {c.source}</span>
                    <span className="chunk-page-tag">Page: {c.page}</span>
                    {c.score !== undefined && (
                      <span className="chunk-score-tag">Distance Score: {c.score}</span>
                    )}
                    {c.ocr_applied && <span className="ocr-tag">OCR Applied</span>}
                  </div>
                  <div className="test-chunk-body">"{c.text}"</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Synthesized Prompt Context Preview:
              </div>
              <pre className="context-preview-code">
                {testResults.final_context_preview}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
