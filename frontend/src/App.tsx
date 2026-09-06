import { useState, useEffect } from 'react';
import { api } from './api';
import Workspace from './Workspace';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [ollamaOffline, setOllamaOffline] = useState(false);
  const [success, setSuccess] = useState(false);
  const [view, setView] = useState<'setup' | 'workspace'>('setup');
  
  const capabilities = ["general", "reasoning", "coding", "vision"];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load dynamically discovered models
        const modelsRes = await api.getModels();
        if (!modelsRes.models || modelsRes.models.length === 0) {
          setOllamaOffline(true);
        } else {
          setModels(modelsRes.models);
          // Try fetching config to pre-populate
          try {
             const configRes = await api.getConfig();
             if (configRes.configured) {
                // Merge config
                const configMap = new Map();
                configRes.models.forEach((m: any) => configMap.set(m.name, m.type));
                
                setModels(modelsRes.models.map((m: any) => ({
                   ...m,
                   type: configMap.get(m.name) || m.type
                })));
                setView('workspace'); // Auto go to workspace if configured
             }
          } catch (e) {
             console.error("Config not found or failed to load", e);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load models");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleTypeChange = (modelName: string, newType: string) => {
    setModels(models.map(m => 
      m.name === modelName ? { ...m, type: newType === "none" ? null : newType } : m
    ));
  };

  const handleSave = async () => {
    try {
      setSuccess(false);
      setError(null);
      
      const configToSave = models.filter(m => m.type);
      await api.saveConfig(configToSave);
      setSuccess(true);
      
      setTimeout(() => {
          setSuccess(false);
          setView('workspace');
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save configuration");
    }
  };

  if (loading) return <div className="loading">Loading SOVEREIGN Setup...</div>;

  if (ollamaOffline) {
    return (
      <div className="offline-container">
        <h1>OLLAMA OFFLINE</h1>
        <p>Start Ollama and refresh this page.</p>
      </div>
    );
  }

  if (view === 'workspace') {
      return (
          <>
            <div style={{padding: '10px', backgroundColor: '#1e1e1e', textAlign: 'right'}}>
                <button onClick={() => setView('setup')} style={{marginRight: '20px'}}>Settings</button>
            </div>
            <Workspace />
          </>
      );
  }

  return (
    <div className="container">
      <header>
        <h1>SOVEREIGN</h1>
        <h2>LOCAL AI WORKBENCH</h2>
        <p>Configure your local AI models</p>
        <p className="subtitle">All AI models run locally through Ollama. Choose which model should handle each capability.</p>
      </header>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">Configuration Saved Successfully!</div>}

      <div className="models-list">
        <h3>LOCAL AI MODELS</h3>
        <hr />
        
        {models.map(m => (
          <div key={m.name} className="model-card">
            <h4>{m.name}</h4>
            <div className="status">Status: {m.available ? "Available" : "Unavailable"}</div>
            <div className="purpose-row">
              <label>Purpose:</label>
              <select 
                value={m.type || "none"} 
                onChange={(e) => handleTypeChange(m.name, e.target.value)}
              >
                <option value="none">-- Unassigned --</option>
                {capabilities.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <hr />
      <button className="save-btn" onClick={handleSave}>Save Configuration</button>
      <button className="save-btn" onClick={() => setView('workspace')} style={{marginLeft: '10px', backgroundColor: '#333'}}>Go to Workspace</button>
    </div>
  );
}

export default App;
