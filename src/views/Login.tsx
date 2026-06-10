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
      <div className="login-container glass-panel animate-slide-up">
        <div className="login-header">
          <h1 className="logo-brand">SMO <span className="gradient-text">IT CORE</span></h1>
          <p className="logo-tagline text-muted">Gestión Central de Tecnologías y Soportes</p>
        </div>

        {error && (
          <div className="login-error-alert animate-fade">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="alert-icon-svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span className="alert-text">{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">CORREO ELECTRÓNICO</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="nombre@smo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">CONTRASEÑA</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-submit" disabled={loading}>
            {loading ? (
              <span className="spinner-auth">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
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
              Administrador
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
              Usuario Sede
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
