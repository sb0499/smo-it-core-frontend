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
    <div className="login-wrapper">
      <div className="login-container glass-panel animate-slide-up">
        <div className="login-header">
          <h1 className="logo-brand">SMO <span className="gradient-text">IT CORE</span></h1>
          <p className="logo-tagline text-muted">CAMBIO DE CONTRASEÑA OBLIGATORIO</p>
          <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--color-text-dim)' }}>
            Por razones de seguridad, debes actualizar tu contraseña antes de acceder a la plataforma.
          </p>
        </div>

        {error && (
          <div className="login-error-alert animate-fade">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="alert-icon-svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span className="alert-text">{error}</span>
          </div>
        )}

        {success && (
          <div className="login-error-alert animate-fade" style={{ background: '#ecfdf5', borderColor: '#d1fae5' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span className="alert-text" style={{ color: '#065f46' }}>{success}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="currentPassword">CONTRASEÑA TEMPORAL / ACTUAL</label>
            <input
              type="password"
              id="currentPassword"
              className="form-control"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="newPassword">NUEVA CONTRASEÑA</label>
            <input
              type="password"
              id="newPassword"
              className="form-control"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">CONFIRMAR NUEVA CONTRASEÑA</label>
            <input
              type="password"
              id="confirmPassword"
              className="form-control"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-submit" disabled={loading}>
            {loading ? (
              <span className="spinner-auth">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
                Actualizando...
              </span>
            ) : (
              <span>Actualizar Contraseña</span>
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '10px' }} 
            onClick={logout}
            disabled={loading}
          >
            Regresar al Login
          </button>
        </div>
      </div>
    </div>
  );
};
