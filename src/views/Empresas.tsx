import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { showAlert, showConfirm } from '../utils/alerts';
import './Inventario.css';

export interface Sucursal {
  id?: number;
  empresa_id?: number;
  nombre: string;
}

export interface Empresa {
  id: number;
  nombre: string;
  sucursales?: Sucursal[];
}

export const Empresas: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  
  // Sucursales in form state
  const [hasSucursales, setHasSucursales] = useState(false);
  const [formSucursales, setFormSucursales] = useState<{ id?: number; nombre: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const empData = await apiClient.get<Empresa[]>('/empresas');
      setEmpresas(Array.isArray(empData) ? empData : []);
    } catch (err: any) {
      console.error('Error al cargar empresas:', err);
      setError(err.message || 'Error al cargar empresas');
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setNombreEmpresa('');
    setHasSucursales(false);
    setFormSucursales([]);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (emp: Empresa) => {
    setIsEditing(true);
    setEditingId(emp.id);
    setNombreEmpresa(emp.nombre);
    const existingSuc = emp.sucursales || [];
    setHasSucursales(existingSuc.length > 0);
    setFormSucursales(
      existingSuc.map(s => ({
        id: s.id,
        nombre: s.nombre
      }))
    );
    setError(null);
    setShowModal(true);
  };

  const handleAddSucursalRow = () => {
    setFormSucursales(prev => [...prev, { nombre: '' }]);
  };

  const handleRemoveSucursalRow = (index: number) => {
    setFormSucursales(prev => prev.filter((_, i) => i !== index));
  };

  const handleSucursalNameChange = (index: number, value: string) => {
    setFormSucursales(prev => {
      const updated = [...prev];
      updated[index].nombre = value;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEmpresa.trim()) {
      setError('Por favor ingresa el nombre de la empresa.');
      return;
    }

    if (hasSucursales) {
      const validSuc = formSucursales.filter(s => s.nombre.trim());
      if (validSuc.length === 0) {
        setError('Si la empresa tiene sucursales, debes agregar al menos una con nombre.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      nombre: nombreEmpresa.trim(),
      sucursales: hasSucursales
        ? formSucursales
            .filter(s => s.nombre.trim())
            .map(s => ({
              id: s.id,
              nombre: s.nombre.trim()
            }))
        : []
    };

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/empresas/${editingId}`, payload);
      } else {
        await apiClient.post('/empresas', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la empresa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (emp: Empresa) => {
    if (!await showConfirm(`¿Estás seguro de eliminar la empresa "${emp.nombre}"?`)) return;

    try {
      await apiClient.delete(`/empresas/${emp.id}`);
      fetchData();
      showAlert('Empresa eliminada exitosamente.');
    } catch (err: any) {
      showAlert('Error al eliminar la empresa: ' + err.message);
    }
  };

  const filteredEmpresas = empresas.filter(emp =>
    emp.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (emp.sucursales && emp.sucursales.some(s => s.nombre.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Empresas y Sucursales</h1>
          <p className="text-muted">Gestión de empresas del grupo y registro de sus sucursales</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nueva Empresa
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre de empresa o sucursal..."
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
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando catálogo de empresas...</p>
        </div>
      ) : filteredEmpresas.length === 0 ? (
        <div className="glass-panel text-center py-5" style={{ padding: '40px' }}>
          <h3>No se encontraron empresas</h3>
          <p className="text-muted">Empieza agregando la primera empresa y sus sucursales.</p>
        </div>
      ) : (
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre de Empresa</th>
                <th>Tiene Sucursales</th>
                <th>Sucursales Registradas</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmpresas.map(emp => {
                const hasSuc = emp.sucursales && emp.sucursales.length > 0;
                return (
                  <tr key={emp.id} className="table-row-hover">
                    <td style={{ fontWeight: '600' }}>#{emp.id}</td>
                    <td style={{ fontWeight: '700', fontSize: '15px' }}>{emp.nombre}</td>
                    <td>
                      {hasSuc ? (
                        <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          Sí ({emp.sucursales!.length} {emp.sucursales!.length === 1 ? 'sucursal' : 'sucursales'})
                        </span>
                      ) : (
                        <span className="badge badge-secondary" style={{ opacity: 0.7 }}>
                          Sede Única / Sin sucursales
                        </span>
                      )}
                    </td>
                    <td>
                      {hasSuc ? (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {emp.sucursales!.map(suc => (
                            <span key={suc.id || suc.nombre} className="badge badge-process" style={{ fontSize: '11px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>
                              📍 {suc.nombre}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-dim" style={{ fontSize: '13px' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => openEditModal(emp)} title="Editar Empresa y Sucursales">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px 10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={() => handleDelete(emp)} title="Eliminar Empresa">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{isEditing ? 'Editar Empresa y Sucursales' : 'Registrar Nueva Empresa'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>

            {error && (
              <div className="login-error-alert" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '10px 14px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span className="alert-text" style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">NOMBRE DE LA EMPRESA *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. CONDADO, SCALA, SMO, DATATRUST..."
                  value={nombreEmpresa}
                  onChange={(e) => setNombreEmpresa(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              {/* Checkbox / Toggle for Sucursales */}
              <div className="form-group" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '600', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={hasSucursales}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasSucursales(checked);
                      if (checked && formSucursales.length === 0) {
                        setFormSucursales([{ nombre: '' }]);
                      }
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Esta empresa cuenta con varias sucursales</span>
                </label>
              </div>

              {/* Dynamic Sucursales list */}
              {hasSucursales && (
                <div className="sucursales-section animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: '700' }}>LISTA DE SUCURSALES</label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddSucursalRow}
                      style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      + Agregar Sucursal
                    </button>
                  </div>

                  {formSucursales.map((suc, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej. Sucursal Norte, Matriz, Local 12..."
                        value={suc.nombre}
                        onChange={(e) => handleSucursalNameChange(idx, e.target.value)}
                        disabled={submitting}
                        required
                        style={{ flex: 1 }}
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveSucursalRow(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                        title="Quitar sucursal"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
