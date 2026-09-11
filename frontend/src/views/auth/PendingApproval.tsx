import React from 'react';
import { Link } from 'react-router-dom';

const PendingApproval: React.FC = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--canvas)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: 'var(--surface)', border: '1px solid var(--border-structural)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Account Pending Approval</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Your account request has been submitted successfully. An administrator must approve your account before you can access the workspace.
          </p>
        </div>
        
        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px' }}>
          <Link to="/login" className="btn-secondary">Return to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
