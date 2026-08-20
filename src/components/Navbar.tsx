import { showAlert, showConfirm } from "../utils/alerts";
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ticketService } from "../services/ticket.service";
import {
  notificacionService,
  Notificacion,
} from "../services/notificacion.service";
import "./Navbar.css";

interface NavbarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  setMobileOpen: (open: boolean) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  setMobileOpen,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [runningAlert, setRunningAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);

  const [notifList, setNotifList] = useState<Notificacion[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [ecuadorTime, setEcuadorTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const dateStr = date.toLocaleDateString("es-EC", {
        timeZone: "America/Guayaquil",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timeStr = date.toLocaleTimeString("es-EC", {
        timeZone: "America/Guayaquil",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      setEcuadorTime(`${dateStr} ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifs = async () => {
    try {
      const list = await notificacionService.getNotificaciones();
      setNotifList(list);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 45000); // 45 seconds polling
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleNotifClick = async (notif: Notificacion) => {
    if (!notif.leido) {
      try {
        await notificacionService.marcarLeida(notif.id);
        setNotifList((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, leido: true } : n)),
        );
      } catch (e) {
        console.error(e);
      }
    }

    // Redirect user to the corresponding module based on notification content
    const titleLower = (notif.titulo || "").toLowerCase();
    const msgLower = (notif.mensaje || "").toLowerCase();

    if (
      titleLower.includes("proyecto") || 
      titleLower.includes("tarea") || 
      titleLower.includes("subtarea") || 
      titleLower.includes("mención") || 
      titleLower.includes("mencion") ||
      msgLower.includes("proyecto")
    ) {
      setActiveView("proyectos");
    } else if (
      titleLower.includes("ticket") || 
      titleLower.includes("soporte") || 
      titleLower.includes("estado") ||
      msgLower.includes("ticket")
    ) {
      setActiveView("tickets");
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      await notificacionService.marcarTodasLeidas();
      setNotifList((prev) => prev.map((n) => ({ ...n, leido: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefreshClick = () => {
    fetchNotifs();
    onRefresh();
  };

  const unreadCount = notifList.filter((n) => !n.leido).length;

  const getViewTitle = () => {
    switch (activeView) {
      case "dashboard":
        return "Panel de Control Principal";
      case "tickets":
        return "Módulo de Soportes y Tickets";
      case "inventario":
        return "Inventarios y Consumibles TI";
      case "proyectos":
        return "Gestión de Proyectos & Kanban";
      case "guardias":
        return "Cronograma de Guardias TI";
      case "chats":
        return "Canal de Mensajería Interna";
      case "personas":
        return "Gestión de Personas y Empleados";
      case "proveedores":
        return "Gestión de Proveedores TI";
      case "plantillas":
        return "Plantillas y Tareas Recurrentes";
      case "usuarios":
        return "Control de Usuarios Técnicos";
      case "movimientos":
        return "Historial y Auditoría de Inventario";
      default:
        return "TISMO";
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
      showAlert("Error ejecutando alerta: " + (e as Error).message);
    } finally {
      setRunningAlert(false);
    }
  };

  return (
    <header className="navbar glass-panel">
      <div className="navbar-left">
        <button
          className="mobile-toggle-btn"
          onClick={() => setMobileOpen(true)}
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="view-breadcrumb">
          <span className="breadcrumb-sub">TISMO</span>
          <span className="breadcrumb-slash">/</span>
          <h2 className="breadcrumb-main">{getViewTitle()}</h2>
        </div>
      </div>

      <div className="navbar-right">
        {/* Quick Admin Action */}
        {(user?.rol === "ADMIN" || user?.rol === "SUPERVISOR") && (
          <button
            className={`admin-cierre-btn ${alertSuccess ? "success" : ""}`}
            onClick={handleCierreDiarioAlert}
            disabled={runningAlert}
            title="Enviar recordatorios de cierre diario a todos los técnicos"
          >
            {runningAlert ? (
              <span className="spinner">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="spin"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </span>
            ) : alertSuccess ? (
              <span>✓ Enviado</span>
            ) : (
              <span>Alerta Cierre</span>
            )}
          </button>
        )}

        {/* Notification Bell Dropdown */}
        <div
          className="notification-bell-container"
          style={{ position: "relative" }}
        >
          <button
            className={`bell-btn ${unreadCount > 0 ? "unread" : ""}`}
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            title="Notificaciones internas"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {unreadCount > 0 && (
              <span className="bell-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifMenu && (
            <div className="notif-dropdown glass-panel animate-slide-up">
              <div className="notif-header">
                <h4>Notificaciones</h4>
                {unreadCount > 0 && (
                  <button
                    className="mark-all-read-btn"
                    onClick={handleMarcarTodasLeidas}
                  >
                    Marcar todo leído
                  </button>
                )}
              </div>

              <div className="notif-list-scroll">
                {notifList.length === 0 ? (
                  <div className="empty-notifs">No tienes notificaciones</div>
                ) : (
                  notifList.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        handleNotifClick(n);
                        setShowNotifMenu(false);
                      }}
                      className={`notif-item-row ${n.leido ? "read" : "unread"}`}
                    >
                      <div className="notif-title-row">
                        <span className="notif-title">{n.titulo}</span>
                        {!n.leido && <span className="notif-unread-dot"></span>}
                      </div>
                      <p className="notif-desc">{n.mensaje}</p>
                      <span className="notif-time">
                        {new Date(n.created_at).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          className="refresh-btn"
          onClick={handleRefreshClick}
          title="Refrescar datos"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        </button>

        <div
          className="system-status"
          style={{
            border: "1px solid #f1f5f9",
            background: "#f8fafc",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#475569",
            fontWeight: "bold",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "#2563eb" }}
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span style={{ fontFamily: "monospace" }}>{ecuadorTime}</span>
        </div>
      </div>
    </header>
  );
};
