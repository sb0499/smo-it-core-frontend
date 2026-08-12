import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './views/Login';
import { ForcedPasswordReset } from './views/ForcedPasswordReset';
import { Dashboard } from './views/Dashboard';
import { Tickets } from './views/Tickets';
import { Inventario } from './views/Inventario';
import { Proyectos } from './views/Proyectos';
import { Guardias } from './views/Guardias';
import { Chats } from './views/Chats';
import { Personas } from './views/Personas';
import { Proveedores } from './views/Proveedores';
import { SoportesRecurrentes } from './views/SoportesRecurrentes';
import { Usuarios } from './views/Usuarios';
import { MovimientosInventario } from './views/MovimientosInventario';
import { Reportes } from './views/Reportes';
import { Bodegas } from './views/Bodegas';
import { EntregaCredenciales } from './views/EntregaCredenciales';
import { AlertContainer } from './components/AlertContainer';
import './App.css';

function AppContent() {
  const { token, user } = useAuth();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Reset activeView to default dashboard or role-based default view on user change (login/logout)
  useEffect(() => {
    if (user) {
      if (user.rol === 'USUARIO') {
        setActiveView('tickets');
      } else {
        setActiveView('dashboard');
      }
    }
  }, [user]);

  // If no auth token, redirect to glassmorphic login screen
  if (!token) {
    return <Login />;
  }

  // If must change password, force lock screen reset
  if (user?.must_change_password) {
    return <ForcedPasswordReset />;
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard key={refreshKey} />;
      case 'tickets':
        return <Tickets key={refreshKey} />;
      case 'inventario':
        if (user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || (user?.rol === 'TECNICO' && user?.has_inventory_access)) {
          return <Inventario key={refreshKey} />;
        }
        return user?.rol === 'USUARIO' ? <Tickets key={refreshKey} /> : <Dashboard key={refreshKey} />;
      case 'proyectos':
        return <Proyectos key={refreshKey} />;
      case 'guardias':
        return <Guardias key={refreshKey} />;
      case 'chats':
        return <Chats key={refreshKey} />;
      case 'personas':
        if (user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || user?.rol === 'TECNICO') {
          return <Personas key={refreshKey} />;
        }
        return user?.rol === 'USUARIO' ? <Tickets key={refreshKey} /> : <Dashboard key={refreshKey} />;
      case 'proveedores':
        if (user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || user?.rol === 'TECNICO') {
          return <Proveedores key={refreshKey} />;
        }
        return user?.rol === 'USUARIO' ? <Tickets key={refreshKey} /> : <Dashboard key={refreshKey} />;
      case 'plantillas':
        return <SoportesRecurrentes key={refreshKey} />;
      case 'usuarios':
        if (user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR') {
          return <Usuarios key={refreshKey} />;
        }
        return user?.rol === 'USUARIO' ? <Tickets key={refreshKey} /> : <Dashboard key={refreshKey} />;
      case 'movimientos':
        if (user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || (user?.rol === 'TECNICO' && user?.has_inventory_access)) {
          return <MovimientosInventario key={refreshKey} />;
        }
        return user?.rol === 'USUARIO' ? <Tickets key={refreshKey} /> : <Dashboard key={refreshKey} />;
      case 'reportes':
        return <Reportes key={refreshKey} />;
      case 'bodegas':
        if (user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || (user?.rol === 'TECNICO' && user?.has_inventory_access)) {
          return <Bodegas key={refreshKey} />;
        }
        return user?.rol === 'USUARIO' ? <Tickets key={refreshKey} /> : <Dashboard key={refreshKey} />;
      case 'credenciales':
        if (user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || user?.rol === 'TECNICO') {
          return <EntregaCredenciales key={refreshKey} />;
        }
        return user?.rol === 'USUARIO' ? <Tickets key={refreshKey} /> : <Dashboard key={refreshKey} />;
      default:
        return user?.rol === 'USUARIO' ? <Tickets key={refreshKey} /> : <Dashboard key={refreshKey} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      
      <main className="app-main-content">
        <Navbar
          activeView={activeView}
          setMobileOpen={setMobileOpen}
          onRefresh={handleRefresh}
        />
        <div className="view-content-wrapper">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <AlertContainer />
    </AuthProvider>
  );
}

export default App;
