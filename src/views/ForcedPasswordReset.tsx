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
      {/* Animated Glowing Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

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
            <span className="alert-icon">⚠️</span>
            <span className="alert-text">{error}</span>
          </div>
        )}

        {success && (
          <div className="login-error-alert animate-fade" style={{ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
            <span className="alert-icon" style={{ color: '#34d399' }}>✓</span>
            <span className="alert-text" style={{ color: '#34d399' }}>{success}</span>
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
              <span className="spinner-auth">⏳ Actualizando...</span>
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
