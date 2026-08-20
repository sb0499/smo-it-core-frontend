import { showAlert, showConfirm } from '../utils/alerts';
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Inventario.css';

const fallbackCopy = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showAlert('¡Copiado al portapapeles!');
  } catch (err) {
    showAlert('Error al copiar al portapapeles.');
  }
  document.body.removeChild(textArea);
};

const copyToClipboard = (text: string) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showAlert('¡Copiado al portapapeles!'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
};


interface Usuario {
  id: number;
  email: string;
  nombre_completo: string;
  is_active: number | boolean;
  rol_id: number;
  rol_nombre: string;
  must_change_password: number | boolean;
  nivel_soporte?: 'N1' | 'N2';
  grupo_n2?: 'Infraestructura' | 'Desarrollo';
  empresa_ids: number[];
  empresa_nombres: string[];
  empresa_inventario_ids: number[];
  empresa_inventario_nombres: string[];
}

interface Empresa {
  id: number;
  nombre: string;
}

export const Usuarios: React.FC = () => {
  const { user } = useAuth();
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
  const [nivelSoporte, setNivelSoporte] = useState<'N1' | 'N2'>('N1');
  const [grupoN2, setGrupoN2] = useState<'Infraestructura' | 'Desarrollo' | ''>('');
  const [selectedEmpresas, setSelectedEmpresas] = useState<number[]>([]);
  const [selectedEmpresasInventario, setSelectedEmpresasInventario] = useState<number[]>([]);
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
    setNivelSoporte('N1');
    setGrupoN2('');
    setSelectedEmpresas([]);
    setSelectedEmpresasInventario([]);
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
    setNivelSoporte(u.nivel_soporte || 'N1');
    setGrupoN2(u.grupo_n2 || '');
    setSelectedEmpresas(u.empresa_ids || []);
    setSelectedEmpresasInventario(u.empresa_inventario_ids || []);
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

  const handleEmpresaInventarioToggle = (empId: number) => {
    if (selectedEmpresasInventario.includes(empId)) {
      setSelectedEmpresasInventario(selectedEmpresasInventario.filter(id => id !== empId));
    } else {
      setSelectedEmpresasInventario([...selectedEmpresasInventario, empId]);
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
      nivel_soporte: (Number(rolId) === 2 || Number(rolId) === 4) ? nivelSoporte : undefined,
      grupo_n2: ((Number(rolId) === 2 || Number(rolId) === 4) && nivelSoporte === 'N2') ? (grupoN2 || null) : null,
      empresa_ids: selectedEmpresas,
      empresa_inventario_ids: selectedEmpresasInventario,
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

  const handleDelete = async (id: number, name: string) => {
    if (!await showConfirm(`¿Estás seguro de que deseas eliminar permanentemente la cuenta de "${name}"?`)) {
      return;
    }
    try {
      await apiClient.delete(`/usuarios/${id}`);
      showAlert('La cuenta de usuario fue eliminada correctamente.');
      fetchData();
    } catch (err: any) {
      showAlert(err.message || 'Error al eliminar la cuenta.');
    }
  };

  const filteredUsuarios = usuarios.filter(u =>
    u.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Cuentas y Accesos TI</h1>
          <p className="text-muted">Administra los técnicos de planta, directores y administradores de la plataforma</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Registrar Usuario
        </button>
      </div>

      {/* Filter Card */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '8px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre o correo de la cuenta..."
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
          <div className="spinner" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
          </div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando usuarios y accesos...</p>
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
                <th>Usuario</th>
                <th>Rol / Soporte</th>
                <th>Sedes Soporte</th>
                <th>Sedes Inventario</th>
                <th>Estado</th>
                <th>Contraseña</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u) => (
                  <tr key={u.id} className="table-row-hover animate-slide-up">
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>{u.nombre_completo}</span>
                        <span className="text-muted" style={{ fontSize: '12px' }}>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: '500' }}>{u.rol_nombre}</span>
                        {u.rol_nombre === 'TECNICO' && (
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            Soporte {u.nivel_soporte || 'N1'} {u.grupo_n2 ? `(${u.grupo_n2})` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '200px' }}>
                        {u.empresa_nombres && u.empresa_nombres.length > 0 ? (
                          u.empresa_nombres.map((name, idx) => (
                            <span key={idx} className="badge badge-process" style={{ fontSize: '9px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-dim" style={{ fontSize: '11px' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '200px' }}>
                        {u.empresa_inventario_nombres && u.empresa_inventario_nombres.length > 0 ? (
                          u.empresa_inventario_nombres.map((name, idx) => (
                            <span key={idx} className="badge badge-process" style={{ fontSize: '9px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-dim" style={{ fontSize: '11px' }}>—</span>
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
                      <button className="btn btn-secondary" style={{ padding: '5px 7px', marginRight: '6px' }} onClick={() => openEditModal(u)} title="Editar / Cambiar Clave">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                      </button>
                      {user?.id !== u.id && (
                        <button className="btn btn-danger" style={{ padding: '5px 7px' }} onClick={() => handleDelete(u.id, u.nombre_completo)} title="Eliminar Cuenta">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      )}
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
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '540px', padding: '28px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{isEditing ? 'Configurar Cuenta de Usuario' : 'Registrar Nuevo Acceso'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            
            {error && (
              <div className="login-error-alert" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '10px 14px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span className="alert-text" style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{error}</span>
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
                    Generar Clave
                  </button>
                </div>
                {generatedPassword && (
                  <div style={{ marginTop: '6px', padding: '8px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', color: '#10b981', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Contraseña generada: <strong>{generatedPassword}</strong></span>
                    <button 
                      type="button" 
                      style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                      onClick={() => {
                        copyToClipboard(generatedPassword);
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
                  <option value={4}>SUPERVISOR (Control total, reportes, turnos y nivel soporte)</option>
                  <option value={2}>TECNICO (Acceso a sus propios tickets y chats)</option>
                  <option value={3}>USUARIO (Acceso básico de solicitud y lectura)</option>
                </select>
              </div>

              {(Number(rolId) === 2 || Number(rolId) === 4) && (
                <>
                  <div className="form-group">
                    <label className="form-label">NIVEL DE SOPORTE (ITIL)</label>
                    <select
                      className="form-control"
                      value={nivelSoporte}
                      onChange={(e) => {
                        setNivelSoporte(e.target.value as any);
                        if (e.target.value === 'N1') setGrupoN2('');
                      }}
                      disabled={submitting}
                    >
                      <option value="N1">Nivel 1 (Helpdesk / Presencial en CC)</option>
                      <option value="N2">Nivel 2 (Especialista / Infraestructura y Desarrollo)</option>
                    </select>
                  </div>

                  {nivelSoporte === 'N2' && (
                    <div className="form-group">
                      <label className="form-label">GRUPO N2 (ESPECIALIDAD)</label>
                      <select
                        className="form-control"
                        value={grupoN2}
                        onChange={(e) => setGrupoN2(e.target.value as any)}
                        disabled={submitting}
                        required
                      >
                        <option value="">Seleccione Especialidad...</option>
                        <option value="Infraestructura">Infraestructura</option>
                        <option value="Desarrollo">Desarrollo</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Support Sedes Checklist */}
              <div className="form-group">
                <label className="form-label">SEDES FÍSICAS DE SOPORTE (ASIGNACIÓN DE TICKETS)</label>
                <p className="text-dim" style={{ fontSize: '11px', marginTop: '-4px', marginBottom: '8px' }}>
                  Sedes bajo la guardia y asignación automática de tickets de soporte técnico.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '110px', overflowY: 'auto', padding: '10px', background: 'var(--overlay-05)', borderRadius: '6px' }}>
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

              {/* Inventario Sedes Checklist */}
              <div className="form-group">
                <label className="form-label">SEDES FÍSICAS DE INVENTARIO (CONTROL DE ACTIVOS)</label>
                <p className="text-dim" style={{ fontSize: '11px', marginTop: '-4px', marginBottom: '8px' }}>
                  Sedes donde se permite el control de activos, consumibles y bodegas físicas.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '110px', overflowY: 'auto', padding: '10px', background: 'var(--overlay-05)', borderRadius: '6px' }}>
                  {empresas.map(emp => (
                    <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={selectedEmpresasInventario.includes(emp.id)}
                        onChange={() => handleEmpresaInventarioToggle(emp.id)}
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
