import { showAlert, showConfirm } from '../utils/alerts';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  inventoryService, 
  Activo, 
  Consumible, 
  Persona, 
  Proveedor, 
  MovimientoInventario,
  HistorialCambio
} from '../services/inventory.service';
import { apiClient } from '../services/api';
import './Inventario.css';

interface TipoEquipo {
  id: number;
  nombre: string;
  abreviacion?: string;
  created_at?: string;
}

export const Inventario: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'activos' | 'consumibles' | 'reciclaje' | 'tipos_equipo'>('activos');
  const [activos, setActivos] = useState<Activo[]>([]);
  const [consumibles, setConsumibles] = useState<Consumible[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [empresas, setEmpresas] = useState<{ id: number; nombre: string }[]>([]);
  const [tipoEquipos, setTipoEquipos] = useState<TipoEquipo[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  // Asset detail & action modals
  const [selectedActivo, setSelectedActivo] = useState<Activo | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [historialCambios, setHistorialCambios] = useState<HistorialCambio[]>([]);
  const [drawerSubTab, setDrawerSubTab] = useState<'custodia' | 'cambios'>('custodia');
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

  // Excel import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<number>(0);
  const [importTypes, setImportTypes] = useState<{ id: number; nombre: string; descripcion: string | null }[]>([]);
  const [importBodegaName, setImportBodegaName] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(false);
  const [importSummary, setImportSummary] = useState<{ totalProcessed: number; totalInserted: number; errors: string[] } | null>(null);

  // Pagination states
  const [pageActivos, setPageActivos] = useState(1);
  const [totalActivos, setTotalActivos] = useState(0);
  const [pageConsumibles, setPageConsumibles] = useState(1);
  const [totalConsumibles, setTotalConsumibles] = useState(0);
  const [pageReciclaje, setPageReciclaje] = useState(1);
  const [totalReciclaje, setTotalReciclaje] = useState(0);
  const [reciclajeActivos, setReciclajeActivos] = useState<Activo[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Asset Create fields
  const [assetCodigo, setAssetCodigo] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetMarca, setAssetMarca] = useState('');
  const [assetModelo, setAssetModelo] = useState('');
  const [assetEspecificaciones, setAssetEspecificaciones] = useState('');
  const [assetProveedorId, setAssetProveedorId] = useState<number>(0);
  const [assetFechaCompra, setAssetFechaCompra] = useState('');
  const [assetEmpresaId, setAssetEmpresaId] = useState<number>(0);
  const [assetTipoEquipoId, setAssetTipoEquipoId] = useState<number>(0);

  // Asset Edit fields
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editAssetSerial, setEditAssetSerial] = useState('');
  const [editAssetMarca, setEditAssetMarca] = useState('');
  const [editAssetModelo, setEditAssetModelo] = useState('');
  const [editAssetEspecificaciones, setEditAssetEspecificaciones] = useState('');
  const [editAssetProveedorId, setEditAssetProveedorId] = useState<number>(0);
  const [editAssetFechaCompra, setEditAssetFechaCompra] = useState('');
  const [editAssetEmpresaId, setEditAssetEmpresaId] = useState<number>(0);
  const [editAssetTipoEquipoId, setEditAssetTipoEquipoId] = useState<number>(0);

  // Consumable Create fields
  const [consNombre, setConsNombre] = useState('');
  const [consDescripcion, setConsDescripcion] = useState('');
  const [consUnidadMedida, setConsUnidadMedida] = useState('Unidades');
  const [consStockActual, setConsStockActual] = useState<number>(0);
  const [consStockMinimo, setConsStockMinimo] = useState<number>(0);

  // Tipo Equipo CRUD fields
  const [newTipoEquipoNombre, setNewTipoEquipoNombre] = useState('');
  const [editingTipoEquipo, setEditingTipoEquipo] = useState<TipoEquipo | null>(null);
  const [editTipoEquipoNombre, setEditTipoEquipoNombre] = useState('');

  // Fetch unique code preview in real-time
  useEffect(() => {
    if (assetEmpresaId > 0 && assetTipoEquipoId > 0 && showCreateAssetModal) {
      inventoryService.getAutogeneratedCode(assetEmpresaId, assetTipoEquipoId)
        .then(res => setAssetCodigo(res.codigo))
        .catch(() => setAssetCodigo(''));
    } else {
      setAssetCodigo('');
    }
  }, [assetEmpresaId, assetTipoEquipoId, showCreateAssetModal]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetSerial || !assetMarca || !assetModelo || assetEmpresaId <= 0 || assetTipoEquipoId <= 0) {
      showAlert('Por favor completa los campos requeridos para el activo.');
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
        empresa_id: assetEmpresaId,
        tipo_equipo_id: assetTipoEquipoId
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
      setAssetEmpresaId(0);
      setAssetTipoEquipoId(0);

      fetchInventoryData();
    } catch (err: any) {
      showAlert('Error registrando activo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateConsumable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consNombre || !consUnidadMedida) {
      showAlert('Por favor completa los campos requeridos para el consumible.');
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
      setConsNombre('');
      setConsDescripcion('');
      setConsUnidadMedida('Unidades');
      setConsStockActual(0);
      setConsStockMinimo(0);

      fetchInventoryData();
    } catch (err: any) {
      showAlert('Error registrando consumible: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      showAlert('Por favor selecciona un archivo Excel.');
      return;
    }
    if (importType <= 0) {
      showAlert('Por favor selecciona un tipo de inventario.');
      return;
    }

    const selectedTypeName = importTypes.find(t => t.id === importType)?.nombre;

    try {
      setImportProgress(true);
      setImportSummary(null);
      
      const response = await inventoryService.importarInventario(
        importFile,
        importType,
        selectedTypeName === 'Bodega' && importBodegaName ? importBodegaName.trim() : undefined
      );

      setImportSummary({
        totalProcessed: response.totalProcessed,
        totalInserted: response.totalInserted,
        errors: response.errors || []
      });

      showAlert(`Importación finalizada. Se procesaron ${response.totalProcessed} filas, insertando ${response.totalInserted} activos.`);
      fetchInventoryData();
    } catch (err: any) {
      showAlert('Error durante la importación: ' + err.message);
    } finally {
      setImportProgress(false);
    }
  };

  const handleCreateTipoEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTipoEquipoNombre.trim()) return;
    try {
      setIsSubmitting(true);
      await inventoryService.createTipoEquipo({ nombre: newTipoEquipoNombre.trim() });
      setNewTipoEquipoNombre('');
      fetchInventoryData();
      showAlert('Tipo de equipo agregado con éxito.');
    } catch (err: any) {
      showAlert('Error al crear tipo de equipo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTipoEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTipoEquipo || !editTipoEquipoNombre.trim()) return;
    try {
      setIsSubmitting(true);
      await inventoryService.updateTipoEquipo(editingTipoEquipo.id, { nombre: editTipoEquipoNombre.trim() });
      setEditingTipoEquipo(null);
      setEditTipoEquipoNombre('');
      fetchInventoryData();
      showAlert('Tipo de equipo actualizado con éxito.');
    } catch (err: any) {
      showAlert('Error al actualizar tipo de equipo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTipoEquipo = async (id: number) => {
    if (!await showConfirm('¿Estás seguro de que deseas eliminar este tipo de equipo? Los activos que lo usen quedarán desvinculados.')) return;
    try {
      await inventoryService.deleteTipoEquipo(id);
      fetchInventoryData();
      showAlert('Tipo de equipo eliminado.');
    } catch (err: any) {
      showAlert('Error al eliminar: ' + err.message);
    }
  };

  const fetchActivosPage = async (page = pageActivos, search = debouncedSearch, estado = filterEstado) => {
    try {
      setLoading(true);
      const res = await inventoryService.getActivos(page, 10, search, estado);
      setActivos(res.data);
      setTotalActivos(res.total);
    } catch (err) {
      console.error('Error fetching assets page:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsumiblesPage = async (page = pageConsumibles, search = debouncedSearch) => {
    try {
      setLoading(true);
      const res = await inventoryService.getConsumibles(page, 10, search);
      setConsumibles(res.data);
      setTotalConsumibles(res.total);
    } catch (err) {
      console.error('Error fetching consumables page:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReciclajePage = async (page = pageReciclaje, search = debouncedSearch) => {
    try {
      setLoading(true);
      const res = await inventoryService.getActivos(page, 10, search, 'Reciclaje');
      setReciclajeActivos(res.data);
      setTotalReciclaje(res.total);
    } catch (err) {
      console.error('Error fetching recycling assets page:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [personasList, proveedoresList, empresaList, tipoEquiposList, tipoInventariosList] = await Promise.all([
        inventoryService.getPersonas().catch(() => []),
        inventoryService.getProveedores().catch(() => []),
        apiClient.get<any[]>('/empresas').catch(() => []),
        inventoryService.getTipoEquipos().catch(() => []),
        inventoryService.getTipoInventarios().catch(() => []),
      ]);

      setPersonas(personasList);
      setProveedores(proveedoresList);
      setEmpresas(empresaList);
      setTipoEquipos(tipoEquiposList);
      setImportTypes(tipoInventariosList);
      if (tipoInventariosList.length > 0) {
        setImportType(prev => prev === 0 ? tipoInventariosList[0].id : prev);
      }

      await Promise.all([
        fetchActivosPage(1, debouncedSearch, filterEstado),
        fetchConsumiblesPage(1, debouncedSearch),
        fetchReciclajePage(1, debouncedSearch)
      ]);
    } catch (e) {
      console.error('Error fetching static inventory data', e);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // When search or filter changes, reset the page number (which will trigger the main fetch useEffect)
  useEffect(() => {
    setPageActivos(1);
  }, [debouncedSearch, filterEstado]);

  useEffect(() => {
    setPageConsumibles(1);
  }, [debouncedSearch]);

  useEffect(() => {
    setPageReciclaje(1);
  }, [debouncedSearch]);

  // Main fetch useEffect for Activos
  useEffect(() => {
    fetchActivosPage(pageActivos, debouncedSearch, filterEstado);
  }, [pageActivos, debouncedSearch, filterEstado]);

  // Main fetch useEffect for Consumibles
  useEffect(() => {
    fetchConsumiblesPage(pageConsumibles, debouncedSearch);
  }, [pageConsumibles, debouncedSearch]);

  // Main fetch useEffect for Reciclaje
  useEffect(() => {
    fetchReciclajePage(pageReciclaje, debouncedSearch);
  }, [pageReciclaje, debouncedSearch]);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleOpenDetail = async (activo: Activo) => {
    setSelectedActivo(activo);
    setIsEditingAsset(false);
    setDrawerSubTab('custodia');
    try {
      const history = await inventoryService.getHistorial(activo.id);
      setMovimientos(history);
      const changes = await inventoryService.getHistorialCambios(activo.id);
      setHistorialCambios(changes);
    } catch (e) {
      setMovimientos([]);
      setHistorialCambios([]);
    }
  };

  const startEditingAsset = () => {
    if (!selectedActivo) return;
    setEditAssetSerial(selectedActivo?.serial || '');
    setEditAssetMarca(selectedActivo?.marca || '');
    setEditAssetModelo(selectedActivo?.modelo || '');
    setEditAssetEmpresaId(selectedActivo?.empresa_id || 0);
    setEditAssetTipoEquipoId(selectedActivo?.tipo_equipo_id || 0);
    setEditAssetProveedorId(selectedActivo?.proveedor_id || 0);
    setEditAssetFechaCompra(selectedActivo?.fecha_compra ? selectedActivo.fecha_compra.split('T')[0] : '');
    setEditAssetEspecificaciones(selectedActivo?.especificaciones || '');
    setIsEditingAsset(true);
  };

  const handleSaveAssetEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivo) return;
    if (!editAssetSerial || !editAssetMarca || !editAssetModelo || editAssetEmpresaId <= 0 || editAssetTipoEquipoId <= 0) {
      showAlert('Por favor completa los campos requeridos.');
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await inventoryService.updateActivo(selectedActivo.id, {
        serial: editAssetSerial,
        marca: editAssetMarca,
        modelo: editAssetModelo,
        empresa_id: editAssetEmpresaId,
        tipo_equipo_id: editAssetTipoEquipoId,
        proveedor_id: editAssetProveedorId > 0 ? editAssetProveedorId : null,
        fecha_compra: editAssetFechaCompra || null,
        especificaciones: editAssetEspecificaciones || null
      });

      setSelectedActivo(updated);
      setIsEditingAsset(false);

      const history = await inventoryService.getHistorial(selectedActivo.id);
      setMovimientos(history);
      const changes = await inventoryService.getHistorialCambios(selectedActivo.id);
      setHistorialCambios(changes);

      fetchInventoryData();
      showAlert('Activo editado y cambios registrados en el historial.');
    } catch (err: any) {
      showAlert('Error al guardar cambios: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivo || selectedPersonaId <= 0) {
      showAlert('Por favor selecciona un empleado.');
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryService.asignarActivo(selectedActivo.id, selectedPersonaId, observations);
      
      setShowAssignModal(false);
      setSelectedPersonaId(0);
      setObservations('');
      setSelectedActivo(null);
      
      fetchInventoryData();
      showAlert('Equipo entregado exitosamente.');
    } catch (err: any) {
      showAlert('Error en asignación: ' + err.message);
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
      
      setShowDevolverModal(false);
      setObservations('');
      setSelectedActivo(null);
      
      fetchInventoryData();
      showAlert('Equipo recibido y liberado en bodega central.');
    } catch (err: any) {
      showAlert('Error al devolver el activo: ' + err.message);
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
      showAlert('Error al actualizar el stock: ' + err.message);
    }
  };

  // Since the backend handles searching, filtering, and paging:
  const filteredActivos = activos;
  const filteredConsumibles = consumibles;

  const renderPagination = (
    currentPage: number,
    totalItems: number,
    itemsPerPage: number,
    onPageChange: (p: number) => void
  ) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', padding: '10px 0' }}>
        <button 
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: '12px' }}
        >
          Anterior
        </button>
        <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: '500' }}>
          Página {currentPage} de {totalPages} ({totalItems} registros)
        </span>
        <button 
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{ cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: '12px' }}
        >
          Siguiente
        </button>
      </div>
    );
  };

  const getFilteredImportTypes = () => {
    if (activeTab === 'activos') {
      return importTypes.filter(t => 
        t.nombre === 'Bodega' || 
        t.nombre === 'Asignado a Usuarios' || 
        t.nombre === 'Servidores e Infraestructura'
      );
    }
    if (activeTab === 'consumibles') {
      return importTypes.filter(t => t.nombre === 'Consumibles y Suministros');
    }
    if (activeTab === 'reciclaje') {
      return importTypes.filter(t => t.nombre === 'Reciclaje');
    }
    return importTypes;
  };

  return (
    <div className="inventario-container animate-fade">
      {/* Tab Switcher */}
      <div className="tabs-header glass-panel">
        <button 
          className={`tab-btn ${activeTab === 'activos' ? 'active' : ''}`}
          onClick={() => { setActiveTab('activos'); setSearchQuery(''); }}
        >
          Activos Tecnológicos (Hardware)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'consumibles' ? 'active' : ''}`}
          onClick={() => { setActiveTab('consumibles'); setSearchQuery(''); }}
        >
          Consumibles y Suministros
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reciclaje' ? 'active' : ''}`}
          onClick={() => { setActiveTab('reciclaje'); setSearchQuery(''); }}
        >
          Reciclaje
        </button>
        {(user?.rol === 'ADMIN' || user?.rol === 'TECNICO') && (
          <button 
            className={`tab-btn ${activeTab === 'tipos_equipo' ? 'active' : ''}`}
            onClick={() => { setActiveTab('tipos_equipo'); setSearchQuery(''); }}
          >
            Tipos de Equipo
          </button>
        )}
      </div>

      {/* Searching control panel */}
      {activeTab !== 'tipos_equipo' && (
        <div className="inventory-controls glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="controls-left" style={{ flex: 1, display: 'flex', gap: '12px' }}>
            <input
              type="text"
              className="form-control search-input"
              placeholder={
                activeTab === 'activos' 
                  ? "Buscar activos por código, marca, serial, sede..." 
                  : activeTab === 'reciclaje' 
                    ? "Buscar reciclados por código, marca, serial..." 
                    : "Buscar consumibles..."
              }
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
            <div className="controls-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  setImportFile(null);
                  setImportSummary(null);
                  setImportBodegaName('');
                  const filtered = importTypes.filter(t => {
                    if (activeTab === 'activos') {
                      return t.nombre === 'Bodega' || t.nombre === 'Asignado a Usuarios' || t.nombre === 'Servidores e Infraestructura';
                    }
                    if (activeTab === 'consumibles') {
                      return t.nombre === 'Consumibles y Suministros';
                    }
                    if (activeTab === 'reciclaje') {
                      return t.nombre === 'Reciclaje';
                    }
                    return true;
                  });
                  if (activeTab === 'consumibles' || activeTab === 'reciclaje') {
                    setImportType(filtered[0]?.id || 0);
                  } else {
                    setImportType(0);
                  }
                  setShowImportModal(true);
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Importar Excel
              </button>
              <a 
                href={inventoryService.exportarInventarioUrl()} 
                download 
                className="btn btn-secondary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Exportar Todo
              </a>
              {activeTab === 'activos' && (
                <button className="btn btn-primary" onClick={() => {
                  setAssetEmpresaId(0);
                  setAssetTipoEquipoId(0);
                  setAssetCodigo('');
                  setShowCreateAssetModal(true);
                }}>
                  Registrar Activo
                </button>
              )}
              {activeTab === 'consumibles' && (
                <button className="btn btn-primary" onClick={() => setShowCreateConsumableModal(true)}>
                  Registrar Consumible
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">
          <div className="loader"></div>
          <p className="text-muted">Leyendo registros físicos de IT...</p>
        </div>
      ) : activeTab === 'activos' ? (
        /* TAB 1: ACTIVOS HARDWARE */
        filteredActivos.length === 0 ? (
          <div className="empty-panel glass-panel text-center py-5">
            <span className="empty-big-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-dim)' }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </span>
            <h3>No se encontraron activos tecnológicos</h3>
            <p className="text-muted">Prueba a registrar un activo o redefine tus filtros.</p>
          </div>
        ) : (
          <div className="assets-table-container glass-panel">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>CÓDIGO / MARCA</th>
                  <th>TIPO / SEDE</th>
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
                    <td>
                      <div className="asset-code-group">
                        <span className="asset-brand" style={{ fontWeight: '500' }}>{a.tipo_equipo_nombre || 'N/A'}</span>
                        <span className="asset-brand text-muted">{a.empresa_nombre || 'N/A'}</span>
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
                        <span className="holder-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                          {a.persona_nombre}
                        </span>
                      ) : (
                        <span className="holder-empty">Bodega Central</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleOpenDetail(a)}>
                          Ver Ficha
                        </button>
                        {(user?.rol === 'ADMIN' || user?.rol === 'TECNICO') && (
                          <>
                            {a.estado === 'Stock' ? (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => { setSelectedActivo(a); setShowAssignModal(true); }}
                              >
                                Asignar
                              </button>
                            ) : a.estado === 'Asignado' ? (
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #fca5a5', color: '#b91c1c' }}
                                onClick={() => { setSelectedActivo(a); setShowDevolverModal(true); }}
                              >
                                Liberar
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {renderPagination(pageActivos, totalActivos, 10, setPageActivos)}
          </div>
        )
      ) : activeTab === 'reciclaje' ? (
        /* TAB: RECICLAJE Y BAJAS */
        reciclajeActivos.length === 0 ? (
          <div className="empty-panel glass-panel text-center py-5">
            <span className="empty-big-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-dim)' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </span>
            <h3>No hay activos en reciclaje</h3>
            <p className="text-muted font-xs">Los activos en estado de Reciclaje aparecerán listados aquí.</p>
          </div>
        ) : (
          <div className="assets-table-container glass-panel">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>CÓDIGO / MARCA</th>
                  <th>TIPO / SEDE</th>
                  <th>N/S SERIAL</th>
                  <th>MODELO</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {reciclajeActivos.map((a) => (
                  <tr key={a.id} className="asset-row animate-slide-up">
                    <td>
                      <div className="asset-code-group">
                        <span className="asset-code">{a.codigo}</span>
                        <span className="asset-brand text-muted">{a.marca}</span>
                      </div>
                    </td>
                    <td>
                      <div className="asset-code-group">
                        <span className="asset-brand" style={{ fontWeight: '500' }}>{a.tipo_equipo_nombre || 'N/A'}</span>
                        <span className="asset-brand text-muted">{a.empresa_nombre || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="asset-serial">{a.serial}</td>
                    <td className="asset-model">{a.modelo}</td>
                    <td>
                      <span className="badge badge-state-baja" style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c' }}>
                        {a.estado}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleOpenDetail(a)}>
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {renderPagination(pageReciclaje, totalReciclaje, 10, setPageReciclaje)}
          </div>
        )
      ) : activeTab === 'consumibles' ? (
        /* TAB 2: CONSUMIBLES */
        filteredConsumibles.length === 0 ? (
          <div className="empty-panel glass-panel text-center py-5">
            <span className="empty-big-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-dim)' }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </span>
            <h3>No se encontraron consumibles</h3>
          </div>
        ) : (
          <>
            <div className="consumables-grid">
            {filteredConsumibles.map((c) => {
              const isLowStock = c.stock_actual <= c.stock_minimo;
              return (
                <div key={c.id} className={`consumable-card glass-panel ${isLowStock ? 'low-stock-critical' : ''} animate-slide-up`}>
                  <div className="consumable-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="consumable-icon-wrap" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                    </span>
                    {isLowStock && <span className="badge badge-state-baja" style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c' }}>Stock Mínimo</span>}
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
                          Ajustar Inventario
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {renderPagination(pageConsumibles, totalConsumibles, 10, setPageConsumibles)}
        </>
        )
      ) : (
        /* TAB 3: GESTIÓN TIPOS EQUIPO (CRUD) */
        <div className="tipo-equipos-layout animate-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Create form */}
          <div className="tipo-form-box glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
            <h3>{editingTipoEquipo ? 'Editar Tipo de Equipo' : 'Registrar Tipo de Equipo'}</h3>
            <p className="text-muted font-xs mb-3">Los tipos de equipo sirven para segmentar los activos y autogenerar códigos.</p>
            
            {editingTipoEquipo ? (
              <form onSubmit={handleUpdateTipoEquipo} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Nombre del Tipo de Equipo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Laptop, Servidor, Impresora"
                    value={editTipoEquipoNombre}
                    onChange={(e) => setEditTipoEquipoNombre(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                    Guardar Cambios
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingTipoEquipo(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateTipoEquipo} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Nombre del Tipo de Equipo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Laptop, Servidor, Impresora"
                    value={newTipoEquipoNombre}
                    onChange={(e) => setNewTipoEquipoNombre(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                  Agregar Tipo
                </button>
              </form>
            )}
          </div>

          {/* List Box */}
          <div className="tipo-list-box glass-panel" style={{ padding: '24px' }}>
            <h3>Tipos de Equipos Registrados</h3>
            {tipoEquipos.length === 0 ? (
              <p className="text-muted text-center py-5">No hay tipos de equipo guardados.</p>
            ) : (
              <div className="assets-table-container mt-3" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="assets-table">
                  <thead>
                    <tr>
                      <th>NOMBRE</th>
                      <th>CÓDIGO DE ABREVIACIÓN</th>
                      <th>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tipoEquipos.map(te => {
                      const abrev = te.abreviacion || te.nombre.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
                      return (
                        <tr key={te.id}>
                          <td style={{ fontWeight: '600' }}>{te.nombre}</td>
                          <td>
                            <span className="badge badge-new" style={{ fontFamily: 'monospace' }}>
                              {abrev}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '5px 7px' }}
                                onClick={() => {
                                  setEditingTipoEquipo(te);
                                  setEditTipoEquipoNombre(te.nombre);
                                }}
                                title="Editar"
                              >
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                              </button>
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '5px 7px', border: '1px solid #fca5a5', color: '#b91c1c' }}
                                onClick={() => handleDeleteTipoEquipo(te.id)}
                                title="Eliminar"
                              >
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
          </div>
        </div>
      )}

      {/* ASSET DETAILS DRAWER (FICHA TÉCNICA Y AUDITORÍA DE MOVIMIENTOS) */}
      {selectedActivo && !showAssignModal && !showDevolverModal && (
        <div className="drawer-overlay animate-fade" onClick={() => setSelectedActivo(null)}>
          <div className="drawer-container glass-panel animate-slide-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>{isEditingAsset ? 'Editar Ficha de Activo' : 'Ficha Técnica de Activo TI'}</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!isEditingAsset && (user?.rol === 'ADMIN' || user?.rol === 'TECNICO') && (
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={startEditingAsset}
                    style={{ padding: '4px 8px', fontSize: '12.5px', height: '28px', display: 'flex', alignItems: 'center' }}
                  >
                    Editar
                  </button>
                )}
                <button className="drawer-close-btn" onClick={() => setSelectedActivo(null)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>×</button>
              </div>
            </div>

            <div className="drawer-body">
              {isEditingAsset ? (
                <form onSubmit={handleSaveAssetEdit} className="modal-form" style={{ gap: '14px', display: 'flex', flexDirection: 'column' }}>
                  <div className="form-row">
                    <div className="form-group half">
                      <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>TIPO EQUIPO *</label>
                      <select
                        className="form-control"
                        value={editAssetTipoEquipoId}
                        onChange={(e) => setEditAssetTipoEquipoId(Number(e.target.value))}
                        required
                      >
                        <option value="0">Seleccionar...</option>
                        {tipoEquipos.map(te => (
                          <option key={te.id} value={te.id}>{te.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group half">
                      <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>SEDE / EMPRESA *</label>
                      <select
                        className="form-control"
                        value={editAssetEmpresaId}
                        onChange={(e) => setEditAssetEmpresaId(Number(e.target.value))}
                        required
                      >
                        <option value="0">Seleccionar...</option>
                        {empresas.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>MARCA *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editAssetMarca}
                        onChange={(e) => setEditAssetMarca(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group half">
                      <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>MODELO *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editAssetModelo}
                        onChange={(e) => setEditAssetModelo(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>NÚMERO SERIAL *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editAssetSerial}
                        onChange={(e) => setEditAssetSerial(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group half">
                      <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>FECHA DE COMPRA</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editAssetFechaCompra}
                        onChange={(e) => setEditAssetFechaCompra(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>PROVEEDOR</label>
                    <select
                      className="form-control"
                      value={editAssetProveedorId}
                      onChange={(e) => setEditAssetProveedorId(Number(e.target.value))}
                    >
                      <option value="0">Ninguno</option>
                      {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>ESPECIFICACIONES</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={editAssetEspecificaciones}
                      onChange={(e) => setEditAssetEspecificaciones(e.target.value)}
                      placeholder="Detalles de hardware..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                      {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditingAsset(false)} style={{ flex: 1 }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Top Spec summary */}
                  <div className="asset-spec-box" style={{ border: '1px solid #f1f5f9', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{selectedActivo.codigo}</span>
                      <span className={`badge badge-state-${selectedActivo.estado.toLowerCase()}`}>
                        {selectedActivo.estado}
                      </span>
                    </div>
                    
                    <div className="spec-details-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#64748b' }}>Tipo Equipo:</span>
                        <strong>{selectedActivo.tipo_equipo_nombre || 'N/A'}</strong>
                      </div>
                      <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#64748b' }}>Sede (Ubicación):</span>
                        <strong>{selectedActivo.empresa_nombre || 'N/A'}</strong>
                      </div>
                      <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#64748b' }}>Marca:</span>
                        <strong>{selectedActivo.marca}</strong>
                      </div>
                      <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#64748b' }}>Modelo:</span>
                        <strong>{selectedActivo.modelo}</strong>
                      </div>
                      <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#64748b' }}>Número Serial:</span>
                        <strong>{selectedActivo.serial}</strong>
                      </div>
                      {selectedActivo.fecha_compra && (
                        <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                          <span style={{ color: '#64748b' }}>Fecha Adquisición:</span>
                          <strong>{new Date(selectedActivo.fecha_compra).toLocaleDateString()}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>Especificaciones Técnicas:</span>
                        <p style={{ fontSize: '12px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                          {selectedActivo.especificaciones || 'Sin especificaciones detalladas registradas'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* History Sub-tabs Switcher */}
                  <div className="drawer-subtabs" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginTop: '20px', gap: '16px' }}>
                    <button
                      type="button"
                      className={`subtab-btn ${drawerSubTab === 'custodia' ? 'active' : ''}`}
                      onClick={() => setDrawerSubTab('custodia')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px 4px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: drawerSubTab === 'custodia' ? 'var(--color-primary)' : '#64748b',
                        borderBottom: drawerSubTab === 'custodia' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      Historial de Custodia
                    </button>
                    <button
                      type="button"
                      className={`subtab-btn ${drawerSubTab === 'cambios' ? 'active' : ''}`}
                      onClick={() => setDrawerSubTab('cambios')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px 4px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: drawerSubTab === 'cambios' ? 'var(--color-primary)' : '#64748b',
                        borderBottom: drawerSubTab === 'cambios' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      Historial de Cambios
                    </button>
                  </div>

                  {drawerSubTab === 'custodia' ? (
                    <div className="asset-history-box" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      <div className="history-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px', marginLeft: '6px' }}>
                        {movimientos.length === 0 ? (
                          <p className="text-muted text-center py-4">No hay registros de movimientos para este equipo.</p>
                        ) : (
                          movimientos.map((m) => (
                            <div key={m.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {/* Dot indicator */}
                              <div style={{ position: 'absolute', left: '-21.5px', top: '5px', width: '9px', height: '9px', borderRadius: '50%', background: '#2563eb' }}></div>
                              
                              <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#1e293b', marginBottom: '4px' }}>
                                  <span>{m.tipo}</span>
                                  <span style={{ color: '#94a3b8', textTransform: 'none', fontWeight: 'normal' }}>{new Date(m.fecha).toLocaleDateString()}</span>
                                </div>
                                <p style={{ color: '#475569', fontSize: '11.5px' }}>
                                  {m.desde_persona_nombre ? `De: ${m.desde_persona_nombre}` : ''}
                                  {m.hacia_persona_nombre ? ` A: ${m.hacia_persona_nombre}` : ''}
                                </p>
                                {m.observaciones && (
                                  <p style={{ fontStyle: 'italic', color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 8px', borderRadius: '4px', marginTop: '6px', fontSize: '11px' }}>
                                    "{m.observaciones}"
                                  </p>
                                )}
                                
                                {/* ACTA PDF DOWNLOAD */}
                                <a 
                                  href={inventoryService.getActaUrl(m.id)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="download-acta-link mt-2"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', marginTop: '6px', color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}
                                >
                                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                                  Descargar Acta Entrega PDF
                                </a>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="asset-history-box" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      <div className="history-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px', marginLeft: '6px' }}>
                        {historialCambios.length === 0 ? (
                          <p className="text-muted text-center py-4">No hay registros de cambios de datos para este equipo.</p>
                        ) : (
                          historialCambios.map((hc) => (
                            <div key={hc.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {/* Dot indicator */}
                              <div style={{ position: 'absolute', left: '-21.5px', top: '5px', width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b' }}></div>
                              
                              <div style={{ background: '#fdfbeb', border: '1px solid #fef3c7', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#b45309', marginBottom: '4px' }}>
                                  <span>Modificado por: {hc.usuario_nombre}</span>
                                  <span style={{ color: '#d97706', textTransform: 'none', fontWeight: 'normal' }}>{new Date(hc.fecha).toLocaleDateString()}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                  {hc.cambios.split(' | ').map((cambio, idx) => (
                                    <div key={idx} style={{ padding: '4px 8px', background: '#ffffff', border: '1px solid #fde68a', borderRadius: '4px', color: '#78350f', fontSize: '11.5px' }}>
                                      {cambio}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
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
              <button className="modal-close-btn" onClick={() => { setShowAssignModal(false); setSelectedActivo(null); }}>×</button>
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
                  placeholder="Ej: Se entrega con cargador, mouse y en estuche..."
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAssignModal(false); setSelectedActivo(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando...' : 'Entregar Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEVOLVER HARDWARE MODAL */}
      {showDevolverModal && selectedActivo && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>Recibir Activo {selectedActivo.codigo} en Bodega</h2>
              <button className="modal-close-btn" onClick={() => { setShowDevolverModal(false); setSelectedActivo(null); }}>×</button>
            </div>

            <form onSubmit={handleDevolver} className="modal-form">
              <div className="form-group">
                <label className="form-label">OBSERVACIONES DE LA DEVOLUCIÓN</label>
                <textarea
                  className="form-control textarea-field"
                  placeholder="Ej: Se recibe en perfectas condiciones, cargador original..."
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowDevolverModal(false); setSelectedActivo(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
                  {isSubmitting ? 'Procesando...' : 'Recibir y Liberar Custodio'}
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
              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">SEDE / UBICACIÓN *</label>
                  <select 
                    className="form-control" 
                    value={assetEmpresaId} 
                    onChange={(e) => setAssetEmpresaId(Number(e.target.value))}
                    required
                  >
                    <option value="0">Seleccionar sede...</option>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group half">
                  <label className="form-label">TIPO DE EQUIPO *</label>
                  <select 
                    className="form-control" 
                    value={assetTipoEquipoId} 
                    onChange={(e) => setAssetTipoEquipoId(Number(e.target.value))}
                    required
                  >
                    <option value="0">Seleccionar tipo...</option>
                    {tipoEquipos.map(te => (
                      <option key={te.id} value={te.id}>{te.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">CÓDIGO ÚNICO AUTOGENERADO</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Se generará al seleccionar sede y tipo de equipo"
                  value={assetCodigo}
                  readOnly
                  style={{ background: '#f1f5f9', fontWeight: 'bold' }}
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

      {/* EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1002 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Importar Inventario desde Excel</h2>
              <button 
                className="modal-close-btn" 
                onClick={() => { 
                  setShowImportModal(false); 
                  setImportFile(null); 
                  setImportSummary(null); 
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleImportExcel} className="modal-form">
              {activeTab === 'activos' ? (
                <div className="form-group animate-fade">
                  <label className="form-label">TIPO DE INVENTARIO A CARGAR *</label>
                  <select 
                    className="form-control" 
                    value={importType} 
                    onChange={(e) => setImportType(Number(e.target.value))}
                    required
                  >
                    <option value="0">Seleccionar tipo...</option>
                    {getFilteredImportTypes().map(t => (
                      <option key={t.id} value={t.id}>{t.descripcion || t.nombre}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group animate-fade">
                  <label className="form-label">TIPO DE INVENTARIO A CARGAR</label>
                  <input
                    type="text"
                    className="form-control"
                    value={getFilteredImportTypes()[0]?.descripcion || getFilteredImportTypes()[0]?.nombre || ''}
                    readOnly
                    style={{ background: '#f1f5f9' }}
                  />
                </div>
              )}

              {importTypes.find(t => t.id === importType)?.nombre === 'Bodega' && (
                <div className="form-group animate-fade">
                  <label className="form-label">NOMBRE DE LA BODEGA DE DESTINO</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Bodega Sistemas, Bodega Oficina (Opcional)"
                    value={importBodegaName}
                    onChange={(e) => setImportBodegaName(e.target.value)}
                  />
                  <small className="text-muted" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Si se deja vacío se asignará "Bodega Central".
                  </small>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">SELECCIONAR ARCHIVO EXCEL (.XLSX, .XLS) *</label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="form-control"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setImportFile(files[0]);
                    }
                  }}
                  required
                />
              </div>

              {importProgress && (
                <div className="import-loading text-center py-3">
                  <div className="loader" style={{ margin: '0 auto 12px' }}></div>
                  <p className="text-primary font-bold">Procesando y autogenerando códigos de activos...</p>
                  <p className="text-muted font-xs">Por favor no cierres este modal.</p>
                </div>
              )}

              {importSummary && (
                <div className="import-summary-box mt-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Resumen del Proceso:</h4>
                  <ul style={{ fontSize: '12px', listStyleType: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>✅ Filas procesadas: <strong>{importSummary.totalProcessed}</strong></li>
                    <li>📥 Activos insertados individualmente: <strong className="text-success">{importSummary.totalInserted}</strong></li>
                    {importSummary.errors.length > 0 && (
                      <li className="mt-2">
                        <strong className="text-danger" style={{ display: 'block', marginBottom: '4px' }}>⚠️ Advertencias/Errores ({importSummary.errors.length}):</strong>
                        <div style={{ maxHeight: '100px', overflowY: 'auto', background: '#ffffff', border: '1px solid #fee2e2', padding: '8px', borderRadius: '4px', fontSize: '11px', color: '#b91c1c' }}>
                          {importSummary.errors.map((err, i) => (
                            <div key={i} style={{ borderBottom: '1px solid #fee2e2', paddingBottom: '2px', marginBottom: '2px' }}>{err}</div>
                          ))}
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="modal-actions mt-4">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { 
                    setShowImportModal(false); 
                    setImportFile(null); 
                    setImportSummary(null); 
                  }}
                  disabled={importProgress}
                >
                  Cerrar
                </button>
                <button type="submit" className="btn btn-primary" disabled={importProgress || !importFile}>
                  {importProgress ? 'Importando...' : 'Iniciar Importación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
