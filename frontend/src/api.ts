const API_BASE = 'http://localhost:8000/api/v1';
const LEGACY_API = 'http://localhost:8000/api';

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── Dashboard ─────────────────────────────────────
  getDashboardStats: () => request(`${API_BASE}/dashboard/stats`),

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

  // ── Files ─────────────────────────────────────────
  getFileDownloadUrl: (taskId: string, format: string) =>
    `${LEGACY_API}/files/${taskId}/download?format=${format}`,
};

export type { };
