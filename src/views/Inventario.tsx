import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  inventoryService, 
  Activo, 
  Consumible, 
  Persona, 
  Proveedor, 
  MovimientoInventario 
} from '../services/inventory.service';
import './Inventario.css';

export const Inventario: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'activos' | 'consumibles'>('activos');
  const [activos, setActivos] = useState<Activo[]>([]);
  const [consumibles, setConsumibles] = useState<Consumible[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  // Asset detail & action modals
  const [selectedActivo, setSelectedActivo] = useState<Activo | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDevolverModal, setShowDevolverModal] = useState(false);

  // Forms state
  const [selectedPersonaId, setSelectedPersonaId] = useState<number>(0);
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Consumables quick adjust state
  const [adjustingConsumableId, setAdjustingConsumableId] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);

  // Creation Modals & Fields
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);
  const [showCreateConsumableModal, setShowCreateConsumableModal] = useState(false);

  // Asset Create fields
  const [assetCodigo, setAssetCodigo] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetMarca, setAssetMarca] = useState('');
  const [assetModelo, setAssetModelo] = useState('');
  const [assetEspecificaciones, setAssetEspecificaciones] = useState('');
  const [assetProveedorId, setAssetProveedorId] = useState<number>(0);
  const [assetFechaCompra, setAssetFechaCompra] = useState('');

  // Consumable Create fields
  const [consNombre, setConsNombre] = useState('');
  const [consDescripcion, setConsDescripcion] = useState('');
  const [consUnidadMedida, setConsUnidadMedida] = useState('Unidades');
  const [consStockActual, setConsStockActual] = useState<number>(0);
  const [consStockMinimo, setConsStockMinimo] = useState<number>(0);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCodigo || !assetSerial || !assetMarca || !assetModelo) {
      alert('Por favor completa los campos requeridos para el activo.');
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryService.createActivo({
        codigo: assetCodigo,
        serial: assetSerial,
        marca: assetMarca,
        modelo: assetModelo,
        especificaciones: assetEspecificaciones || undefined,
        proveedor_id: assetProveedorId > 0 ? assetProveedorId : undefined,
        fecha_compra: assetFechaCompra || undefined,
      });

      setShowCreateAssetModal(false);
      // Reset fields
      setAssetCodigo('');
      setAssetSerial('');
      setAssetMarca('');
      setAssetModelo('');
      setAssetEspecificaciones('');
      setAssetProveedorId(0);
      setAssetFechaCompra('');

      fetchInventoryData();
    } catch (err: any) {
      alert('Error registrando activo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateConsumable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consNombre || !consUnidadMedida) {
      alert('Por favor completa los campos requeridos para el consumible.');
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryService.createConsumible({
        nombre: consNombre,
        descripcion: consDescripcion || undefined,
        unidad_medida: consUnidadMedida,
        stock_actual: Number(consStockActual),
        stock_minimo: Number(consStockMinimo),
      });

      setShowCreateConsumableModal(false);
      // Reset fields
      setConsNombre('');
      setConsDescripcion('');
      setConsUnidadMedida('Unidades');
      setConsStockActual(0);
      setConsStockMinimo(0);

      fetchInventoryData();
    } catch (err: any) {
      alert('Error registrando consumible: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [activosList, consumiblesList, personasList, proveedoresList] = await Promise.all([
        inventoryService.getActivos().catch(() => []),
        inventoryService.getConsumibles().catch(() => []),
        inventoryService.getPersonas().catch(() => []),
        inventoryService.getProveedores().catch(() => []),
      ]);

      setActivos(activosList);
      setConsumibles(consumiblesList);
      setPersonas(personasList);
      setProveedores(proveedoresList);
    } catch (e) {
      console.error('Error fetching inventory assets', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleOpenDetail = async (activo: Activo) => {
    setSelectedActivo(activo);
    try {
      const history = await inventoryService.getHistorial(activo.id);
      setMovimientos(history);
    } catch (e) {
      setMovimientos([]);
    }
  };

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivo || selectedPersonaId <= 0) {
      alert('Por favor selecciona un empleado.');
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryService.asignarActivo(selectedActivo.id, selectedPersonaId, observations);
      
      // Reset
      setShowAssignModal(false);
      setSelectedPersonaId(0);
      setObservations('');
      setSelectedActivo(null);
      
      fetchInventoryData();
    } catch (err: any) {
      alert('Error en asignación: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevolver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivo) return;

    try {
      setIsSubmitting(true);
      await inventoryService.devolverActivo(selectedActivo.id, observations);
      
      // Reset
      setShowDevolverModal(false);
      setObservations('');
      setSelectedActivo(null);
      
      fetchInventoryData();
    } catch (err: any) {
      alert('Error al devolver el activo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConsumableStockAdjust = async (id: number) => {
    if (adjustAmount === 0) return;
    try {
      await inventoryService.updateConsumibleStock(id, adjustAmount);
      setAdjustingConsumableId(null);
      setAdjustAmount(0);
      fetchInventoryData();
    } catch (err: any) {
      alert('Error al actualizar el stock: ' + err.message);
    }
  };

  // Filters
  const filteredActivos = activos.filter(a => {
    const matchEstado = filterEstado === 'todos' || a.estado === filterEstado;
    const matchSearch = a.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.serial.toLowerCase().includes(searchQuery.toLowerCase());
    return matchEstado && matchSearch;
  });

  const filteredConsumibles = consumibles.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="inventario-container animate-fade">
      {/* Tab Switcher */}
      <div className="tabs-header glass-panel">
        <button 
          className={`tab-btn ${activeTab === 'activos' ? 'active' : ''}`}
          onClick={() => { setActiveTab('activos'); setSearchQuery(''); }}
        >
          💻 Activos Tecnológicos (Hardware)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'consumibles' ? 'active' : ''}`}
          onClick={() => { setActiveTab('consumibles'); setSearchQuery(''); }}
        >
          🔌 Consumibles y Suministros
        </button>
      </div>

      {/* Searching control panel */}
      <div className="inventory-controls glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div className="controls-left" style={{ flex: 1, display: 'flex', gap: '12px' }}>
          <input
            type="text"
            className="form-control search-input"
            placeholder={activeTab === 'activos' ? "🔍 Buscar activos por código, marca, serial..." : "🔍 Buscar consumibles..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          {activeTab === 'activos' && (
            <select 
              className="form-control filter-select"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{ width: '180px' }}
            >
              <option value="todos">Todos los Estados</option>
              <option value="Stock">Stock (En Bodega)</option>
              <option value="Asignado">Asignado</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Baja">Baja</option>
            </select>
          )}
        </div>

        {(user?.rol === 'ADMIN' || user?.rol === 'TECNICO') && (
          <div className="controls-right">
            {activeTab === 'activos' ? (
              <button className="btn btn-primary" onClick={() => setShowCreateAssetModal(true)}>
                ➕ Registrar Activo
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowCreateConsumableModal(true)}>
                ➕ Registrar Consumible
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="dashboard-loading">
          <div className="loader"></div>
          <p className="text-muted">Leyendo registros físicos de IT...</p>
        </div>
      ) : activeTab === 'activos' ? (
        /* TAB 1: ACTIVOS HARDWARE */
        filteredActivos.length === 0 ? (
          <div className="empty-panel glass-panel text-center py-5">
            <span className="empty-big-icon">💻</span>
            <h3>No se encontraron activos tecnológicos</h3>
            <p className="text-muted">Prueba a registrar un activo o redefine tus filtros.</p>
          </div>
        ) : (
          <div className="assets-table-container glass-panel">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>CÓDIGO / MARCA</th>
                  <th>N/S SERIAL</th>
                  <th>MODELO</th>
                  <th>ESTADO</th>
                  <th>RESPONSABLE</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivos.map((a) => (
                  <tr key={a.id} className="asset-row animate-slide-up">
                    <td>
                      <div className="asset-code-group">
                        <span className="asset-code">{a.codigo}</span>
                        <span className="asset-brand text-muted">{a.marca}</span>
                      </div>
                    </td>
                    <td className="asset-serial">{a.serial}</td>
                    <td className="asset-model">{a.modelo}</td>
                    <td>
                      <span className={`badge badge-state-${a.estado.toLowerCase()}`}>
                        {a.estado}
                      </span>
                    </td>
                    <td className="asset-holder">
                      {a.persona_nombre ? (
                        <span className="holder-badge">👤 {a.persona_nombre}</span>
                      ) : (
                        <span className="holder-empty">Bodega Central</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm-view" onClick={() => handleOpenDetail(a)}>
                        🔍 Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* TAB 2: CONSUMIBLES */
        filteredConsumibles.length === 0 ? (
          <div className="empty-panel glass-panel text-center py-5">
            <span className="empty-big-icon">🔌</span>
            <h3>No se encontraron consumibles</h3>
          </div>
        ) : (
          <div className="consumables-grid">
            {filteredConsumibles.map((c) => {
              const isLowStock = c.stock_actual <= c.stock_minimo;
              return (
                <div key={c.id} className={`consumable-card glass-panel ${isLowStock ? 'low-stock-critical' : ''} animate-slide-up`}>
                  <div className="consumable-card-header">
                    <span className="consumable-icon">🏷️</span>
                    {isLowStock && <span className="badge badge-state-baja">⚠️ Stock Mínimo</span>}
                  </div>
                  <div className="consumable-card-body mt-2">
                    <h3>{c.nombre}</h3>
                    <p className="text-muted font-xs">{c.descripcion || 'Sin descripción adicional'}</p>
                    
                    <div className="consumable-numbers mt-3">
                      <div className="number-group">
                        <span className="num-val">{c.stock_actual}</span>
                        <span className="num-lbl">Stock Actual ({c.unidad_medida})</span>
                      </div>
                      <div className="number-group">
                        <span className="num-val">{c.stock_minimo}</span>
                        <span className="num-lbl">Mínimo</span>
                      </div>
                    </div>

                    <div className="stock-meter-track mt-3">
                      <div 
                        className={`stock-meter-fill ${isLowStock ? 'alert-fill' : 'safe-fill'}`} 
                        style={{ width: `${Math.min(100, Math.max(5, (c.stock_actual / (c.stock_minimo * 2 || 10)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stock quick adjuster */}
                  {(user?.rol === 'ADMIN' || user?.rol === 'TECNICO') && (
                    <div className="consumable-adjuster-bar mt-4">
                      {adjustingConsumableId === c.id ? (
                        <div className="adjuster-input-group">
                          <input
                            type="number"
                            className="form-control adjust-input"
                            placeholder="Cant (+/-)"
                            value={adjustAmount === 0 ? '' : adjustAmount}
                            onChange={(e) => setAdjustAmount(Number(e.target.value))}
                          />
                          <button className="btn btn-primary btn-adjust-ok" onClick={() => handleConsumableStockAdjust(c.id)}>
                            Ok
                          </button>
                          <button className="btn btn-secondary btn-adjust-cancel" onClick={() => setAdjustingConsumableId(null)}>
                            ×
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-secondary btn-adjust-trigger" onClick={() => { setAdjustingConsumableId(c.id); setAdjustAmount(0); }}>
                          ⚡ Ajustar Inventario
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ASSET DETAILS MODAL (FICHA TÉCNICA Y AUDITORÍA DE MOVIMIENTOS) */}
      {selectedActivo && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel modal-lg animate-slide-up">
            <div className="modal-header">
              <h2>Ficha Técnica de Activo TI</h2>
              <button className="modal-close-btn" onClick={() => setSelectedActivo(null)}>×</button>
            </div>

            <div className="asset-details-grid">
              {/* Left Column: Tech spec summary */}
              <div className="asset-spec-box">
                <div className="spec-header">
                  <span className="spec-title-code">{selectedActivo.codigo}</span>
                  <span className={`badge badge-state-${selectedActivo.estado.toLowerCase()}`}>
                    {selectedActivo.estado}
                  </span>
                </div>
                
                <div className="spec-details-list mt-3">
                  <div className="spec-item"><span>Marca:</span> <strong>{selectedActivo.marca}</strong></div>
                  <div className="spec-item"><span>Modelo:</span> <strong>{selectedActivo.modelo}</strong></div>
                  <div className="spec-item"><span>Número Serial:</span> <strong>{selectedActivo.serial}</strong></div>
                  {selectedActivo.fecha_compra && (
                    <div className="spec-item"><span>Fecha Adquisición:</span> <strong>{new Date(selectedActivo.fecha_compra).toLocaleDateString()}</strong></div>
                  )}
                  <div className="spec-item-block mt-3">
                    <span>Especificaciones Técnicas:</span>
                    <p className="spec-desc">{selectedActivo.especificaciones || 'Sin especificaciones detalladas registradas'}</p>
                  </div>
                </div>

                {/* Operations buttons */}
                {(user?.rol === 'ADMIN' || user?.rol === 'TECNICO') && (
                  <div className="asset-actions-row mt-4">
                    {selectedActivo.estado === 'Stock' ? (
                      <button className="btn btn-primary w-100" onClick={() => setShowAssignModal(true)}>
                        👤 Entregar a Empleado
                      </button>
                    ) : selectedActivo.estado === 'Asignado' ? (
                      <button className="btn btn-danger w-100" onClick={() => setShowDevolverModal(true)}>
                        📦 Recibir en Bodega
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Right Column: Dynamic movement logs & Actas download */}
              <div className="asset-history-box">
                <h4 className="gradient-text mb-3">Historial de Custodia (Movimientos)</h4>
                
                <div className="history-timeline">
                  {movimientos.length === 0 ? (
                    <p className="text-muted text-center py-4">No hay registros de movimientos para este equipo.</p>
                  ) : (
                    movimientos.map((m) => (
                      <div key={m.id} className="timeline-item">
                        <div className="timeline-badge-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-event-header">
                            <span className="event-type">{m.tipo}</span>
                            <span className="event-date text-dim">{new Date(m.fecha).toLocaleDateString()}</span>
                          </div>
                          <p className="event-text text-muted">
                            {m.desde_persona_nombre ? `De: ${m.desde_persona_nombre}` : ''}
                            {m.hacia_persona_nombre ? ` A: ${m.hacia_persona_nombre}` : ''}
                          </p>
                          {m.observaciones && <p className="event-obs">"{m.observaciones}"</p>}
                          
                          {/* ACTA PDF DOWNLOAD */}
                          <a 
                            href={inventoryService.getActaUrl(m.id)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="download-acta-link mt-2"
                          >
                            📄 Descargar Acta Entrega PDF
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN HARDWARE MODAL */}
      {showAssignModal && selectedActivo && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>Asignar Activo {selectedActivo.codigo}</h2>
              <button className="modal-close-btn" onClick={() => setShowAssignModal(false)}>×</button>
            </div>

            <form onSubmit={handleAsignar} className="modal-form">
              <div className="form-group">
                <label className="form-label">SELECCIONAR EMPLEADO SOLICITANTE</label>
                <select 
                  className="form-control" 
                  value={selectedPersonaId} 
                  onChange={(e) => setSelectedPersonaId(Number(e.target.value))}
                  required
                >
                  <option value="0">Seleccionar empleado...</option>
                  {personas.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.cargo || 'Sede'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">OBSERVACIONES DE LA ENTREGA</label>
                <textarea
                  className="form-control textarea-field"
                  placeholder="Ej: Se entrega con cargador, mouse y en estuche protector..."
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando...' : 'Entregar Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ASSET MODAL */}
      {showCreateAssetModal && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Registrar Nuevo Activo Tecnológico</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateAssetModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateAsset} className="modal-form">
              <div className="form-group">
                <label className="form-label">CÓDIGO INSTITUCIONAL (ACTIVO) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: ACT-001"
                  value={assetCodigo}
                  onChange={(e) => setAssetCodigo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">NÚMERO DE SERIAL *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: S/N 872348A"
                  value={assetSerial}
                  onChange={(e) => setAssetSerial(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">MARCA *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: HP, Dell, Lenovo"
                    value={assetMarca}
                    onChange={(e) => setAssetMarca(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group half">
                  <label className="form-label">MODELO *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: EliteBook 840 G8"
                    value={assetModelo}
                    onChange={(e) => setAssetModelo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">PROVEEDOR TI</label>
                  <select
                    className="form-control"
                    value={assetProveedorId}
                    onChange={(e) => setAssetProveedorId(Number(e.target.value))}
                  >
                    <option value="0">Seleccionar proveedor...</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group half">
                  <label className="form-label">FECHA DE COMPRA</label>
                  <input
                    type="date"
                    className="form-control"
                    value={assetFechaCompra}
                    onChange={(e) => setAssetFechaCompra(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ESPECIFICACIONES TÉCNICAS</label>
                <textarea
                  className="form-control textarea-field"
                  placeholder="Ej: Intel Core i7 11th Gen, 16GB RAM DDR4, SSD 512GB..."
                  rows={3}
                  value={assetEspecificaciones}
                  onChange={(e) => setAssetEspecificaciones(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateAssetModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Registrar Activo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CONSUMABLE MODAL */}
      {showCreateConsumableModal && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>Registrar Nuevo Consumible</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateConsumableModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateConsumable} className="modal-form">
              <div className="form-group">
                <label className="form-label">NOMBRE DEL CONSUMIBLE *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Cable UTP Cat 6, Conectores RJ45, Tóner 85A..."
                  value={consNombre}
                  onChange={(e) => setConsNombre(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">UNIDAD DE MEDIDA *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Unidades, Cajas, Metros"
                    value={consUnidadMedida}
                    onChange={(e) => setConsUnidadMedida(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group half">
                  <label className="form-label font-xs">DESCRIPCIÓN</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Cable de red color azul..."
                    value={consDescripcion}
                    onChange={(e) => setConsDescripcion(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">STOCK INICIAL *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={consStockActual}
                    onChange={(e) => setConsStockActual(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group half">
                  <label className="form-label">STOCK MÍNIMO *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={consStockMinimo}
                    onChange={(e) => setConsStockMinimo(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateConsumableModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Registrar Consumible'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
