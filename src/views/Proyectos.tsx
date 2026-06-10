import { showAlert, showConfirm } from '../utils/alerts';
import React, { useEffect, useState } from 'react';
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

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const list = await projectService.getProyectos();
      setProyectos(list);
      
      const usersList = await projectService.getUsuarios();
      setTechnicians(usersList.filter(u => u.rol === 'TECNICO' || u.rol === 'ADMIN'));
    } catch (e) {
      console.error('Error fetching projects list', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

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
      });

      setShowAddProjectModal(false);
      setNewProjName('');
      setNewProjDesc('');
      setNewProjDate('');
      
      fetchProjects();
    } catch (err: any) {
      showAlert('Error creando proyecto: ' + err.message);
    }
  };

  const handleSubtaskToggle = async (sub: Subtarea, isChecked: boolean) => {
    if (!activeProyecto) return;

    try {
      const nextEstado = isChecked ? 'Finalizado' : 'En Proceso';
      const nextAvance = isChecked ? 100 : 30;
      
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

  return (
    <div className="proyectos-container animate-fade">
      {/* Dynamic project overview or detail */}
      {!activeProyecto ? (
        /* PROJECTS LIST OVERVIEW */
        <>
          <div className="projects-header-controls glass-panel">
            <h3>Portafolio de Proyectos Activos</h3>
            <button className="btn btn-primary" onClick={() => setShowAddProjectModal(true)}>
              Crear Proyecto
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
                      Término: {new Date(p.fecha_fin_estimada).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* PROJECT DETAIL VIEW */
        <div className="project-detail-layout animate-fade">
          <div className="detail-header glass-panel">
            <div className="header-left">
              <button className="back-btn-trigger" onClick={handleCloseProject} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Volver a Proyectos
              </button>
              <h2 className="project-name mt-2">{activeProyecto.nombre}</h2>
              <span className="project-tag mt-1">Categoría: {activeProyecto.tipo_proyecto} • Estado: {activeProyecto.estado}</span>
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

          <div className="project-grid-columns mt-4">
            {/* Column 1: Tasks & Subtasks (Kanban accordion) */}
            <div className="project-column-left glass-panel">
              <h3 className="column-title mb-4">Lista de Tareas y Subtareas</h3>

              {loadingDetail ? (
                <div className="loader-detail"></div>
              ) : !activeProyecto.tareas || activeProyecto.tareas.length === 0 ? (
                <p className="text-muted text-center py-5">No hay tareas programadas para este proyecto.</p>
              ) : (
                <div className="project-tasks-list">
                  {activeProyecto.tareas.map((task) => (
                    <div key={task.id} className="task-block glass-panel">
                      <div className="task-header">
                        <div className="task-title-group">
                          <span className="task-title">{task.titulo}</span>
                          <span className="task-assignee text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            {task.responsable_nombre}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {(!task.subtareas || task.subtareas.length === 0) && task.estado !== 'Finalizado' && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleFinishTask(task)}
                            >
                              Terminar
                            </button>
                          )}
                          <span className={`badge badge-state-${task.estado.toLowerCase().replace(' ', '')}`}>
                            {task.estado} ({task.avance_porcentaje}%)
                          </span>
                        </div>
                      </div>
                      
                      {task.descripcion && <p className="task-desc-text text-muted">{task.descripcion}</p>}

                      {/* Subtasks listing */}
                      <div className="subtasks-container mt-3">
                        <span className="subtasks-title font-xs text-dim">SUBTAREAS COMPLEMENTARIAS:</span>
                        {!task.subtareas || task.subtareas.length === 0 ? (
                          <p className="font-xs text-muted italic mt-1">Sin subtareas.</p>
                        ) : (
                          <div className="subtasks-list mt-2">
                            {task.subtareas.map((sub) => (
                              <div key={sub.id} className="subtask-row">
                                <label className="subtask-checkbox-label">
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
                                <span className="subtask-owner text-muted font-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                  {sub.responsable_nombre}
                                </span>
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
                <h3 className="column-title mb-3">Mesa de Discusión</h3>
                
                <div className="comments-timeline">
                  {!activeProyecto.comentarios || activeProyecto.comentarios.length === 0 ? (
                    <p className="text-muted text-center py-4 font-xs">No hay comentarios en este proyecto. Comparte tus notas abajo.</p>
                  ) : (
                    activeProyecto.comentarios.map((c) => (
                      <div key={c.id} className="comment-bubble">
                        <div className="comment-meta">
                          <span className="comment-author">{c.autor_nombre}</span>
                          <span className="comment-date text-dim">{new Date(c.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="comment-content">{c.contenido}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="comment-input-form mt-3">
                  <input
                    type="text"
                    className="form-control comment-input"
                    placeholder="Escribe un comentario o menciona con @..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-comment-send">Enviar</button>
                </form>
              </div>

              {/* Uploaded Documents */}
              <div className="files-section glass-panel mt-4">
                <h3 className="column-title mb-3">Documentos y Planos</h3>
                
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

                <form onSubmit={handleFileUpload} className="file-upload-form mt-3">
                  <input
                    type="file"
                    id="project-file-input"
                    className="form-control file-input"
                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  />
                  <button type="submit" className="btn btn-secondary btn-upload" disabled={isUploading || !selectedFile}>
                    {isUploading ? 'Subiendo...' : 'Subir Adjunto'}
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

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProjectModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Iniciar Proyecto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
