import { showAlert, showConfirm } from '../utils/alerts';
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
      showAlert('Error ejecutando alerta: ' + (e as Error).message);
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
              <span>Alerta Cierre</span>
            )}
          </button>
        )}

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
