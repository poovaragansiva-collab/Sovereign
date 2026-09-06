import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Workspace.css';

interface Task {
  task_id: string;
  task: string;
  capability: string;
  model_used: string;
  status: string;
  created_time: string;
}

const Workspace: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputTask, setInputTask] = useState('');
  const [capability, setCapability] = useState('general');
  const [outputFormat, setOutputFormat] = useState('markdown');
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/tasks');
      setTasks(res.data.tasks);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleExecute = async () => {
    if (!inputTask) return;
    setLoading(true);

    let uploadedFiles = [];
    if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        try {
            const uploadRes = await axios.post('http://localhost:8000/api/files/upload', formData);
            uploadedFiles.push(uploadRes.data.path);
        } catch(e) {
            console.error('Upload failed', e);
        }
    }

    try {
      const res = await axios.post('http://localhost:8000/api/tasks/execute', {
        task: inputTask,
        task_type: 'generate',
        capability: capability,
        files: uploadedFiles,
        options: { format: outputFormat }
      });
      setSelectedTask(res.data);
      fetchTasks();
    } catch (error) {
      console.error('Task execution failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-container">
      <div className="sidebar">
        <h3>Task History</h3>
        <div className="task-list">
          {tasks.map((t) => (
            <div key={t.task_id} className="task-item" onClick={async () => {
                const res = await axios.get(`http://localhost:8000/api/tasks/${t.task_id}`);
                setSelectedTask(res.data);
            }}>
              <p><strong>{t.capability}</strong>: {t.status}</p>
              <small>{new Date(t.created_time).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="main-content">
        <div className="input-area">
          <textarea
            value={inputTask}
            onChange={(e) => setInputTask(e.target.value)}
            placeholder="Enter your task here..."
            rows={4}
          />
          <div className="controls">
            <select value={capability} onChange={(e) => setCapability(e.target.value)}>
              <option value="general">General</option>
              <option value="reasoning">Reasoning</option>
              <option value="coding">Coding</option>
            </select>
            <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
              <option value="text">Text</option>
            </select>
            <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            <button onClick={handleExecute} disabled={loading}>
              {loading ? 'Executing...' : 'Execute'}
            </button>
          </div>
        </div>
        <div className="output-area">
          {selectedTask && (
            <div className="task-result">
              <h3>Result</h3>
              <div className="metadata">
                <span>Model: {selectedTask.model_used}</span>
                <span>Status: {selectedTask.status}</span>
                {selectedTask.verification && (
                    <span>Verification: {selectedTask.verification.status} ({selectedTask.verification.confidence})</span>
                )}
              </div>
              <pre className="content">{selectedTask.content || selectedTask.task}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;
