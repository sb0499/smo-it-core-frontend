import { showAlert, showConfirm } from '../utils/alerts';
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import './Inventario.css';

interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
}

export const Proveedores: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [search, setSearch] = useState('');
  
  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Proveedor[]>('/proveedores');
      setProveedores(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar proveedores.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setNombre('');
    setContacto('');
    setTelefono('');
    setEmail('');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (p: Proveedor) => {
    setIsEditing(true);
    setEditingId(p.id);
    setNombre(p.nombre);
    setContacto(p.contacto || '');
    setTelefono(p.telefono || '');
    setEmail(p.email || '');
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) {
      setError('Por favor, ingresa el nombre del proveedor.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const payload = {
      nombre,
      contacto: contacto || null,
      telefono: telefono || null,
      email: email || null
    };

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/proveedores/${editingId}`, payload);
      } else {
        await apiClient.post('/proveedores', payload);
      }
      setShowModal(false);
      fetchProveedores();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proveedor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!await showConfirm(`¿Estás seguro de que deseas eliminar al proveedor "${name}"?`)) {
      return;
    }
    try {
      await apiClient.delete(`/proveedores/${id}`);
      fetchProveedores();
    } catch (err: any) {
      showAlert(`Error al eliminar proveedor: ${err.message}`);
    }
  };

  const filteredProveedores = proveedores.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) || 
    (p.contacto && p.contacto.toLowerCase().includes(search.toLowerCase())) ||
    (p.email && p.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Proveedores Tecnológicos</h1>
          <p className="text-muted">Directorio y gestión de proveedores de equipos y licencias de IT</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Añadir Proveedor
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre, contacto o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-dim)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <button className="btn btn-secondary" onClick={fetchProveedores}>
          Actualizar
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ fontSize: '32px' }}>⏳</div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando proveedores...</p>
        </div>
      ) : error && !showModal ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchProveedores} style={{ marginTop: '12px' }}>Reintentar</button>
        </div>
      ) : (
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Persona de Contacto</th>
                <th>Teléfono</th>
                <th>Correo Electrónico</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveedores.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No se encontraron proveedores IT registrados.
                  </td>
                </tr>
              ) : (
                filteredProveedores.map((p) => (
                  <tr key={p.id} className="table-row-hover">
                    <td style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{p.nombre}</td>
                    <td>{p.contacto || '—'}</td>
                    <td>{p.telefono || '—'}</td>
                    <td className="text-muted">{p.email || '—'}</td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditModal(p)}>
                        Editar
                      </button>
                      <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete(p.id, p.nombre)}>
                        Eliminar
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
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '460px', padding: '28px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color-active)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{isEditing ? 'Editar Proveedor IT' : 'Registrar Nuevo Proveedor'}</h3>
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
                <label className="form-label">RAZÓN SOCIAL / NOMBRE PROVEEDOR</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Dell Tech Solutions"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">NOMBRE DE CONTACTO</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Lorena Flores"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">TELÉFONO DE CONTACTO</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. 0991234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">CORREO ELECTRÓNICO</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Ej. contacto@proveedor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
