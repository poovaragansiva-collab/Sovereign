import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const data = await authApi.login(params);
      await login(data.access_token);
      navigate('/workbench');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--canvas)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: 'var(--surface)', border: '1px solid var(--border-structural)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Sign in to SOVEREIGN</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Private AI processing inside your organization's infrastructure.</p>
        </div>
        
        {error && (
          <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#991b1b', fontSize: '14px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Email</label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ marginTop: '16px', padding: '10px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
          <Link to="/register" style={{ color: 'var(--text-secondary)' }}>Create account</Link>
          <Link to="/forgot-password" style={{ color: 'var(--text-secondary)' }}>Forgot password?</Link>
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', fontWeight: 500, color: 'var(--text-subtle)', letterSpacing: '0.05em' }}>
          LOCAL • SECURE
        </div>
      </div>
    </div>
  );
};

export default Login;
