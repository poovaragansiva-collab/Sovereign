import React, { useState, useEffect } from 'react';
import { api } from './api';
interface TaskItem {
  task_id: string;
  task: string;
  capability: string;
  model_used: string;
  status: string;
  created_time: string;
}

const Workspace: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [inputTask, setInputTask] = useState('');
  const [capability, setCapability] = useState('general');
  const [outputFormat, setOutputFormat] = useState('markdown');
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await api.listTasks({ limit: 50 });
      const items = (res.tasks || []).map((t: any) => ({
        task_id: t.id || t.task_id,
        task: t.task || t.prompt,
        capability: t.capability || 'general',
        model_used: t.model_used || '—',
        status: t.status || 'completed',
        created_time: t.created_time || new Date().toISOString(),
      }));
      setTasks(items);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleExecute = async () => {
    if (!inputTask.trim()) return;
    setLoading(true);

    const uploadedFiles: string[] = [];
    if (selectedFile) {
      try {
        const uploadRes = await api.uploadDocument(selectedFile);
        if (uploadRes.file_path) {
          uploadedFiles.push(uploadRes.file_path);
        }
      } catch (e) {
        console.error('Upload failed', e);
      }
    }

    try {
      const res = await api.executeTaskDirect({
        task: inputTask,
        task_type: 'generate',
        capability,
        files: uploadedFiles,
        options: { format: outputFormat },
      });
      setSelectedTask(res);
      fetchTasks();
    } catch (error) {
      console.error('Task execution failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="sidebar" style={{ padding: '20px', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '16px', fontFamily: 'var(--font-newsreader)', fontSize: '18px' }}>Task History</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tasks.map((t) => (
            <div
              key={t.task_id}
              className="card"
              style={{ cursor: 'pointer', padding: '12px' }}
              onClick={async () => {
                try {
                  const res = await api.getTask(t.task_id);
                  setSelectedTask(res);
                } catch (e) {
                  console.error('Failed to load task details', e);
                }
              }}
            >
              <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
                <strong>{t.capability}</strong>: {t.status}
              </p>
              <small style={{ color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                {new Date(t.created_time).toLocaleString()}
              </small>
            </div>
          ))}
        </div>
      </div>
      <div className="main-area" style={{ padding: '24px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <textarea
            className="form-textarea"
            value={inputTask}
            onChange={(e) => setInputTask(e.target.value)}
            placeholder="Enter your task here..."
            rows={4}
          />
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
            <select className="input-field" style={{ width: 'auto' }} value={capability} onChange={(e) => setCapability(e.target.value)}>
              <option value="general">General</option>
              <option value="reasoning">Reasoning</option>
              <option value="coding">Coding</option>
              <option value="vision">Vision</option>
            </select>
            <select className="input-field" style={{ width: 'auto' }} value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
              <option value="text">Text</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word</option>
              <option value="pptx">PowerPoint</option>
            </select>
            <input className="input-field" style={{ width: 'auto' }} type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            <button className="btn-primary" onClick={handleExecute} disabled={loading}>
              {loading ? 'Executing...' : 'Execute'}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, backgroundColor: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-structural)', overflowY: 'auto' }}>
          {selectedTask && (
            <div className="card">
              <h3 style={{ marginBottom: '12px', fontFamily: 'var(--font-newsreader)' }}>Result</h3>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Model: {selectedTask.model_used || 'Local Router'}</span>
                <span>Status: <span className="status-badge">{selectedTask.status}</span></span>
                {selectedTask.verification && (
                  <span>
                    Verification: {selectedTask.verification.status} ({selectedTask.verification.confidence})
                  </span>
                )}
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'var(--font-mono)', fontSize: '13px', backgroundColor: 'var(--canvas)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-structural)' }}>
                {selectedTask.answer || selectedTask.content || selectedTask.task}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;
