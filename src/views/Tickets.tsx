import { showAlert, showConfirm } from "../utils/alerts";
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ticketService,
  Ticket,
  TicketAdjunto,
  CreateTicketPayload,
} from "../services/ticket.service";
import { projectService, User } from "../services/project.service";
import { kbService } from "../services/kb.service";
import { areaService, Area } from "../services/area.service";
import { apiClient } from "../services/api";
import "./Tickets.css";

const formatFileSize = (bytes?: number) => {
  if (!bytes || isNaN(bytes)) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getBackendAttachmentUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
  const backendBase = apiUrl.replace(/\/api\/v1\/?$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
};

const isImageFile = (tipo?: string, nombre?: string) => {
  if (tipo && tipo.startsWith("image/")) return true;
  if (nombre) {
    const ext = nombre.toLowerCase().split(".").pop() || "";
    return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
  }
  return false;
};

export const Tickets: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showEscalarModal, setShowEscalarModal] = useState(false);
  const [escalarGrupo, setEscalarGrupo] = useState<
    "Infraestructura" | "Desarrollo"
  >("Infraestructura");
  const [escalarTechId, setEscalarTechId] = useState<number>(0);
  const [showEscalarAdminModal, setShowEscalarAdminModal] = useState(false);
  const [escalarAdminTechId, setEscalarAdminTechId] = useState<number>(0);

  // New ticket state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("Sistemas");
  const [newPrioridad, setNewPrioridad] = useState<
    "Baja" | "Media" | "Alta" | "Critica"
  >("Media");
  const [newEmpresaId, setNewEmpresaId] = useState<number>(0);
  const [newSucursalId, setNewSucursalId] = useState<number>(0);
  const [newPersonaSol, setNewPersonaSol] = useState("");
  const [newAreaSol, setNewAreaSol] = useState("");
  const [newAsignacionDestino, setNewAsignacionDestino] = useState<
    "SEDE_N1" | "ASIGNAR_A_MI"
  >("SEDE_N1");
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Ticket edit & detail state
  const [editEstado, setEditEstado] = useState<string>("");
  const [editObs, setEditObs] = useState<string>("");
  const [editTechId, setEditTechId] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCierrePanel, setShowCierrePanel] = useState(false);
  const [cierreObs, setCierreObs] = useState("");
  const [cierreFiles, setCierreFiles] = useState<File[]>([]);
  const [isUploadingDetailFiles, setIsUploadingDetailFiles] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Knowledge Base publish states
  const [showKBModal, setShowKBModal] = useState(false);
  const [kbTitle, setKbTitle] = useState("");
  const [kbCat, setKbCat] = useState("Sistemas");
  const [kbSteps, setKbSteps] = useState("");
  const [kbTicketId, setKbTicketId] = useState<number | null>(null);
  const [isPublishingKB, setIsPublishingKB] = useState(false);

  const renderTicketAdjuntos = (t: Ticket) => {
    const adjuntosList = t.adjuntos || [];
    return (
      <div className="ticket-adjuntos-section">
        <div className="ticket-adjuntos-header">
          <h4 className="ticket-adjuntos-title">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
            Archivos y Evidencias Adjuntas ({adjuntosList.length})
          </h4>

          {/* Botón para adjuntar más archivos al ticket en cualquier momento */}
          <div>
            <input
              type="file"
              id={`detail-upload-input-${t.id}`}
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
              style={{ display: "none" }}
              disabled={isUploadingDetailFiles}
              onChange={(e) => {
                handleUploadDetailFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <label
              htmlFor={`detail-upload-input-${t.id}`}
              className="btn btn-secondary btn-sm"
              style={{
                cursor: isUploadingDetailFiles ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 10px",
                fontSize: "11.5px",
                background: "#f1f5f9",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              {isUploadingDetailFiles ? "Subiendo..." : "+ Adjuntar Archivo"}
            </label>
          </div>
        </div>

        {adjuntosList.length === 0 ? (
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: "12px",
              color: "var(--color-text-muted, #64748b)",
            }}
          >
            No se adjuntaron archivos o evidencias en este ticket.
          </p>
        ) : (
          <div className="adjuntos-grid">
            {adjuntosList.map((adj, idx) => {
              const isImg = isImageFile(adj.tipo, adj.nombre);
              const fullUrl = getBackendAttachmentUrl(adj.url);
              const etapaClass = adj.etapa || "creacion";

              return (
                <div key={adj.id || idx} className="adjunto-card">
                  {isImg ? (
                    <div
                      className="adjunto-img-preview"
                      onClick={() => setPreviewImageUrl(fullUrl)}
                      title="Clic para ver en tamaño completo"
                    >
                      <img src={fullUrl} alt={adj.nombre} loading="lazy" />
                      <div className="adjunto-img-overlay">
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          <line x1="11" y1="8" x2="11" y2="14"></line>
                          <line x1="8" y1="11" x2="14" y2="11"></line>
                        </svg>
                        <span>Ver Foto</span>
                      </div>
                    </div>
                  ) : (
                    <div className="adjunto-doc-header">
                      <div className="adjunto-icon-box">
                        <svg
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </div>
                      <span className={`adjunto-badge ${etapaClass}`}>
                        {etapaClass}
                      </span>
                    </div>
                  )}

                  <div className="adjunto-body">
                    {isImg && (
                      <span className={`adjunto-badge ${etapaClass}`}>
                        {etapaClass}
                      </span>
                    )}
                    <div className="adjunto-filename" title={adj.nombre}>
                      {adj.nombre}
                    </div>
                    <div className="adjunto-meta">
                      <span>
                        {formatFileSize(adj.tamano)} •{" "}
                        {adj.usuario || "Usuario"}
                      </span>
                      <span>
                        {adj.fecha
                          ? new Date(adj.fecha).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="adjunto-actions">
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={adj.nombre}
                      className="adjunto-btn-download"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="13"
                        height="13"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Descargar
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleOpenKBFromTicket = (t: Ticket) => {
    setKbTitle(t.titulo);
    setKbCat(t.categoria || "Sistemas");
    const initialSteps = t.observaciones
      ? `Diagnóstico / Solución del Ticket #${t.id}:\n${t.observaciones}`
      : `Paso a paso para resolver (Ticket #${t.id}):\n${t.descripcion}`;
    setKbSteps(initialSteps);
    setKbTicketId(t.id);
    setShowKBModal(true);
  };

  const handlePublishKB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbTitle.trim() || !kbSteps.trim()) {
      showAlert(
        "Por favor completa el título y las instrucciones paso a paso.",
      );
      return;
    }
    try {
      setIsPublishingKB(true);
      await kbService.createArticulo({
        titulo: kbTitle,
        categoria: kbCat,
        pasos_solucion: kbSteps,
        ticket_origen_id: kbTicketId,
      });
      showAlert("¡Solución publicada con éxito en la Base de Conocimientos!");
      setShowKBModal(false);
    } catch (err: any) {
      showAlert(
        "Error al publicar en la base de conocimientos: " + err.message,
      );
    } finally {
      setIsPublishingKB(false);
    }
  };

  const [empresas, setEmpresas] = useState<
    {
      id: number;
      nombre: string;
      sucursales?: {
        id: number;
        nombre: string;
        persona_id: number | null;
        persona_nombre?: string;
      }[];
    }[]
  >([]);
  const [categoriesList, setCategoriesList] = useState<
    { id: number; nombre: string }[]
  >([]);
  const [areasList, setAreasList] = useState<Area[]>([]);

  const loggedInTech = technicians.find((t) => t.id === user?.id);
  const isN2 =
    loggedInTech?.nivel_soporte === "N2" ||
    (user as any)?.nivel_soporte === "N2";
  const isTechN2 = user?.rol === "TECNICO" && isN2;
  const isN1 =
    loggedInTech?.nivel_soporte === "N1" || (!isN2 && user?.rol === "TECNICO");
  const isTechN1 = user?.rol === "TECNICO" && isN1;

  const [activeTab, setActiveTab] = useState<"SOLICITUDES" | "INCIDENCIAS">(
    "SOLICITUDES",
  );

  // Si el usuario es técnico N2, asegurar que la pestaña activa sea INCIDENCIAS
  useEffect(() => {
    if (isTechN2 && activeTab !== "INCIDENCIAS") {
      setActiveTab("INCIDENCIAS");
    }
  }, [isTechN2]);

  const isReadOnlyForUser = Boolean(
    user?.rol === "TECNICO" &&
    selectedTicket &&
    ((isTechN1 &&
      selectedTicket.nivel_soporte === "N2" &&
      selectedTicket.tecnico_id !== user.id &&
      (!loggedInTech?.grupo_n2 ||
        loggedInTech.grupo_n2 !== selectedTicket.grupo_n2) &&
      selectedTicket.estado !== "Resuelto") ||
      (isTechN2 &&
        selectedTicket.tecnico_id !== user.id &&
        selectedTicket.nivel_soporte === "N1")),
  );

  const fetchTicketsData = async (
    pageNumber = page,
    searchVal = debouncedSearch,
    estadoVal = filterEstado,
    tecnicoIdVal = selectedTecnicoId,
    tabVal = activeTab,
  ) => {
    try {
      setLoading(true);
      const res = await ticketService.getTicketsPaginated(
        pageNumber,
        10,
        undefined,
        estadoVal,
        searchVal,
        tecnicoIdVal,
        tabVal,
      );
      setTickets(res.data);
      setTotalTickets(res.total);
    } catch (e) {
      console.error("Error fetching support tickets", e);
    } finally {
      setLoading(false);
    }
  };

  // Load static metadata once on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [companiesList, cats, usersList, areasData] = await Promise.all([
          apiClient.get<
            {
              id: number;
              nombre: string;
              sucursales?: {
                id: number;
                nombre: string;
                persona_id: number | null;
                persona_nombre?: string;
              }[];
            }[]
          >("/empresas"),
          ticketService.getCategorias().catch(() => []),
          projectService.getUsuarios().catch(() => []),
          areaService.getAllActiveAreas().catch(() => []),
        ]);

        setEmpresas(companiesList);
        if (companiesList.length > 0 && newEmpresaId === 0) {
          const firstEmp = companiesList[0];
          setNewEmpresaId(firstEmp.id);
          const firstSuc = firstEmp.sucursales || [];
          if (firstSuc.length > 0) {
            setNewSucursalId(firstSuc[0].id);
            if (firstSuc[0].persona_nombre) {
              setNewPersonaSol(firstSuc[0].persona_nombre);
            }
          }
        }

        setCategoriesList(cats);
        if (cats.length > 0) {
          setNewCat(cats[0].nombre);
        }

        setAreasList(areasData);
        if (areasData.length > 0 && !newAreaSol) {
          setNewAreaSol(areasData[0].nombre);
        }

        const techs = usersList.filter(
          (u) =>
            u.rol === "TECNICO" || u.rol === "SUPERVISOR" || u.rol === "ADMIN",
        );
        setTechnicians(techs);
      } catch (err) {
        console.error("Error loading metadata", err);
      }
    };
    loadMetadata();
  }, [user]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when search, status, technician filter or tab changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterEstado, selectedTecnicoId, activeTab]);

  // Fetch tickets when page, search, status, technician filter or tab changes
  useEffect(() => {
    fetchTicketsData(
      page,
      debouncedSearch,
      filterEstado,
      selectedTecnicoId,
      activeTab,
    );
  }, [page, debouncedSearch, filterEstado, selectedTecnicoId, activeTab]);

  const handleEmpresaSelectChange = (empId: number) => {
    setNewEmpresaId(empId);
    const selectedEmp = empresas.find((e) => e.id === empId);
    const sucs = selectedEmp?.sucursales || [];
    if (sucs.length > 0) {
      setNewSucursalId(sucs[0].id);
    } else {
      setNewSucursalId(0);
    }
  };

  useEffect(() => {
    if (showCreateModal && empresas.length > 0) {
      const userEmpresaIds = loggedInTech?.empresa_ids || [];
      const isManagementRole =
        user?.rol === "ADMIN" || user?.rol === "SUPERVISOR";
      const allowed =
        isManagementRole || !userEmpresaIds.length
          ? empresas
          : empresas.filter((c) => userEmpresaIds.includes(c.id));

      if (allowed.length > 0) {
        const isCurrentValid = allowed.some((e) => e.id === newEmpresaId);
        const validId = isCurrentValid ? newEmpresaId : allowed[0].id;
        handleEmpresaSelectChange(validId);
      }
    }
  }, [showCreateModal]);

  const handleSucursalSelectChange = (sucId: number) => {
    setNewSucursalId(sucId);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTechN2) {
      showAlert(
        "Los técnicos con Nivel de Soporte N2 no tienen permitido crear tickets.",
      );
      return;
    }
    if (!newTitle || !newDesc) {
      showAlert("Por favor completa el título y descripción.");
      return;
    }

    try {
      setIsUploadingFiles(true);
      const isManagementOrN2 =
        user?.rol === "SUPERVISOR" || user?.rol === "ADMIN" || isN2;
      const isSelfAssign =
        isManagementOrN2 && newAsignacionDestino === "ASIGNAR_A_MI";
      const ticketNivel = isSelfAssign && isN2 ? "N2" : "N1";
      const assignedTechId = isSelfAssign ? user?.id : undefined;

      let uploadedAdjuntos = undefined;
      if (createFiles.length > 0) {
        uploadedAdjuntos = await ticketService.uploadAdjuntos(
          createFiles,
          "creacion",
        );
      }

      const payload: CreateTicketPayload = {
        titulo: newTitle,
        descripcion: newDesc,
        categoria: newCat,
        prioridad: newPrioridad,
        empresa_id: newEmpresaId,
        sucursal_id: newSucursalId > 0 ? newSucursalId : undefined,
        persona_solicitante: newPersonaSol || undefined,
        area_solicitante: newAreaSol || undefined,
        medio_solicitud: "Plataforma",
        tecnico_id: assignedTechId,
        nivel_soporte: ticketNivel,
        adjuntos: uploadedAdjuntos,
      };

      await ticketService.createTicket(payload);
      setShowCreateModal(false);

      // Reset
      setNewTitle("");
      setNewDesc("");
      setNewSucursalId(0);
      setNewPersonaSol("");
      setNewAreaSol("");
      setNewAsignacionDestino("SEDE_N1");
      setCreateFiles([]);

      fetchTicketsData();
    } catch (err: any) {
      showAlert("Error al crear el ticket: " + err.message);
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const handleOpenEditModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditEstado(ticket.estado);
    setEditObs(ticket.observaciones || "");
    setEditTechId(ticket.tecnico_id || 0);
    setShowCierrePanel(false);
    setCierreObs("");
    setCierreFiles([]);
  };

  const handleCerrarTicketConfirmado = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!cierreObs.trim()) {
      showAlert("Por favor ingresa las observaciones finales de la solución.");
      return;
    }

    try {
      setIsUpdating(true);
      if (cierreFiles.length > 0) {
        await ticketService.addAdjuntosToTicket(
          selectedTicket.id,
          cierreFiles,
          isTechN2 ? "resolucion" : "cierre",
        );
      }
      const updated = await ticketService.updateTicket(selectedTicket.id, {
        estado: "Cerrado",
        observaciones: cierreObs,
        tecnico_id: editTechId > 0 ? editTechId : user?.id,
      });

      setSelectedTicket(null);
      setCierreFiles([]);
      fetchTicketsData();
      showAlert("Ticket cerrado definitivamente con éxito.");
    } catch (err: any) {
      showAlert("Error al finalizar el ticket: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUploadDetailFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedTicket) return;
    const fileArray = Array.from(files);

    const tooLarge = fileArray.find((f) => f.size > 25 * 1024 * 1024);
    if (tooLarge) {
      showAlert(
        `El archivo "${tooLarge.name}" supera el límite máximo de 25MB.`,
      );
      return;
    }

    try {
      setIsUploadingDetailFiles(true);
      const updated = await ticketService.addAdjuntosToTicket(
        selectedTicket.id,
        fileArray,
        "seguimiento",
      );
      setSelectedTicket(updated);
      fetchTicketsData();
      showAlert("Archivos adjuntados con éxito.");
    } catch (err: any) {
      showAlert("Error al adjuntar archivos: " + err.message);
    } finally {
      setIsUploadingDetailFiles(false);
    }
  };

  const handleReabrirTicket = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicket) return;
    if (
      !(await showConfirm(
        "¿Deseas reabrir este ticket? Se cambiará su estado a 'En Proceso' y permanecerá bajo tu atención (N1).",
      ))
    )
      return;

    try {
      setIsUpdating(true);
      const updated = await ticketService.updateTicket(selectedTicket.id, {
        estado: "En Proceso",
      });
      setSelectedTicket(updated);
      fetchTicketsData();
      showAlert("El ticket ha sido reabierto exitosamente y asignado a N1.");
    } catch (err: any) {
      showAlert("Error al reabrir ticket: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEscalarN2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setIsUpdating(true);
      await ticketService.escalarTicketAN2(selectedTicket.id, {
        grupo_n2: escalarGrupo,
        tecnico_id: escalarTechId > 0 ? escalarTechId : null,
      });
      setShowEscalarModal(false);
      setSelectedTicket(null);
      fetchTicketsData();
      showAlert("Ticket escalado a Nivel 2 exitosamente.");
    } catch (err: any) {
      showAlert("Error al escalar el ticket: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEscalarAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setIsUpdating(true);
      await ticketService.escalarTicketAAdmin(selectedTicket.id, {
        tecnico_id: escalarAdminTechId > 0 ? escalarAdminTechId : null,
      });
      setShowEscalarAdminModal(false);
      setSelectedTicket(null);
      fetchTicketsData();
      showAlert("Ticket escalado a Nivel Administración exitosamente.");
    } catch (err: any) {
      showAlert("Error al escalar a Administración: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEscalarAProveedor = async () => {
    if (!selectedTicket) return;
    if (
      !(await showConfirm(
        "¿Estás seguro de elevar este soporte a Proveedor (N3)? El SLA del ticket será pausado.",
      ))
    )
      return;

    try {
      setIsUpdating(true);
      await ticketService.escalarTicketAProveedor(selectedTicket.id);
      setSelectedTicket(null);
      fetchTicketsData();
      showAlert("Ticket escalado a Proveedor (N3) exitosamente. SLA Pausado.");
    } catch (err: any) {
      showAlert("Error al elevar a Proveedor: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasarAEnProceso = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setIsUpdating(true);
      const updated = await ticketService.updateTicket(selectedTicket.id, {
        estado: "En Proceso",
        tecnico_id: editTechId > 0 ? editTechId : user?.id,
      });
      setSelectedTicket(updated);
      setEditEstado("En Proceso");
      fetchTicketsData();
      showAlert('El ticket ha pasado a estado "En Proceso".');
    } catch (err: any) {
      showAlert("Error al actualizar a En Proceso: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setIsUpdating(true);
      await ticketService.updateTicket(selectedTicket.id, {
        estado: editEstado as any,
        observaciones: editObs || null,
        tecnico_id: editTechId > 0 ? editTechId : null,
      });

      setSelectedTicket(null);
      fetchTicketsData();
    } catch (err: any) {
      showAlert("Error al actualizar el ticket: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadReport = () => {
    const url = ticketService.getReporteUrl();
    window.open(url, "_blank");
  };

  const handleTriggerCierreDiario = async () => {
    if (
      !(await showConfirm(
        "¿Deseas enviar alertas de cierre diario a todos los técnicos con tickets pendientes?",
      ))
    )
      return;
    try {
      const res = (await ticketService.triggerCierreDiario()) as any;
      showAlert(
        `Éxito: ${res.message || "Recordatorios enviados"}\n\nTécnicos alertados: ${res.totalTecnicosAlertados}\nTickets pendientes reportados: ${res.totalTicketsRemitidos}`,
      );
    } catch (err: any) {
      showAlert("Error enviando recordatorios: " + err.message);
    }
  };

  const filteredTickets = tickets;

  return (
    <div className="tickets-container animate-fade">
      {/* ITIL Navigation Tabs */}
      {!isTechN2 ? (
        <div className="itil-tabs-container">
          <div className="itil-tabs-header">
            <button
              type="button"
              className={`itil-tab-btn ${activeTab === "SOLICITUDES" ? "active" : ""}`}
              onClick={() => setActiveTab("SOLICITUDES")}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>SOLICITUDES</span>
              {activeTab === "SOLICITUDES" && (
                <span className="itil-tab-badge">{totalTickets}</span>
              )}
            </button>

            <button
              type="button"
              className={`itil-tab-btn ${activeTab === "INCIDENCIAS" ? "active" : ""}`}
              onClick={() => setActiveTab("INCIDENCIAS")}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>INCIDENCIAS</span>
              {activeTab === "INCIDENCIAS" && (
                <span className="itil-tab-badge">{totalTickets}</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="itil-tabs-container">
          <div className="itil-tabs-header">
            <div className="itil-tab-btn active" style={{ cursor: "default" }}>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>INCIDENCIAS ASIGNADAS</span>
              <span className="itil-tab-badge">{totalTickets}</span>
            </div>
          </div>
        </div>
      )}

      {/* Upper controls bar */}
      <div className="tickets-controls glass-panel">
        <div className="controls-left">
          <input
            type="text"
            className="form-control search-input"
            placeholder="Buscar por título, categoría, descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="form-control filter-select"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="todos">Todos los Estados</option>
            <option value="Nuevo">Nuevo</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Resuelto">Resuelto</option>
            <option value="Cerrado">Cerrado</option>
            <option value="Elevado a Proveedor">Elevado a Proveedor</option>
            <option value="Elevado a Administración">
              Elevado a Administración
            </option>
          </select>
          {(user?.rol === "ADMIN" || user?.rol === "SUPERVISOR") && (
            <select
              className="form-control filter-select"
              value={selectedTecnicoId}
              onChange={(e) => setSelectedTecnicoId(e.target.value)}
              title="Filtrar por Técnico Asignado"
            >
              <option value="">Todos los Técnicos</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre_completo}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="controls-right-buttons">
          {(user?.rol === "ADMIN" || user?.rol === "SUPERVISOR") && (
            <button
              type="button"
              className="btn btn-secondary excel-btn"
              onClick={handleDownloadReport}
            >
              Reporte Semanal Excel
            </button>
          )}
          {!isTechN2 && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Reportar Soporte / Ticket
            </button>
          )}
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="dashboard-loading">
          <div className="loader"></div>
          <p className="text-muted">Leyendo base de datos de soporte...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="empty-panel glass-panel text-center py-5">
          <span
            className="empty-big-icon"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="48"
              height="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--color-text-dim)" }}
            >
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"></path>
              <line x1="13" y1="5" x2="13" y2="19"></line>
            </svg>
          </span>
          <h3>No se encontraron tickets</h3>
          <p className="text-muted">
            Ajusta tus filtros o crea un nuevo reporte para empezar.
          </p>
        </div>
      ) : (
        <div className="tickets-grid">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="ticket-card glass-panel glass-panel-interactive animate-slide-up"
              onClick={() => handleOpenEditModal(ticket)}
            >
              <div className="ticket-card-header">
                <span
                  className={`badge badge-priority-${ticket.prioridad.toLowerCase()}`}
                >
                  {ticket.prioridad}
                </span>
                <span
                  className={`badge badge-level-${ticket.nivel_soporte?.toLowerCase() || "n1"}`}
                >
                  Nivel {ticket.nivel_soporte || "N1"}{" "}
                  {ticket.nivel_soporte === "N2" && ticket.grupo_n2
                    ? `(${ticket.grupo_n2})`
                    : ""}
                </span>
                <span
                  className={`badge badge-${ticket.estado.toLowerCase().replace(/\s+/g, "")}`}
                >
                  {ticket.estado}
                </span>
              </div>

              <div className="ticket-card-body">
                <h3 className="ticket-title">{ticket.titulo}</h3>
                <p className="ticket-desc text-muted">
                  {ticket.descripcion.substring(0, 110)}
                  {ticket.descripcion.length > 110 ? "..." : ""}
                </p>

                <div className="ticket-meta mt-3">
                  <div className="meta-tag">{ticket.categoria}</div>
                  <div className="meta-tag">
                    {ticket.empresa_nombre || "Sin Sede Asignada"}
                    {ticket.sucursal_nombre
                      ? ` (${ticket.sucursal_nombre})`
                      : ""}
                  </div>
                  {ticket.adjuntos && ticket.adjuntos.length > 0 && (
                    <div
                      className="meta-tag"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "rgba(99, 102, 241, 0.08)",
                        color: "var(--color-primary, #6366f1)",
                        borderColor: "rgba(99, 102, 241, 0.2)",
                        fontWeight: "500",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                      </svg>
                      {ticket.adjuntos.length}{" "}
                      {ticket.adjuntos.length === 1 ? "adjunto" : "adjuntos"}
                    </div>
                  )}
                </div>
              </div>

              <div className="ticket-card-footer">
                <div className="assignee-info">
                  <span
                    className="assignee-avatar"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#e2e8f0",
                      borderRadius: "50%",
                      width: "32px",
                      height: "32px",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <div className="assignee-text">
                    <span className="assignee-label">Técnico Asignado:</span>
                    <span className="assignee-name">
                      {ticket.tecnico_nombre || "Asignación automática..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalTickets > 10 && (
        <div
          className="pagination-container"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "24px",
            padding: "12px 0",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            style={{
              cursor: page === 1 ? "not-allowed" : "pointer",
              padding: "6px 12px",
              fontSize: "12px",
            }}
          >
            Anterior
          </button>
          <span
            style={{
              fontSize: "13px",
              color: "var(--color-text)",
              fontWeight: "500",
            }}
          >
            Página {page} de {Math.ceil(totalTickets / 10)} ({totalTickets}{" "}
            registros)
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page === Math.ceil(totalTickets / 10)}
            onClick={() => setPage(page + 1)}
            style={{
              cursor:
                page === Math.ceil(totalTickets / 10)
                  ? "not-allowed"
                  : "pointer",
              padding: "6px 12px",
              fontSize: "12px",
            }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up">
            <div className="modal-header">
              <h2>Reportar Nuevo Soporte Técnico</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="modal-form">
              <div className="form-group">
                <label className="form-label">
                  TÍTULO DEL SOPORTE / DAÑO *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Impresora no enciende o correo bloqueado"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">CATEGORÍA *</label>
                  <select
                    className="form-control"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group half">
                  <label className="form-label">PRIORIDAD *</label>
                  <select
                    className="form-control"
                    value={newPrioridad}
                    onChange={(e) => setNewPrioridad(e.target.value as any)}
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Critica">Crítica</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                {(() => {
                  const userEmpresaIds = loggedInTech?.empresa_ids || [];
                  const isManagementRole =
                    user?.rol === "ADMIN" || user?.rol === "SUPERVISOR";

                  const allowedEmpresas =
                    isManagementRole || !userEmpresaIds.length
                      ? empresas
                      : empresas.filter((c) => userEmpresaIds.includes(c.id));

                  return (
                    <div className="form-group half">
                      <label className="form-label">SEDE / EMPRESA *</label>
                      <select
                        className="form-control"
                        value={newEmpresaId}
                        onChange={(e) =>
                          handleEmpresaSelectChange(Number(e.target.value))
                        }
                      >
                        {allowedEmpresas.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                <div className="form-group half">
                  <label className="form-label">ÁREA SOLICITANTE *</label>
                  {areasList.length > 0 ? (
                    <select
                      className="form-control"
                      value={newAreaSol}
                      onChange={(e) => setNewAreaSol(e.target.value)}
                      required
                    >
                      {areasList.map((a) => (
                        <option key={a.id} value={a.nombre}>
                          {a.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Contabilidad, Caja 3, etc."
                      value={newAreaSol}
                      onChange={(e) => setNewAreaSol(e.target.value)}
                      required
                    />
                  )}
                </div>
              </div>

              {/* Combobox de Sucursal si la empresa seleccionada posee sucursales */}
              {(() => {
                const userSucursalIds = loggedInTech?.sucursal_ids || [];
                const isManagementRole =
                  user?.rol === "ADMIN" || user?.rol === "SUPERVISOR";

                const currentEmpObj = empresas.find(
                  (e) => e.id === newEmpresaId,
                );
                const sucs = currentEmpObj?.sucursales || [];
                if (!sucs || sucs.length === 0) {
                  return null;
                }

                const allowedSucursales =
                  isManagementRole || !userSucursalIds.length
                    ? sucs
                    : sucs.filter((s) => userSucursalIds.includes(s.id));

                const displaySucursales =
                  allowedSucursales.length > 0 ? allowedSucursales : sucs;

                if (displaySucursales.length > 0) {
                  return (
                    <div className="form-group animate-fade">
                      <label className="form-label">
                        SUCURSAL DE LA EMPRESA *
                      </label>
                      <select
                        className="form-control"
                        value={newSucursalId}
                        onChange={(e) =>
                          handleSucursalSelectChange(Number(e.target.value))
                        }
                      >
                        {displaySucursales.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="form-group">
                <label className="form-label">
                  NOMBRE DEL EMPLEADO AFECTADO (SOLICITANTE) *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: María Augusta Zambrano"
                  value={newPersonaSol}
                  onChange={(e) => setNewPersonaSol(e.target.value)}
                />
              </div>

              {(user?.rol === "SUPERVISOR" ||
                user?.rol === "ADMIN" ||
                isN2) && (
                <div className="form-group">
                  <label className="form-label">ASIGNACIÓN DEL TICKET *</label>
                  <select
                    className="form-control"
                    value={newAsignacionDestino}
                    onChange={(e) =>
                      setNewAsignacionDestino(
                        e.target.value as "SEDE_N1" | "ASIGNAR_A_MI",
                      )
                    }
                  >
                    <option value="SEDE_N1">
                      Asignar al Técnico N1 de la Sede / Centro Comercial
                    </option>
                    <option value="ASIGNAR_A_MI">
                      Asignarme a mí (Auto-atención){" "}
                      {isN2 ? "(Nivel 2)" : "(Nivel 1)"}
                    </option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  DESCRIPCIÓN DE LA FALLA O SOLICITUD *
                </label>
                <textarea
                  className="form-control textarea-field"
                  placeholder="Describe con el mayor detalle posible el inconveniente..."
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  required
                />
              </div>

              {/* ADJUNTOS / EVIDENCIAS AL CREAR */}
              <div className="form-group">
                <label
                  className="form-label"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    ADJUNTAR ARCHIVOS / CAPTURAS / DOCUMENTOS (OPCIONAL)
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-muted, #64748b)",
                      fontWeight: "normal",
                    }}
                  >
                    Imágenes, PDFs, Word, Excel (Máx. 25MB c/u)
                  </span>
                </label>

                <div className="ticket-dropzone">
                  <input
                    type="file"
                    id="create-ticket-files"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setCreateFiles((prev) => [...prev, ...newFiles]);
                        e.target.value = "";
                      }
                    }}
                  />
                  <label
                    htmlFor="create-ticket-files"
                    className="dropzone-label"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>
                      Haz clic aquí para seleccionar o arrastrar archivos /
                      fotos
                    </span>
                  </label>
                </div>

                {createFiles.length > 0 && (
                  <div className="selected-files-list mt-2">
                    {createFiles.map((file, idx) => (
                      <div key={idx} className="file-chip">
                        <span className="file-chip-name" title={file.name}>
                          {file.name}
                        </span>
                        <span className="file-chip-size">
                          ({formatFileSize(file.size)})
                        </span>
                        <button
                          type="button"
                          className="file-chip-remove"
                          onClick={() =>
                            setCreateFiles((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isUploadingFiles}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploadingFiles}
                >
                  {isUploadingFiles
                    ? "Subiendo archivos y registrando..."
                    : "Registrar Soporte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL & EDIT MODAL */}
      {selectedTicket && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up">
            <div className="modal-header">
              <h2>Detalle del Soporte #{selectedTicket.id}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedTicket(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateTicket} className="modal-form">
              <div className="ticket-detail-summary">
                <h3>{selectedTicket.titulo}</h3>
                <p className="ticket-detail-desc">
                  {selectedTicket.descripcion}
                </p>
                <div className="ticket-detail-meta text-muted">
                  <span>
                    Sede:{" "}
                    <strong>
                      {selectedTicket.empresa_nombre || "CONDADO"}
                      {selectedTicket.sucursal_nombre
                        ? ` (${selectedTicket.sucursal_nombre})`
                        : ""}
                    </strong>
                  </span>
                  <span>
                    Categoría: <strong>{selectedTicket.categoria}</strong>
                  </span>
                  <span>
                    Prioridad: <strong>{selectedTicket.prioridad}</strong>
                  </span>
                  <span>
                    Nivel:{" "}
                    <strong
                      className={`badge badge-level-${selectedTicket.nivel_soporte?.toLowerCase() || "n1"}`}
                      style={{
                        display: "inline-block",
                        padding: "2px 6px",
                        fontSize: "10px",
                        verticalAlign: "middle",
                        marginLeft: "4px",
                      }}
                    >
                      {selectedTicket.nivel_soporte || "N1"}{" "}
                      {selectedTicket.nivel_soporte === "N2" &&
                      selectedTicket.grupo_n2
                        ? `(${selectedTicket.grupo_n2})`
                        : ""}
                    </strong>
                  </span>
                  {selectedTicket.sla_paused_at && (
                    <span style={{ color: "#ec4899", fontWeight: 600 }}>
                      [SLA PAUSADO]
                    </span>
                  )}
                  <span>
                    Fecha:{" "}
                    {new Date(selectedTicket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Editable Fields for Admin / Technical Staff */}
              {(user?.rol === "ADMIN" ||
                user?.rol === "SUPERVISOR" ||
                user?.rol === "TECNICO") &&
              !isReadOnlyForUser ? (
                <div className="admin-editable-section">
                  <h4 className="section-title gradient-text mt-3 mb-2">
                    Administrar Operación TI
                  </h4>

                  {selectedTicket.estado !== "Cerrado" &&
                  selectedTicket.estado !== "Finalizada" ? (
                    <div className="cierre-rapido-container mb-3">
                      {selectedTicket.estado === "Nuevo" ? (
                        <button
                          type="button"
                          className="btn"
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            background: "#f59e0b",
                            border: "none",
                            color: "white",
                            fontWeight: "600",
                            padding: "12px",
                            fontSize: "14px",
                            borderRadius: "10px",
                          }}
                          onClick={handlePasarAEnProceso}
                          disabled={isUpdating}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                          {isUpdating
                            ? "Actualizando..."
                            : "Iniciar Atención / Pasar a En Proceso"}
                        </button>
                      ) : selectedTicket.estado === "Resuelto" ? (
                        <div
                          style={{
                            border: "1px solid #a7f3d0",
                            background: "#ecfdf5",
                            padding: "16px",
                            borderRadius: "12px",
                          }}
                        >
                          <div
                            style={{
                              color: "#047857",
                              fontWeight: "600",
                              fontSize: "14px",
                              marginBottom: "6px",
                            }}
                          >
                            🟢 Ticket Marcado como Resuelto por N2
                          </div>
                          {selectedTicket.observaciones && (
                            <div
                              style={{
                                background: "#ffffff",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: "1px solid #a7f3d0",
                                margin: "8px 0 12px 0",
                                fontSize: "13px",
                                color: "#065f46",
                              }}
                            >
                              <strong>
                                Observación / Solución enviada por N2:
                              </strong>
                              <p
                                style={{
                                  margin: "4px 0 0 0",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {selectedTicket.observaciones}
                              </p>
                            </div>
                          )}
                          <p
                            style={{
                              margin: "0 0 12px 0",
                              fontSize: "12.5px",
                              color: "#065f46",
                            }}
                          >
                            Por favor contacta al usuario para confirmar que la
                            solución haya sido satisfactoria antes de cerrar
                            definitivamente o reabrir el ticket.
                          </p>
                          {!showCierrePanel ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                className="btn btn-success"
                                style={{
                                  flex: 1,
                                  padding: "10px",
                                  fontWeight: "600",
                                }}
                                onClick={() => setShowCierrePanel(true)}
                              >
                                Confirmar y Cerrar Definitivamente
                              </button>
                              <button
                                type="button"
                                className="btn btn-warning"
                                style={{
                                  flex: 1,
                                  padding: "10px",
                                  fontWeight: "600",
                                  background: "#f59e0b",
                                  color: "white",
                                }}
                                onClick={handleReabrirTicket}
                                disabled={isUpdating}
                              >
                                Reabrir Ticket (Asignar a N1)
                              </button>
                            </div>
                          ) : (
                            <div className="cierre-rapido-panel animate-fade">
                              <label
                                className="form-label"
                                style={{
                                  color: "#047857",
                                  fontWeight: "600",
                                  marginBottom: "8px",
                                  display: "block",
                                }}
                              >
                                OBSERVACIONES DEL CIERRE DE N1 (OBLIGATORIO) *
                              </label>
                              <textarea
                                className="form-control textarea-field"
                                placeholder="Confirmación con el usuario y detalles de cierre..."
                                rows={3}
                                value={cierreObs}
                                onChange={(e) => setCierreObs(e.target.value)}
                                required
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  marginBottom: "12px",
                                }}
                              />
                              <div style={{ marginBottom: "12px" }}>
                                <label
                                  style={{
                                    fontSize: "12px",
                                    color: "#047857",
                                    fontWeight: "600",
                                    marginBottom: "4px",
                                    display: "block",
                                  }}
                                >
                                  ADJUNTAR EVIDENCIAS DEL CIERRE (OPCIONAL)
                                </label>
                                <input
                                  type="file"
                                  id="cierre-files-input-n1"
                                  multiple
                                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      const newF = Array.from(e.target.files);
                                      setCierreFiles((prev) => [
                                        ...prev,
                                        ...newF,
                                      ]);
                                      e.target.value = "";
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="cierre-files-input-n1"
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                  }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="14"
                                    height="14"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                  </svg>
                                  Seleccionar archivos de evidencia
                                </label>

                                {cierreFiles.length > 0 && (
                                  <div className="selected-files-list mt-2">
                                    {cierreFiles.map((file, idx) => (
                                      <div key={idx} className="file-chip">
                                        <span className="file-chip-name">
                                          {file.name}
                                        </span>
                                        <span className="file-chip-size">
                                          ({formatFileSize(file.size)})
                                        </span>
                                        <button
                                          type="button"
                                          className="file-chip-remove"
                                          onClick={() =>
                                            setCierreFiles((prev) =>
                                              prev.filter((_, i) => i !== idx),
                                            )
                                          }
                                        >
                                          &times;
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                  type="button"
                                  className="btn btn-success"
                                  onClick={handleCerrarTicketConfirmado}
                                  disabled={isUpdating}
                                  style={{
                                    flex: 1,
                                    background: "#10b981",
                                    border: "none",
                                    color: "white",
                                    fontWeight: "600",
                                    padding: "8px",
                                  }}
                                >
                                  {isUpdating
                                    ? "Cerrando..."
                                    : "Confirmar Cierre (Finalizado)"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    setShowCierrePanel(false);
                                    setCierreObs("");
                                    setCierreFiles([]);
                                  }}
                                  style={{ flex: 0.5, padding: "8px" }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            border: "1px solid rgba(16,185,129,0.2)",
                            background: "rgba(16,185,129,0.04)",
                            padding: "16px",
                            borderRadius: "12px",
                          }}
                        >
                          {!showCierrePanel ? (
                            <button
                              type="button"
                              className="btn btn-success"
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                background: "#10b981",
                                border: "none",
                                color: "white",
                                fontWeight: "600",
                                padding: "10px",
                              }}
                              onClick={() => setShowCierrePanel(true)}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="16"
                                height="16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              {selectedTicket.estado === "Elevado a Proveedor"
                                ? "Finalizar / Cerrar Ticket con Solución (SLA Pausado)"
                                : isTechN2
                                  ? "Resolver Ticket (Devolver a N1)"
                                  : "Finalizar / Cerrar Ticket con Solución"}
                            </button>
                          ) : (
                            <div className="cierre-rapido-panel animate-fade">
                              <label
                                className="form-label"
                                style={{
                                  color: "#047857",
                                  fontWeight: "600",
                                  marginBottom: "8px",
                                  display: "block",
                                }}
                              >
                                OBSERVACIONES DE LA SOLUCIÓN (OBLIGATORIO) *
                              </label>
                              <textarea
                                className="form-control textarea-field"
                                placeholder="Escribe la solución detallada aplicada para poder cerrar el ticket..."
                                rows={3}
                                value={cierreObs}
                                onChange={(e) => setCierreObs(e.target.value)}
                                required
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  marginBottom: "12px",
                                }}
                              />

                              <div style={{ marginBottom: "12px" }}>
                                <label
                                  style={{
                                    fontSize: "12px",
                                    color: "#047857",
                                    fontWeight: "600",
                                    marginBottom: "4px",
                                    display: "block",
                                  }}
                                >
                                  ADJUNTAR EVIDENCIAS DE LA SOLUCIÓN (OPCIONAL)
                                </label>
                                <input
                                  type="file"
                                  id="cierre-files-input-tech"
                                  multiple
                                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      const newF = Array.from(e.target.files);
                                      setCierreFiles((prev) => [
                                        ...prev,
                                        ...newF,
                                      ]);
                                      e.target.value = "";
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="cierre-files-input-tech"
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                  }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="14"
                                    height="14"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                  </svg>
                                  Seleccionar archivos de evidencia
                                </label>

                                {cierreFiles.length > 0 && (
                                  <div className="selected-files-list mt-2">
                                    {cierreFiles.map((file, idx) => (
                                      <div key={idx} className="file-chip">
                                        <span className="file-chip-name">
                                          {file.name}
                                        </span>
                                        <span className="file-chip-size">
                                          ({formatFileSize(file.size)})
                                        </span>
                                        <button
                                          type="button"
                                          className="file-chip-remove"
                                          onClick={() =>
                                            setCierreFiles((prev) =>
                                              prev.filter((_, i) => i !== idx),
                                            )
                                          }
                                        >
                                          &times;
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                  type="button"
                                  className="btn btn-success"
                                  onClick={handleCerrarTicketConfirmado}
                                  disabled={isUpdating}
                                  style={{
                                    flex: 1,
                                    background: "#10b981",
                                    border: "none",
                                    color: "white",
                                    fontWeight: "600",
                                    padding: "8px",
                                  }}
                                >
                                  {isUpdating
                                    ? "Procesando..."
                                    : isTechN2
                                      ? "Marcar como Resuelto (Devolver a N1)"
                                      : "Confirmar Cierre (Finalizado)"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    setShowCierrePanel(false);
                                    setCierreObs("");
                                    setCierreFiles([]);
                                  }}
                                  style={{ flex: 0.5, padding: "8px" }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        padding: "14px",
                        borderRadius: "10px",
                        color: "#475569",
                        fontSize: "13px",
                        marginBottom: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <span>
                        <strong>Ticket Cerrado:</strong> Este requerimiento ha
                        sido concluido y cerrado definitivamente.
                      </span>
                      {!isReadOnlyForUser && (
                        <button
                          type="button"
                          className="btn btn-warning"
                          style={{
                            background: "#f59e0b",
                            borderColor: "#f59e0b",
                            color: "white",
                            padding: "6px 12px",
                            fontSize: "12px",
                          }}
                          onClick={handleReabrirTicket}
                          disabled={isUpdating}
                        >
                          Reabrir Ticket
                        </button>
                      )}
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group half">
                      <label className="form-label">TÉCNICO TI ASIGNADO</label>
                      {user.rol === "ADMIN" || user.rol === "SUPERVISOR" ? (
                        <select
                          className="form-control"
                          value={editTechId}
                          onChange={(e) =>
                            setEditTechId(Number(e.target.value))
                          }
                        >
                          <option value="0">Seleccionar Técnico...</option>
                          {technicians.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nombre_completo}{" "}
                              {t.nivel_soporte ? `(${t.nivel_soporte})` : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          className="static-field-value"
                          style={{
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                          >
                            <rect
                              x="2"
                              y="3"
                              width="20"
                              height="14"
                              rx="2"
                              ry="2"
                            ></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                          </svg>
                          {technicians.find((t) => t.id === editTechId)
                            ?.nombre_completo || "Sin técnico asignado"}
                        </div>
                      )}
                    </div>

                    <div className="form-group half">
                      <label className="form-label">ÁREA / SOLICITANTE</label>
                      <div
                        className="static-field-value"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0 }}
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        {selectedTicket.persona_solicitante ||
                          "Sin especificar"}{" "}
                        ({selectedTicket.area_solicitante || "General"})
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      OBSERVACIONES / BITÁCORA TÉCNICA
                    </label>
                    <textarea
                      className="form-control textarea-field"
                      placeholder="Agrega notas sobre la solución aplicada o la bitácora de soporte..."
                      rows={3}
                      value={editObs}
                      onChange={(e) => setEditObs(e.target.value)}
                    />
                  </div>

                  {Array.isArray((selectedTicket as any).bitacora_dinamica) &&
                    (selectedTicket as any).bitacora_dinamica.length > 0 && (
                      <div className="bitacora-timeline mt-3">
                        <strong
                          style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "13px",
                            color: "var(--text-main, #334155)",
                          }}
                        >
                          Historial del Ticket:
                        </strong>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            maxHeight: "220px",
                            overflowY: "auto",
                            paddingRight: "4px",
                          }}
                        >
                          {(selectedTicket as any).bitacora_dinamica.map(
                            (item: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  background: "rgba(139, 92, 246, 0.06)",
                                  borderLeft: "3px solid #8b5cf6",
                                  padding: "10px 14px",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "4px",
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>
                                    {item.usuario || "Sistema"}
                                  </span>
                                  <span
                                    style={{ fontSize: "10px", opacity: 0.7 }}
                                  >
                                    {item.fecha
                                      ? new Date(item.fecha).toLocaleString()
                                      : ""}
                                  </span>
                                </div>
                                <div style={{ color: "#334155" }}>
                                  {item.accion}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="user-view-only-section">
                  <h4 className="section-title mt-3">
                    Estado y Bitácora de la Solución
                  </h4>
                  <div
                    className="static-progress-details mt-2"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <span>
                      Técnico Responsable:{" "}
                      <strong>
                        {selectedTicket.tecnico_nombre ||
                          "Asignación automática programada"}
                      </strong>
                    </span>
                    {selectedTicket.tecnico_n1_nombre && (
                      <span>
                        Técnico N1 de Origen:{" "}
                        <strong>{selectedTicket.tecnico_n1_nombre}</strong>
                      </span>
                    )}
                  </div>
                  {selectedTicket.observaciones && (
                    <div
                      className="observations-box mt-3"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <strong>Observaciones de Solución / Cierre:</strong>
                      <p style={{ marginTop: "6px", whiteSpace: "pre-wrap" }}>
                        {selectedTicket.observaciones}
                      </p>
                    </div>
                  )}

                  {Array.isArray((selectedTicket as any).bitacora_dinamica) &&
                    (selectedTicket as any).bitacora_dinamica.length > 0 && (
                      <div className="bitacora-timeline mt-3">
                        <strong
                          style={{ display: "block", marginBottom: "8px" }}
                        >
                          Historial Completo de Bitácora:
                        </strong>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            maxHeight: "220px",
                            overflowY: "auto",
                            paddingRight: "4px",
                          }}
                        >
                          {(selectedTicket as any).bitacora_dinamica.map(
                            (item: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  background: "rgba(139, 92, 246, 0.06)",
                                  borderLeft: "3px solid #8b5cf6",
                                  padding: "10px 14px",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "4px",
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>
                                    {item.usuario || "Sistema"}
                                  </span>
                                  <span
                                    style={{ fontSize: "10px", opacity: 0.7 }}
                                  >
                                    {item.fecha
                                      ? new Date(item.fecha).toLocaleString()
                                      : ""}
                                  </span>
                                </div>
                                <div>{item.accion}</div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* SECCIÓN DE ARCHIVOS Y EVIDENCIAS ADJUNTAS */}
              {renderTicketAdjuntos(selectedTicket)}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedTicket(null)}
                >
                  Cerrar
                </button>

                {/* Escalar a N2 (Solo para tickets N1 activos) */}
                {!isReadOnlyForUser &&
                  (selectedTicket.nivel_soporte === "N1" ||
                    !selectedTicket.nivel_soporte) &&
                  (user?.rol === "ADMIN" ||
                    user?.rol === "SUPERVISOR" ||
                    user?.rol === "TECNICO") &&
                  selectedTicket.estado !== "Cerrado" &&
                  selectedTicket.estado !== "Finalizada" &&
                  selectedTicket.estado !== "Elevado a Proveedor" && (
                    <button
                      type="button"
                      className="btn btn-warning"
                      style={{
                        background: "#8b5cf6",
                        borderColor: "#8b5cf6",
                        color: "white",
                      }}
                      onClick={() => {
                        setEscalarGrupo("Infraestructura");
                        setEscalarTechId(0);
                        setShowEscalarModal(true);
                      }}
                      disabled={isUpdating}
                    >
                      Escalar a N2 (Especialista)
                    </button>
                  )}

                {/* Escalar a Nivel Administración (Exclusivo Supervisores y Administradores) */}
                {!isReadOnlyForUser &&
                  (user?.rol === "SUPERVISOR" || user?.rol === "ADMIN") &&
                  selectedTicket.nivel_soporte !== "ADMIN" &&
                  selectedTicket.estado !== "Cerrado" &&
                  selectedTicket.estado !== "Finalizada" &&
                  selectedTicket.estado !== "Resuelto" && (
                    <button
                      type="button"
                      className="btn"
                      style={{
                        background: "#6366f1",
                        borderColor: "#6366f1",
                        color: "white",
                        fontWeight: "600",
                      }}
                      onClick={() => {
                        setEscalarAdminTechId(0);
                        setShowEscalarAdminModal(true);
                      }}
                      disabled={isUpdating}
                    >
                      Escalar a Gerencia TI
                    </button>
                  )}

                {/* Elevar a N3 / Proveedor (Técnicos N1, N2, Admin, Supervisor) */}
                {!isReadOnlyForUser &&
                  (user?.rol === "ADMIN" ||
                    user?.rol === "SUPERVISOR" ||
                    user?.rol === "TECNICO") &&
                  selectedTicket.estado !== "Elevado a Proveedor" &&
                  selectedTicket.estado !== "Cerrado" &&
                  selectedTicket.estado !== "Finalizada" &&
                  selectedTicket.estado !== "Resuelto" && (
                    <button
                      type="button"
                      className="btn"
                      style={{
                        background: "#d97706",
                        borderColor: "#d97706",
                        color: "white",
                      }}
                      onClick={handleEscalarAProveedor}
                      disabled={isUpdating}
                    >
                      Elevar a Proveedor (N3)
                    </button>
                  )}

                {!isReadOnlyForUser &&
                  (user?.rol === "ADMIN" ||
                    user?.rol === "SUPERVISOR" ||
                    user?.rol === "TECNICO") && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          background: "rgba(37,99,235,0.08)",
                          color: "#2563eb",
                          border: "1px solid rgba(37,99,235,0.2)",
                          fontWeight: "600",
                        }}
                        onClick={() => handleOpenKBFromTicket(selectedTicket)}
                        title="Convertir esta solución en una guía para la Base de Conocimientos"
                      >
                        Publicar en Base de Conocimientos
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Guardando..." : "Guardar Cambios"}
                      </button>
                    </>
                  )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showEscalarModal && (
        <div
          className="modal-backdrop animate-fade"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
        >
          <div
            className="glass-panel animate-slide-up"
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "16px" }}>
                Escalar Ticket a Nivel 2
              </h4>
              <button
                type="button"
                onClick={() => setShowEscalarModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-muted)",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleEscalarN2Submit}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div className="form-group">
                <label className="form-label">SELECCIONE GRUPO N2 *</label>
                <select
                  className="form-control"
                  value={escalarGrupo}
                  onChange={(e) => {
                    setEscalarGrupo(e.target.value as any);
                    setEscalarTechId(0);
                  }}
                  disabled={isUpdating}
                  required
                >
                  <option value="Infraestructura">Infraestructura</option>
                  <option value="Desarrollo">Desarrollo</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  ASIGNAR A TÉCNICO ESPECÍFICO (DE ESTA SEDE)
                </label>
                <select
                  className="form-control"
                  value={escalarTechId}
                  onChange={(e) => setEscalarTechId(Number(e.target.value))}
                  disabled={isUpdating}
                >
                  <option value="0">
                    Auto-asignación (Balanceo de Carga en Sede)
                  </option>
                  {(() => {
                    const ticketEmpId =
                      selectedTicket?.empresa_id != null
                        ? Number(selectedTicket.empresa_id)
                        : null;
                    const ticketSucId =
                      selectedTicket?.sucursal_id != null
                        ? Number(selectedTicket.sucursal_id)
                        : null;

                    const filtered = technicians.filter((t) => {
                      if (t.grupo_n2 !== escalarGrupo) return false;

                      const techEmpIds = Array.isArray(t.empresa_ids)
                        ? t.empresa_ids.map(Number)
                        : [];
                      const techSucIds = Array.isArray(t.sucursal_ids)
                        ? t.sucursal_ids.map(Number)
                        : [];

                      // 1. Si el técnico tiene sucursales asignadas específicamente (ej: Scala o Condado)
                      if (techSucIds.length > 0) {
                        if (ticketSucId) {
                          if (!techSucIds.includes(ticketSucId)) return false;
                        } else if (ticketEmpId) {
                          const currentEmp = empresas.find(
                            (e) => Number(e.id) === ticketEmpId,
                          );
                          const empSucIds = (currentEmp?.sucursales || []).map(
                            (s) => Number(s.id),
                          );
                          if (empSucIds.length > 0) {
                            const hasMatch = techSucIds.some((sId) =>
                              empSucIds.includes(sId),
                            );
                            if (!hasMatch) return false;
                          }
                        }
                      }

                      // 2. Si el técnico tiene empresas asignadas específicamente
                      if (techEmpIds.length > 0 && ticketEmpId) {
                        if (!techEmpIds.includes(ticketEmpId)) return false;
                      }

                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <option value="-1" disabled>
                          Sin técnicos N2 de {escalarGrupo} asignados a esta
                          sede
                        </option>
                      );
                    }

                    return filtered.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre_completo}
                      </option>
                    ));
                  })()}
                </select>
                {selectedTicket?.empresa_nombre && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-muted, #64748b)",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    Técnicos N2 con acceso a {selectedTicket.empresa_nombre}
                    {selectedTicket.sucursal_nombre
                      ? ` (${selectedTicket.sucursal_nombre})`
                      : ""}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowEscalarModal(false)}
                  disabled={isUpdating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    background: "#8b5cf6",
                    borderColor: "#8b5cf6",
                    color: "white",
                  }}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Escalando..." : "Confirmar Escalación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEscalarAdminModal && (
        <div
          className="modal-backdrop animate-fade"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
        >
          <div
            className="glass-panel animate-slide-up"
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "16px" }}>
                Escalar Ticket a Nivel Administración
              </h4>
              <button
                type="button"
                onClick={() => setShowEscalarAdminModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-muted)",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleEscalarAdminSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div className="form-group">
                <label className="form-label">
                  SELECCIONAR ADMINISTRADOR DESTINO
                </label>
                <select
                  className="form-control"
                  value={escalarAdminTechId}
                  onChange={(e) =>
                    setEscalarAdminTechId(Number(e.target.value))
                  }
                  disabled={isUpdating}
                >
                  <option value="0">
                    Auto-asignación (Balanceo entre Administradores Habilitados)
                  </option>
                  {technicians
                    .filter(
                      (t) =>
                        t.rol === "ADMIN" &&
                        (t.recibir_escalado_admin ?? 1) === 1,
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre_completo}
                      </option>
                    ))}
                </select>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--color-text-muted, #64748b)",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Únicamente se muestran los administradores habilitados para
                  recibir escalamientos desde base de datos.
                </span>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowEscalarAdminModal(false)}
                  disabled={isUpdating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    background: "#6366f1",
                    borderColor: "#6366f1",
                    color: "white",
                  }}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Escalando..." : "Confirmar Escalación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Publishing Ticket Solution to Knowledge Base */}
      {showKBModal && (
        <div
          className="modal-backdrop animate-fade"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15,23,42,0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1200,
            padding: "20px",
          }}
        >
          <div
            className="modal-container glass-panel animate-slide-up"
            style={{
              width: "100%",
              maxWidth: "620px",
              background: "#ffffff",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#0f172a",
                }}
              >
                Publicar en la Base de Conocimientos
              </h3>
              <button
                type="button"
                onClick={() => setShowKBModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePublishKB} style={{ padding: "20px" }}>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Título del Artículo *
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={kbTitle}
                  onChange={(e) => setKbTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Categoría *
                </label>
                <select
                  className="form-control"
                  value={kbCat}
                  onChange={(e) => setKbCat(e.target.value)}
                  required
                >
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Paso a Paso / Solución Detallada *
                </label>
                <textarea
                  className="form-control"
                  rows={8}
                  value={kbSteps}
                  onChange={(e) => setKbSteps(e.target.value)}
                  required
                  style={{
                    resize: "vertical",
                    fontFamily: "inherit",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowKBModal(false)}
                  disabled={isPublishingKB}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isPublishingKB}
                  style={{ background: "#2563eb" }}
                >
                  {isPublishingKB ? "Publicando..." : "Publicar Guía Global"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX PARA PREVISUALIZAR IMÁGENES / CAPTURAS EN TAMAÑO COMPLETO */}
      {previewImageUrl && (
        <div
          className="image-lightbox-modal animate-fade"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="image-lightbox-content animate-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="image-lightbox-close"
              onClick={() => setPreviewImageUrl(null)}
            >
              &times;
            </button>
            <img src={previewImageUrl} alt="Evidencia en tamaño completo" />
            <div
              style={{
                marginTop: "14px",
                display: "flex",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="btn btn-primary btn-sm"
                style={{
                  background: "#6366f1",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  textDecoration: "none",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Descargar Imagen Original
              </a>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPreviewImageUrl(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
