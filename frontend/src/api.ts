const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? '' : 'http://127.0.0.1:8000');
const API_BASE = `${BASE_URL}/api/v1`;
const LEGACY_API = `${BASE_URL}/api`;

export interface ModelInfo {
  name: string;
  size?: number;
  parameters?: string;
  quantization?: string;
  capabilities?: string[];
  status?: string;
  modified_at?: string;
}

export interface ModelConfigItem {
  capability: string;
  model_name: string | null;
  enabled?: boolean;
}

export interface Citation {
  source: string;
  page: number;
  score?: number;
  text: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
  created_at?: string;
  sources?: Citation[];
  verification?: { status: string; confidence?: number };
  metadata?: { latency_ms?: number; persona?: string };
}

export interface Conversation {
  id: string;
  title: string;
  selected_model?: string;
  capability?: string;
  persona?: string;
  message_count?: number;
  last_message?: string;
  created_at?: string;
  updated_at?: string;
  messages?: Message[];
}

export interface DocumentItem {
  id: number;
  filename: string;
  file_path: string;
  size: number;
  mime_type: string | null;
  indexed: boolean;
  chunks_count: number;
  page_count: number;
  ocr_applied: boolean;
  status: 'ready' | 'indexing' | 'failed';
  created_at: string | null;
  updated_at?: string | null;
}

export interface TaskRecord {
  id?: string;
  task_id: string;
  task: string;
  capability: string;
  status: string;
  task_type?: string;
  model_used: string | null;
  result?: string;
  answer?: string;
  created_at: string | null;
  completed_at: string | null;
  duration_seconds?: number;
  verification?: { status: string; confidence: number };
  files?: Array<{ filename: string; format: string }>;
}

export interface PluginItem {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  capabilities: string[];
  permissions: string[];
}

export interface OutputItem {
  id: number;
  filename: string;
  format: string;
  file_path: string;
  file_size?: number;
  task_id?: string | null;
  conversation_id?: string | null;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  timestamp: string;
  action: string;
  details?: string;
  user?: string;
}

export interface DashboardStats {
  metrics: {
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    pending_tasks: number;
    total_documents: number;
    total_conversations?: number;
    configured_models: number;
    detected_models: number;
    ollama_online: boolean;
    rag_vectorstore?: string;
    rag_indexed_chunks?: number;
    plugins_installed?: number;
  };
  recent_tasks: TaskRecord[];
}

export interface RAGStatus {
  status: 'ready' | 'uninitialized' | 'failed';
  documents: { total: number; indexed: number; failed: number };
  vector_store: string;
  collection_name: string;
  total_chunks: number;
  embedding_dimension?: number | null;
  embedding_model: string;
  ocr_available: boolean;
}

