import React, { useState, useEffect } from 'react';
import { hostingDominioService, HostingDominio } from '../services/hostingDominio.service';
import { inventoryService, Proveedor } from '../services/inventory.service';
import { apiClient } from '../services/api';
import { showAlert, showConfirm } from '../utils/alerts';
import './HostingsDominios.css';

interface Empresa {
  id: number;
  nombre: string;
}

export const HostingsDominios: React.FC = () => {
  // Active Tab: 'HOSTING' | 'DOMINIO'
  const [activeTab, setActiveTab] = useState<'HOSTING' | 'DOMINIO'>('HOSTING');

  const [items, setItems] = useState<HostingDominio[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number>(0);

  // Main CRUD Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [formTipo, setFormTipo] = useState<'HOSTING' | 'DOMINIO'>('HOSTING');
  const [formNombre, setFormNombre] = useState('');
  const [formDetalle, setFormDetalle] = useState('');
  const [formPagadoHasta, setFormPagadoHasta] = useState('');
  const [formEmpresaId, setFormEmpresaId] = useState<number | ''>('');
  const [formProveedorId, setFormProveedorId] = useState<number | ''>('');
  const [formPrecioRenovacion, setFormPrecioRenovacion] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Renewal Modal state
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewItem, setRenewItem] = useState<HostingDominio | null>(null);
  const [renewFecha, setRenewFecha] = useState('');

  // Load catalog options once
  useEffect(() => {
    console.log('[HostingsDominios] Cargando empresas y proveedores...');
    apiClient.get<Empresa[]>('/empresas')
      .then(res => {
        console.log('[HostingsDominios] Empresas obtenidas:', res);
        setEmpresas(Array.isArray(res) ? res : []);
      })
      .catch(err => {
        console.error('[HostingsDominios] Error al cargar empresas:', err);
        setEmpresas([]);
      });

    inventoryService.getProveedores()
      .then(res => {
        console.log('[HostingsDominios] Proveedores obtenidos:', res);
        setProveedores(Array.isArray(res) ? res : []);
      })
      .catch(err => {
        console.error('[HostingsDominios] Error al cargar proveedores:', err);
        setProveedores([]);
      });
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch items
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[HostingsDominios] Solicitando datos - activeTab: ${activeTab}, empresaId: ${selectedEmpresaId}, search: "${debouncedSearch}"`);
      const data = await hostingDominioService.getHostingsDominios(
        activeTab,
        selectedEmpresaId || undefined,
        debouncedSearch || undefined
      );
      console.log('[HostingsDominios] Datos recibidos del servidor:', data);
      const safeData = Array.isArray(data) ? data : [];
      setItems(safeData);
      if (!Array.isArray(data)) {
        console.warn('[HostingsDominios] La respuesta no fue un arreglo válido:', data);
      }
    } catch (err: any) {
      console.error('[HostingsDominios] Error al cargar hostings y dominios:', err);
      setItems([]);
      setError(err.message || 'Error al obtener la lista de registros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedEmpresaId, debouncedSearch]);

  // Stats calculation
  const safeItems = Array.isArray(items) ? items : [];
  const totalHostings = safeItems.filter(i => i.tipo === 'HOSTING').length;
  const totalDominios = safeItems.filter(i => i.tipo === 'DOMINIO').length;

  const currentTabItems = safeItems;
  const porVencerCount = currentTabItems.filter(i => i?.estado_vencimiento === 'POR_VENCER').length;
  const vencidosCount = currentTabItems.filter(i => i?.estado_vencimiento === 'VENCIDO').length;

  // Open modal to Create
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormTipo(activeTab);
    setFormNombre('');
    setFormDetalle('');

    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setFormPagadoHasta(nextYear.toISOString().split('T')[0]);

    setFormEmpresaId('');
    setFormProveedorId('');
    setFormPrecioRenovacion('');
    setShowModal(true);
  };

  // Open modal to Edit
  const handleOpenEditModal = (item: HostingDominio) => {
    setIsEditing(true);
    setEditingId(item.id);
    setFormTipo(item.tipo);
    setFormNombre(item.nombre);
    setFormDetalle(item.detalle || '');

    const fmtDate = item.pagado_hasta
      ? new Date(item.pagado_hasta).toISOString().split('T')[0]
      : '';
    setFormPagadoHasta(fmtDate);

    setFormEmpresaId(item.empresa_id || '');
    setFormProveedorId(item.proveedor_id || '');
    setFormPrecioRenovacion(item.precio_renovacion ? String(item.precio_renovacion) : '');
    setShowModal(true);
  };

  // Handle Save (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      showAlert('El nombre es obligatorio', 'warning');
      return;
    }
    if (!formPagadoHasta) {
      showAlert('La fecha "Pagado hasta" es obligatoria', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tipo: formTipo,
        nombre: formNombre.trim(),
        detalle: formDetalle.trim() || undefined,
        pagado_hasta: formPagadoHasta,
        empresa_id: formEmpresaId ? Number(formEmpresaId) : null,
        proveedor_id: formProveedorId ? Number(formProveedorId) : null,
        precio_renovacion: formPrecioRenovacion ? Number(formPrecioRenovacion) : null
      };

      if (isEditing && editingId) {
        await hostingDominioService.update(editingId, payload);
        showAlert(`${formTipo === 'HOSTING' ? 'Hosting' : 'Dominio'} actualizado exitosamente`, 'success');
      } else {
        await hostingDominioService.create(payload);
        showAlert(`${formTipo === 'HOSTING' ? 'Hosting' : 'Dominio'} registrado exitosamente`, 'success');
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Error al guardar:', err);
      showAlert(err.message || 'Error al procesar la solicitud', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Quick Renewal Modal
  const handleOpenRenewModal = (item: HostingDominio) => {
    setRenewItem(item);
    
    const baseDate = item.pagado_hasta ? new Date(item.pagado_hasta) : new Date();
    baseDate.setFullYear(baseDate.getFullYear() + 1);
    setRenewFecha(baseDate.toISOString().split('T')[0]);

    setShowRenewModal(true);
  };

  // Submit Quick Renewal
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewItem || !renewFecha) return;

    setSubmitting(true);
    try {
      await hostingDominioService.renovarPagadoHasta(renewItem.id, renewFecha);
      showAlert(`Fecha "Pagado hasta" actualizada a ${renewFecha}`, 'success');
      setShowRenewModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Error al renovar:', err);
      showAlert(err.message || 'Error al renovar la fecha', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (item: HostingDominio) => {
    const confirm = await showConfirm(
      '¿Eliminar registro?',
      `¿Está seguro de que desea eliminar el ${item.tipo.toLowerCase()} "${item.nombre}"?`
    );
    if (!confirm) return;

    try {
      await hostingDominioService.delete(item.id);
      showAlert('Registro eliminado correctamente', 'success');
      fetchData();
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      showAlert(err.message || 'Error al eliminar el registro', 'danger');
    }
  };

  // Helper for status badge
  const renderStatusBadge = (item: HostingDominio) => {
    if (item.estado_vencimiento === 'VENCIDO') {
      return (
        <span className="badge-vencimiento-vencido" title="Registro caducado">
          ● Vencido ({item.dias_restantes !== undefined ? Math.abs(item.dias_restantes) : ''} días)
        </span>
      );
    }
    if (item.estado_vencimiento === 'POR_VENCER') {
      return (
        <span className="badge-vencimiento-porvencer" title="Caduca en menos de 30 días">
          ⚠️ Por vencer ({item.dias_restantes} días)
        </span>
      );
    }
    return (
      <span className="badge-vencimiento-vigente">
        ✓ Vigente ({item.dias_restantes} días)
      </span>
    );
  };

  return (
    <div className="inventario-view animate-fade">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Hostings y Dominios</h1>
          <p className="text-muted">Gestión de infraestructura web, renovación de licencias y alertas anticipadas</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo {activeTab === 'HOSTING' ? 'Hosting' : 'Dominio'}
        </button>
      </div>

      {/* Tabs Selection Header */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'HOSTING' ? 'active' : ''}`}
          onClick={() => setActiveTab('HOSTING')}
        >
          Hostings ({totalHostings})
        </button>
        <button
          className={`tab-btn ${activeTab === 'DOMINIO' ? 'active' : ''}`}
          onClick={() => setActiveTab('DOMINIO')}
        >
          Dominios ({totalDominios})
        </button>
      </div>

      {/* Stats Summary Grid */}
      <div className="hd-stats-container">
        <div className="hd-stat-card glass-panel">
          <div>
            <div className="hd-stat-title">Total Hostings</div>
            <div className="hd-stat-number">{totalHostings}</div>
          </div>
          <div className="hd-stat-icon-wrapper blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
          </div>
        </div>

        <div className="hd-stat-card glass-panel">
          <div>
            <div className="hd-stat-title">Total Dominios</div>
            <div className="hd-stat-number">{totalDominios}</div>
          </div>
          <div className="hd-stat-icon-wrapper purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path></svg>
          </div>
        </div>

        <div className="hd-stat-card glass-panel">
          <div>
            <div className="hd-stat-title">Por Vencer (&lt; 30 días)</div>
            <div className="hd-stat-number">{porVencerCount}</div>
          </div>
          <div className="hd-stat-icon-wrapper amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
        </div>

        <div className="hd-stat-card glass-panel">
          <div>
            <div className="hd-stat-title">Vencidos</div>
            <div className="hd-stat-number">{vencidosCount}</div>
          </div>
          <div className="hd-stat-icon-wrapper red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          </div>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 2, minWidth: '240px', position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder={`Buscar ${activeTab.toLowerCase()} por nombre o detalle...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-dim)' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <select
            className="form-control"
            value={selectedEmpresaId}
            onChange={(e) => setSelectedEmpresaId(Number(e.target.value))}
            style={{ width: '100%' }}
          >
            <option value={0}>Todas las Sedes / Empresas</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
            ))}
          </select>
        </div>

        <button className="btn btn-secondary" onClick={fetchData}>
          Actualizar
        </button>
      </div>

      {/* Content Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
          </div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando {activeTab.toLowerCase()}s...</p>
        </div>
      ) : error ? (
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
                <th>Detalle</th>
                <th>Sede / Empresa</th>
                <th>Proveedor</th>
                <th>Pagado Hasta</th>
                <th>Estado Vencimiento</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentTabItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No se encontraron {activeTab.toLowerCase()}s registrados.
                  </td>
                </tr>
              ) : (
                currentTabItems.map((item) => (
                  <tr key={item.id} className="table-row-hover animate-slide-up">
                    <td style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                      {item.nombre}
                    </td>
                    <td className="text-muted" style={{ fontSize: '13px', maxWidth: '280px' }}>
                      {item.detalle || '—'}
                    </td>
                    <td>
                      {item.empresa_nombre ? (
                        <span className="holder-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '3px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600 }}>
                          {item.empresa_nombre}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-dim)', fontStyle: 'italic', fontSize: '12px' }}>Global / General</span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {item.proveedor_nombre ? item.proveedor_nombre : <span style={{ color: 'var(--color-text-dim)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: '600', fontSize: '13px' }}>
                      {item.pagado_hasta ? new Date(item.pagado_hasta).toISOString().split('T')[0] : '—'}
                    </td>
                    <td>
                      {renderStatusBadge(item)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {/* Quick Renew Button */}
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 9px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                          onClick={() => handleOpenRenewModal(item)}
                          title="Actualizar fecha Pagado Hasta"
                        >
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                          Actualizar Pagado Hasta
                        </button>

                        {/* Edit Button */}
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 7px' }}
                          onClick={() => handleOpenEditModal(item)}
                          title="Editar"
                        >
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          className="btn btn-danger"
                          style={{ padding: '5px 7px' }}
                          onClick={() => handleDelete(item)}
                          title="Eliminar"
                        >
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Main Form Modal (Create / Edit) */}
      {showModal && (
        <div className="hd-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="hd-modal-container animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="hd-modal-header">
              <h2>
                {isEditing ? `Editar ${formTipo === 'HOSTING' ? 'Hosting' : 'Dominio'}` : `Nuevo ${formTipo === 'HOSTING' ? 'Hosting' : 'Dominio'}`}
              </h2>
              <button
                className="hd-modal-close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div className="hd-modal-body">
                <div className="hd-form-grid">
                  <div className="form-group">
                    <label className="form-label">Tipo de Registro</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formTipo === 'HOSTING' ? 'Hosting (Servidor / Alojamiento)' : 'Dominio (Dominio Web / DNS)'}
                      readOnly
                      disabled
                      style={{ background: '#f1f5f9', cursor: 'not-allowed', fontWeight: 600, color: 'var(--color-primary)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nombre del {formTipo === 'HOSTING' ? 'Hosting' : 'Dominio'} *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={formTipo === 'HOSTING' ? 'Ej: VPS Principal AWS' : 'Ej: miempresa.com'}
                      value={formNombre}
                      onChange={(e) => setFormNombre(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pagado Hasta (Fecha Expiración) *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formPagadoHasta}
                      onChange={(e) => setFormPagadoHasta(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sede / Empresa</label>
                    <select
                      className="form-control"
                      value={formEmpresaId}
                      onChange={(e) => setFormEmpresaId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">-- Toda la Empresa (Global) --</option>
                      {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Proveedor Registrar / Provider</label>
                    <select
                      className="form-control"
                      value={formProveedorId}
                      onChange={(e) => setFormProveedorId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">-- Seleccionar Proveedor (Opcional) --</option>
                      {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Precio Renovación ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="Ej: 14.99"
                      value={formPrecioRenovacion}
                      onChange={(e) => setFormPrecioRenovacion(e.target.value)}
                    />
                  </div>

                  <div className="form-group hd-form-full">
                    <label className="form-label">Detalle / Especificaciones / Notas</label>
                    <textarea
                      rows={2}
                      className="form-control"
                      placeholder="Detalles adicionales (IP, NameServers, notas, etc.)..."
                      value={formDetalle}
                      onChange={(e) => setFormDetalle(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="hd-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Renew Date Modal */}
      {showRenewModal && renewItem && (
        <div className="hd-modal-overlay" onClick={() => setShowRenewModal(false)}>
          <div className="hd-modal-container animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="hd-modal-header">
              <h2>Renovar "Pagado Hasta"</h2>
              <button
                className="hd-modal-close-btn"
                onClick={() => setShowRenewModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRenewSubmit}>
              <div className="hd-modal-body">
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Actualizando fecha de vencimiento para:{' '}
                  <strong style={{ color: 'var(--color-text-main)' }}>{renewItem.nombre}</strong>
                </p>

                <div className="form-group">
                  <label className="form-label">Nueva Fecha "Pagado Hasta" *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={renewFecha}
                    onChange={(e) => setRenewFecha(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="hd-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRenewModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Actualizando...' : 'Confirmar Renovación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
