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
  return (
    <div className="login-wrapper-split">
      {/* Left side: Premium gradient & abstract decorative art */}
      <div className="login-decor-side">
        <div className="decor-shapes-container">
          <div className="decor-circle circle-1"></div>
          <div className="decor-circle circle-2"></div>
          <div className="decor-capsule capsule-1"></div>
          <div className="decor-capsule capsule-2"></div>
          <div className="decor-capsule capsule-3"></div>
          <div className="decor-capsule capsule-4"></div>
          <div className="decor-capsule capsule-5"></div>
        </div>
        <div className="decor-content">
          <h1 className="decor-title">
            Bienvenido a <br/>
            <span className="decor-brand">SMO IT CORE</span>
          </h1>
          <p className="decor-subtitle">
            Gestión Central de TI para SMO.
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="login-form-side">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2 className="login-form-title">INICIAR SESIÓN</h2>
          </div>

          {error && (
            <div className="login-error-alert animate-fade">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="alert-icon-svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span className="alert-text">{error}</span>
            </div>
          )}

          <form className="login-form-element" onSubmit={handleSubmit}>
            <div className="form-group-custom">
              <div className="input-pill-wrapper">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pill-icon-svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <input
                  type="email"
                  id="email"
                  className="pill-control"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group-custom">
              <div className="input-pill-wrapper">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pill-icon-svg"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input
                  type="password"
                  id="password"
                  className="pill-control"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-options-row">
              <label className="checkbox-container">
                <input type="checkbox" defaultChecked />
                <span className="checkmark"></span>
                <span className="checkbox-label">Recordarme</span>
              </label>
              <a href="#forgot" className="forgot-link" onClick={(e) => e.preventDefault()}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button type="submit" className="btn-gradient-submit" disabled={loading}>
              {loading ? (
                <span className="spinner-auth-custom">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
                  Iniciando...
                </span>
              ) : (
                <span>INGRESAR</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
