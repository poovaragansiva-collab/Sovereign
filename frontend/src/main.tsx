import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App'
import Login from './views/Login'
import Register from './views/auth/Register'
import PendingApproval from './views/auth/PendingApproval'
import ForgotPassword from './views/auth/ForgotPassword'
import { AuthProvider, useAuth } from './context/AuthContext'

import Landing from './views/landing/Landing'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--canvas)' }}>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/workbench/*" element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
