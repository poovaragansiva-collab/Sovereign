import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer style={{ borderTop: '1px solid var(--border-structural)', padding: '40px 32px', backgroundColor: 'var(--canvas)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--text-secondary)', borderRadius: '2px' }}></div>
            <span style={{ fontFamily: 'var(--font-newsreader)', fontSize: '18px', fontWeight: 500, color: 'var(--text-secondary)' }}>SOVEREIGN</span>
          </div>
          <p style={{ color: 'var(--text-subtle)', fontSize: '13px', maxWidth: '300px' }}>
            Enterprise-grade private AI workbench. Engineered for strict data compliance and offline execution.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '64px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>Platform</h4>
            <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Architecture</a>
            <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Security</a>
            <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Models</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>Legal</h4>
            <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Privacy Policy</a>
            <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Terms of Service</a>
          </div>
        </div>
      </div>
      
      <div style={{ borderTop: '1px solid var(--border-heavy)', marginTop: '40px', paddingTop: '24px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
        © {new Date().getFullYear()} Sovereign Private AI. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
