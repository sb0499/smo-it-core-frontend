import { showAlert, showConfirm } from '../utils/alerts';
import React, { useEffect, useState } from 'react';
import { formatLocalDateSimple } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import { 
  projectService, 
  Proyecto, 
  Tarea, 
  Subtarea, 
  ProyectoComentario, 
  ProyectoArchivo, 
  ProyectoHistorial,
  User
} from '../services/project.service';
import './Proyectos.css';

export const Proyectos: React.FC = () => {
  const { user } = useAuth();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [activeProyecto, setActiveProyecto] = useState<Proyecto | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // New comments & uploads state
  const [newComment, setNewComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Add task / subtask models trigger
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjDate, setNewProjDate] = useState('');
  const [newProjType, setNewProjType] = useState('Infraestructura');

  // Add task / subtask models trigger
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskResponsableId, setTaskResponsableId] = useState<number>(0);

  const [showAddSubtaskModal, setShowAddSubtaskModal] = useState(false);
  const [selectedTaskForSubtask, setSelectedTaskForSubtask] = useState<Tarea | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDesc, setSubtaskDesc] = useState('');
  const [subtaskDate, setSubtaskDate] = useState('');
  const [subtaskResponsableId, setSubtaskResponsableId] = useState<number>(0);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsModalData, setCommentsModalData] = useState<{ type: 'task' | 'subtask'; id: number; title: string; comments: ProyectoComentario[]; responsableId: number } | null>(null);
  const [newTaskSubComment, setNewTaskSubComment] = useState('');

  // New Project Member state
  const [selectedMiembros, setSelectedMiembros] = useState<number[]>([]);

  // Autocomplete @mention states
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [activeInputType, setActiveInputType] = useState<'project' | 'task-sub' | null>(null);
  const [filteredTechs, setFilteredTechs] = useState<User[]>([]);
  const [dropdownIndex, setDropdownIndex] = useState(0);

  // Load technicians once on mount
  useEffect(() => {
    projectService.getUsuarios()
      .then(res => {
        setTechnicians(res.filter(u => u.rol === 'TECNICO' || u.rol === 'ADMIN' || u.rol === 'SUPERVISOR'));
      })
      .catch(err => console.error('Error loading users:', err));
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch paginated projects whenever page, limit or search changes
  useEffect(() => {
    fetchProjects();
  }, [page, limit, debouncedSearch]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectService.getProyectos(page, limit, debouncedSearch);
      setProyectos(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error('Error fetching projects list', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProyecto = async (id: number) => {
    try {
      setLoadingDetail(true);
      const detail = await projectService.getProyectoById(id);
      setActiveProyecto(detail);
    } catch (e) {
      showAlert('Error cargando detalles del proyecto.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjDate) return;

    try {
      await projectService.createProyecto({
        nombre: newProjName,
        descripcion: newProjDesc || null,
        fecha_fin_estimada: new Date(newProjDate).toISOString(),
        tipo_proyecto: newProjType,
        miembros: selectedMiembros.length > 0 ? JSON.stringify(selectedMiembros) : undefined,
      });

      setShowAddProjectModal(false);
      setNewProjName('');
      setNewProjDesc('');
      setNewProjDate('');
      setSelectedMiembros([]);
      
      fetchProjects();
    } catch (err: any) {
      showAlert('Error creando proyecto: ' + err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProyecto || !taskTitle || !taskDate || !taskResponsableId) return;

    try {
      await projectService.createTarea({
        proyecto_id: activeProyecto.id,
        titulo: taskTitle,
        descripcion: taskDesc || undefined,
        fecha_fin: new Date(taskDate).toISOString(),
        responsable_id: Number(taskResponsableId),
      });

      showAlert('Tarea creada exitosamente.');
      setShowAddTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskDate('');
      setTaskResponsableId(0);

      await handleSelectProyecto(activeProyecto.id);
    } catch (err: any) {
      showAlert('Error al crear tarea: ' + err.message);
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForSubtask || !subtaskTitle || !subtaskDate || !subtaskResponsableId) return;

    try {
      await projectService.createSubtarea({
        tarea_id: selectedTaskForSubtask.id,
        titulo: subtaskTitle,
        descripcion: subtaskDesc || undefined,
        fecha_fin: new Date(subtaskDate).toISOString(),
        responsable_id: Number(subtaskResponsableId),
      });

      showAlert('Subtarea creada exitosamente.');
      setShowAddSubtaskModal(false);
      setSubtaskTitle('');
      setSubtaskDesc('');
      setSubtaskDate('');
      setSubtaskResponsableId(0);
      setSelectedTaskForSubtask(null);

      if (activeProyecto) {
        await handleSelectProyecto(activeProyecto.id);
      }
    } catch (err: any) {
      showAlert('Error al crear subtarea: ' + err.message);
    }
  };

  const handleOpenCommentsModal = (data: { type: 'task' | 'subtask'; id: number; title: string; comments: ProyectoComentario[]; responsableId: number }) => {
    setCommentsModalData(data);
    setShowCommentsModal(true);
  };

  const handleAddTaskSubComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentsModalData || !newTaskSubComment || !activeProyecto) return;

    try {
      const payload: any = {
        contenido: newTaskSubComment
      };
      if (commentsModalData.type === 'task') {
        payload.tarea_id = commentsModalData.id;
      } else {
        payload.subtarea_id = commentsModalData.id;
      }

      await projectService.addComentario(payload);
      setNewTaskSubComment('');
      
      const detail = await projectService.getProyectoById(activeProyecto.id);
      setActiveProyecto(detail);
      
      const updatedTaskOrSub = commentsModalData.type === 'task'
        ? detail.tareas?.find((t: any) => t.id === commentsModalData.id)
        : detail.tareas?.flatMap((t: any) => t.subtareas || []).find((s: any) => s.id === commentsModalData.id);
        
      if (updatedTaskOrSub) {
        setCommentsModalData({
          ...commentsModalData,
          comments: updatedTaskOrSub.comentarios || []
        });
      }
      showAlert('Comentario agregado exitosamente.');
    } catch (err: any) {
      showAlert(err.response?.data?.detail || 'Error al agregar comentario.');
    }
  };

  const handleSubtaskToggle = async (sub: Subtarea, isChecked: boolean) => {
    if (!activeProyecto) return;

    try {
      const nextEstado = isChecked ? 'Finalizado' : 'Sin Iniciar';
      const nextAvance = isChecked ? 100 : 0;
      
      await projectService.updateSubtarea(sub.id, {
        estado: nextEstado,
        avance_porcentaje: nextAvance
      });

      // Reload project detail to compute parent tasks/project progress updates
      handleSelectProyecto(activeProyecto.id);
    } catch (err: any) {
      showAlert('Error actualizando subtarea: ' + err.message);
    }
  };

  // Autocomplete @mention helpers
  const checkMentionTrigger = (text: string, selectionStart: number, inputType: 'project' | 'task-sub') => {
    const textBeforeCursor = text.substring(0, selectionStart);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9._-]*)$/);
    
    if (match) {
      const query = match[1];
      const startIndex = match.index!;
      setMentionQuery(query);
      setMentionStartIndex(startIndex);
      setActiveInputType(inputType);
      setDropdownIndex(0);
      
      const filtered = technicians.filter(t => 
        t.nombre_completo.toLowerCase().includes(query.toLowerCase()) ||
        t.email.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredTechs(filtered);
    } else {
      setMentionQuery(null);
      setMentionStartIndex(-1);
      setActiveInputType(null);
      setFilteredTechs([]);
    }
  };

  const selectUserMention = (targetUser: User) => {
    if (mentionStartIndex === -1 || activeInputType === null) return;
    
    const emailPrefix = targetUser.email.split('@')[0];
    const mentionText = `@${emailPrefix} `;
    
    if (activeInputType === 'project') {
      const textBefore = newComment.substring(0, mentionStartIndex);
      const textAfter = newComment.substring(mentionStartIndex + (mentionQuery || '').length + 1);
      const newValue = textBefore + mentionText + textAfter;
      setNewComment(newValue);
    } else if (activeInputType === 'task-sub') {
      const textBefore = newTaskSubComment.substring(0, mentionStartIndex);
      const textAfter = newTaskSubComment.substring(mentionStartIndex + (mentionQuery || '').length + 1);
      const newValue = textBefore + mentionText + textAfter;
      setNewTaskSubComment(newValue);
    }
    
    setMentionQuery(null);
    setMentionStartIndex(-1);
    setActiveInputType(null);
    setFilteredTechs([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, inputType: 'project' | 'task-sub') => {
    if (mentionQuery !== null && filteredTechs.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDropdownIndex(prev => (prev + 1) % filteredTechs.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDropdownIndex(prev => (prev - 1 + filteredTechs.length) % filteredTechs.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectUserMention(filteredTechs[dropdownIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment || !activeProyecto) return;

    try {
      await projectService.addComentario({
        proyecto_id: activeProyecto.id,
        contenido: newComment
      });
      setNewComment('');
      handleSelectProyecto(activeProyecto.id);
    } catch (err: any) {
      showAlert('Error agregando comentario.');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !activeProyecto) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('proyecto_id', String(activeProyecto.id));
      formData.append('archivo', selectedFile);

      await projectService.addArchivo(formData);
      setSelectedFile(null);
      
      // Reset input element
      const fileInput = document.getElementById('project-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      handleSelectProyecto(activeProyecto.id);
    } catch (err: any) {
      showAlert('Error cargando archivo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseProject = () => {
    setActiveProyecto(null);
    fetchProjects();
  };

  const handleFinishProject = async (proj: Proyecto) => {
    if (!await showConfirm(`¿Estás seguro de finalizar el proyecto "${proj.nombre}"?`)) return;
    try {
      await projectService.updateProyecto(proj.id, { estado: 'Finalizado' });
      showAlert('Proyecto finalizado exitosamente.');
      handleSelectProyecto(proj.id);
    } catch (e: any) {
      showAlert('Error al finalizar proyecto: ' + e.message);
    }
  };

  const handleFinishTask = async (task: Tarea) => {
    if (!await showConfirm(`¿Estás seguro de finalizar la tarea "${task.titulo}"?`)) return;
    try {
      await projectService.updateTarea(task.id, { estado: 'Finalizado', avance_porcentaje: 100 });
      showAlert('Tarea finalizada exitosamente.');
      if (activeProyecto) handleSelectProyecto(activeProyecto.id);
    } catch (e: any) {
      showAlert('Error al finalizar tarea: ' + e.message);
    }
  };
  // Parse project members for initials avatars display
  let memberIds: number[] = [];
  try {
    memberIds = activeProyecto && activeProyecto.miembros ? JSON.parse(activeProyecto.miembros) : [];
  } catch (err) {}
  const projectMembers = technicians.filter(t => memberIds.includes(t.id));
  
  const isUserProjectMember = projectMembers.some(m => m.id === user?.id);
  const isUserProjectCreator = activeProyecto?.creador_id === user?.id;
  const isUserAdmin = user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR';
  const isUserAuthorized = isUserAdmin || isUserProjectCreator || isUserProjectMember;

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="proyectos-container animate-fade">
      {/* Dynamic project overview or detail */}
      {!activeProyecto ? (
        /* PROJECTS LIST OVERVIEW */
        <>
          <div className="projects-header-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 4px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-main)' }}>Portafolio de Proyectos Activos</h2>
            <button className="btn btn-primary" onClick={() => setShowAddProjectModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Crear Proyecto
            </button>
          </div>

          {/* Search bar */}
          <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre, descripción del proyecto o ticket de origen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%' }}
              />
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-dim)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <button className="btn btn-secondary" onClick={fetchProjects}>
              Actualizar
            </button>
          </div>

          {loading ? (
            <div className="dashboard-loading">
              <div className="loader"></div>
              <p className="text-muted">Leyendo cronograma de proyectos...</p>
            </div>
          ) : proyectos.length === 0 ? (
            <div className="empty-panel glass-panel text-center py-5">
              <span className="empty-big-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-dim)' }}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              </span>
              <h3>No hay proyectos registrados</h3>
              <p className="text-muted">Comienza creando tu primer proyecto colaborativo.</p>
            </div>
          ) : (
            <>
              <div className="projects-grid mt-4">
                {proyectos.map((p) => (
                  <div 
                    key={p.id} 
                    className="project-summary-card glass-panel glass-panel-interactive animate-slide-up"
                    onClick={() => handleSelectProyecto(p.id)}
                  >
                    <div className="proj-card-header">
                      <span className="proj-tag">{p.tipo_proyecto}</span>
                      <span className={`badge badge-state-${p.estado.toLowerCase().replace(' ', '')}`}>
                        {p.estado}
                      </span>
                    </div>

                    <div className="proj-card-body mt-2">
                      <h3 className="proj-title">{p.nombre}</h3>
                      <p className="proj-desc text-muted">{p.descripcion || 'Sin descripción'}</p>
                    </div>

                    <div className="proj-card-footer mt-4">
                      <div className="progress-bar-labeled">
                        <div className="prog-label">
                          <span>Progreso</span>
                          <span>{p.avance_porcentaje}%</span>
                        </div>
                        <div className="proj-track">
                          <div className="proj-fill" style={{ width: `${p.avance_porcentaje}%` }}></div>
                        </div>
                      </div>

                      <div className="proj-dates text-muted font-xs mt-2" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Término: {formatLocalDateSimple(p.fecha_fin_estimada)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {proyectos.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '0 4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    style={{ cursor: page === 1 ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: '12px' }}
                  >
                    Anterior
                  </button>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-main)', fontWeight: '500' }}>
                    Página {page} de {totalPages} ({total} registros)
                  </span>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    style={{ cursor: page >= totalPages ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: '12px' }}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* PROJECT DETAIL VIEW */
        <div className="project-detail-layout animate-fade">
          {/* Unified Clean Header */}
          <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', padding: '0 4px', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <div className="header-left">
              <button className="back-btn-trigger" onClick={handleCloseProject} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Volver a Proyectos
              </button>
              <h2 className="project-name mt-2" style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '8px 0 4px 0' }}>{activeProyecto.nombre}</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="badge" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Categoría: {activeProyecto.tipo_proyecto}</span>
                <span className={`badge badge-state-${activeProyecto.estado.toLowerCase().replace(' ', '')}`} style={{ fontSize: '10px' }}>{activeProyecto.estado}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                <span style={{ fontSize: '10.5px', color: '#64748b', marginRight: '4px', fontWeight: '500' }}>Equipo:</span>
                {projectMembers.map(m => {
                  const initials = m.nombre_completo.split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={m.id} className="comment-avatar" style={{ width: '22px', height: '22px', fontSize: '9px', background: '#eff6ff', border: '1px solid #dbeafe' }} title={m.nombre_completo}>
                      {initials}
                    </div>
                  );
                })}
                {projectMembers.length === 0 && <span style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic' }}>Sin miembros asignados</span>}
              </div>
            </div>
            <div className="header-right" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {(!activeProyecto.tareas || activeProyecto.tareas.length === 0) && activeProyecto.estado !== 'Finalizado' && (
                <button className="btn btn-secondary" onClick={() => handleFinishProject(activeProyecto)} style={{ height: 'fit-content' }}>
                  Terminar Proyecto
                </button>
              )}
              <div className="detail-circular-progress">
                <span className="progress-big-val">{activeProyecto.avance_porcentaje}%</span>
                <span className="progress-lbl">Completado</span>
              </div>
            </div>
          </div>

          <div className="project-grid-columns">
            {/* Column 1: Tasks & Subtasks (Kanban accordion) */}
            <div className="project-column-left" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="column-title" style={{ fontSize: '14px', fontWeight: '600', color: '#334155', border: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2563eb' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                  Lista de Tareas y Subtareas
                </h3>
                {activeProyecto.estado !== 'Finalizado' && isUserAuthorized && (
                  <button className="btn btn-primary" onClick={() => { setTaskDate(new Date(activeProyecto.fecha_fin_estimada).toISOString().split('T')[0]); setShowAddTaskModal(true); }} style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Agregar Tarea
                  </button>
                )}
              </div>

              {loadingDetail ? (
                <div className="loader-detail"></div>
              ) : !activeProyecto.tareas || activeProyecto.tareas.length === 0 ? (
                <div className="glass-panel text-center py-5">
                  <p className="text-muted">No hay tareas programadas para este proyecto.</p>
                </div>
              ) : (
                <div className="project-tasks-list">
                  {activeProyecto.tareas.map((task) => (
                    <div key={task.id} className={`task-block glass-panel task-block-${task.estado.toLowerCase().replace(' ', '')}`}>
                      <div className="task-header">
                        <div className="task-title-group">
                          <span className="task-title">{task.titulo}</span>
                          <span className="task-assignee text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            {task.responsable_nombre}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            type="button"
                            className="task-action-btn" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => handleOpenCommentsModal({ type: 'task', id: task.id, title: task.titulo, comments: task.comentarios || [], responsableId: task.responsable_id })}
                            title="Comentarios de la tarea"
                          >
                            💬 {task.comentarios?.length || 0}
                          </button>
                          {task.estado !== 'Finalizado' && (isUserAuthorized || task.responsable_id === user?.id) && (
                            <button 
                              className="task-action-btn task-action-btn-primary" 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                              onClick={() => { setSelectedTaskForSubtask(task); setSubtaskDate(new Date(task.fecha_fin || activeProyecto.fecha_fin_estimada).toISOString().split('T')[0]); setShowAddSubtaskModal(true); }}
                            >
                              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                              + Subtarea
                            </button>
                          )}
                          {(!task.subtareas || task.subtareas.length === 0) && task.estado !== 'Finalizado' && (
                            <button 
                              className="task-action-btn task-action-btn-success" 
                              onClick={() => handleFinishTask(task)}
                            >
                              Terminar
                            </button>
                          )}
                          <span className={`badge badge-state-${task.estado.toLowerCase().replace(' ', '')}`} style={{ fontSize: '10.5px' }}>
                            {task.estado} ({task.avance_porcentaje}%)
                          </span>
                        </div>
                      </div>
                      
                      {task.descripcion && <p className="task-desc-text text-muted">{task.descripcion}</p>}

                      {/* Subtasks listing */}
                      <div className="subtasks-container">
                        <span className="subtasks-title">Subtareas</span>
                        {!task.subtareas || task.subtareas.length === 0 ? (
                          <p className="font-xs text-muted italic mt-1">Sin subtareas.</p>
                        ) : (
                          <div className="subtasks-list mt-2">
                            {task.subtareas.map((sub) => (
                              <div key={sub.id} className="subtask-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                  <label className="subtask-checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <input
                                      type="checkbox"
                                      className="subtask-checkbox"
                                      checked={sub.estado === 'Finalizado' || sub.avance_porcentaje === 100}
                                      onChange={(e) => handleSubtaskToggle(sub, e.target.checked)}
                                    />
                                    <span className={`subtask-title-text ${sub.estado === 'Finalizado' ? 'crossed' : ''}`}>
                                      {sub.titulo}
                                    </span>
                                  </label>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <button 
                                      type="button"
                                      className="task-action-btn"
                                      style={{ padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                      onClick={() => handleOpenCommentsModal({ type: 'subtask', id: sub.id, title: sub.titulo, comments: sub.comentarios || [], responsableId: sub.responsable_id })}
                                      title="Comentarios de la subtarea"
                                    >
                                      💬 {sub.comentarios?.length || 0}
                                    </button>
                                    <span className="subtask-owner text-muted font-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                      {sub.responsable_nombre}
                                    </span>
                                  </div>
                                </div>
                                {sub.descripcion && (
                                  <p className="font-xs text-muted" style={{ margin: '2px 0 2px 22px', fontSize: '11px', fontStyle: 'italic' }}>
                                    {sub.descripcion}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Discussion and Documents */}
            <div className="project-column-right">
              {/* Discuss comments */}
              <div className="discuss-section glass-panel">
                <h3 className="column-title mb-3">Comentarios</h3>
                
                <div className="comments-timeline">
                  {!activeProyecto.comentarios || activeProyecto.comentarios.length === 0 ? (
                    <p className="text-muted text-center py-4 font-xs">No hay comentarios en este proyecto. Comparte tus notas abajo.</p>
                  ) : (
                    activeProyecto.comentarios.map((c) => {
                      const initials = (c.autor_nombre || 'Sin Nombre')
                        .split(' ')
                        .map((n: string) => n[0] || '')
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <div key={c.id} className="comment-bubble">
                          <div className="comment-avatar" title={c.autor_nombre || 'Sin Nombre'}>
                            {initials}
                          </div>
                          <div className="comment-body">
                            <div className="comment-meta">
                              <span className="comment-author">{c.autor_nombre || 'Sin Nombre'}</span>
                              <span className="comment-date text-dim">{new Date(c.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="comment-content">{c.contenido}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleAddComment} className="comment-input-form mt-3">
                  <input
                    type="text"
                    className="form-control comment-input"
                    placeholder="Escribe un comentario o menciona con @..."
                    value={newComment}
                    onChange={(e) => {
                      setNewComment(e.target.value);
                      checkMentionTrigger(e.target.value, e.target.selectionStart || 0, 'project');
                    }}
                    onKeyDown={(e) => handleKeyDown(e, 'project')}
                    onSelect={(e: any) => {
                      checkMentionTrigger(e.target.value, e.target.selectionStart || 0, 'project');
                    }}
                  />
                  <button type="submit" className="btn btn-primary btn-comment-send">Enviar</button>

                  {/* Mention Dropdown */}
                  {mentionQuery !== null && activeInputType === 'project' && filteredTechs.length > 0 && (
                    <div className="mention-dropdown">
                      {filteredTechs.map((t, idx) => (
                        <div 
                          key={t.id} 
                          className={`mention-item ${idx === dropdownIndex ? 'active' : ''}`}
                          onClick={() => selectUserMention(t)}
                        >
                          <span className="mention-item-name">{t.nombre_completo}</span>
                          <span className="mention-item-email">{t.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </form>
              </div>

              {/* Uploaded Documents */}
              <div className="files-section glass-panel mt-4">
                <h3 className="column-title mb-3">Documentos Adjuntos</h3>
                
                <div className="files-list">
                  {!activeProyecto.archivos || activeProyecto.archivos.length === 0 ? (
                    <p className="text-muted text-center py-4 font-xs">No hay archivos adjuntos en el proyecto.</p>
                  ) : (
                    activeProyecto.archivos.map((f) => (
                      <div key={f.id} className="file-row">
                        <div className="file-info-group">
                          <span className="file-icon-type" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                          </span>
                          <div className="file-text">
                            <span className="file-name">{f.nombre_original}</span>
                            <span className="file-size text-muted font-xs">Autor: {f.autor_nombre}</span>
                          </div>
                        </div>
                        <a 
                          href={projectService.getArchivoUrl(f.id)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="file-download-btn"
                          title="Descargar archivo"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </a>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleFileUpload} className="file-upload-form mt-3" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label 
                    htmlFor="project-file-input" 
                    className="btn btn-secondary" 
                    style={{ 
                      flex: 1, 
                      textAlign: 'center', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '6px', 
                      cursor: 'pointer',
                      padding: '8px 12px',
                      fontSize: '11.5px',
                      border: '1px dashed #cbd5e1',
                      background: '#f8fafc',
                      color: '#475569',
                      borderRadius: '6px',
                      transition: 'all 0.2s',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      fontWeight: 'normal'
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    {selectedFile ? selectedFile.name : 'Seleccionar archivo...'}
                  </label>
                  <input
                    type="file"
                    id="project-file-input"
                    style={{ display: 'none' }}
                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '11.5px' }} disabled={isUploading || !selectedFile}>
                    {isUploading ? 'Subiendo...' : 'Subir'}
                  </button>
                </form>
              </div>

              {/* Project Logs */}
              <div className="logs-section glass-panel mt-4">
                <h3 className="column-title mb-3">Historial de Cambios</h3>
                <div className="logs-timeline-list">
                  {!activeProyecto.historial || activeProyecto.historial.length === 0 ? (
                    <p className="text-muted font-xs">Sin registros históricos.</p>
                  ) : (
                    activeProyecto.historial.map((h) => (
                      <div key={h.id} className="log-row">
                        <span className="log-dot"></span>
                        <div className="log-text-group">
                          <span className="log-desc text-muted">{h.descripcion_cambio}</span>
                          <span className="log-time text-dim font-xs">{new Date(h.created_at).toLocaleString()}</span>
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

      {/* ADD PROJECT MODAL */}
      {showAddProjectModal && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Crear Nuevo Proyecto Colaborativo</h2>
              <button className="modal-close-btn" onClick={() => setShowAddProjectModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateProject} className="modal-form">
              <div className="form-group">
                <label className="form-label">NOMBRE DEL PROYECTO</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Migración Correo Corporativo"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">TIPO DE PROYECTO</label>
                  <select 
                    className="form-control" 
                    value={newProjType} 
                    onChange={(e) => setNewProjType(e.target.value)}
                  >
                    <option value="Infraestructura">Infraestructura</option>
                    <option value="Desarrollo">Desarrollo Software</option>
                    <option value="Seguridad">Seguridad / Redes</option>
                    <option value="Migración">Migración / Cloud</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="form-group half">
                  <label className="form-label">FECHA FIN ESTIMADA</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newProjDate}
                    onChange={(e) => setNewProjDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">DESCRIPCIÓN DEL PROYECTO</label>
                <textarea
                  className="form-control textarea-field"
                  placeholder="Describe brevemente el alcance de este proyecto..."
                  rows={3}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">ASIGNAR EQUIPO (MIEMBROS)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '120px', overflowY: 'auto', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '8px', background: '#f8fafc' }}>
                  {technicians.map((t) => (
                    <label key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={selectedMiembros.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMiembros([...selectedMiembros, t.id]);
                          } else {
                            setSelectedMiembros(selectedMiembros.filter(id => id !== t.id));
                          }
                        }}
                      />
                      {t.nombre_completo}
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProjectModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Iniciar Proyecto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TASK MODAL */}
      {showAddTaskModal && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Agregar Nueva Tarea</h2>
              <button className="modal-close-btn" onClick={() => setShowAddTaskModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateTask} className="modal-form">
              <div className="form-group">
                <label className="form-label">TÍTULO DE LA TAREA</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Instalar Firewall Fortinet"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">DESCRIPCIÓN</label>
                <textarea
                  className="form-control textarea-field"
                  placeholder="Instrucciones adicionales para la tarea..."
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">RESPONSABLE</label>
                  <select
                    className="form-control"
                    value={taskResponsableId || ''}
                    onChange={(e) => setTaskResponsableId(Number(e.target.value))}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {(projectMembers.length > 0 ? projectMembers : technicians).map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group half">
                  <label className="form-label">FECHA LÍMITE</label>
                  <input
                    type="date"
                    className="form-control"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions mt-3">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTaskModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Tarea</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SUBTASK MODAL */}
      {showAddSubtaskModal && selectedTaskForSubtask && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Agregar Subtarea</h2>
              <button className="modal-close-btn" onClick={() => { setShowAddSubtaskModal(false); setSelectedTaskForSubtask(null); }}>×</button>
            </div>

            <form onSubmit={handleCreateSubtask} className="modal-form">
              <div style={{ marginBottom: '14px', fontSize: '11px', color: '#64748b' }}>
                Tarea principal: <strong>{selectedTaskForSubtask.titulo}</strong>
              </div>

              <div className="form-group">
                <label className="form-label">TÍTULO DE LA SUBTAREA</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Respaldar configuración anterior"
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">DESCRIPCIÓN DE LA SUBTAREA</label>
                <textarea
                  className="form-control"
                  placeholder="Detalles de la subtarea (opcional)..."
                  rows={2}
                  value={subtaskDesc}
                  onChange={(e) => setSubtaskDesc(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">RESPONSABLE</label>
                  <select
                    className="form-control"
                    value={subtaskResponsableId || ''}
                    onChange={(e) => setSubtaskResponsableId(Number(e.target.value))}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {(projectMembers.length > 0 ? projectMembers : technicians).map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group half">
                  <label className="form-label">FECHA LÍMITE</label>
                  <input
                    type="date"
                    className="form-control"
                    value={subtaskDate}
                    onChange={(e) => setSubtaskDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions mt-3">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddSubtaskModal(false); setSelectedTaskForSubtask(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Subtarea</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK & SUBTASK COMMENTS MODAL */}
      {showCommentsModal && commentsModalData && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '15px', textTransform: 'capitalize' }}>Comentarios de la {commentsModalData.type === 'task' ? 'Tarea' : 'Subtarea'}</h2>
              <button className="modal-close-btn" onClick={() => { setShowCommentsModal(false); setCommentsModalData(null); setNewTaskSubComment(''); }}>×</button>
            </div>

            <div style={{ padding: '0 0 10px 0', borderBottom: '1px solid #f1f5f9', marginBottom: '12px' }}>
              <span className="text-muted font-xs">Elemento:</span> <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>{commentsModalData.title}</strong>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px', minHeight: '150px' }}>
              {commentsModalData.comments.length === 0 ? (
                <p className="text-muted font-xs italic text-center py-4">No hay comentarios en este elemento aún.</p>
              ) : (
                commentsModalData.comments.map((c) => {
                  const initials = (c.autor_nombre || 'Sin Nombre')
                    .split(' ')
                    .map((n: string) => n[0] || '')
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div key={c.id} className="comment-bubble" style={{ display: 'flex', gap: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div className="comment-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', fontWeight: 'bold', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#1e293b' }}>{c.autor_nombre}</span>
                          <span style={{ fontSize: '9.5px', color: '#94a3b8' }}>{new Date(c.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#475569', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{c.contenido}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Input Form */}
            {user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR' || activeProyecto?.creador_id === user?.id || commentsModalData.responsableId === user?.id ? (
              <form onSubmit={handleAddTaskSubComment} style={{ marginTop: '16px', display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Escribe un comentario..."
                  value={newTaskSubComment}
                  onChange={(e) => {
                    setNewTaskSubComment(e.target.value);
                    checkMentionTrigger(e.target.value, e.target.selectionStart || 0, 'task-sub');
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'task-sub')}
                  onSelect={(e: any) => {
                    checkMentionTrigger(e.target.value, e.target.selectionStart || 0, 'task-sub');
                  }}
                  required
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>Enviar</button>

                {/* Mention Dropdown */}
                {mentionQuery !== null && activeInputType === 'task-sub' && filteredTechs.length > 0 && (
                  <div className="mention-dropdown">
                    {filteredTechs.map((t, idx) => (
                      <div 
                        key={t.id} 
                        className={`mention-item ${idx === dropdownIndex ? 'active' : ''}`}
                        onClick={() => selectUserMention(t)}
                      >
                        <span className="mention-item-name">{t.nombre_completo}</span>
                        <span className="mention-item-email">{t.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            ) : (
              <p className="text-muted font-xs italic mt-3 text-center" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                Solo el creador de la {commentsModalData.type === 'task' ? 'tarea' : 'subtarea'} o el responsable asignado pueden agregar comentarios.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
