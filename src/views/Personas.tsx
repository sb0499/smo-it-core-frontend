import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import './Inventario.css'; // Re-use inventario CSS layout for table and forms

interface Persona {
  id: number;
  cedula: string;
  nombre: string;
  telefono: string | null;
  departamento: string | null;
  cargo: string | null;
  empresa_id: number;
  empresa_nombre?: string;
}

interface Empresa {
  id: number;
  nombre: string;
}

export const Personas: React.FC = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [search, setSearch] = useState('');
  
  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresaId, setEmpresaId] = useState<number | ''>('');
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [personasData, empresasData] = await Promise.all([
        apiClient.get<Persona[]>('/personas'),
        apiClient.get<Empresa[]>('/empresas'),
      ]);
      setPersonas(personasData);
      setEmpresas(empresasData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setCedula('');
    setNombre('');
    setTelefono('');
    setDepartamento('');
    setCargo('');
    setEmpresaId(empresas[0]?.id || '');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (p: Persona) => {
    setIsEditing(true);
    setEditingId(p.id);
    setCedula(p.cedula);
    setNombre(p.nombre);
    setTelefono(p.telefono || '');
    setDepartamento(p.departamento || '');
    setCargo(p.cargo || '');
    setEmpresaId(p.empresa_id);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula || !nombre || !empresaId) {
      setError('Por favor, ingresa cédula, nombre y empresa.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const payload = {
      cedula,
      nombre,
      telefono: telefono || null,
      departamento: departamento || null,
      cargo: cargo || null,
      empresa_id: Number(empresaId),
    };

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/personas/${editingId}`, payload);
      } else {
        await apiClient.post('/personas', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el empleado.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPersonas = personas.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) || 
    p.cedula.includes(search) ||
    (p.empresa_nombre && p.empresa_nombre.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Personal y Empleados</h1>
          <p className="text-muted">Gestión de empleados de sedes asociados a empresas físicas</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Registrar Empleado
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre, cédula o sede..."
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
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando personal...</p>
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
                <th>Cédula</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Sede / Empresa</th>
                <th>Departamento / Área</th>
                <th>Cargo</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersonas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No se encontraron empleados registrados.
                  </td>
                </tr>
              ) : (
                filteredPersonas.map((p) => (
                  <tr key={p.id} className="table-row-hover">
                    <td style={{ fontWeight: '600' }}>{p.cedula}</td>
                    <td>{p.nombre}</td>
                    <td className="text-muted">{p.telefono || 'N/A'}</td>
                    <td>
                      <span className="badge badge-process" style={{ fontSize: '10px' }}>
                        {p.empresa_nombre || 'Desconocido'}
                      </span>
                    </td>
                    <td>{p.departamento || 'N/A'}</td>
                    <td className="text-dim">{p.cargo || 'N/A'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditModal(p)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Sidebar Form overlay */}
      {showModal && (
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '500px', padding: '28px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color-active)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{isEditing ? 'Editar Datos del Empleado' : 'Registrar Nuevo Empleado'}</h3>
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
                <label className="form-label">CÉDULA / IDENTIFICACIÓN</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. 1712345678"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">NOMBRE COMPLETO</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Carlos Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">TELÉFONO DE CONTACTO</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. 0998765432"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">EMPRESA / SEDE ASOCIADA</label>
                <select
                  className="form-control"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value ? Number(e.target.value) : '')}
                  disabled={submitting}
                >
                  <option value="">Seleccione una empresa...</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">DEPARTAMENTO / ÁREA</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Operaciones, Ventas, Finanzas"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">CARGO</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Coordinador de Sede, Analista"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