async function request(url: string, options: RequestInit = {}) {
  try {
    const token = localStorage.getItem('sovereign_token');
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || `Request failed (${res.status}): ${res.statusText}`);
    }
    return res.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Unable to connect to SOVEREIGN backend at ${url}. Ensure the server is online.`);
    }
    throw error;
  }
}

export const api = {
  // ── Health & Diagnostic ───────────────────────────
  checkHealth: () => request(`${BASE_URL}/health`),
  getDashboardStats: (): Promise<DashboardStats> => request(`${API_BASE}/dashboard/stats`),

  // ── Models ─────────────────────────────────────────
  getModels: () => request(`${LEGACY_API}/models`),
  getModelsV1: () => request(`${API_BASE}/models`),
  getModelConfig: () => request(`${API_BASE}/models/config`),
  getConfig: () => request(`${LEGACY_API}/models/config`),
  saveConfig: (models: { name: string; type: string }[]) =>
    request(`${LEGACY_API}/models/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ models }),
    }),
  saveModelConfig: (models: { name: string; type: string | null; enabled?: boolean }[]) =>
    request(`${API_BASE}/models/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ models }),
    }),
  getSetupStatus: () => request(`${LEGACY_API}/models/setup-status`),

  // ── Tasks ──────────────────────────────────────────
  listTasks: (params?: { status?: string; capability?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.capability) q.set('capability', params.capability);
    if (params?.limit) q.set('limit', String(params.limit));
    return request(`${API_BASE}/tasks/?${q}`);
  },
  getTask: (taskId: string) => request(`${API_BASE}/tasks/${taskId}`),
  createTask: (data: {
    task: string;
    capability?: string;
    task_type?: string;
    files?: string[];
    options?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) =>
    request(`${API_BASE}/tasks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  executeTask: (taskId: string) =>
    request(`${API_BASE}/tasks/${taskId}/execute`, { method: 'POST' }),
  executeTaskDirect: (data: {
    task: string;
    capability?: string;
    task_type?: string;
    files?: string[];
    options?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) =>
    request(`${API_BASE}/tasks/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteTask: (taskId: string) =>
    request(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' }),

  // ── Documents ──────────────────────────────────────
  listDocuments: (query?: string) => {
    const q = new URLSearchParams();
    if (query) q.set('query', query);
    return request(`${API_BASE}/documents/?${q}`);
  },
  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request(`${API_BASE}/documents/upload`, { method: 'POST', body: form });
  },
  uploadFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request(`${LEGACY_API}/files/upload`, { method: 'POST', body: form });
  },
  deleteDocument: (docId: number) =>
    request(`${API_BASE}/documents/${docId}`, { method: 'DELETE' }),

  // ── Audit Logs ─────────────────────────────────────
  listAuditLogs: (limit = 100) =>
    request(`${API_BASE}/audit-logs/?limit=${limit}`),

  // ── Chat ──────────────────────────────────────────
  createConversation: (data?: { title?: string; selected_model?: string; capability?: string; persona?: string }) =>
    request(`${API_BASE}/chat/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    }),
  listConversations: () => request(`${API_BASE}/chat/conversations`),
  getConversation: (id: string) => request(`${API_BASE}/chat/conversations/${id}`),
  deleteConversation: (id: string) =>
    request(`${API_BASE}/chat/conversations/${id}`, { method: 'DELETE' }),
  sendMessage: (
    conversationId: string,
    data: {
      content: string;
      rag_enabled?: boolean;
      tools_enabled?: boolean;
      model?: string;
      persona?: string;
    }
  ) =>
    request(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  exportConversation: (conversationId: string, format: string) =>
    request(`${API_BASE}/chat/conversations/${conversationId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    }),

  // ── RAG Diagnostics ───────────────────────────────
  getRagStatus: () => request(`${API_BASE}/rag/status`),
  testRagRetrieval: (query: string, k = 4) =>
    request(`${API_BASE}/rag/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, k }),
    }),
  reindexDocuments: (documentIds?: number[]) =>
    request(`${API_BASE}/rag/reindex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_ids: documentIds }),
    }),

  // ── Plugins ────────────────────────────────────────
  listPlugins: () => request(`${API_BASE}/plugins/`),
  togglePlugin: (name: string, enabled: boolean) =>
    request(`${API_BASE}/plugins/${encodeURIComponent(name)}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }),
  executePlugin: (name: string, action: string, params?: Record<string, unknown>) =>
    request(`${API_BASE}/plugins/${encodeURIComponent(name)}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params: params || {} }),
    }),

  // ── Outputs ────────────────────────────────────────
  listOutputs: () => request(`${API_BASE}/outputs/`),
  generateOutput: (data: { title: string; content: unknown; format: string; task_id?: string; conversation_id?: string }) =>
    request(`${API_BASE}/outputs/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  getOutputDownloadUrl: (outputId: number) => `${API_BASE}/outputs/${outputId}/download`,

  // ── Models (Extended) ──────────────────────────────
  pullModel: (name: string) =>
    request(`${API_BASE}/models/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  deleteModel: (name: string) =>
    request(`${API_BASE}/models/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  // ── Files ─────────────────────────────────────────
  getFileDownloadUrl: (taskId: string, format: string) =>
    `${LEGACY_API}/files/${taskId}/download?format=${format}`,
};

export type { };


export const authApi = {
    login: (data: URLSearchParams) =>
        request(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: data.toString()
        }),
    me: () => request(`${API_BASE}/auth/me`)
};
