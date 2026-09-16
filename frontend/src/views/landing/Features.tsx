import React from 'react';

const Features: React.FC = () => {
  return (
    <section style={{ padding: '80px 24px', backgroundColor: 'var(--surface)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Engineering Precision & Privacy</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
            Built for enterprise confidentiality. Execute advanced AI capabilities entirely within your security boundary.
          </p>
        </div>

        <div className="metrics-grid">
          
          <div className="metric-card">
            <div className="metric-icon">🔒</div>
            <div className="metric-label">Air-Gapped Execution</div>
            <p style={{ fontSize: '14px', marginTop: '12px', color: 'var(--text-secondary)' }}>
              Total data sovereignty. The core engine and local LLMs run completely offline. No telemetry, no external API calls.
            </p>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🧠</div>
            <div className="metric-label">Local RAG</div>
            <p style={{ fontSize: '14px', marginTop: '12px', color: 'var(--text-secondary)' }}>
              Ingest sensitive documents locally. Embeddings and vector search happen entirely on your hardware without leaking data.
            </p>
          </div>

          <div className="metric-card">
            <div className="metric-icon">⚡</div>
            <div className="metric-label">Intelligent Routing</div>
            <p style={{ fontSize: '14px', marginTop: '12px', color: 'var(--text-secondary)' }}>
              Automatically delegates tasks to the appropriate model based on complexity, keeping private tasks local and accelerating workflows.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Features;
