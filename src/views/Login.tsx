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
      {/* Animated Glowing Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      <div className="login-container glass-panel animate-slide-up">
        <div className="login-header">
          <h1 className="logo-brand">SMO <span className="gradient-text">IT CORE</span></h1>
          <p className="logo-tagline text-muted">Gestión Central de Tecnologías y Soportes</p>
        </div>

        {error && (
          <div className="login-error-alert animate-fade">
            <span className="alert-icon">⚠️</span>
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
              <span className="spinner-auth">⏳ Iniciando...</span>
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
              👑 Admin
            </button>
            <button 
              className="quick-btn role-badge-tech"
              onClick={() => handleQuickLogin('santi@smo.com', 'tech123')}
              disabled={loading}
            >
              🔧 Técnico
            </button>
            <button 
              className="quick-btn role-badge-user"
              onClick={() => handleQuickLogin('user@smo.com', 'user123')}
              disabled={loading}
            >
              👤 Usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
