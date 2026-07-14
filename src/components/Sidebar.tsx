import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  mobileOpen,
  setMobileOpen,
}) => {
  const { user, logout } = useAuth();

  const [ticketsOpen, setTicketsOpen] = useState(false);
  const [inventarioOpen, setInventarioOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    if (['tickets', 'plantillas'].includes(activeView)) {
      setTicketsOpen(true);
    }
    if (['inventario', 'movimientos', 'bodegas'].includes(activeView)) {
      setInventarioOpen(true);
    }
    if (['personas', 'proveedores', 'usuarios'].includes(activeView)) {
      setAdminOpen(true);
    }
  }, [activeView]);

  const handleNav = (id: string) => {
    setActiveView(id);
    setMobileOpen(false);
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return '';
    if (role === 'ADMIN') return 'Administrador';
    if (role === 'TECNICO') return 'Técnico TI';
    return 'Usuario Sede';
  };

  // Modern minimal monochrome SVGs
  const Icons = {
    dashboard: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
    tickets: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
        <path d="M13 5v14M9 9h8M9 15h8" />
      </svg>
    ),
    plantillas: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    inventario: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
    movimientos: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    proyectos: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    guardias: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    chats: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    personas: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    proveedores: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    usuarios: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    reportes: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    logout: (
      <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
    ),
  };

  const isUserRole = user?.rol === 'USUARIO';

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)}></div>
      )}

      <aside className={`sidebar glass-panel ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-glow"></div>
          <span className="logo-text">SMO <span className="gradient-text">IT CORE</span></span>
        </div>

        <nav className="sidebar-nav">
          {/* USER Sede - Simple Interface (ONLY Tickets) */}
          {isUserRole ? (
            <button
              className={`nav-item ${activeView === 'tickets' ? 'active' : ''}`}
              onClick={() => handleNav('tickets')}
            >
              <span className="nav-icon">{Icons.tickets}</span>
              <span className="nav-label">Mis Tickets</span>
              {activeView === 'tickets' && <div className="active-glow"></div>}
            </button>
          ) : (
            <>
              {/* ADMIN & TECNICO Full Interface */}
              <button
                className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNav('dashboard')}
              >
                <span className="nav-icon">{Icons.dashboard}</span>
                <span className="nav-label">Dashboard</span>
                {activeView === 'dashboard' && <div className="active-glow"></div>}
              </button>

              {/* Accordion 1: Tickets */}
              <div className={`accordion-group ${ticketsOpen ? 'open' : ''}`}>
                <button
                  className={`accordion-header ${['tickets', 'plantillas'].includes(activeView) ? 'active' : ''}`}
                  onClick={() => setTicketsOpen(!ticketsOpen)}
                >
                  <div className="accordion-header-left">
                    <span className="nav-icon">{Icons.tickets}</span>
                    <span>Soportes & Tickets</span>
                  </div>
                  <svg className="accordion-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
                <div className="accordion-content">
                  <button
                    className={`sub-nav-item ${activeView === 'tickets' ? 'active' : ''}`}
                    onClick={() => handleNav('tickets')}
                  >
                    <span>• Tickets</span>
                  </button>
                  <button
                    className={`sub-nav-item ${activeView === 'plantillas' ? 'active' : ''}`}
                    onClick={() => handleNav('plantillas')}
                  >
                    <span>• Soportes Recurrentes</span>
                  </button>
                </div>
              </div>

              {/* Accordion 2: Inventarios */}
              <div className={`accordion-group ${inventarioOpen ? 'open' : ''}`}>
                <button
                  className={`accordion-header ${['inventario', 'movimientos', 'bodegas'].includes(activeView) ? 'active' : ''}`}
                  onClick={() => setInventarioOpen(!inventarioOpen)}
                >
                  <div className="accordion-header-left">
                    <span className="nav-icon">{Icons.inventario}</span>
                    <span>Inventario TI</span>
                  </div>
                  <svg className="accordion-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
                <div className="accordion-content">
                  <button
                    className={`sub-nav-item ${activeView === 'inventario' ? 'active' : ''}`}
                    onClick={() => handleNav('inventario')}
                  >
                    <span>• Activos & Stock</span>
                  </button>
                  <button
                    className={`sub-nav-item ${activeView === 'movimientos' ? 'active' : ''}`}
                    onClick={() => handleNav('movimientos')}
                  >
                    <span>• Historial Movs</span>
                  </button>
                  <button
                    className={`sub-nav-item ${activeView === 'bodegas' ? 'active' : ''}`}
                    onClick={() => handleNav('bodegas')}
                  >
                    <span>• Bodegas</span>
                  </button>
                </div>
              </div>

              {/* Projects */}
              <button
                className={`nav-item ${activeView === 'proyectos' ? 'active' : ''}`}
                onClick={() => handleNav('proyectos')}
              >
                <span className="nav-icon">{Icons.proyectos}</span>
                <span className="nav-label">Proyectos TI</span>
                {activeView === 'proyectos' && <div className="active-glow"></div>}
              </button>

              {/* Guards */}
              <button
                className={`nav-item ${activeView === 'guardias' ? 'active' : ''}`}
                onClick={() => handleNav('guardias')}
              >
                <span className="nav-icon">{Icons.guardias}</span>
                <span className="nav-label">Guardias & Turnos</span>
                {activeView === 'guardias' && <div className="active-glow"></div>}
              </button>

              {/* Internal Slack Chat */}
              <button
                className={`nav-item ${activeView === 'chats' ? 'active' : ''}`}
                onClick={() => handleNav('chats')}
              >
                <span className="nav-icon">{Icons.chats}</span>
                <span className="nav-label">Chat Interno</span>
                {activeView === 'chats' && <div className="active-glow"></div>}
              </button>

              {/* Reportes */}
              <button
                className={`nav-item ${activeView === 'reportes' ? 'active' : ''}`}
                onClick={() => handleNav('reportes')}
              >
                <span className="nav-icon">{Icons.reportes}</span>
                <span className="nav-label">Reportería</span>
                {activeView === 'reportes' && <div className="active-glow"></div>}
              </button>

              {/* Accordion 3: Administration */}
              <div className={`accordion-group ${adminOpen ? 'open' : ''}`}>
                <button
                  className={`accordion-header ${['personas', 'proveedores', 'usuarios'].includes(activeView) ? 'active' : ''}`}
                  onClick={() => setAdminOpen(!adminOpen)}
                >
                  <div className="accordion-header-left">
                    <span className="nav-icon">{Icons.personas}</span>
                    <span>Administración</span>
                  </div>
                  <svg className="accordion-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
                <div className="accordion-content">
                  <button
                    className={`sub-nav-item ${activeView === 'personas' ? 'active' : ''}`}
                    onClick={() => handleNav('personas')}
                  >
                    <span>• Empleados</span>
                  </button>
                  <button
                    className={`sub-nav-item ${activeView === 'proveedores' ? 'active' : ''}`}
                    onClick={() => handleNav('proveedores')}
                  >
                    <span>• Proveedores TI</span>
                  </button>
                  {user?.rol === 'ADMIN' && (
                    <button
                      className={`sub-nav-item ${activeView === 'usuarios' ? 'active' : ''}`}
                      onClick={() => handleNav('usuarios')}
                    >
                      <span>• Usuarios Cuentas</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              {user?.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="username" title={user?.nombre}>{user?.nombre}</div>
              <div className={`user-role-badge role-${user?.rol.toLowerCase()}`}>
                {getRoleLabel(user?.rol)}
              </div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Cerrar sesión">
            <span className="logout-icon">{Icons.logout}</span>
            <span className="logout-text">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
