import React from 'react';
import { useNavigate } from 'react-router-dom';

const Navigation: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="section-header" style={{ padding: '16px 32px', position: 'sticky', top: 0, backgroundColor: 'rgba(251, 251, 249, 0.9)', backdropFilter: 'blur(8px)', zIndex: 100, borderBottom: '1px solid var(--border-structural)', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '24px', height: '24px', backgroundColor: 'var(--text-primary)', borderRadius: '4px' }}></div>
        <span style={{ fontFamily: 'var(--font-newsreader)', fontSize: '20px', fontWeight: 600 }}>SOVEREIGN</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <button className="btn-secondary" onClick={() => navigate('/login')}>Sign In</button>
      </div>
    </header>
  );
};

export default Navigation;
