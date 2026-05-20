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
import { Plantillas } from './views/Plantillas';
import { Usuarios } from './views/Usuarios';
import { MovimientosInventario } from './views/MovimientosInventario';
import './App.css';

function AppContent() {
  const { token, user } = useAuth();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Sync activeView for Sede user
  useEffect(() => {
    if (user?.rol === 'USUARIO') {
      setActiveView('tickets');
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
        return <Inventario key={refreshKey} />;
      case 'proyectos':
        return <Proyectos key={refreshKey} />;
      case 'guardias':
        return <Guardias key={refreshKey} />;
      case 'chats':
        return <Chats key={refreshKey} />;
      case 'personas':
        return <Personas key={refreshKey} />;
      case 'proveedores':
        return <Proveedores key={refreshKey} />;
      case 'plantillas':
        return <Plantillas key={refreshKey} />;
      case 'usuarios':
        return <Usuarios key={refreshKey} />;
      case 'movimientos':
        return <MovimientosInventario key={refreshKey} />;
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
    </AuthProvider>
  );
}

export default App;
