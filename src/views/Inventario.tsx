import { showAlert, showConfirm } from '../utils/alerts';
import React, { useEffect, useRef, useState } from 'react';
import { formatLocalDateSimple } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import { 
  inventoryService, 
  Activo, 
  Consumible,
  ConsumibleHistorial,
  Persona, 
  Proveedor, 
  MovimientoInventario,
  HistorialCambio,
  Bodega
} from '../services/inventory.service';
import { projectService, User } from '../services/project.service';
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
  const [loggedInTech, setLoggedInTech] = useState<User | null>(null);

  useEffect(() => {
    if (user) {
      projectService.getUsuarios().then(users => {
        const me = users.find(u => u.id === user.id);
        if (me) setLoggedInTech(me);
      }).catch(() => {});
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState<'activos' | 'consumibles' | 'tipos_equipo' | 'recepciones'>('activos');
  const [activos, setActivos] = useState<Activo[]>([]);
  const [consumibles, setConsumibles] = useState<Consumible[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [empresas, setEmpresas] = useState<{ id: number; nombre: string; sucursales?: { id: number; nombre: string }[] }[]>([]);

  const userEmpresaIds = loggedInTech?.empresa_ids || [];
  const isManagementRole = user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR';
  const allowedEmpresas = isManagementRole || !userEmpresaIds.length
    ? empresas
    : empresas.filter((c) => userEmpresaIds.includes(c.id));
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [tipoEquipos, setTipoEquipos] = useState<TipoEquipo[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterSucursalId, setFilterSucursalId] = useState<number>(0);
  const [assetSucursalId, setAssetSucursalId] = useState<number>(0);
  const [egresoSucursalId, setEgresoSucursalId] = useState<number>(0);
  const [recepcionSucursalId, setRecepcionSucursalId] = useState<number>(0);
  const [editAssetSucursalId, setEditAssetSucursalId] = useState<number>(0);

  // Asset detail & action modals
  const [selectedActivo, setSelectedActivo] = useState<Activo | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [historialCambios, setHistorialCambios] = useState<HistorialCambio[]>([]);
  const [drawerSubTab, setDrawerSubTab] = useState<'custodia' | 'cambios'>('custodia');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDevolverModal, setShowDevolverModal] = useState(false);

  // Maintenance process modal state
  const [showMantenimientoModal, setShowMantenimientoModal] = useState(false);
  const [mantenimientoActivo, setMantenimientoActivo] = useState<Activo | null>(null);
  const [mantenimientoAccion, setMantenimientoAccion] = useState<'Reasignar' | 'Stock' | 'Baja'>('Reasignar');
  const [mantenimientoPersonaId, setMantenimientoPersonaId] = useState<number>(0);
  const [mantenimientoObs, setMantenimientoObs] = useState<string>('');

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
  const [importEmpresaId, setImportEmpresaId] = useState<number>(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(false);
  const [importSummary, setImportSummary] = useState<{ totalProcessed: number; totalInserted: number; errors: string[] } | null>(null);

  // Pagination states
  const [pageActivos, setPageActivos] = useState(1);
  const [totalActivos, setTotalActivos] = useState(0);
  const [pageConsumibles, setPageConsumibles] = useState(1);
  const [totalConsumibles, setTotalConsumibles] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Asset Create / Ingreso fields
  const [assetCodigo, setAssetCodigo] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetMarca, setAssetMarca] = useState('');
  const [assetModelo, setAssetModelo] = useState('');
  const [assetEspecificaciones, setAssetEspecificaciones] = useState('');
  const [assetProveedorId, setAssetProveedorId] = useState<number>(0);
  const [assetFechaCompra, setAssetFechaCompra] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assetEmpresaId, setAssetEmpresaId] = useState<number>(0);
  const [assetTipoEquipoId, setAssetTipoEquipoId] = useState<number>(0);
  const [assetBodegaId, setAssetBodegaId] = useState<number>(0);

  // New Ingreso de Bodega extra fields
  const [assetNroOrdenCompra, setAssetNroOrdenCompra] = useState('');
  const [assetNroFactura, setAssetNroFactura] = useState('');
  const [assetNroSolicitudPago, setAssetNroSolicitudPago] = useState('');
  const [assetFechaIngreso, setAssetFechaIngreso] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assetDescripcion, setAssetDescripcion] = useState('');
  const [assetEsLote, setAssetEsLote] = useState(false);
  const [assetCantidad, setAssetCantidad] = useState<number>(1);
  const [extraAssets, setExtraAssets] = useState<Array<{ tipo_equipo_id: number; tipo_equipo_search_text?: string; show_dropdown?: boolean; marca: string; modelo: string; serial: string; especificaciones: string; es_lote?: boolean; cantidad?: number }>>([]);

  // Searchable Proveedor TI & Tipo Equipo in Ingreso
  const [assetProveedorSearchText, setAssetProveedorSearchText] = useState('');
  const [showAssetProveedorDropdown, setShowAssetProveedorDropdown] = useState(false);
  const assetProveedorRef = useRef<HTMLDivElement>(null);

  const [assetTipoEquipoSearchText, setAssetTipoEquipoSearchText] = useState('');
  const [showAssetTipoEquipoDropdown, setShowAssetTipoEquipoDropdown] = useState(false);
  const assetTipoEquipoRef = useRef<HTMLDivElement>(null);


  // Egreso / Multi-Asset Assignment State
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [egresoEmpresaId, setEgresoEmpresaId] = useState<number>(0);
  const [egresoPersonaId, setEgresoPersonaId] = useState<number>(0);
  const [egresoArea, setEgresoArea] = useState<string>('');
  const [egresoObservaciones, setEgresoObservaciones] = useState<string>('');
  const [egresoSearchAsset, setEgresoSearchAsset] = useState<string>('');
  const [selectedEgresoAssetIds, setSelectedEgresoAssetIds] = useState<number[]>([]);

  // Recepcion Modal fields
  const [showRecepcionModal, setShowRecepcionModal] = useState(false);
  const [recepcionEmpresaId, setRecepcionEmpresaId] = useState<number>(0);
  const [recepcionPersonaId, setRecepcionPersonaId] = useState<number>(0);
  const [recepcionArea, setRecepcionArea] = useState<string>('');
  const [recepcionBodegaId, setRecepcionBodegaId] = useState<number>(0);
  const [recepcionEstadoDestino, setRecepcionEstadoDestino] = useState<'Stock' | 'Mantenimiento' | 'Baja'>('Stock');
  const [recepcionObservaciones, setRecepcionObservaciones] = useState<string>('');
  const [selectedRecepcionAssetIds, setSelectedRecepcionAssetIds] = useState<number[]>([]);
  const [personaAssignedActivos, setPersonaAssignedActivos] = useState<Activo[]>([]);
  const [recepciones, setRecepciones] = useState<any[]>([]);
  const [pageRecepciones, setPageRecepciones] = useState(1);
  const [totalRecepciones, setTotalRecepciones] = useState(0);

  // Searchable Employee Select & Modal Asset Filters
  const [assignPersonaSearchText, setAssignPersonaSearchText] = useState('');
  const [showAssignPersonaDropdown, setShowAssignPersonaDropdown] = useState(false);
  const [recepcionPersonaSearchText, setRecepcionPersonaSearchText] = useState('');
  const [showRecepcionPersonaDropdown, setShowRecepcionPersonaDropdown] = useState(false);
  const [recepcionTipoEquipoId, setRecepcionTipoEquipoId] = useState<number>(0);
  const [recepcionAssetSearchText, setRecepcionAssetSearchText] = useState<string>('');

  const resetRecepcionModalState = () => {
    setRecepcionEmpresaId(0);
    setRecepcionSucursalId(0);
    setRecepcionPersonaId(0);
    setRecepcionPersonaSearchText('');
    setShowRecepcionPersonaDropdown(false);
    setRecepcionTipoEquipoId(0);
    setRecepcionAssetSearchText('');
    setRecepcionArea('');
    setRecepcionBodegaId(0);
    setRecepcionEstadoDestino('Stock');
    setRecepcionObservaciones('');
    setSelectedRecepcionAssetIds([]);
    setPersonaAssignedActivos([]);
  };

  const closeRecepcionModal = () => {
    resetRecepcionModalState();
    setShowRecepcionModal(false);
  };

  const resetAssignModalState = () => {
    setSelectedPersonaId(0);
    setAssignPersonaSearchText('');
    setShowAssignPersonaDropdown(false);
    setObservations('');
  };

  const closeAssignModal = () => {
    resetAssignModalState();
    setShowAssignModal(false);
    setSelectedActivo(null);
  };

  const [egresoPersonaSearchText, setEgresoPersonaSearchText] = useState('');
  const [showEgresoPersonaDropdown, setShowEgresoPersonaDropdown] = useState(false);
  const [egresoTipoEquipoId, setEgresoTipoEquipoId] = useState<number>(0);
  const [egresoTipoEquipoSearchText, setEgresoTipoEquipoSearchText] = useState<string>('');
  const [showEgresoTipoEquipoDropdown, setShowEgresoTipoEquipoDropdown] = useState<boolean>(false);
  const [allStockActivos, setAllStockActivos] = useState<Activo[]>([]);
  const [egresoAssetPage, setEgresoAssetPage] = useState<number>(1);

  // References to close search dropdowns when clicking outside
  const assignPersonaRef = useRef<HTMLDivElement>(null);
  const recepcionPersonaRef = useRef<HTMLDivElement>(null);
  const egresoPersonaRef = useRef<HTMLDivElement>(null);
  const egresoTipoEquipoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (assignPersonaRef.current && !assignPersonaRef.current.contains(target)) {
        setShowAssignPersonaDropdown(false);
      }
      if (recepcionPersonaRef.current && !recepcionPersonaRef.current.contains(target)) {
        setShowRecepcionPersonaDropdown(false);
      }
      if (egresoPersonaRef.current && !egresoPersonaRef.current.contains(target)) {
        setShowEgresoPersonaDropdown(false);
      }
      if (egresoTipoEquipoRef.current && !egresoTipoEquipoRef.current.contains(target)) {
        setShowEgresoTipoEquipoDropdown(false);
      }
      if (assetProveedorRef.current && !assetProveedorRef.current.contains(target)) {
        setShowAssetProveedorDropdown(false);
      }
      if (assetTipoEquipoRef.current && !assetTipoEquipoRef.current.contains(target)) {
        setShowAssetTipoEquipoDropdown(false);
      }

      setExtraAssets(prev => {
        let needsUpdate = false;
        const nextState = prev.map((item, idx) => {
          if (item.show_dropdown) {
            const wrapper = document.getElementById(`extra-asset-tipo-wrapper-${idx}`);
            if (wrapper && !wrapper.contains(target)) {
              needsUpdate = true;
              return { ...item, show_dropdown: false };
            }
          }
          return item;
        });
        return needsUpdate ? nextState : prev;
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchAllStockActivos = async () => {
    try {
      const res = await inventoryService.getActivos(1, 1000, '', 'Stock');
      setAllStockActivos(res.data || []);
    } catch (err) {
      console.error('Error fetching all stock assets:', err);
    }
  };

  const resetEgresoModalState = () => {
    setEgresoEmpresaId(0);
    setEgresoSucursalId(0);
    setEgresoPersonaId(0);
    setEgresoPersonaSearchText('');
    setShowEgresoPersonaDropdown(false);
    setEgresoTipoEquipoId(0);
    setEgresoTipoEquipoSearchText('');
    setShowEgresoTipoEquipoDropdown(false);
    setEgresoArea('');
    setEgresoObservaciones('');
    setEgresoSearchAsset('');
    setSelectedEgresoAssetIds([]);
    setEgresoAssetPage(1);
    fetchAllStockActivos();
  };

  const closeEgresoModal = () => {
    resetEgresoModalState();
    setShowEgresoModal(false);
  };

  useEffect(() => {
    setEgresoAssetPage(1);
  }, [egresoEmpresaId, egresoTipoEquipoId, egresoSearchAsset]);

  // Fetch assigned assets for selected persona and selected empresa in reception modal
  useEffect(() => {
    if (recepcionPersonaId > 0 && recepcionEmpresaId > 0 && showRecepcionModal) {
      const params: any = { custodio_id: recepcionPersonaId, empresa_id: recepcionEmpresaId, estado: 'Asignado', limit: 100 };
      apiClient.get<any>('/inventarios', { params })
        .then(res => {
          const list = Array.isArray(res) ? res : (res.data || []);
          setPersonaAssignedActivos(list);
          setSelectedRecepcionAssetIds(list.map((a: Activo) => a.id));
          const persona = personas.find(p => p.id === recepcionPersonaId);
          if (persona) {
            setRecepcionArea(persona.departamento || persona.cargo || '');
          }
        })
        .catch(() => setPersonaAssignedActivos([]));
    } else {
      setPersonaAssignedActivos([]);
      setSelectedRecepcionAssetIds([]);
    }
  }, [recepcionPersonaId, recepcionEmpresaId, showRecepcionModal, personas]);

  const fetchRecepcionesPage = async (page: number, search: string) => {
    try {
      const res = await inventoryService.getRecepcionesBodega(page, 10, search);
      setRecepciones(res.data || []);
      setTotalRecepciones(res.total || 0);
    } catch (e) {
      setRecepciones([]);
      setTotalRecepciones(0);
    }
  };

  useEffect(() => {
    if (activeTab === 'recepciones') {
      fetchRecepcionesPage(pageRecepciones, debouncedSearch);
    }
  }, [activeTab, pageRecepciones, debouncedSearch]);

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
  const [editAssetBodegaId, setEditAssetBodegaId] = useState<number>(0);

  // Suministros TI state & modal handlers
  const [showSuministroModal, setShowSuministroModal] = useState(false);
  const [editingSuministro, setEditingSuministro] = useState<Consumible | null>(null);
  const [suministroEmpresaId, setSuministroEmpresaId] = useState<number>(0);
  const [suministroNombre, setSuministroNombre] = useState('');
  const [suministroSerial, setSuministroSerial] = useState('');
  const [suministroUnidadMedida, setSuministroUnidadMedida] = useState('Unidades');
  const [suministroPrecioUnitario, setSuministroPrecioUnitario] = useState<number | string>('');
  const [suministroStockActual, setSuministroStockActual] = useState<number | string>(0);
  const [suministroStockMinimo, setSuministroStockMinimo] = useState<number | string>(0);
  const [suministroDescripcion, setSuministroDescripcion] = useState('');

  // Usar Modal
  const [showUsarModal, setShowUsarModal] = useState(false);
  const [usarSuministro, setUsarSuministro] = useState<Consumible | null>(null);
  const [usarCantidad, setUsarCantidad] = useState<number | string>(1);
  const [usarMotivo, setUsarMotivo] = useState('');

  // Restock Modal
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockSuministro, setRestockSuministro] = useState<Consumible | null>(null);
  const [restockCantidad, setRestockCantidad] = useState<number | string>(10);
  const [restockPrecioUnitario, setRestockPrecioUnitario] = useState<number | string>('');
  const [restockMotivo, setRestockMotivo] = useState('');

  // Ficha / Bitácora Modal
  const [showFichaSuministroModal, setShowFichaSuministroModal] = useState(false);
  const [fichaSuministro, setFichaSuministro] = useState<Consumible | null>(null);
  const [historialSuministro, setHistorialSuministro] = useState<ConsumibleHistorial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [pageHistorial, setPageHistorial] = useState<number>(1);

  // Tipo Equipo CRUD & Pagination fields
  const [newTipoEquipoNombre, setNewTipoEquipoNombre] = useState('');
  const [editingTipoEquipo, setEditingTipoEquipo] = useState<TipoEquipo | null>(null);
  const [editTipoEquipoNombre, setEditTipoEquipoNombre] = useState('');
  const [pageTipoEquipos, setPageTipoEquipos] = useState(1);
  const [totalTipoEquipos, setTotalTipoEquipos] = useState(0);
  const [searchTipoEquipo, setSearchTipoEquipo] = useState('');
  const [debouncedSearchTipoEquipo, setDebouncedSearchTipoEquipo] = useState('');
  const [allTipoEquipos, setAllTipoEquipos] = useState<TipoEquipo[]>([]);

  // Modal de confirmación con botones a PDF para Ingreso, Egreso y Recepción
  const [successDocModal, setSuccessDocModal] = useState<{
    title: string;
    code: string;
    message: string;
    buttons: {
      label: string;
      url: string;
      variant: 'primary' | 'secondary';
    }[];
  } | null>(null);

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

  // Pre-select bodega when Sede changes in Create Asset
  useEffect(() => {
    if (assetEmpresaId > 0) {
      const sedeBodegas = bodegas.filter(b => b.empresa_id === assetEmpresaId);
      if (sedeBodegas.length > 0) {
        setAssetBodegaId(sedeBodegas[0].id);
      } else {
        setAssetBodegaId(0);
      }
    } else {
      setAssetBodegaId(0);
    }
  }, [assetEmpresaId, bodegas]);

  // Pre-select bodega when Sede changes in Edit Asset
  useEffect(() => {
    if (editAssetEmpresaId > 0) {
      const sedeBodegas = bodegas.filter(b => b.empresa_id === editAssetEmpresaId);
      const currentBelongs = sedeBodegas.some(b => b.id === editAssetBodegaId);
      if (!currentBelongs) {
        if (sedeBodegas.length > 0) {
          setEditAssetBodegaId(sedeBodegas[0].id);
        } else {
          setEditAssetBodegaId(0);
        }
      }
    } else {
      setEditAssetBodegaId(0);
    }
  }, [editAssetEmpresaId, bodegas, editAssetBodegaId]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assetEmpresaId <= 0) {
      showAlert('Seleccione la Sede / Ubicación.');
      return;
    }

    if (!assetFechaCompra || !assetFechaIngreso) {
      showAlert('Ingrese las fechas de compra e ingreso.');
      return;
    }
    if (!assetDescripcion.trim()) {
      showAlert('Ingrese la descripción de la compra completa.');
      return;
    }

    // Asset 1 validation
    if (assetTipoEquipoId <= 0 || !assetMarca.trim() || !assetModelo.trim()) {
      showAlert('Por favor complete los datos obligatorios del Activo #1 (Tipo, Marca, Modelo).');
      return;
    }

    // Extra assets validation
    for (let i = 0; i < extraAssets.length; i++) {
      const ext = extraAssets[i];
      if (ext.tipo_equipo_id <= 0 || !ext.marca.trim() || !ext.modelo.trim()) {
        showAlert(`Por favor complete los datos del Activo #${i + 2} (Tipo, Marca, Modelo).`);
        return;
      }
    }

    const allAssets: Array<{
      tipo_equipo_id: number;
      marca: string;
      modelo: string;
      serial: string;
      especificaciones?: string;
      bodega_id?: number;
    }> = [];

    const countActivo1 = (assetEsLote && assetCantidad > 1) ? assetCantidad : 1;
    for (let c = 0; c < countActivo1; c++) {
      allAssets.push({
        tipo_equipo_id: assetTipoEquipoId,
        marca: assetMarca.trim(),
        modelo: assetModelo.trim(),
        serial: assetSerial.trim() || 'NA',
        especificaciones: assetEspecificaciones.trim() || undefined,
        bodega_id: assetBodegaId > 0 ? assetBodegaId : undefined
      });
    }

    for (let i = 0; i < extraAssets.length; i++) {
      const ext = extraAssets[i];
      const countExt = (ext.es_lote && ext.cantidad && ext.cantidad > 1) ? ext.cantidad : 1;
      for (let c = 0; c < countExt; c++) {
        allAssets.push({
          tipo_equipo_id: ext.tipo_equipo_id,
          marca: ext.marca.trim(),
          modelo: ext.modelo.trim(),
          serial: ext.serial.trim() || 'NA',
          especificaciones: ext.especificaciones.trim() || undefined
        });
      }
    }

    try {
      setIsSubmitting(true);
      const createdIngreso = await inventoryService.createIngresoBodega({
        empresa_id: assetEmpresaId,
        sucursal_id: assetSucursalId > 0 ? assetSucursalId : undefined,
        proveedor_id: assetProveedorId > 0 ? assetProveedorId : undefined,
        nro_orden_compra: assetNroOrdenCompra.trim(),
        nro_factura: assetNroFactura.trim() || undefined,
        nro_solicitud_pago: assetNroSolicitudPago.trim() || undefined,
        fecha_compra: assetFechaCompra,
        fecha_ingreso: assetFechaIngreso,
        descripcion: assetDescripcion.trim(),
        activos: allAssets
      });

      setShowCreateAssetModal(false);

      // Reset fields
      setAssetCodigo('');
      setAssetSerial('');
      setAssetMarca('');
      setAssetModelo('');
      setAssetEspecificaciones('');
      setAssetEsLote(false);
      setAssetCantidad(1);
      setAssetProveedorId(0);
      setAssetProveedorSearchText('');
      setShowAssetProveedorDropdown(false);
      setAssetFechaCompra(new Date().toISOString().split('T')[0]);
      setAssetFechaIngreso(new Date().toISOString().split('T')[0]);
      setAssetEmpresaId(0);
      setAssetSucursalId(0);
      setAssetTipoEquipoId(0);
      setAssetTipoEquipoSearchText('');
      setShowAssetTipoEquipoDropdown(false);
      setAssetBodegaId(0);
      setAssetNroOrdenCompra('');
      setAssetNroFactura('');
      setAssetNroSolicitudPago('');
      setAssetDescripcion('');
      setExtraAssets([]);

      fetchInventoryData();

      // Show document modal with PDF button
      setSuccessDocModal({
        title: '¡Ingreso a Bodega Registrado!',
        code: createdIngreso.codigo_ingreso || 'IB REGISTRADO',
        message: 'Se registraron los activos e ingreso a bodega de manera exitosa.',
        buttons: [
          {
            label: 'Ver / Descargar Acta de Ingreso (IB)',
            url: inventoryService.getActaIngresoUrl(createdIngreso.id),
            variant: 'primary'
          }
        ]
      });
    } catch (err: any) {
      showAlert('Error registrando ingreso de bodega: ' + (err.message || 'Error inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (egresoEmpresaId <= 0) {
      showAlert('Seleccione la Sede / Ubicación del egreso.');
      return;
    }
    if (egresoPersonaId <= 0) {
      showAlert('Seleccione la persona / custodio a quien se asigna.');
      return;
    }
    if (selectedEgresoAssetIds.length === 0) {
      showAlert('Seleccione al menos un activo disponible en stock para asignar.');
      return;
    }

    try {
      setIsSubmitting(true);
      const createdEgreso = await inventoryService.createEgresoBodega({
        empresa_id: egresoEmpresaId,
        sucursal_id: egresoSucursalId > 0 ? egresoSucursalId : undefined,
        custodio_id: egresoPersonaId,
        area: egresoArea.trim() || undefined,
        observaciones: egresoObservaciones.trim() || undefined,
        activo_ids: selectedEgresoAssetIds
      });

      closeEgresoModal();
      fetchInventoryData();

      // Show document modal with both PDF buttons
      setSuccessDocModal({
        title: '¡Asignación / Egreso Registrado!',
        code: createdEgreso.codigo_egreso || 'EB REGISTRADO',
        message: 'Se generó correctamente el egreso de bodega y entrega de bienes TI.',
        buttons: [
          {
            label: 'Ver Acta de Egreso de Bodega (3 Firmas)',
            url: inventoryService.getActaEgresoUrl(createdEgreso.id),
            variant: 'primary'
          },
          {
            label: 'Ver Acta de Entrega (2 Firmas)',
            url: inventoryService.getActaEntregaEgresoUrl(createdEgreso.id),
            variant: 'secondary'
          }
        ]
      });
    } catch (err: any) {
      showAlert('Error registrando asignación: ' + (err.message || 'Error inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateSuministro = () => {
    setEditingSuministro(null);
    setSuministroEmpresaId(0);
    setSuministroNombre('');
    setSuministroSerial('');
    setSuministroUnidadMedida('Unidades');
    setSuministroPrecioUnitario('');
    setSuministroStockActual(0);
    setSuministroStockMinimo(0);
    setSuministroDescripcion('');
    setShowSuministroModal(true);
  };

  const handleOpenEditSuministro = (c: Consumible) => {
    setEditingSuministro(c);
    setSuministroEmpresaId(c.empresa_id || 0);
    setSuministroNombre(c.nombre || '');
    setSuministroSerial(c.serial || '');
    setSuministroUnidadMedida(c.unidad_medida || 'Unidades');
    setSuministroPrecioUnitario(c.precio_unitario || '');
    setSuministroStockActual(c.stock_actual ?? 0);
    setSuministroStockMinimo(c.stock_minimo ?? 0);
    setSuministroDescripcion(c.descripcion || '');
    setShowSuministroModal(true);
  };

  const handleSaveSuministro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (suministroEmpresaId <= 0) {
      showAlert('Por favor seleccione la Sede / Empresa del suministro.');
      return;
    }
    if (!suministroNombre.trim()) {
      showAlert('Por favor ingrese el nombre del suministro.');
      return;
    }

    try {
      setIsSubmitting(true);
      const dataPayload = {
        empresa_id: suministroEmpresaId,
        nombre: suministroNombre.trim(),
        serial: suministroSerial.trim() || undefined,
        unidad_medida: suministroUnidadMedida || 'Unidades',
        precio_unitario: suministroPrecioUnitario !== '' ? Number(suministroPrecioUnitario) : undefined,
        stock_actual: Number(suministroStockActual || 0),
        stock_minimo: Number(suministroStockMinimo || 0),
        descripcion: suministroDescripcion.trim() || undefined
      };

      if (editingSuministro) {
        await inventoryService.updateConsumible(editingSuministro.id, dataPayload);
        showAlert('Suministro actualizado correctamente.');
      } else {
        await inventoryService.createConsumible(dataPayload);
        showAlert('Suministro registrado correctamente.');
      }

      setShowSuministroModal(false);
      fetchConsumiblesPage(pageConsumibles, debouncedSearch);
    } catch (err: any) {
      showAlert('Error al guardar suministro: ' + (err.message || 'Error inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSuministro = async (id: number) => {
    if (!await showConfirm('¿Estás seguro de que deseas eliminar este suministro de TI? Esta acción no se puede deshacer.')) return;
    try {
      await inventoryService.deleteConsumible(id);
      showAlert('Suministro eliminado.');
      fetchConsumiblesPage(pageConsumibles, debouncedSearch);
    } catch (err: any) {
      showAlert('Error al eliminar suministro: ' + err.message);
    }
  };

  const handleDirectUsar = async (c: Consumible) => {
    if (c.stock_actual <= 0) {
      showAlert('El suministro no tiene stock disponible.');
      return;
    }
    try {
      setIsSubmitting(true);
      await inventoryService.usarConsumible(c.id, {
        cantidad: 1,
        motivo: 'Uso de suministro'
      });
      fetchConsumiblesPage(pageConsumibles, debouncedSearch);
    } catch (err: any) {
      showAlert('Error al descontar stock: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRestock = (c: Consumible) => {
    setRestockSuministro(c);
    setRestockCantidad(10);
    setRestockPrecioUnitario(c.precio_unitario || '');
    setRestockMotivo('');
    setShowRestockModal(true);
  };

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockSuministro) return;
    const cant = Number(restockCantidad);
    if (!cant || cant <= 0) {
      showAlert('Ingrese una cantidad válida a ingresar mayor a 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryService.restockConsumible(restockSuministro.id, {
        cantidad: cant,
        precio_unitario: restockPrecioUnitario !== '' ? Number(restockPrecioUnitario) : undefined,
        motivo: restockMotivo.trim() || undefined
      });
      showAlert('Restock registrado correctamente. Stock actualizado.');
      setShowRestockModal(false);
      fetchConsumiblesPage(pageConsumibles, debouncedSearch);
    } catch (err: any) {
      showAlert('Error al registrar restock: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenFicha = async (c: Consumible) => {
    setFichaSuministro(c);
    setPageHistorial(1);
    setShowFichaSuministroModal(true);
    setLoadingHistorial(true);
    try {
      const history = await inventoryService.getHistorialConsumible(c.id);
      setHistorialSuministro(history || []);
    } catch (err) {
      console.error('Error fetching historial:', err);
      setHistorialSuministro([]);
    } finally {
      setLoadingHistorial(false);
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

  const refreshTipoEquiposAll = async () => {
    fetchTipoEquiposPage(pageTipoEquipos, debouncedSearchTipoEquipo);
    const unpaginated = await inventoryService.getTipoEquipos().catch(() => []);
    const parsed = Array.isArray(unpaginated) ? unpaginated : (unpaginated.data || []);
    setAllTipoEquipos(parsed);
  };

  const handleCreateTipoEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTipoEquipoNombre.trim()) return;
    try {
      setIsSubmitting(true);
      await inventoryService.createTipoEquipo({ nombre: newTipoEquipoNombre.trim() });
      setNewTipoEquipoNombre('');
      refreshTipoEquiposAll();
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
      refreshTipoEquiposAll();
      showAlert('Tipo de equipo actualizado con éxito.');
    } catch (err: any) {
      showAlert('Error al actualizar tipo de equipo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenMantenimientoModal = (activo: Activo) => {
    setMantenimientoActivo(activo);
    setMantenimientoAccion('Reasignar');
    setMantenimientoPersonaId(activo.ultimo_custodio_id || 0);
    setMantenimientoObs('');
    setShowMantenimientoModal(true);
  };

  const handleProcesarMantenimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mantenimientoActivo) return;

    if (mantenimientoAccion === 'Reasignar' && !mantenimientoActivo.ultimo_custodio_id) {
      showAlert('Este activo no tiene un custodio de origen registrado para re-asignarlo automáticamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      await inventoryService.procesarMantenimiento(mantenimientoActivo.id, {
        accion: mantenimientoAccion,
        persona_id: mantenimientoAccion === 'Reasignar' ? (mantenimientoActivo.ultimo_custodio_id || undefined) : undefined,
        observaciones: mantenimientoObs
      });

      showAlert(`El activo ${mantenimientoActivo.codigo} ha salido de mantenimiento exitosamente.`);

      setShowMantenimientoModal(false);
      setMantenimientoActivo(null);
      if (selectedActivo && selectedActivo.id === mantenimientoActivo.id) {
        setSelectedActivo(null);
      }
      fetchInventoryData();
    } catch (err: any) {
      showAlert('Error al procesar salida de mantenimiento: ' + (err.response?.data?.detail || err.message || 'Error inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTipoEquipo = async (id: number) => {
    if (!await showConfirm('¿Estás seguro de que deseas eliminar este tipo de equipo? Los activos que lo usen quedarán desvinculados.')) return;
    try {
      await inventoryService.deleteTipoEquipo(id);
      refreshTipoEquiposAll();
      showAlert('Tipo de equipo eliminado.');
    } catch (err: any) {
      showAlert('Error al eliminar: ' + err.message);
    }
  };

  const fetchActivosPage = async (page = pageActivos, search = debouncedSearch, estado = filterEstado, sucursalId = filterSucursalId) => {
    try {
      setLoading(true);
      const res = await inventoryService.getActivos(page, 10, search, estado, undefined, sucursalId > 0 ? sucursalId : undefined);
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

  const fetchTipoEquiposPage = async (page = pageTipoEquipos, search = debouncedSearchTipoEquipo) => {
    try {
      const res = await inventoryService.getTipoEquipos(page, 10, search);
      if (res && res.data) {
        setTipoEquipos(res.data);
        setTotalTipoEquipos(res.total);
      } else if (Array.isArray(res)) {
        setTipoEquipos(res);
        setTotalTipoEquipos(res.length);
      }
    } catch (err) {
      console.error('Error fetching tipo equipos page:', err);
    }
  };

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [personasList, proveedoresList, empresaList, allTipoEquiposList, tipoInventariosList, bodegasList] = await Promise.all([
        inventoryService.getPersonas().catch(() => []),
        inventoryService.getProveedores().catch(() => []),
        apiClient.get<any[]>('/empresas').catch(() => []),
        inventoryService.getTipoEquipos().catch(() => []),
        inventoryService.getTipoInventarios().catch(() => []),
        inventoryService.getBodegas().catch(() => []),
      ]);

      setPersonas(personasList);
      setProveedores(proveedoresList);
      setEmpresas(empresaList);
      const parsedAllTipoEquipos = Array.isArray(allTipoEquiposList) ? allTipoEquiposList : (allTipoEquiposList.data || []);
      setAllTipoEquipos(parsedAllTipoEquipos);
      setImportTypes(tipoInventariosList);
      setBodegas(bodegasList);
      if (tipoInventariosList.length > 0) {
        setImportType(prev => prev === 0 ? tipoInventariosList[0].id : prev);
      }

      await Promise.all([
        fetchActivosPage(1, debouncedSearch, filterEstado),
        fetchConsumiblesPage(1, debouncedSearch),
        fetchTipoEquiposPage(1, debouncedSearchTipoEquipo)
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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTipoEquipo(searchTipoEquipo);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTipoEquipo]);

  // When search or filter changes, reset the page number (which will trigger the main fetch useEffect)
  useEffect(() => {
    setPageActivos(1);
  }, [debouncedSearch, filterEstado, filterSucursalId]);

  useEffect(() => {
    setPageConsumibles(1);
  }, [debouncedSearch]);

  useEffect(() => {
    setPageTipoEquipos(1);
  }, [debouncedSearchTipoEquipo]);

  // Main fetch useEffect for Activos
  useEffect(() => {
    fetchActivosPage(pageActivos, debouncedSearch, filterEstado, filterSucursalId);
  }, [pageActivos, debouncedSearch, filterEstado, filterSucursalId]);

  // Main fetch useEffect for Consumibles
  useEffect(() => {
    fetchConsumiblesPage(pageConsumibles, debouncedSearch);
  }, [pageConsumibles, debouncedSearch]);

  // Main fetch useEffect for Tipos de Equipos
  useEffect(() => {
    fetchTipoEquiposPage(pageTipoEquipos, debouncedSearchTipoEquipo);
  }, [pageTipoEquipos, debouncedSearchTipoEquipo]);





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
    setEditAssetSucursalId(selectedActivo?.sucursal_id || 0);
    setEditAssetTipoEquipoId(selectedActivo?.tipo_equipo_id || 0);
    setEditAssetProveedorId(selectedActivo?.proveedor_id || 0);
    setEditAssetFechaCompra(selectedActivo?.fecha_compra ? selectedActivo.fecha_compra.split('T')[0] : '');
    setEditAssetEspecificaciones(selectedActivo?.especificaciones || '');
    setEditAssetBodegaId(selectedActivo?.bodega_id || 0);
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
        sucursal_id: editAssetSucursalId > 0 ? editAssetSucursalId : null,
        tipo_equipo_id: editAssetTipoEquipoId,
        proveedor_id: editAssetProveedorId > 0 ? editAssetProveedorId : null,
        fecha_compra: editAssetFechaCompra || null,
        especificaciones: editAssetEspecificaciones || null,
        bodega_id: editAssetBodegaId > 0 ? editAssetBodegaId : null
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

  const handleCreateRecepcion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recepcionEmpresaId <= 0) {
      showAlert('Seleccione la Sede / Empresa.');
      return;
    }
    if (recepcionPersonaId <= 0) {
      showAlert('Seleccione el Empleado / Custodio que devuelve los activos.');
      return;
    }
    if (selectedRecepcionAssetIds.length === 0) {
      showAlert('Seleccione al menos un activo a recibir.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await inventoryService.createRecepcionBodega({
        empresa_id: recepcionEmpresaId,
        sucursal_id: recepcionSucursalId > 0 ? recepcionSucursalId : undefined,
        persona_entrega_id: recepcionPersonaId,
        area: recepcionArea,
        bodega_id: recepcionBodegaId > 0 ? recepcionBodegaId : undefined,
        estado_destino: recepcionEstadoDestino,
        observaciones: recepcionObservaciones,
        activo_ids: selectedRecepcionAssetIds
      });

      closeRecepcionModal();
      fetchInventoryData();
      fetchActivosPage(pageActivos, debouncedSearch, filterEstado);
      fetchRecepcionesPage(pageRecepciones, debouncedSearch);

      // Show document modal with both PDF buttons if documents were generated
      if (created && created.id) {
        setSuccessDocModal({
          title: '¡Recepción de Bodega Registrada!',
          code: created.codigo_recepcion || 'AR REGISTRADA',
          message: 'Se procesó la recepción de los activos devueltos y reingreso a bodega.',
          buttons: [
            {
              label: 'Ver Acta de Recepción / Devolución (AR)',
              url: inventoryService.getActaRecepcionUrl(created.id),
              variant: 'primary'
            },
            {
              label: 'Ver Acta de Reingreso a Bodega (IB)',
              url: inventoryService.getActaIngresoDevolucionUrl(created.id),
              variant: 'secondary'
            }
          ]
        });
      } else {
        showAlert('Los activos seleccionados han sido enviados a Mantenimiento exitosamente.');
      }
    } catch (err: any) {
      showAlert('Error al registrar recepción: ' + (err.response?.data?.detail || err.message));
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
    return importTypes;
  };

  const assignedPersona = selectedActivo ? personas.find(p => p.id === selectedActivo.persona_id || p.id === (selectedActivo as any).custodio_id || p.id === (selectedActivo as any).egreso_custodio_id) : null;
  const latestMov = movimientos.length > 0 ? movimientos[0] : null;

  const drawerCustodioNombre = selectedActivo ? (
    selectedActivo.persona_nombre || 
    assignedPersona?.nombre || 
    latestMov?.hacia_persona_nombre || 
    (latestMov as any)?.persona_recibe_nombre || 
    (latestMov as any)?.persona_entrega_nombre || null
  ) : null;

  const drawerCustodioCedula = selectedActivo ? (selectedActivo.persona_cedula || assignedPersona?.cedula || (latestMov as any)?.persona_recibe_cedula) : null;
  const drawerCustodioCargo = selectedActivo ? (selectedActivo.persona_cargo || assignedPersona?.cargo) : null;
  const drawerCustodioDepartamento = selectedActivo ? (selectedActivo.persona_departamento || assignedPersona?.departamento) : null;

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
          Suministros de TI
        </button>
        <button 
          className={`tab-btn ${activeTab === 'recepciones' ? 'active' : ''}`}
          onClick={() => { setActiveTab('recepciones'); setSearchQuery(''); }}
        >
          Recepciones y Devoluciones
        </button>
        {(user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || user?.rol === 'TECNICO') && (
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
                  ? "Buscar por código, marca, serial, responsable, sede..." 
                  : activeTab === 'recepciones'
                    ? "Buscar por código de recepción, custodio o área..."
                    : "Buscar consumibles..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            {activeTab === 'activos' && (
              <>
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
              </>
            )}
          </div>

          {(user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || user?.rol === 'TECNICO') && (
            <div className="controls-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  setImportFile(null);
                  setImportSummary(null);
                  setImportBodegaName('');
                  setImportEmpresaId(0);
                  const filtered = importTypes.filter(t => {
                    if (activeTab === 'activos') {
                      return t.nombre === 'Bodega' || t.nombre === 'Asignado a Usuarios' || t.nombre === 'Servidores e Infraestructura';
                    }
                    if (activeTab === 'consumibles') {
                      return t.nombre === 'Consumibles y Suministros';
                    }
                    return true;
                  });
                  if (activeTab === 'consumibles') {
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
                <>
                  <button className="btn btn-primary" onClick={() => {
                    resetEgresoModalState();
                    setShowEgresoModal(true);
                  }}>
                    + Registrar Asignación
                  </button>
                  <button className="btn btn-primary" onClick={() => {
                    setAssetEmpresaId(0);
                    setAssetTipoEquipoId(0);
                    setAssetCodigo('');
                    setAssetNroOrdenCompra('');
                    setAssetNroFactura('');
                    setAssetNroSolicitudPago('');
                    setAssetDescripcion('');
                    setExtraAssets([]);
                    setShowCreateAssetModal(true);
                  }}>
                    + Registrar Nuevo Ingreso
                  </button>
                </>
              )}
              {activeTab === 'recepciones' && (
                <button className="btn btn-primary" onClick={() => {
                  resetRecepcionModalState();
                  setShowRecepcionModal(true);
                }}>
                  + Ingresar Recepción
                </button>
              )}
              {activeTab === 'consumibles' && (
                <button className="btn btn-primary" onClick={handleOpenCreateSuministro}>
                  + Registrar Suministro
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
                        <span className="asset-brand text-muted">{a.empresa_nombre || 'N/A'}{a.sucursal_nombre ? ` (${a.sucursal_nombre})` : ''}</span>
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
                      {(() => {
                        const rowPersonaName = a.persona_nombre || personas.find(p => p.id === a.persona_id || p.id === (a as any).custodio_id || p.id === (a as any).egreso_custodio_id)?.nombre;
                        if (rowPersonaName) {
                          return (
                            <span className="holder-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                              {rowPersonaName}
                            </span>
                          );
                        }
                        return (
                          <span className="holder-badge-bodega" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                            {a.bodega_nombre || 'Bodega Central'}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleOpenDetail(a)}>
                          Ver Ficha
                        </button>
                        {a.estado === 'Mantenimiento' && (
                          <button 
                            className="btn" 
                            style={{ padding: '6px 12px', fontSize: '12px', background: '#d97706', borderColor: '#b45309', color: '#ffffff', fontWeight: '600', borderRadius: '6px' }} 
                            onClick={() => handleOpenMantenimientoModal(a)}
                          >
                            Procesar Mantenimiento
                          </button>
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
      ) : activeTab === 'consumibles' ? (
        /* TAB 2: SUMINISTROS DE TI (TABLA ESTRUCTURADA) */
        filteredConsumibles.length === 0 ? (
          <div className="empty-panel glass-panel text-center py-5">
            <span className="empty-big-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-dim)' }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </span>
            <h3>No se encontraron suministros de TI</h3>
            <p className="text-muted">Utiliza el botón "+ Registrar Suministro" para agregar nuevos ítems de consumo en tus sedes.</p>
          </div>
        ) : (
          <div className="assets-table-container glass-panel">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>CÓDIGO / NOMBRE</th>
                  <th>SEDE / UBICACIÓN</th>
                  <th>SERIAL / N° PARTE</th>
                  <th>UNIDAD / PRECIO</th>
                  <th>STOCK ACTUAL</th>
                  <th>MÍNIMO / ÚLTIMO RESTOCK</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsumibles.map((c) => {
                  const isLowStock = c.stock_actual <= c.stock_minimo;
                  return (
                    <tr key={c.id} className="asset-row animate-slide-up">
                      <td>
                        <div className="asset-code-group">
                          <span className="asset-code">{c.codigo || `SUM-${c.id}`}</span>
                          <span className="asset-brand" style={{ fontWeight: '600' }}>{c.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className="holder-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                          {c.empresa_nombre || 'General'}
                        </span>
                      </td>
                      <td className="asset-serial">{c.serial || 'N/A'}</td>
                      <td>
                        <div className="asset-code-group">
                          <span style={{ fontSize: '12px', fontWeight: '500' }}>{c.unidad_medida || 'Unidades'}</span>
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            {c.precio_unitario ? `$${Number(c.precio_unitario).toFixed(2)}` : 'Sin precio'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: isLowStock ? '#dc2626' : '#0f172a' }}>
                            {c.stock_actual}
                          </span>
                          {isLowStock && (
                            <span className="badge badge-state-baja" style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', fontSize: '10px' }}>
                              Stock Mínimo
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="asset-code-group">
                          <span className="text-muted" style={{ fontSize: '12px' }}>Mínimo: {c.stock_minimo}</span>
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            {c.fecha_restock ? formatLocalDateSimple(c.fecha_restock) : 'Sin restock'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="btn"
                            style={{ padding: '4px 10px', fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleDirectUsar(c)}
                            title="Descontar 1 unidad del stock"
                          >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Usar
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '4px 10px', fontSize: '11px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleOpenRestock(c)}
                            title="Aumentar inventario (Reabastecer)"
                          >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Restock
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleOpenFicha(c)}
                            title="Ver ficha y bitácora de movimientos"
                          >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            Ficha
                          </button>
                          {(user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || user?.rol === 'TECNICO') && (
                            <>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                                onClick={() => handleOpenEditSuministro(c)}
                                title="Editar suministro"
                              >
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              </button>
                              <button
                                className="btn"
                                style={{ padding: '4px 8px', fontSize: '11px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center' }}
                                onClick={() => handleDeleteSuministro(c.id)}
                                title="Eliminar suministro"
                              >
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {renderPagination(pageConsumibles, totalConsumibles, 10, setPageConsumibles)}
          </div>
        )
      ) : activeTab === 'recepciones' ? (
        /* TAB 3: RECEPCIONES */
        recepciones.length === 0 ? (
          <div className="empty-panel glass-panel text-center py-5">
            <span className="empty-big-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-dim)' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            </span>
            <h3>No se encontraron recepciones de bodega</h3>
            <p className="text-muted">Utiliza el botón "+ Ingresar Recepción" para registrar una devolución de activos.</p>
          </div>
        ) : (
          <div className="assets-table-container glass-panel">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>CÓDIGO RECEPCIÓN</th>
                  <th>SEDE / EMPRESA</th>
                  <th>DEVOLVIÓ (CUSTODIO)</th>
                  <th>RECIBIÓ (SOPORTE TI)</th>
                  <th>ÁREA</th>
                  <th>FECHA RECEPCIÓN</th>
                  <th>CANT. ACTIVOS</th>
                </tr>
              </thead>
              <tbody>
                {recepciones.map((r) => (
                  <tr key={r.id} className="table-row-hover">
                    <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{r.codigo_recepcion}</td>
                    <td>{r.empresa_nombre || '-'}</td>
                    <td>{r.persona_entrega_nombre || '-'}</td>
                    <td>{r.recibido_por_nombre || 'Soporte TI'}</td>
                    <td>{r.area || '-'}</td>
                    <td>{r.fecha_recepcion ? r.fecha_recepcion.split('T')[0] : (r.created_at ? r.created_at.split('T')[0] : '-')}</td>
                    <td>
                      <span className="badge badge-process">{r.cantidad_activos || 0} ítems</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {renderPagination(pageRecepciones, totalRecepciones, 10, setPageRecepciones)}
          </div>
        )
      ) : (
        /* TAB 4: GESTIÓN TIPOS EQUIPO (CRUD) */
        <div className="tipo-equipos-layout animate-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Create form */}
          <div className="tipo-form-box glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
            <h3>{editingTipoEquipo ? 'Editar Tipo de Equipo' : 'Registrar Tipo de Equipo'}</h3>
            <p className="text-muted font-xs mb-3">Los tipos de equipo sirven para segmentar los activos y autogenerar códigos.</p>
            
            {editingTipoEquipo ? (
              <form onSubmit={handleUpdateTipoEquipo} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Nombre del Tipo de Equipo *</label>
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
                  <label className="form-label">Nombre del Tipo de Equipo *</label>
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
            <div className="tipo-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0 }}>Tipos de Equipos Registrados</h3>
              <div className="search-tipo-container" style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar tipo..."
                  value={searchTipoEquipo}
                  onChange={(e) => setSearchTipoEquipo(e.target.value)}
                  style={{ paddingLeft: '32px', height: '34px', fontSize: '12px' }}
                />
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--color-text-dim)' }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            </div>

            {tipoEquipos.length === 0 ? (
              <p className="text-muted text-center py-5">No hay tipos de equipo guardados.</p>
            ) : (
              <>
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

                {/* Pagination Footer for Tipos de Equipo */}
                {Math.ceil(totalTipoEquipos / 10) > 1 && (
                  <div
                    className="pagination-container"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "12px",
                      marginTop: "16px",
                      padding: "10px 0",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={pageTipoEquipos === 1}
                      onClick={() => setPageTipoEquipos((p) => Math.max(1, p - 1))}
                      style={{ cursor: pageTipoEquipos === 1 ? "not-allowed" : "pointer", padding: "4px 12px", fontSize: "12px" }}
                    >
                      Anterior
                    </button>
                    <span style={{ fontSize: "12.5px", color: "var(--color-text)", fontWeight: "500" }}>
                      Página {pageTipoEquipos} de {Math.ceil(totalTipoEquipos / 10)} ({totalTipoEquipos} registros)
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={pageTipoEquipos >= Math.ceil(totalTipoEquipos / 10)}
                      onClick={() => setPageTipoEquipos((p) => Math.min(Math.ceil(totalTipoEquipos / 10), p + 1))}
                      style={{ cursor: pageTipoEquipos >= Math.ceil(totalTipoEquipos / 10) ? "not-allowed" : "pointer", padding: "4px 12px", fontSize: "12px" }}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
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
                {!isEditingAsset && (user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || user?.rol === 'TECNICO') && (
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
                        {(allTipoEquipos.length > 0 ? allTipoEquipos : tipoEquipos).map(te => (
                          <option key={te.id} value={te.id}>{te.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group half">
                      <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>SEDE / EMPRESA *</label>
                      <select 
                        className="form-control" 
                        value={editAssetEmpresaId} 
                        onChange={(e) => {
                          setEditAssetEmpresaId(Number(e.target.value));
                          setEditAssetSucursalId(0);
                        }}
                        required
                      >
                        <option value="0">Seleccionar...</option>
                        {empresas.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const selectedEmp = empresas.find(e => e.id === editAssetEmpresaId);
                    if (selectedEmp && selectedEmp.sucursales && selectedEmp.sucursales.length > 0) {
                      return (
                        <div className="form-group">
                          <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>SUCURSAL *</label>
                          <select
                            className="form-control"
                            value={editAssetSucursalId}
                            onChange={(e) => setEditAssetSucursalId(Number(e.target.value))}
                          >
                            <option value="0">Todas las Sucursales</option>
                            {selectedEmp.sucursales.map(s => (
                              <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="form-group">
                    <label className="form-label font-bold text-xs" style={{ color: '#475569' }}>BODEGA *</label>
                    <select
                      className="form-control"
                      value={editAssetBodegaId}
                      onChange={(e) => setEditAssetBodegaId(Number(e.target.value))}
                      required
                      disabled={editAssetEmpresaId === 0}
                    >
                      <option value="0">Seleccionar bodega...</option>
                      {bodegas
                        .filter(b => b.empresa_id === editAssetEmpresaId)
                        .map(b => (
                          <option key={b.id} value={b.id}>{b.nombre}</option>
                        ))
                      }
                    </select>
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
                  {/* Banner de Mantenimiento Activo */}
                  {selectedActivo.estado === 'Mantenimiento' && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(245, 158, 11, 0.08) 100%)',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#b45309' }}>Equipo en Mantenimiento / Soporte</div>
                          {selectedActivo.ultimo_custodio_nombre && (
                            <div style={{ fontSize: '11.5px', color: '#78350f' }}>
                              Custodio de Origen: <strong>{selectedActivo.ultimo_custodio_nombre}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        className="btn"
                        style={{ background: '#d97706', borderColor: '#b45309', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '6px', whiteSpace: 'nowrap' }}
                        onClick={() => handleOpenMantenimientoModal(selectedActivo)}
                      >
                        Procesar Salida
                      </button>
                    </div>
                  )}

                  {/* Custodio / Asignación Banner */}
                  {(selectedActivo.estado === 'Asignado' || drawerCustodioNombre) && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.08) 100%)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'var(--color-primary, #6366f1)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)'
                      }}>
                        {drawerCustodioNombre ? drawerCustodioNombre.charAt(0).toUpperCase() : (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 'bold', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '0.6px' }}>
                          Asignado a (Custodio Actual)
                        </span>
                        <span style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a' }}>
                          {drawerCustodioNombre || 'Sin nombre asignado'}
                        </span>
                        {(drawerCustodioCargo || drawerCustodioCedula || drawerCustodioDepartamento) && (
                          <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: '500' }}>
                            {[
                              drawerCustodioCargo,
                              drawerCustodioDepartamento,
                              drawerCustodioCedula ? `C.I: ${drawerCustodioCedula}` : null
                            ].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

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
                        <span style={{ color: '#64748b' }}>Asignado / Custodio:</span>
                        {drawerCustodioNombre ? (
                          <strong style={{ color: '#2563eb' }}>{drawerCustodioNombre}</strong>
                        ) : selectedActivo.estado === 'Asignado' ? (
                          <strong style={{ color: '#2563eb' }}>Asignado</strong>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>En Stock / Bodega</span>
                        )}
                      </div>
                        <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                          <span style={{ color: '#64748b' }}>Tipo Equipo:</span>
                          <strong>{selectedActivo.tipo_equipo_nombre || 'N/A'}</strong>
                        </div>
                      <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#64748b' }}>Sede (Ubicación):</span>
                        <strong>{selectedActivo.empresa_nombre || 'N/A'}</strong>
                      </div>
                      {selectedActivo.bodega_nombre && (
                        <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                          <span style={{ color: '#64748b' }}>Bodega:</span>
                          <strong>{selectedActivo.bodega_nombre}</strong>
                        </div>
                      )}
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
                          <strong>{formatLocalDateSimple(selectedActivo.fecha_compra)}</strong>
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
                                  <span style={{ color: '#94a3b8', textTransform: 'none', fontWeight: 'normal' }}>{formatLocalDateSimple(m.fecha)}</span>
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
                                  <span style={{ color: '#d97706', textTransform: 'none', fontWeight: 'normal' }}>{formatLocalDateSimple(hc.fecha)}</span>
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

      {/* RECEPCIÓN DE ACTIVOS DE BODEGA MODAL */}
      {showRecepcionModal && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '820px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h2>Ingresar Recepción de Activos (Devolución)</h2>
              <button className="modal-close-btn" onClick={closeRecepcionModal}>×</button>
            </div>

            <form onSubmit={handleCreateRecepcion} className="modal-form" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem', color: 'var(--color-primary)' }}>1. Datos de Origen (Quién Devuelve)</h4>
                
                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">SEDE / EMPRESA *</label>
                    <select
                      className="form-control"
                      value={recepcionEmpresaId}
                      onChange={(e) => {
                        setRecepcionEmpresaId(Number(e.target.value));
                        setRecepcionSucursalId(0);
                        setRecepcionPersonaId(0);
                        setRecepcionPersonaSearchText('');
                        setShowRecepcionPersonaDropdown(false);
                      }}
                      required
                    >
                      <option value="0">Seleccionar sede...</option>
                      {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const selectedEmp = empresas.find(e => e.id === recepcionEmpresaId);
                    if (selectedEmp && selectedEmp.sucursales && selectedEmp.sucursales.length > 0) {
                      return (
                        <div className="form-group half">
                          <label className="form-label">SUCURSAL *</label>
                          <select
                            className="form-control"
                            value={recepcionSucursalId}
                            onChange={(e) => setRecepcionSucursalId(Number(e.target.value))}
                          >
                            <option value="0">Todas las Sucursales</option>
                            {selectedEmp.sucursales.map(s => (
                              <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div ref={recepcionPersonaRef} className="form-group half" style={{ position: 'relative', width: '100%', opacity: recepcionEmpresaId <= 0 ? 0.65 : 1 }}>
                    <label className="form-label">EMPLEADO / CUSTODIO QUE DEVUELVE *</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={recepcionEmpresaId <= 0 ? "Primero selecciona una Sede / Empresa..." : "Buscar por nombre o cédula..."}
                        value={recepcionPersonaSearchText}
                        disabled={recepcionEmpresaId <= 0}
                        onChange={(e) => {
                          if (recepcionEmpresaId <= 0) return;
                          setRecepcionPersonaSearchText(e.target.value);
                          setShowRecepcionPersonaDropdown(true);
                          if (recepcionPersonaId > 0) {
                            setRecepcionPersonaId(0);
                          }
                        }}
                        onFocus={() => {
                          if (recepcionEmpresaId > 0) setShowRecepcionPersonaDropdown(true);
                        }}
                        style={{ paddingRight: '32px', width: '100%', cursor: recepcionEmpresaId <= 0 ? 'not-allowed' : 'text' }}
                        required={recepcionPersonaId <= 0}
                      />
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: '#64748b'
                        }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>

                    {showRecepcionPersonaDropdown && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          width: '100%',
                          zIndex: 2000,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          marginTop: '4px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
                        }}
                      >
                        {personas
                          .filter(p => !recepcionPersonaSearchText || p.nombre.toLowerCase().includes(recepcionPersonaSearchText.toLowerCase()) || (p.cedula && p.cedula.includes(recepcionPersonaSearchText)) || (p.cargo && p.cargo.toLowerCase().includes(recepcionPersonaSearchText.toLowerCase())))
                          .length === 0 ? (
                            <div style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px', textAlign: 'center' }}>
                              No se encontraron empleados coincidentes
                            </div>
                          ) : (
                            personas
                              .filter(p => !recepcionPersonaSearchText || p.nombre.toLowerCase().includes(recepcionPersonaSearchText.toLowerCase()) || (p.cedula && p.cedula.includes(recepcionPersonaSearchText)) || (p.cargo && p.cargo.toLowerCase().includes(recepcionPersonaSearchText.toLowerCase())))
                              .map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setRecepcionPersonaId(p.id);
                                    setRecepcionPersonaSearchText(`${p.nombre} (${p.cargo || p.departamento || 'Sin cargo'})`);
                                    setShowRecepcionPersonaDropdown(false);
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f1f5f9',
                                    background: recepcionPersonaId === p.id ? '#eff6ff' : '#ffffff',
                                    fontSize: '12.5px',
                                    transition: 'background 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (recepcionPersonaId !== p.id) e.currentTarget.style.background = '#f8fafc';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (recepcionPersonaId !== p.id) e.currentTarget.style.background = '#ffffff';
                                  }}
                                >
                                  <strong style={{ color: '#0f172a', display: 'block', fontSize: '13px' }}>{p.nombre}</strong>
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    {p.cargo || p.departamento || 'Sin cargo'} • {p.empresa_nombre || 'Sede'} • C.I. {p.cedula || 'N/A'}
                                  </span>
                                </div>
                              ))
                          )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">ÁREA / DEPARTAMENTO</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Sistemas, Operaciones, Comercial"
                      value={recepcionArea}
                      onChange={(e) => setRecepcionArea(e.target.value)}
                    />
                  </div>

                  <div className="form-group half">
                    <label className="form-label">BODEGA DESTINO</label>
                    <select
                      className="form-control"
                      value={recepcionBodegaId}
                      onChange={(e) => setRecepcionBodegaId(Number(e.target.value))}
                    >
                      <option value="0">Seleccionar bodega de la sede...</option>
                      {bodegas
                        .filter(b => recepcionEmpresaId <= 0 || b.empresa_id === recepcionEmpresaId)
                        .map(b => (
                          <option key={b.id} value={b.id}>{b.nombre}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">ESTADO FINAL DEL ACTIVO (DESTINO) *</label>
                    <select
                      className="form-control"
                      value={recepcionEstadoDestino}
                      onChange={(e) => setRecepcionEstadoDestino(e.target.value as any)}
                      required
                    >
                      <option value="Stock">Stock (Bodega - Disponible)</option>
                      <option value="Mantenimiento">Mantenimiento (En Reparación)</option>
                      <option value="Baja">Baja (Dado de Baja / Desincorporado)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* LISTA DE ACTIVOS ASIGNADOS */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                    2. Selección de Activos a Recibir ({selectedRecepcionAssetIds.length} seleccionados)
                  </h4>
                  {personaAssignedActivos.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (selectedRecepcionAssetIds.length === personaAssignedActivos.length) {
                          setSelectedRecepcionAssetIds([]);
                        } else {
                          setSelectedRecepcionAssetIds(personaAssignedActivos.map(a => a.id));
                        }
                      }}
                    >
                      {selectedRecepcionAssetIds.length === personaAssignedActivos.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                    </button>
                  )}
                </div>

                {recepcionEmpresaId <= 0 ? (
                  <p className="text-muted font-xs text-center py-3">Selecciona la Sede de la cual se devolverán los activos para generar su acta de recepción.</p>
                ) : recepcionPersonaId <= 0 ? (
                  <p className="text-muted font-xs text-center py-3">Selecciona un empleado arriba para cargar sus activos asignados en esta sede.</p>
                ) : personaAssignedActivos.length === 0 ? (
                  <p className="text-muted font-xs text-center py-3">El empleado no tiene activos asignados registrados en la sede seleccionada.</p>
                ) : (
                  <>
                    {/* FILTROS EN TIEMPO REAL PARA LOS ACTIVOS */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px', width: '100%', alignItems: 'center' }}>
                      <div style={{ flex: '1', minWidth: '180px' }}>
                        <select
                          className="form-control"
                          value={recepcionTipoEquipoId}
                          onChange={(e) => setRecepcionTipoEquipoId(Number(e.target.value))}
                          style={{ height: '38px', width: '100%' }}
                        >
                          <option value="0">Todos los Tipos de Equipo</option>
                          {(allTipoEquipos.length > 0 ? allTipoEquipos : tipoEquipos).map(te => (
                            <option key={te.id} value={te.id}>{te.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '2', minWidth: '240px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Buscar por código, serial, marca o modelo..."
                          value={recepcionAssetSearchText}
                          onChange={(e) => setRecepcionAssetSearchText(e.target.value)}
                          style={{ height: '38px', width: '100%' }}
                        />
                      </div>
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                      <table className="inventario-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>CÓDIGO</th>
                            <th>EQUIPO</th>
                            <th>SEDE ORIGEN</th>
                            <th>MARCA / MODELO</th>
                            <th>SERIE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {personaAssignedActivos
                            .filter(a => {
                              const matchTipo = recepcionTipoEquipoId <= 0 || a.tipo_equipo_id === recepcionTipoEquipoId;
                              const searchLower = recepcionAssetSearchText.toLowerCase();
                              const matchText = !searchLower ||
                                a.codigo.toLowerCase().includes(searchLower) ||
                                (a.serial && a.serial.toLowerCase().includes(searchLower)) ||
                                (a.marca && a.marca.toLowerCase().includes(searchLower)) ||
                                (a.modelo && a.modelo.toLowerCase().includes(searchLower)) ||
                                (a.tipo_equipo_nombre && a.tipo_equipo_nombre.toLowerCase().includes(searchLower));
                              return matchTipo && matchText;
                            })
                            .map((a) => {
                              const isSelected = selectedRecepcionAssetIds.includes(a.id);
                              return (
                                <tr key={a.id} className="table-row-hover" style={{ cursor: 'pointer' }} onClick={() => {
                                  if (isSelected) {
                                    setSelectedRecepcionAssetIds(selectedRecepcionAssetIds.filter(id => id !== a.id));
                                  } else {
                                    setSelectedRecepcionAssetIds([...selectedRecepcionAssetIds, a.id]);
                                  }
                                }}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                    />
                                  </td>
                                  <td style={{ fontWeight: '700' }}>{a.codigo}</td>
                                  <td>{a.tipo_equipo_nombre || '-'}</td>
                                  <td><span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' }}>{a.empresa_nombre || 'General'}</span></td>
                                  <td>{a.marca} {a.modelo}</td>
                                  <td>{a.serial || 'NA'}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">OBSERVACIONES / MOTIVO DE DEVOLUCIÓN</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Ej: Salida de personal, renovación de equipo informático, etc."
                  value={recepcionObservaciones}
                  onChange={(e) => setRecepcionObservaciones(e.target.value)}
                ></textarea>
              </div>

              <div className="modal-actions" style={{ flexShrink: 0, marginTop: 'auto' }}>
                <button type="button" className="btn btn-secondary" onClick={closeRecepcionModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || selectedRecepcionAssetIds.length === 0}>
                  {isSubmitting ? 'Procesando...' : 'Generar y Registrar Recepción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN HARDWARE MODAL */}
      {showAssignModal && selectedActivo && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>Asignar Activo {selectedActivo.codigo}</h2>
              <button className="modal-close-btn" onClick={closeAssignModal}>×</button>
            </div>

            <form onSubmit={handleAsignar} className="modal-form">
              <div ref={assignPersonaRef} className="form-group" style={{ position: 'relative', width: '100%' }}>
                <label className="form-label">SELECCIONAR EMPLEADO SOLICITANTE *</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por nombre o cédula..."
                    value={assignPersonaSearchText}
                    onChange={(e) => {
                      setAssignPersonaSearchText(e.target.value);
                      setShowAssignPersonaDropdown(true);
                      if (selectedPersonaId > 0) {
                        setSelectedPersonaId(0);
                      }
                    }}
                    onFocus={() => setShowAssignPersonaDropdown(true)}
                    style={{ paddingRight: '32px', width: '100%', cursor: 'text' }}
                    required={selectedPersonaId <= 0}
                  />
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#64748b'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {showAssignPersonaDropdown && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      width: '100%',
                      zIndex: 2000,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      marginTop: '4px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
                    }}
                  >
                    {personas
                      .filter(p => !assignPersonaSearchText || p.nombre.toLowerCase().includes(assignPersonaSearchText.toLowerCase()) || (p.cedula && p.cedula.includes(assignPersonaSearchText)) || (p.cargo && p.cargo.toLowerCase().includes(assignPersonaSearchText.toLowerCase())))
                      .length === 0 ? (
                        <div style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px', textAlign: 'center' }}>
                          No se encontraron empleados coincidentes
                        </div>
                      ) : (
                        personas
                          .filter(p => !assignPersonaSearchText || p.nombre.toLowerCase().includes(assignPersonaSearchText.toLowerCase()) || (p.cedula && p.cedula.includes(assignPersonaSearchText)) || (p.cargo && p.cargo.toLowerCase().includes(assignPersonaSearchText.toLowerCase())))
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedPersonaId(p.id);
                                setAssignPersonaSearchText(`${p.nombre} (${p.cargo || p.departamento || 'Sin cargo'})`);
                                setShowAssignPersonaDropdown(false);
                              }}
                              style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f1f5f9',
                                background: selectedPersonaId === p.id ? '#eff6ff' : '#ffffff',
                                fontSize: '12.5px',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedPersonaId !== p.id) e.currentTarget.style.background = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                if (selectedPersonaId !== p.id) e.currentTarget.style.background = '#ffffff';
                              }}
                            >
                              <strong style={{ color: '#0f172a', display: 'block', fontSize: '13px' }}>{p.nombre}</strong>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {p.cargo || p.departamento || 'Sin cargo'} • {p.empresa_nombre || 'Sede'} • C.I. {p.cedula || 'N/A'}
                              </span>
                            </div>
                          ))
                      )}
                  </div>
                )}
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
                <button type="button" className="btn btn-secondary" onClick={closeAssignModal}>Cancelar</button>
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

      {/* PROCESAR MANTENIMIENTO MODAL */}
      {showMantenimientoModal && mantenimientoActivo && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Procesar Salida de Mantenimiento</h2>
              <button className="modal-close-btn" onClick={() => { setShowMantenimientoModal(false); setMantenimientoActivo(null); }}>×</button>
            </div>

            <form onSubmit={handleProcesarMantenimiento} className="modal-form">
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  Activo: {mantenimientoActivo.codigo} - {mantenimientoActivo.marca} {mantenimientoActivo.modelo}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Serial: <strong>{mantenimientoActivo.serial || 'N/A'}</strong> | Sede: <strong>{mantenimientoActivo.empresa_nombre || 'N/A'}</strong>
                </div>
                {mantenimientoActivo.ultimo_custodio_nombre && (
                  <div style={{ fontSize: '12px', color: '#1e293b', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
                    Custodio de Origen registrado: <strong>{mantenimientoActivo.ultimo_custodio_nombre}</strong>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700' }}>SELECCIONAR DESTINO / ACCIÓN FINAL *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: mantenimientoAccion === 'Reasignar' ? '#eff6ff' : '#ffffff', border: `1px solid ${mantenimientoAccion === 'Reasignar' ? '#3b82f6' : '#cbd5e1'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                    <input 
                      type="radio" 
                      name="accion_mantenimiento" 
                      checked={mantenimientoAccion === 'Reasignar'} 
                      onChange={() => setMantenimientoAccion('Reasignar')} 
                    />
                    <span><strong>Re-asignar a su Custodio</strong> (Operativo de nuevo)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: mantenimientoAccion === 'Stock' ? '#eff6ff' : '#ffffff', border: `1px solid ${mantenimientoAccion === 'Stock' ? '#3b82f6' : '#cbd5e1'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                    <input 
                      type="radio" 
                      name="accion_mantenimiento" 
                      checked={mantenimientoAccion === 'Stock'} 
                      onChange={() => setMantenimientoAccion('Stock')} 
                    />
                    <span><strong>Retornar a Stock en Bodega</strong> (Reparado y disponible)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: mantenimientoAccion === 'Baja' ? '#fef2f2' : '#ffffff', border: `1px solid ${mantenimientoAccion === 'Baja' ? '#ef4444' : '#cbd5e1'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                    <input 
                      type="radio" 
                      name="accion_mantenimiento" 
                      checked={mantenimientoAccion === 'Baja'} 
                      onChange={() => setMantenimientoAccion('Baja')} 
                    />
                    <span><strong>Dar de Baja</strong> (Sin solución / Reparación no factible)</span>
                  </label>
                </div>
              </div>

              {mantenimientoAccion === 'Reasignar' && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', display: 'block' }}>
                    Custodio al que se Re-asignará:
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '13.5px', marginTop: '3px', display: 'block' }}>
                    {mantenimientoActivo.ultimo_custodio_nombre ? (
                      mantenimientoActivo.ultimo_custodio_nombre
                    ) : (
                      'Sin custodio de origen registrado (asigna mediante Egreso si aplica)'
                    )}
                  </strong>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">INFORME TÉCNICO / OBSERVACIONES DE REPARACIÓN *</label>
                <textarea
                  className="form-control textarea-field"
                  placeholder="Detalle el diagnóstico técnico, repuestos cambiados o motivo de la baja..."
                  rows={3}
                  value={mantenimientoObs}
                  onChange={(e) => setMantenimientoObs(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowMantenimientoModal(false); setMantenimientoActivo(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Procesando...' : 'Finalizar Mantenimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ASSET / INGRESO DE BODEGA MODAL */}
      {showCreateAssetModal && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Registrar Nuevo Ingreso de Bodega</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateAssetModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateAsset} className="modal-form">
              {/* DATOS DE LA COMPRA / INGRESO */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem' }}>Datos Generales del Ingreso / Compra</h4>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">SEDE / UBICACIÓN *</label>
                    <select 
                      className="form-control" 
                      value={assetEmpresaId} 
                      onChange={(e) => {
                        setAssetEmpresaId(Number(e.target.value));
                        setAssetSucursalId(0);
                      }}
                      required
                    >
                      <option value="0">Seleccionar sede...</option>
                      {allowedEmpresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const selectedEmp = empresas.find(e => e.id === assetEmpresaId);
                    if (selectedEmp && selectedEmp.sucursales && selectedEmp.sucursales.length > 0) {
                      return (
                        <div className="form-group half">
                          <label className="form-label">SUCURSAL *</label>
                          <select
                            className="form-control"
                            value={assetSucursalId}
                            onChange={(e) => setAssetSucursalId(Number(e.target.value))}
                          >
                            <option value="0">Todas las Sucursales</option>
                            {selectedEmp.sucursales.map(s => (
                              <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div ref={assetProveedorRef} className="form-group half" style={{ position: 'relative' }}>
                    <label className="form-label">PROVEEDOR TI (OPCIONAL)</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar proveedor por nombre..."
                        value={assetProveedorSearchText}
                        onChange={(e) => {
                          setAssetProveedorSearchText(e.target.value);
                          setShowAssetProveedorDropdown(true);
                          if (assetProveedorId > 0) {
                            setAssetProveedorId(0);
                          }
                        }}
                        onFocus={() => setShowAssetProveedorDropdown(true)}
                        style={{ paddingRight: '32px', width: '100%', cursor: 'text' }}
                      />
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: '#64748b'
                        }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>

                    {showAssetProveedorDropdown && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          width: '100%',
                          zIndex: 2000,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          marginTop: '4px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
                        }}
                      >
                        {proveedores
                          .filter(p => !assetProveedorSearchText || p.nombre.toLowerCase().includes(assetProveedorSearchText.toLowerCase()))
                          .length === 0 ? (
                            <div style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px', textAlign: 'center' }}>
                              No se encontraron proveedores coincidentes
                            </div>
                          ) : (
                            proveedores
                              .filter(p => !assetProveedorSearchText || p.nombre.toLowerCase().includes(assetProveedorSearchText.toLowerCase()))
                              .map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setAssetProveedorId(p.id);
                                    setAssetProveedorSearchText(p.nombre);
                                    setShowAssetProveedorDropdown(false);
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f1f5f9',
                                    background: assetProveedorId === p.id ? '#eff6ff' : '#ffffff',
                                    fontSize: '12.5px',
                                    transition: 'background 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (assetProveedorId !== p.id) e.currentTarget.style.background = '#f8fafc';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (assetProveedorId !== p.id) e.currentTarget.style.background = '#ffffff';
                                  }}
                                >
                                  <strong style={{ color: '#0f172a', display: 'block', fontSize: '13px' }}>{p.nombre}</strong>
                                  {(p.contacto || p.telefono || p.email) && (
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                      {p.contacto ? `Contacto: ${p.contacto}` : (p.telefono || p.email)}
                                    </span>
                                  )}
                                </div>
                              ))
                          )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">NRO. ORDEN DE COMPRA (OPCIONAL)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: OC-SC-26-0603"
                      value={assetNroOrdenCompra}
                      onChange={(e) => setAssetNroOrdenCompra(e.target.value)}
                    />
                  </div>

                  <div className="form-group half">
                    <label className="form-label">NRO. FACTURA (OPCIONAL)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nro. Factura"
                      value={assetNroFactura}
                      onChange={(e) => setAssetNroFactura(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">NRO. SOLICITUD PAGO (OPCIONAL)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nro. Solicitud de Pago"
                      value={assetNroSolicitudPago}
                      onChange={(e) => setAssetNroSolicitudPago(e.target.value)}
                    />
                  </div>

                  <div className="form-group half">
                    <label className="form-label">FECHA DE COMPRA *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={assetFechaCompra}
                      onChange={(e) => setAssetFechaCompra(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">FECHA DE INGRESO *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={assetFechaIngreso}
                      onChange={(e) => setAssetFechaIngreso(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group half">
                    <label className="form-label">BODEGA DE ALMACENAMIENTO</label>
                    <select
                      className="form-control"
                      value={assetBodegaId}
                      onChange={(e) => setAssetBodegaId(Number(e.target.value))}
                      disabled={assetEmpresaId === 0}
                    >
                      <option value="0">Bodega Por Defecto de la Sede</option>
                      {bodegas
                        .filter(b => b.empresa_id === assetEmpresaId)
                        .map(b => (
                          <option key={b.id} value={b.id}>{b.nombre}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">DESCRIPCIÓN COMPLETA DE LA COMPRA *</label>
                  <textarea
                    className="form-control textarea-field"
                    placeholder="Ej: EQUIPO DE COMPUTO PROYECTO SAP"
                    rows={2}
                    value={assetDescripcion}
                    onChange={(e) => setAssetDescripcion(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* SECCIÓN ACTIVOS DE ESTE INGRESO */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a' }}>
                    Activos a Registrar ({(assetEsLote ? assetCantidad : 1) + extraAssets.reduce((sum, ext) => sum + (ext.es_lote ? (ext.cantidad || 1) : 1), 0)})
                  </h4>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExtraAssets([...extraAssets, { tipo_equipo_id: 0, tipo_equipo_search_text: '', show_dropdown: false, marca: '', modelo: '', serial: '', especificaciones: '', es_lote: false, cantidad: 1 }])}
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    + Agregar más activos a esta compra
                  </button>
                </div>

                {/* ACTIVO #1 (PRINCIPAL) */}
                <div style={{ border: '1px solid #cbd5e1', padding: '0.8rem', borderRadius: '6px', marginBottom: '0.8rem', background: '#ffffff' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>
                    Activo #1
                  </div>
                  <div className="form-row">
                    <div ref={assetTipoEquipoRef} className="form-group half" style={{ position: 'relative' }}>
                      <label className="form-label">TIPO DE EQUIPO *</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Buscar tipo de equipo..."
                          value={assetTipoEquipoSearchText}
                          onChange={(e) => {
                            setAssetTipoEquipoSearchText(e.target.value);
                            setShowAssetTipoEquipoDropdown(true);
                            if (assetTipoEquipoId > 0) {
                              setAssetTipoEquipoId(0);
                            }
                          }}
                          onFocus={() => setShowAssetTipoEquipoDropdown(true)}
                          style={{ paddingRight: '32px', width: '100%', cursor: 'text' }}
                          required={assetTipoEquipoId <= 0}
                        />
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#64748b'
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>

                      {showAssetTipoEquipoDropdown && (
                        <div 
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            width: '100%',
                            zIndex: 2000,
                            maxHeight: '220px',
                            overflowY: 'auto',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            marginTop: '4px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
                          }}
                        >
                          {(allTipoEquipos.length > 0 ? allTipoEquipos : tipoEquipos)
                            .filter(te => !assetTipoEquipoSearchText || te.nombre.toLowerCase().includes(assetTipoEquipoSearchText.toLowerCase()))
                            .length === 0 ? (
                              <div style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px', textAlign: 'center' }}>
                                No se encontraron tipos de equipo
                              </div>
                            ) : (
                              (allTipoEquipos.length > 0 ? allTipoEquipos : tipoEquipos)
                                .filter(te => !assetTipoEquipoSearchText || te.nombre.toLowerCase().includes(assetTipoEquipoSearchText.toLowerCase()))
                                .map(te => (
                                  <div
                                    key={te.id}
                                    onClick={() => {
                                      setAssetTipoEquipoId(te.id);
                                      setAssetTipoEquipoSearchText(te.nombre);
                                      setShowAssetTipoEquipoDropdown(false);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #f1f5f9',
                                      background: assetTipoEquipoId === te.id ? '#eff6ff' : '#ffffff',
                                      fontSize: '12.5px',
                                      transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (assetTipoEquipoId !== te.id) e.currentTarget.style.background = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (assetTipoEquipoId !== te.id) e.currentTarget.style.background = '#ffffff';
                                    }}
                                  >
                                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '13px' }}>{te.nombre}</strong>
                                  </div>
                                ))
                            )}
                        </div>
                      )}
                    </div>

                    <div className="form-group half">
                      <label className="form-label">MARCA *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: Dell, HP, Gazal"
                        value={assetMarca}
                        onChange={(e) => setAssetMarca(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label className="form-label">MODELO *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: 16 PRO, M101"
                        value={assetModelo}
                        onChange={(e) => setAssetModelo(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group half">
                      <label className="form-label">NÚMERO DE SERIAL (OPCIONAL / NA)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: FHV56H4 o dejar vacío para NA"
                        value={assetSerial}
                        onChange={(e) => setAssetSerial(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                    <label className="form-label">ESPECIFICACIONES TÉCNICAS</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Core i7 16GB RAM SSD 512GB..."
                      value={assetEspecificaciones}
                      onChange={(e) => setAssetEspecificaciones(e.target.value)}
                    />
                  </div>

                  {/* LOTE / CANTIDAD MULTIPLE ACTIVO #1 */}
                  <div style={{ marginTop: '0.5rem', background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1e40af', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={assetEsLote}
                        onChange={(e) => {
                          setAssetEsLote(e.target.checked);
                          if (!e.target.checked) setAssetCantidad(1);
                        }}
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <span>Ingreso por Lote / Cantidad Múltiple (Sin Seriales individuales)</span>
                    </label>

                    {assetEsLote && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#1e40af' }}>CANTIDAD *</label>
                        <input
                          type="number"
                          className="form-control"
                          min={1}
                          max={500}
                          value={assetCantidad}
                          onChange={(e) => setAssetCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                          style={{ width: '100px', fontWeight: 'bold', color: '#0f172a', background: '#ffffff', borderColor: '#93c5fd' }}
                          required
                        />
                        <span style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 500 }}>Se registrarán {assetCantidad} unidades de este activo.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTIVOS ADICIONALES (EXTRA) */}
                {extraAssets.map((extra, idx) => (
                  <div key={idx} style={{ border: '1px solid #cbd5e1', padding: '0.8rem', borderRadius: '6px', marginBottom: '0.8rem', background: '#ffffff', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>
                        Activo #{idx + 2}
                      </div>
                      <button
                        type="button"
                        onClick={() => setExtraAssets(extraAssets.filter((_, i) => i !== idx))}
                        style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Eliminar
                      </button>
                    </div>

                    <div className="form-row">
                      <div id={`extra-asset-tipo-wrapper-${idx}`} className="form-group half" style={{ position: 'relative' }}>
                        <label className="form-label">TIPO DE EQUIPO *</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar tipo de equipo..."
                            value={extra.tipo_equipo_search_text || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setExtraAssets(prev => prev.map((item, i) => i === idx ? { ...item, tipo_equipo_search_text: val, show_dropdown: true, tipo_equipo_id: 0 } : item));
                            }}
                            onFocus={() => {
                              setExtraAssets(prev => prev.map((item, i) => i === idx ? { ...item, show_dropdown: true } : item));
                            }}
                            style={{ paddingRight: '32px', width: '100%', cursor: 'text' }}
                            required={extra.tipo_equipo_id <= 0}
                          />
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                              color: '#64748b'
                            }}
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>

                        {extra.show_dropdown && (
                          <div 
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              width: '100%',
                              zIndex: 2000,
                              maxHeight: '220px',
                              overflowY: 'auto',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              marginTop: '4px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
                            }}
                          >
                            {(allTipoEquipos.length > 0 ? allTipoEquipos : tipoEquipos)
                              .filter(te => !extra.tipo_equipo_search_text || te.nombre.toLowerCase().includes(extra.tipo_equipo_search_text.toLowerCase()))
                              .length === 0 ? (
                                <div style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px', textAlign: 'center' }}>
                                  No se encontraron tipos de equipo
                                </div>
                              ) : (
                                (allTipoEquipos.length > 0 ? allTipoEquipos : tipoEquipos)
                                  .filter(te => !extra.tipo_equipo_search_text || te.nombre.toLowerCase().includes(extra.tipo_equipo_search_text.toLowerCase()))
                                  .map(te => (
                                    <div
                                      key={te.id}
                                      onClick={() => {
                                        setExtraAssets(prev => prev.map((item, i) => i === idx ? { ...item, tipo_equipo_id: te.id, tipo_equipo_search_text: te.nombre, show_dropdown: false } : item));
                                      }}
                                      style={{
                                        padding: '10px 14px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f1f5f9',
                                        background: extra.tipo_equipo_id === te.id ? '#eff6ff' : '#ffffff',
                                        fontSize: '12.5px',
                                        transition: 'background 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (extra.tipo_equipo_id !== te.id) e.currentTarget.style.background = '#f8fafc';
                                      }}
                                      onMouseLeave={(e) => {
                                        if (extra.tipo_equipo_id !== te.id) e.currentTarget.style.background = '#ffffff';
                                      }}
                                    >
                                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '13px' }}>{te.nombre}</strong>
                                    </div>
                                  ))
                              )}
                          </div>
                        )}
                      </div>

                      <div className="form-group half">
                        <label className="form-label">MARCA *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej: Dell, HP, Gazal"
                          value={extra.marca}
                          onChange={(e) => {
                            const updated = [...extraAssets];
                            updated[idx].marca = e.target.value;
                            setExtraAssets(updated);
                          }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group half">
                        <label className="form-label">MODELO *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej: 16 PRO, M101"
                          value={extra.modelo}
                          onChange={(e) => {
                            const updated = [...extraAssets];
                            updated[idx].modelo = e.target.value;
                            setExtraAssets(updated);
                          }}
                          required
                        />
                      </div>

                      <div className="form-group half">
                        <label className="form-label">NÚMERO DE SERIAL (OPCIONAL / NA)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej: FHV56H4 o dejar vacío para NA"
                          value={extra.serial}
                          onChange={(e) => {
                            const updated = [...extraAssets];
                            updated[idx].serial = e.target.value;
                            setExtraAssets(updated);
                          }}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                      <label className="form-label">ESPECIFICACIONES TÉCNICAS</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: Mouse óptico usb..."
                        value={extra.especificaciones}
                        onChange={(e) => {
                          const updated = [...extraAssets];
                          updated[idx].especificaciones = e.target.value;
                          setExtraAssets(updated);
                        }}
                      />
                    </div>

                    {/* LOTE / CANTIDAD MULTIPLE EXTRA ASSET */}
                    <div style={{ marginTop: '0.5rem', background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1e40af', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={extra.es_lote || false}
                          onChange={(e) => {
                            const updated = [...extraAssets];
                            updated[idx].es_lote = e.target.checked;
                            if (!e.target.checked) updated[idx].cantidad = 1;
                            setExtraAssets(updated);
                          }}
                          style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <span>Ingreso por Lote / Cantidad Múltiple (Sin Seriales individuales)</span>
                      </label>

                      {extra.es_lote && (
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#1e40af' }}>CANTIDAD *</label>
                          <input
                            type="number"
                            className="form-control"
                            min={1}
                            max={500}
                            value={extra.cantidad || 1}
                            onChange={(e) => {
                              const updated = [...extraAssets];
                              updated[idx].cantidad = Math.max(1, parseInt(e.target.value) || 1);
                              setExtraAssets(updated);
                            }}
                            style={{ width: '100px', fontWeight: 'bold', color: '#0f172a', background: '#ffffff', borderColor: '#93c5fd' }}
                            required
                          />
                          <span style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 500 }}>Se registrarán {extra.cantidad || 1} unidades de este activo.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateAssetModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar y Generar Acta de Ingreso'}
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
                  setImportEmpresaId(0);
                  setImportBodegaName('');
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleImportExcel} className="modal-form">
              <div className="form-group" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed rgba(99, 102, 241, 0.3)', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                <span className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary)' }}>¿NO TIENES EL FORMATO CORRECTO?</span>
                <p style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginBottom: '10px', lineHeight: '1.4' }}>
                  Descarga nuestra plantilla estándar con los campos fijos necesarios para la carga de inventario:
                </p>
                {activeTab === 'activos' ? (
                  <a 
                    href="/templates/plantilla_activos.xlsx" 
                    className="btn btn-secondary" 
                    style={{ display: 'inline-flex', width: '100%', textDecoration: 'none', justifyContent: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '600' }}
                    download
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Descargar Plantilla de Activos (.xlsx)
                  </a>
                ) : (
                  <a 
                    href="/templates/plantilla_consumibles.xlsx" 
                    className="btn btn-secondary" 
                    style={{ display: 'inline-flex', width: '100%', textDecoration: 'none', justifyContent: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '600' }}
                    download
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Descargar Plantilla de Consumibles (.xlsx)
                  </a>
                )}
              </div>
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
                <>
                  <div className="form-group animate-fade">
                    <label className="form-label">SEDE / EMPRESA DE DESTINO *</label>
                    <select 
                      className="form-control"
                      value={importEmpresaId}
                      onChange={(e) => {
                        const empId = Number(e.target.value);
                        setImportEmpresaId(empId);
                        const matchingBodegas = bodegas.filter(b => b.empresa_id === empId);
                        if (matchingBodegas.length > 0) {
                          setImportBodegaName(matchingBodegas[0].nombre);
                        } else {
                          setImportBodegaName('');
                        }
                      }}
                      required
                    >
                      <option value="0">Seleccionar sede...</option>
                      {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {importEmpresaId > 0 && (
                    <div className="form-group animate-fade">
                      <label className="form-label">BODEGA DE DESTINO *</label>
                      {bodegas.filter(b => b.empresa_id === importEmpresaId).length === 0 ? (
                        <>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ej. Bodega Central, Bodega Sistemas"
                            value={importBodegaName}
                            onChange={(e) => setImportBodegaName(e.target.value)}
                            required
                          />
                          <small className="text-muted" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            Esta sede no tiene bodegas registradas. Escribe un nombre para crear una nueva bodega.
                          </small>
                        </>
                      ) : (
                        <select
                          className="form-control"
                          value={importBodegaName}
                          onChange={(e) => setImportBodegaName(e.target.value)}
                          required
                        >
                          {bodegas.filter(b => b.empresa_id === importEmpresaId).map(b => (
                            <option key={b.id} value={b.nombre}>{b.nombre}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </>
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTRAR ASIGNACIÓN / EGRESO DE BODEGA MODAL */}
      {showEgresoModal && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Registrar Asignación (Egreso de Bodega)</h2>
              <button className="modal-close-btn" onClick={closeEgresoModal}>×</button>
            </div>

            <form onSubmit={handleCreateEgreso} className="modal-form">
              {/* DATOS GENERALES DE ASIGNACIÓN */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem' }}>Datos del Receptor y Asignación</h4>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">SEDE / UBICACIÓN *</label>
                    <select 
                      className="form-control" 
                      value={egresoEmpresaId} 
                      onChange={(e) => {
                        const empId = Number(e.target.value);
                        setEgresoEmpresaId(empId);
                        setEgresoSucursalId(0);
                        setEgresoPersonaId(0);
                        setEgresoPersonaSearchText('');
                        setSelectedEgresoAssetIds([]);
                      }}
                      required
                    >
                      <option value="0">Seleccionar sede...</option>
                      {allowedEmpresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const selectedEmp = empresas.find(e => e.id === egresoEmpresaId);
                    if (selectedEmp && selectedEmp.sucursales && selectedEmp.sucursales.length > 0) {
                      return (
                        <div className="form-group half">
                          <label className="form-label">SUCURSAL *</label>
                          <select
                            className="form-control"
                            value={egresoSucursalId}
                            onChange={(e) => setEgresoSucursalId(Number(e.target.value))}
                          >
                            <option value="0">Todas las Sucursales</option>
                            {selectedEmp.sucursales.map(s => (
                              <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div ref={egresoPersonaRef} className="form-group half" style={{ position: 'relative', width: '100%' }}>
                    <label className="form-label">USUARIO / CUSTODIO RECEPTOR *</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nombre o cédula..."
                        value={egresoPersonaSearchText}
                        onChange={(e) => {
                          setEgresoPersonaSearchText(e.target.value);
                          setShowEgresoPersonaDropdown(true);
                          if (egresoPersonaId > 0) {
                            setEgresoPersonaId(0);
                          }
                        }}
                        onFocus={() => setShowEgresoPersonaDropdown(true)}
                        style={{ paddingRight: '32px', width: '100%', cursor: 'text' }}
                        required={egresoPersonaId <= 0}
                      />
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: '#64748b'
                        }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>

                    {showEgresoPersonaDropdown && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          width: '100%',
                          zIndex: 2000,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          marginTop: '4px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
                        }}
                      >
                        {personas
                          .filter(p => !egresoPersonaSearchText || p.nombre.toLowerCase().includes(egresoPersonaSearchText.toLowerCase()) || (p.cedula && p.cedula.includes(egresoPersonaSearchText)) || (p.cargo && p.cargo.toLowerCase().includes(egresoPersonaSearchText.toLowerCase())))
                          .length === 0 ? (
                            <div style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px', textAlign: 'center' }}>
                              No se encontraron empleados coincidentes
                            </div>
                          ) : (
                            personas
                              .filter(p => !egresoPersonaSearchText || p.nombre.toLowerCase().includes(egresoPersonaSearchText.toLowerCase()) || (p.cedula && p.cedula.includes(egresoPersonaSearchText)) || (p.cargo && p.cargo.toLowerCase().includes(egresoPersonaSearchText.toLowerCase())))
                              .map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setEgresoPersonaId(p.id);
                                    setEgresoPersonaSearchText(`${p.nombre} (${p.cargo || p.departamento || 'Sin cargo'})`);
                                    setShowEgresoPersonaDropdown(false);
                                    if (p.departamento || p.cargo) {
                                      setEgresoArea(p.departamento || p.cargo || '');
                                    }
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f1f5f9',
                                    background: egresoPersonaId === p.id ? '#eff6ff' : '#ffffff',
                                    fontSize: '12.5px',
                                    transition: 'background 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (egresoPersonaId !== p.id) e.currentTarget.style.background = '#f8fafc';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (egresoPersonaId !== p.id) e.currentTarget.style.background = '#ffffff';
                                  }}
                                >
                                  <strong style={{ color: '#0f172a', display: 'block', fontSize: '13px' }}>{p.nombre}</strong>
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    {p.cargo || p.departamento || 'Sin cargo'} • {p.empresa_nombre || 'Sede'} • C.I. {p.cedula || 'N/A'}
                                  </span>
                                </div>
                              ))
                          )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">ÁREA / DEPARTAMENTO *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: SAP, Sistemas, Contabilidad"
                      value={egresoArea}
                      onChange={(e) => setEgresoArea(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group half">
                    <label className="form-label">OBSERVACIONES / MOTIVO (Opcional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Entrega de laptop de trabajo y periféricos"
                      value={egresoObservaciones}
                      onChange={(e) => setEgresoObservaciones(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN SELECCIÓN DE ACTIVOS DISPONIBLES EN STOCK (NUEVOS PRIMERO) */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem' }}>
                    Seleccionar Activos a Asignar ({selectedEgresoAssetIds.length} seleccionados)
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Ordenados: Primero los más nuevos
                  </span>
                </div>

                {/* FILTROS POR TIPO Y BÚSQUEDA DE ACTIVOS */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '0.8rem', width: '100%', alignItems: 'center' }}>
                  <div ref={egresoTipoEquipoRef} style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar Tipo de Equipo..."
                        value={egresoTipoEquipoSearchText}
                        onChange={(e) => {
                          setEgresoTipoEquipoSearchText(e.target.value);
                          setShowEgresoTipoEquipoDropdown(true);
                          if (egresoTipoEquipoId > 0) {
                            setEgresoTipoEquipoId(0);
                          }
                        }}
                        onFocus={() => setShowEgresoTipoEquipoDropdown(true)}
                        style={{ paddingRight: '32px', height: '38px', width: '100%', cursor: 'text' }}
                      />
                      {egresoTipoEquipoId > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEgresoTipoEquipoId(0);
                            setEgresoTipoEquipoSearchText('');
                          }}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          ✕
                        </button>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#64748b'
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      )}
                    </div>

                    {showEgresoTipoEquipoDropdown && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          width: '100%',
                          zIndex: 2000,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          marginTop: '4px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
                        }}
                      >
                        <div
                          onClick={() => {
                            setEgresoTipoEquipoId(0);
                            setEgresoTipoEquipoSearchText('');
                            setShowEgresoTipoEquipoDropdown(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            background: egresoTipoEquipoId === 0 ? '#eff6ff' : '#ffffff',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            color: 'var(--color-primary)'
                          }}
                        >
                          -- Todos los Tipos de Equipo --
                        </div>
                        {(allTipoEquipos.length > 0 ? allTipoEquipos : tipoEquipos)
                          .filter(te => !egresoTipoEquipoSearchText || te.nombre.toLowerCase().includes(egresoTipoEquipoSearchText.toLowerCase()) || (te.abreviacion && te.abreviacion.toLowerCase().includes(egresoTipoEquipoSearchText.toLowerCase())))
                          .length === 0 ? (
                            <div style={{ padding: '10px 12px', color: '#64748b', fontSize: '12.5px', textAlign: 'center' }}>
                              No se encontraron tipos coincidentes
                            </div>
                          ) : (
                            (allTipoEquipos.length > 0 ? allTipoEquipos : tipoEquipos)
                              .filter(te => !egresoTipoEquipoSearchText || te.nombre.toLowerCase().includes(egresoTipoEquipoSearchText.toLowerCase()) || (te.abreviacion && te.abreviacion.toLowerCase().includes(egresoTipoEquipoSearchText.toLowerCase())))
                              .map(te => (
                                <div
                                  key={te.id}
                                  onClick={() => {
                                    setEgresoTipoEquipoId(te.id);
                                    setEgresoTipoEquipoSearchText(te.nombre);
                                    setShowEgresoTipoEquipoDropdown(false);
                                  }}
                                  style={{
                                    padding: '9px 12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f1f5f9',
                                    background: egresoTipoEquipoId === te.id ? '#eff6ff' : '#ffffff',
                                    fontSize: '12.5px',
                                    transition: 'background 0.15s ease',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (egresoTipoEquipoId !== te.id) e.currentTarget.style.background = '#f8fafc';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (egresoTipoEquipoId !== te.id) e.currentTarget.style.background = '#ffffff';
                                  }}
                                >
                                  <strong style={{ color: '#0f172a', fontSize: '12.5px' }}>{te.nombre}</strong>
                                  {te.abreviacion && (
                                    <span style={{ fontSize: '10.5px', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                                      {te.abreviacion}
                                    </span>
                                  )}
                                </div>
                              ))
                          )}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: '2', minWidth: '240px', position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar activo por serial, código, marca o modelo..."
                      value={egresoSearchAsset}
                      onChange={(e) => setEgresoSearchAsset(e.target.value)}
                      style={{ paddingLeft: '38px', height: '38px', width: '100%' }}
                    />
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                </div>

                {/* LISTA DE ACTIVOS EN STOCK CON PAGINACIÓN DE 5 */}
                {(() => {
                  const filteredStock = allStockActivos
                    .filter(a => a.estado === 'Stock')
                    .filter(a => egresoEmpresaId === 0 || a.empresa_id === egresoEmpresaId)
                    .filter(a => egresoSucursalId === 0 || a.sucursal_id === egresoSucursalId)
                    .filter(a => egresoTipoEquipoId === 0 || a.tipo_equipo_id === egresoTipoEquipoId)
                    .filter(a => {
                      if (!egresoSearchAsset.trim()) return true;
                      const q = egresoSearchAsset.toLowerCase();
                      return (
                        a.codigo.toLowerCase().includes(q) ||
                        (a.serial && a.serial.toLowerCase().includes(q)) ||
                        (a.marca && a.marca.toLowerCase().includes(q)) ||
                        (a.modelo && a.modelo.toLowerCase().includes(q)) ||
                        (a.tipo_equipo_nombre && a.tipo_equipo_nombre.toLowerCase().includes(q))
                      );
                    })
                    .sort((a, b) => b.id - a.id);

                  const totalPages = Math.ceil(filteredStock.length / 5) || 1;
                  const pagedStock = filteredStock.slice((egresoAssetPage - 1) * 5, egresoAssetPage * 5);

                  return (
                    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {pagedStock.map(a => {
                          const isSelected = selectedEgresoAssetIds.includes(a.id);
                          return (
                            <div
                              key={a.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedEgresoAssetIds(selectedEgresoAssetIds.filter(id => id !== a.id));
                                } else {
                                  setSelectedEgresoAssetIds([...selectedEgresoAssetIds, a.id]);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 14px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1, fontSize: '0.85rem' }}>
                                <strong style={{ color: 'var(--color-primary)' }}>{a.codigo}</strong> - {a.tipo_equipo_nombre || 'Equipo'} ({a.marca} {a.modelo})
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                  Serie: <strong>{a.serial || 'NA'}</strong> | Sede: {a.empresa_nombre || 'General'}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {filteredStock.length === 0 && (
                          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                            No hay activos disponibles en Stock para asignar con los filtros seleccionados.
                          </div>
                        )}
                      </div>

                      {/* CONTROLES DE PAGINACIÓN DE 5 EN 5 */}
                      {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.1)' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={egresoAssetPage === 1}
                            onClick={() => setEgresoAssetPage(p => Math.max(1, p - 1))}
                            style={{ padding: '4px 10px', fontSize: '11.5px' }}
                          >
                            Anterior
                          </button>
                          <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                            Página {egresoAssetPage} de {totalPages} ({filteredStock.length} disponibles)
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={egresoAssetPage >= totalPages}
                            onClick={() => setEgresoAssetPage(p => Math.min(totalPages, p + 1))}
                            style={{ padding: '4px 10px', fontSize: '11.5px' }}
                          >
                            Siguiente
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeEgresoModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Procesando...' : 'Guardar y Generar Acta de Egreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SUCCESS CONFIRMATION & DOCUMENT PDF BUTTONS MODAL */}
      {successDocModal && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1100 }}>
          <div className="modal-container glass-panel animate-scale-up" style={{ maxWidth: '480px', textAlign: 'center', padding: '28px 24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h2 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '4px' }}>{successDocModal.title}</h2>
            <span className="badge badge-process" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary)', background: '#eff6ff', border: '1px solid #dbeafe', margin: '6px 0 12px 0', padding: '4px 12px' }}>
              {successDocModal.code}
            </span>
            <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px', lineHeight: '1.4' }}>
              {successDocModal.message}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {successDocModal.buttons.map((btn, idx) => (
                <a
                  key={idx}
                  href={btn.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn ${btn.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', padding: '10px 16px', fontSize: '13px', justifyContent: 'center', textDecoration: 'none' }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  {btn.label}
                </a>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSuccessDocModal(null)}
              style={{ width: '100%', padding: '9px', fontWeight: '600' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SUMINISTRO DE TI MODAL */}
      {showSuministroModal && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2>{editingSuministro ? `Editar Suministro ${editingSuministro.codigo}` : 'Nuevo Suministro de TI'}</h2>
              <button className="modal-close-btn" onClick={() => setShowSuministroModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveSuministro} className="modal-form">
              <div className="form-group">
                <label className="form-label">SEDE / EMPRESA *</label>
                <select
                  className="form-control"
                  value={suministroEmpresaId}
                  onChange={(e) => setSuministroEmpresaId(Number(e.target.value))}
                  required
                >
                  <option value="0">Seleccionar sede...</option>
                  {allowedEmpresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">NOMBRE DEL SUMINISTRO *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Tóner HP 85A, Cable Patch Cord 2m"
                    value={suministroNombre}
                    onChange={(e) => setSuministroNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group half">
                  <label className="form-label">SERIAL / N° PARTE (Opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: CE285A, CAT6-BLU"
                    value={suministroSerial}
                    onChange={(e) => setSuministroSerial(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">UNIDAD DE MEDIDA *</label>
                  <select
                    className="form-control"
                    value={suministroUnidadMedida}
                    onChange={(e) => setSuministroUnidadMedida(e.target.value)}
                  >
                    <option value="Unidades">Unidades</option>
                    <option value="Cajas">Cajas</option>
                    <option value="Paquetes">Paquetes</option>
                    <option value="Metros">Metros</option>
                    <option value="Rollos">Rollos</option>
                    <option value="Piezas">Piezas</option>
                    <option value="Kits">Kits</option>
                  </select>
                </div>

                <div className="form-group half">
                  <label className="form-label">PRECIO UNITARIO ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="0.00"
                    value={suministroPrecioUnitario}
                    onChange={(e) => setSuministroPrecioUnitario(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">STOCK ACTUAL *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={suministroStockActual}
                    onChange={(e) => setSuministroStockActual(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group half">
                  <label className="form-label">STOCK MÍNIMO (Alerta) *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={suministroStockMinimo}
                    onChange={(e) => setSuministroStockMinimo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">DESCRIPCIÓN / OBSERVACIONES</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Detalles sobre uso, compatibilidad o ubicación específica..."
                  value={suministroDescripcion}
                  onChange={(e) => setSuministroDescripcion(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSuministroModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : editingSuministro ? 'Guardar Cambios' : 'Registrar Suministro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTOCK / REABASTECER SUMINISTRO MODAL */}
      {showRestockModal && restockSuministro && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>Restock de Suministro</h2>
              <button className="modal-close-btn" onClick={() => setShowRestockModal(false)}>×</button>
            </div>

            <form onSubmit={handleConfirmRestock} className="modal-form">
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                <strong style={{ color: '#15803d', display: 'block', fontSize: '13.5px' }}>
                  {restockSuministro.codigo} - {restockSuministro.nombre}
                </strong>
                <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                  Sede: <strong>{restockSuministro.empresa_nombre || 'General'}</strong> | Stock Actual: <strong>{restockSuministro.stock_actual} {restockSuministro.unidad_medida}</strong>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">CANTIDAD A INGRESAR *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={restockCantidad}
                    onChange={(e) => setRestockCantidad(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group half">
                  <label className="form-label">PRECIO UNITARIO ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="Opcional"
                    value={restockPrecioUnitario}
                    onChange={(e) => setRestockPrecioUnitario(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">MOTIVO / PROVEEDOR / N° FACTURA (Opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Compra según Factura #8492 de Proveedor Solutek"
                  value={restockMotivo}
                  onChange={(e) => setRestockMotivo(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRestockModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Procesando...' : 'Registrar Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FICHA TÉCNICA Y BITÁCORA DE HISTORIAL */}
      {showFichaSuministroModal && fichaSuministro && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h2>Ficha del Suministro</h2>
              <button className="modal-close-btn" onClick={() => setShowFichaSuministroModal(false)}>×</button>
            </div>

            <div style={{ padding: '0 0 16px 0', overflowY: 'auto', flex: 1 }}>
              {/* FICHA RESUMEN */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span className="badge badge-process" style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      {fichaSuministro.codigo || `SUM-${fichaSuministro.id}`}
                    </span>
                    <h3 style={{ margin: '6px 0 2px 0', fontSize: '17px', color: '#0f172a' }}>{fichaSuministro.nombre}</h3>
                    <p className="text-muted" style={{ fontSize: '12.5px', margin: 0 }}>
                      Sede: <strong>{fichaSuministro.empresa_nombre || 'General'}</strong> {fichaSuministro.serial ? `| Serial/N° Parte: ${fichaSuministro.serial}` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: fichaSuministro.stock_actual <= fichaSuministro.stock_minimo ? '#dc2626' : '#16a34a' }}>
                      {fichaSuministro.stock_actual} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>{fichaSuministro.unidad_medida}</span>
                    </div>
                    <span className="text-muted" style={{ fontSize: '11px' }}>
                      Stock Mínimo: {fichaSuministro.stock_minimo}
                    </span>
                  </div>
                </div>

                {fichaSuministro.descripcion && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', fontSize: '12px', color: '#475569' }}>
                    <strong>Descripción:</strong> {fichaSuministro.descripcion}
                  </div>
                )}
              </div>

              {/* BITÁCORA DE MOVIMIENTOS */}
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Bitácora de Uso y Restock ({historialSuministro.length} registros)
              </h4>

              {loadingHistorial ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: '13px' }}>
                  Cargando bitácora de movimientos...
                </div>
              ) : historialSuministro.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '13px', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
                  No hay movimientos registrados en la bitácora para este suministro.
                </div>
              ) : (() => {
                const pageSize = 4;
                const totalPages = Math.ceil(historialSuministro.length / pageSize) || 1;
                const pagedHistorial = historialSuministro.slice((pageHistorial - 1) * pageSize, pageHistorial * pageSize);

                return (
                  <div>
                    <div className="assets-table-container">
                      <table className="assets-table" style={{ fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>FECHA</th>
                            <th>TIPO</th>
                            <th>CANTIDAD</th>
                            <th>STOCK (ANT → NUEVO)</th>
                            <th>MOTIVO / DESTINO</th>
                            <th>USUARIO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedHistorial.map(h => (
                            <tr key={h.id}>
                              <td>{formatLocalDateSimple(h.created_at)}</td>
                              <td>
                                {h.tipo_movimiento === 'RESTOCK' ? (
                                  <span className="badge" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '10px' }}>
                                    RESTOCK
                                  </span>
                                ) : (
                                  <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '10px' }}>
                                    USO
                                  </span>
                                )}
                              </td>
                              <td style={{ fontWeight: 'bold', color: h.tipo_movimiento === 'RESTOCK' ? '#16a34a' : '#dc2626' }}>
                                {h.cantidad > 0 ? `+${h.cantidad}` : h.cantidad}
                              </td>
                              <td>
                                {h.stock_anterior} → <strong>{h.stock_nuevo}</strong>
                              </td>
                              <td>{h.motivo || '-'}</td>
                              <td>{h.usuario_nombre || 'Sistema'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <div className="pagination" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                          disabled={pageHistorial === 1}
                          onClick={() => setPageHistorial(p => Math.max(p - 1, 1))}
                        >
                          Anterior
                        </button>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          Página {pageHistorial} de {totalPages}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                          disabled={pageHistorial >= totalPages}
                          onClick={() => setPageHistorial(p => Math.min(p + 1, totalPages))}
                        >
                          Siguiente
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="modal-actions" style={{ marginTop: 'auto', paddingTop: '12px' }}>
              <button type="button" className="btn btn-secondary w-100" onClick={() => setShowFichaSuministroModal(false)}>
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
