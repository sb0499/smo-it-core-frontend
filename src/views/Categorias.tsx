import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { showAlert, showConfirm } from '../utils/alerts';
import './Inventario.css';

export interface CategoriaTicket {
  id: number;
  nombre: string;
  is_active: boolean;
  created_at?: string;
}

export const Categorias: React.FC = () => {
  const [categorias, setCategorias] = useState<CategoriaTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<CategoriaTicket[]>('/categorias?all=true');
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error al cargar categorías:', err);
      setError(err.message || 'Error al cargar categorías de soporte');
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setNombre('');
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (cat: CategoriaTicket) => {
    setIsEditing(true);
    setEditingId(cat.id);
    setNombre(cat.nombre);
    setIsActive(Boolean(cat.is_active));
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Por favor ingresa el nombre de la categoría.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      nombre: nombre.trim(),
      is_active: isActive
    };

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/categorias/${editingId}`, payload);
      } else {
        await apiClient.post('/categorias', payload);
      }
      setShowModal(false);
      fetchCategorias();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la categoría.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat: CategoriaTicket) => {
    const nextStatus = !cat.is_active;
    const actionLabel = nextStatus ? 'activar' : 'desactivar';
    if (!await showConfirm(`¿Deseas ${actionLabel} la categoría "${cat.nombre}"?`)) return;

    try {
      await apiClient.put(`/categorias/${cat.id}`, { is_active: nextStatus });
      fetchCategorias();
    } catch (err: any) {
      showAlert('Error al actualizar la categoría: ' + err.message);
    }
  };

  const handleDelete = async (cat: CategoriaTicket) => {
    if (!await showConfirm(`¿Estás seguro de eliminar la categoría "${cat.nombre}"?`)) return;

    try {
      await apiClient.delete(`/categorias/${cat.id}`);
      fetchCategorias();
      showAlert('Categoría procesada exitosamente.');
    } catch (err: any) {
      showAlert('Error al eliminar categoría: ' + err.message);
    }
  };

  const filteredCategorias = categorias.filter(cat =>
    cat.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Categorías de Soporte</h1>
          <p className="text-muted">Administración del catálogo de tipos y áreas de atención de tickets de soporte técnico</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nueva Categoría
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre de categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-dim)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <button className="btn btn-secondary" onClick={fetchCategorias}>
          Actualizar
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
          </div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando categorías de soporte...</p>
        </div>
      ) : filteredCategorias.length === 0 ? (
        <div className="glass-panel text-center py-5" style={{ padding: '40px' }}>
          <h3>No se encontraron categorías</h3>
          <p className="text-muted">Crea una nueva categoría para agrupar los tickets de soporte.</p>
        </div>
      ) : (
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre de Categoría</th>
                <th>Estado</th>
                <th>Fecha Registro</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategorias.map(cat => (
                <tr key={cat.id} className="table-row-hover">
                  <td style={{ fontWeight: '600' }}>#{cat.id}</td>
                  <td style={{ fontWeight: '700', fontSize: '15px' }}>{cat.nombre}</td>
                  <td>
                    {cat.is_active ? (
                      <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        Activa
                      </span>
                    ) : (
                      <span className="badge badge-secondary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: '13px' }}>
                    {cat.created_at ? new Date(cat.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => handleToggleStatus(cat)}
                        title={cat.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {cat.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px' }}
                        onClick={() => openEditModal(cat)}
                        title="Editar Categoría"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        onClick={() => handleDelete(cat)}
                        title="Eliminar Categoría"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{isEditing ? 'Editar Categoría de Soporte' : 'Nueva Categoría de Soporte'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>

            {error && (
              <div className="login-error-alert" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '10px 14px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span className="alert-text" style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label">NOMBRE DE LA CATEGORÍA *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Sistemas, Redes, Cámaras, Hardware..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">ESTADO DE LA CATEGORÍA</label>
                <select
                  className="form-control"
                  value={isActive ? '1' : '0'}
                  onChange={(e) => setIsActive(e.target.value === '1')}
                  disabled={submitting}
                >
                  <option value="1">Activa (Disponible para reportes)</option>
                  <option value="0">Inactiva (Oculta)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
