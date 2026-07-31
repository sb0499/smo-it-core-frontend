import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import './Login.css';

export const ForcedPasswordReset: React.FC = () => {
  const { logout, updateMustChangePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess('¡Contraseña cambiada con éxito! Redirigiendo...');
      setTimeout(() => {
        updateMustChangePassword(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña. Verifica tu contraseña actual.');
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
            Seguridad Primero <br/>
            <span className="decor-brand">SMO IT CORE</span>
          </h1>
          <p className="decor-subtitle">
            Por razones de seguridad, debes actualizar tu contraseña temporal antes de continuar a la plataforma.
          </p>
        </div>
      </div>

      {/* Right side: Password Reset Form */}
      <div className="login-form-side">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2 className="login-form-title" style={{ fontSize: '18px' }}>CAMBIAR CONTRASEÑA</h2>
            <p style={{ fontSize: '12px', marginTop: '6px', color: '#64748b' }}>
              Define tu nueva contraseña de acceso.
            </p>
          </div>

          {error && (
            <div className="login-error-alert animate-fade">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="alert-icon-svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span className="alert-text">{error}</span>
            </div>
          )}

          {success && (
            <div className="login-error-alert animate-fade" style={{ background: '#ecfdf5', borderColor: '#d1fae5' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span className="alert-text" style={{ color: '#065f46' }}>{success}</span>
            </div>
          )}

          <form className="login-form-element" onSubmit={handleSubmit}>
            <div className="form-group-custom">
              <span className="form-label" style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.05em' }}>CONTRASEÑA TEMPORAL / ACTUAL</span>
              <div className="input-pill-wrapper">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pill-icon-svg"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input
                  type="password"
                  id="currentPassword"
                  className="pill-control"
                  placeholder="Contraseña actual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group-custom">
              <span className="form-label" style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.05em' }}>NUEVA CONTRASEÑA</span>
              <div className="input-pill-wrapper">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pill-icon-svg"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input
                  type="password"
                  id="newPassword"
                  className="pill-control"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group-custom">
              <span className="form-label" style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.05em' }}>CONFIRMAR NUEVA CONTRASEÑA</span>
              <div className="input-pill-wrapper">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pill-icon-svg"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input
                  type="password"
                  id="confirmPassword"
                  className="pill-control"
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-gradient-submit" style={{ marginTop: '10px' }} disabled={loading}>
              {loading ? (
                <span className="spinner-auth-custom">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
                  Actualizando...
                </span>
              ) : (
                <span>ACTUALIZAR CONTRASEÑA</span>
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', padding: '12px', borderRadius: '26px', fontSize: '12px', fontWeight: '600' }} 
              onClick={logout}
              disabled={loading}
            >
              Regresar al Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
