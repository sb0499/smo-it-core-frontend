import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectService, User } from '../services/project.service';

export const Reportes: React.FC = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tipoReporte, setTipoReporte] = useState('tickets');
  const [tecnicoId, setTecnicoId] = useState('');
  const [tecnicos, setTecnicos] = useState<User[]>([]);

  useEffect(() => {
    if (user?.rol === 'ADMIN') {
      projectService.getUsuarios().then((users) => {
        setTecnicos(users.filter(u => u.rol === 'TECNICO' || u.rol === 'ADMIN'));
      }).catch(console.error);
    }
  }, [user]);

  const handleDownloadReport = () => {
    let url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/reportes/${tipoReporte}`;
    const token = localStorage.getItem('smo_token');
    const params = new URLSearchParams();
    
    if (token) params.append('token', token);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (user?.rol === 'ADMIN' && tecnicoId) params.append('tecnico_id', tecnicoId);
    
    if (Array.from(params).length > 0) {
      url += `?${params.toString()}`;
    }

    window.open(url, '_blank');
  };

  return (
    <div className="reportes-container animate-fade p-4">
      <div className="glass-panel mx-auto" style={{ maxWidth: '600px', padding: '30px' }}>
        <h2 className="mb-4 text-center">
          📊 Módulo de Reportería {user?.rol === 'ADMIN' ? 'Global' : 'Personal'}
        </h2>
        <p className="text-muted text-center mb-4">
          Selecciona el rango de fechas y el tipo de reporte que deseas descargar en formato Excel (.xlsx).
        </p>

        <div className="form-group mb-3">
          <label className="form-label">Tipo de Reporte</label>
          <select 
            className="form-control" 
            value={tipoReporte} 
            onChange={(e) => setTipoReporte(e.target.value)}
          >
            <option value="tickets">Reporte de Tickets (Soporte Técnico)</option>
            <option value="proyectos">Reporte de Proyectos y Tareas</option>
          </select>
        </div>

        {user?.rol === 'ADMIN' && (
          <div className="form-group mb-3">
            <label className="form-label">Filtrar por Técnico (Opcional)</label>
            <select 
              className="form-control" 
              value={tecnicoId} 
              onChange={(e) => setTecnicoId(e.target.value)}
            >
              <option value="">Todos los Técnicos (Global)</option>
              {tecnicos.map(t => (
                <option key={t.id} value={t.id}>{t.nombre_completo}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-row mb-4" style={{ display: 'flex', gap: '15px' }}>
          <div className="form-group flex-1" style={{ flex: 1 }}>
            <label className="form-label">Fecha Desde (Opcional)</label>
            <input 
              type="date" 
              className="form-control" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group flex-1" style={{ flex: 1 }}>
            <label className="form-label">Fecha Hasta (Opcional)</label>
            <input 
              type="date" 
              className="form-control" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <button 
          className="btn btn-primary w-100" 
          style={{ padding: '12px', width: '100%' }}
          onClick={handleDownloadReport}
        >
          ⬇ Descargar Reporte Excel
        </button>
      </div>
    </div>
  );
};
