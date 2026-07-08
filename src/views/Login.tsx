import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Error de autenticación. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
  };

  return (
    <div className="login-wrapper">
      {/* Decorative Background Aura Blobs */}
      <div className="bg-blob blob-primary"></div>
      <div className="bg-blob blob-secondary"></div>

      <div className="login-container glass-panel animate-slide-up">
        <div className="login-header">
          <h1 className="logo-brand">SMO <span className="gradient-text">IT CORE</span></h1>
          <p className="logo-tagline text-muted">Gestión Central de Tecnologías y Soportes</p>
        </div>

        {error && (
          <div className="login-error-alert animate-fade">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="alert-icon-svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span className="alert-text">{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">CORREO ELECTRÓNICO</label>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon-svg"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <input
                type="email"
                id="email"
                className="form-control"
                placeholder="nombre@smo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">CONTRASEÑA</label>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon-svg"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <input
                type="password"
                id="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-submit" disabled={loading}>
            {loading ? (
              <span className="spinner-auth">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
                Iniciando...
              </span>
            ) : (
              <span>Acceder al Sistema</span>
            )}
          </button>
        </form>

        <div className="quick-access-section">
          <span className="quick-label text-dim">ACCESO RÁPIDO PARA PRUEBAS:</span>
          <div className="quick-buttons-grid">
            <button 
              className="quick-btn role-badge-admin"
              onClick={() => handleQuickLogin('admin@smo.com', 'admin123')}
              disabled={loading}
            >
              Admin
            </button>
            <button 
              className="quick-btn role-badge-tech"
              onClick={() => handleQuickLogin('santi@smo.com', 'tech123')}
              disabled={loading}
            >
              Técnico
            </button>
            <button 
              className="quick-btn role-badge-user"
              onClick={() => handleQuickLogin('user@smo.com', 'user123')}
              disabled={loading}
            >
              Usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
