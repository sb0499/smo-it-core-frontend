import { showAlert, showConfirm } from '../utils/alerts';
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import './Inventario.css';

interface Usuario {
  id: number;
  email: string;
  nombre_completo: string;
  is_active: number | boolean;
  rol_id: number;
  rol_nombre: string;
  must_change_password: number | boolean;
  empresa_ids: number[];
  empresa_nombres: string[];
}

interface Empresa {
  id: number;
  nombre: string;
}

export const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [search, setSearch] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [rolId, setRolId] = useState<number>(2); // Default to TECNICO
  const [selectedEmpresas, setSelectedEmpresas] = useState<number[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usuariosData, empresasData] = await Promise.all([
        apiClient.get<Usuario[]>('/usuarios'),
        apiClient.get<Empresa[]>('/empresas'),
      ]);
      setUsuarios(usuariosData);
      setEmpresas(empresasData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let tempPass = 'SMO-';
    for (let i = 0; i < 8; i++) {
      tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(tempPass);
    setGeneratedPassword(tempPass);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setEmail('');
    setPassword('');
    setNombreCompleto('');
    setIsActive(true);
    setRolId(2); // Default to TECNICO
    setSelectedEmpresas([]);
    setMustChangePassword(true);
    setGeneratedPassword(null);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (u: Usuario) => {
    setIsEditing(true);
    setEditingId(u.id);
    setEmail(u.email);
    setPassword(''); // Leave blank unless changing
    setNombreCompleto(u.nombre_completo);
    setIsActive(!!u.is_active);
    setRolId(u.rol_id);
    setSelectedEmpresas(u.empresa_ids || []);
    setMustChangePassword(!!u.must_change_password);
    setGeneratedPassword(null);
    setError(null);
    setShowModal(true);
  };

  const handleEmpresaToggle = (empId: number) => {
    if (selectedEmpresas.includes(empId)) {
      setSelectedEmpresas(selectedEmpresas.filter(id => id !== empId));
    } else {
      setSelectedEmpresas([...selectedEmpresas, empId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nombreCompleto || !rolId) {
      setError('Por favor, ingresa email, nombre completo y rol.');
      return;
    }
    if (!isEditing && !password) {
      setError('Debes ingresar o generar una contraseña para un nuevo usuario.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const payload: any = {
      email,
      nombre_completo: nombreCompleto,
      is_active: isActive,
      rol_id: Number(rolId),
      empresa_ids: selectedEmpresas,
      must_change_password: mustChangePassword
    };

    if (password) {
      payload.password = password;
    }

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/usuarios/${editingId}`, payload);
      } else {
        await apiClient.post('/usuarios', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nombre_completo.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.rol_nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Cuentas de Usuario</h1>
          <p className="text-muted">Administración de accesos a la plataforma, asignación de roles y permisos</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Crear Usuario
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre, correo o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-dim)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>
          Actualizar
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ fontSize: '32px' }}>⏳</div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando usuarios...</p>
        </div>
      ) : error && !showModal ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchData} style={{ marginTop: '12px' }}>Reintentar</button>
        </div>
      ) : (
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th>Sedes Asignadas</th>
                <th>Estado</th>
                <th>Clave Temp.</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u) => (
                  <tr key={u.id} className="table-row-hover">
                    <td style={{ fontWeight: '600' }}>{u.nombre_completo}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.rol_nombre === 'ADMIN' ? 'badge-critica' : u.rol_nombre === 'TECNICO' ? 'badge-alta' : 'badge-baja'}`} style={{ fontSize: '10px' }}>
                        {u.rol_nombre}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '300px' }}>
                        {u.empresa_nombres && u.empresa_nombres.length > 0 ? (
                          u.empresa_nombres.map((name, idx) => (
                            <span key={idx} className="badge badge-process" style={{ fontSize: '9px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-dim" style={{ fontSize: '11px' }}>Todas las sedes (ADMIN)</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-done' : 'badge-baja'}`} style={{ fontSize: '9px' }}>
                        {u.is_active ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td>
                      {u.must_change_password ? (
                        <span className="badge badge-media" style={{ fontSize: '9px' }}>Cambio Obligatorio</span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '11px' }}>OK</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditModal(u)}>
                        Editar / Clave
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Overlay */}
      {showModal && (
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '520px', padding: '28px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color-active)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{isEditing ? 'Configurar Cuenta de Usuario' : 'Registrar Nuevo Acceso'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            
            {error && (
              <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                <span className="alert-icon">⚠️</span>
                <span className="alert-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">NOMBRE COMPLETO</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Ing. Juan Pérez"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">CORREO ELECTRÓNICO / USUARIO</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Ej. juan.perez@condado.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Password section with temp generator */}
              <div className="form-group">
                <label className="form-label">
                  CONTRASEÑA {isEditing && <span className="text-dim">(Dejar en blanco para conservar actual)</span>}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={isEditing ? "Ingresa una nueva o genera..." : "Ingresa contraseña o genera..."}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={generateTempPassword}
                    style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                  >
                    🎲 Clave Temp.
                  </button>
                </div>
                {generatedPassword && (
                  <div style={{ marginTop: '6px', padding: '8px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', color: '#10b981', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Contraseña generada: <strong>{generatedPassword}</strong></span>
                    <button 
                      type="button" 
                      style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassword);
                        showAlert('¡Copiado al portapapeles!');
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">ROL DE ACCESO</label>
                <select
                  className="form-control"
                  value={rolId}
                  onChange={(e) => setRolId(Number(e.target.value))}
                  disabled={submitting}
                >
                  <option value={1}>ADMIN (Control total y reportes globales)</option>
                  <option value={2}>TECNICO (Acceso a sus propios tickets y chats)</option>
                  <option value={3}>USUARIO (Acceso básico de solicitud y lectura)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">SEDES FÍSICAS BAJO SUPERVISIÓN</label>
                <p className="text-dim" style={{ fontSize: '11px', marginTop: '-4px', marginBottom: '8px' }}>
                  El técnico solo recibirá y visualizará tickets correspondientes a las sedes seleccionadas.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '120px', overflowY: 'auto', padding: '10px', background: 'var(--overlay-05)', borderRadius: '6px' }}>
                  {empresas.map(emp => (
                    <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={selectedEmpresas.includes(emp.id)}
                        onChange={() => handleEmpresaToggle(emp.id)}
                        disabled={submitting}
                      />
                      {emp.nombre}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="isActiveUser"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={submitting}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isActiveUser" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Usuario Activo (Permite iniciar sesión)
                </label>
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="mustChangePass"
                  checked={mustChangePassword}
                  onChange={(e) => setMustChangePassword(e.target.checked)}
                  disabled={submitting}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="mustChangePass" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Exigir cambio de contraseña al ingresar por primera vez
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
