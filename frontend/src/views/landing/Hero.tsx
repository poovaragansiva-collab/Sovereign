import React from 'react';
import { useNavigate } from 'react-router-dom';

const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '0 24px',
      backgroundColor: 'var(--canvas)'
    }}>
      <div style={{ maxWidth: '800px', textAlign: 'center' }}>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div className="status-dot online"></div>
          <span className="status-text">Local Air-Gapped Compute</span>
        </div>
        
        <h1 style={{ 
          fontSize: '64px', 
          lineHeight: '1.1', 
          marginBottom: '24px', 
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)'
        }}>
          AI that stays where your data lives.
        </h1>
        
        <p style={{ 
          fontSize: '20px', 
          color: 'var(--text-secondary)', 
          marginBottom: '40px',
          maxWidth: '600px',
          margin: '0 auto 40px',
          lineHeight: '1.6'
        }}>
          SOVEREIGN is a private AI workbench for organizations that cannot afford to move confidential information outside their infrastructure.
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button 
            className="btn-primary" 
            style={{ padding: '12px 32px', fontSize: '16px' }}
            onClick={() => navigate('/login')}
          >
            Enter Workbench
          </button>
          <button 
            className="btn-secondary" 
            style={{ padding: '12px 32px', fontSize: '16px' }}
            onClick={() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }}
          >
            Explore Capabilities
          </button>
        </div>

      </div>
    </section>
  );
};

export default Hero;
