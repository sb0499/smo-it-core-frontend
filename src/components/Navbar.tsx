import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/ticket.service';
import './Navbar.css';

interface NavbarProps {
  activeView: string;
  setMobileOpen: (open: boolean) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setMobileOpen,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [runningAlert, setRunningAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Panel de Control Principal';
      case 'tickets': return 'Módulo de Soportes y Tickets';
      case 'inventario': return 'Inventarios y Consumibles TI';
      case 'proyectos': return 'Gestión de Proyectos & Kanban';
      case 'guardias': return 'Cronograma de Guardias TI';
      case 'chats': return 'Canal de Mensajería Interna';
      case 'personas': return 'Gestión de Personas y Empleados';
      case 'proveedores': return 'Gestión de Proveedores TI';
      case 'plantillas': return 'Plantillas y Tareas Recurrentes';
      case 'usuarios': return 'Control de Usuarios Técnicos';
      case 'movimientos': return 'Historial y Auditoría de Inventario';
      default: return 'IT CORE SYSTEM';
    }
  };

  const handleCierreDiarioAlert = async () => {
    setRunningAlert(true);
    setAlertSuccess(false);
    try {
      await ticketService.triggerCierreDiario();
      setAlertSuccess(true);
      setTimeout(() => setAlertSuccess(false), 3000);
      onRefresh();
    } catch (e) {
      alert('Error ejecutando alerta: ' + (e as Error).message);
    } finally {
      setRunningAlert(false);
    }
  };

  return (
    <header className="navbar glass-panel">
      <div className="navbar-left">
        <button className="mobile-toggle-btn" onClick={() => setMobileOpen(true)}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div className="view-breadcrumb">
          <span className="breadcrumb-sub">IT CORE</span>
          <span className="breadcrumb-slash">/</span>
          <h2 className="breadcrumb-main">{getViewTitle()}</h2>
        </div>
      </div>

      <div className="navbar-right">
        {/* Quick Admin Action */}
        {user?.rol === 'ADMIN' && (
          <button 
            className={`admin-cierre-btn ${alertSuccess ? 'success' : ''}`}
            onClick={handleCierreDiarioAlert}
            disabled={runningAlert}
            title="Enviar recordatorios de cierre diario a todos los técnicos"
          >
            {runningAlert ? (
              <span className="spinner">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
              </span>
            ) : alertSuccess ? (
              <span>✓ Enviado</span>
            ) : (
              <span>⏰ Alerta Cierre</span>
            )}
          </button>
        )}

        {/* Theme Toggle Button */}
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Cambiar tema">
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12.1 22a10 10 0 0 1-7.7-3.6 10 10 0 0 1-1.8-7.9 10.3 10.3 0 0 1 6.1-7.3 1 1 0 0 1 1.2.4 1 1 0 0 1-.1 1.3 8 8 0 0 0-.8 6.5 8 8 0 0 0 5.4 5.3 8 8 0 0 0 6.5-.8 1 1 0 0 1 1.3.1 1 1 0 0 1 .4 1.1 10.1 10.1 0 0 1-7.2 6.1 10 10 0 0 1-3.2.1z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 7a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm0-10a1 1 0 0 0 1-1V3a1 1 0 0 0-2 0v1a1 1 0 0 0 1 1zm0 14a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1zm8.49-13.08a1 1 0 0 0-1.41 0l-.71.71a1 1 0 0 0 1.41 1.41l.71-.71a1 1 0 0 0 0-1.41zm-14.14 14.14a1 1 0 0 0-1.41 0l-.71.71a1 1 0 0 0 1.41 1.41l.71-.71a1 1 0 0 0 0-1.41zM21 11h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0-2zM4 11H3a1 1 0 0 0 0 2h1a1 1 0 0 0 0-2zm14.49 3.08a1 1 0 0 0 0 1.41l.71.71a1 1 0 0 0 1.41-1.41l-.71-.71a1 1 0 0 0-1.41 0zM5.64 5.64a1 1 0 0 0 0 1.41l.71.71a1 1 0 0 0 1.41-1.41l-.71-.71a1 1 0 0 0-1.41 0z"/></svg>
          )}
        </button>

        <button className="refresh-btn" onClick={onRefresh} title="Refrescar datos">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>

        <div className="system-status">
          <span className="status-dot"></span>
          <span className="status-text">Online</span>
        </div>
      </div>
    </header>
  );
};
