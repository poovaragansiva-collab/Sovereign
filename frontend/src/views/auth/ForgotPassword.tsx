import React from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--canvas)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: 'var(--surface)', border: '1px solid var(--border-structural)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Reset Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Enter your email to receive a password reset link.</p>
        </div>
        
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Email</label>
            <input type="email" className="input-field" required />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '16px', padding: '10px' }}>
            Send Reset Link
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
          <Link to="/login" style={{ color: 'var(--text-secondary)' }}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
