import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, AlertCircle, CheckCircle, ArrowLeft, Download, Filter, ArrowUpDown, Clock, User } from 'lucide-react';

const StudentDiary = () => {
  const [diaryData, setDiaryData] = useState({ conduct: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [gravityFilter, setGravityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const { profile } = useAuth();
  
  const location = useLocation();
  const navigate = useNavigate();
  const { studentId, isCoordinatorView } = location.state || {};

  useEffect(() => {
    fetchDiary();
  }, [selectedPeriod, studentId]);

  const fetchDiary = async () => {
    setLoading(true);
    try {
      let endpoint = '/student/diary';
      if (isCoordinatorView && studentId) {
        endpoint = `/coordinator/students/${studentId}/diary`;
      }
      const response = await api.get(endpoint, { params: { period: selectedPeriod } });
      setDiaryData(response.data);
    } catch (error) {
      console.error('Error fetching diary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Positivo': return 'bg-good/10 text-good border-good/20';
      case 'Leve': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'Grave': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Muy Grave': return 'bg-red-100 text-red-600 border-red-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Información no disponible';
    const date = new Date(dateStr);
    return date.toLocaleString('es-SV', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const exportToCSV = () => {
    const headers = ['Fecha', 'Código', 'Descripción', 'Gravedad', 'Aplicado por', 'Materia', 'Observación'];
    const rows = filteredConduct.map(record => [
      formatDateTime(record.fecha_aplicacion),
      record.codigo?.nombre || 'N/A',
      record.codigo?.descripcion || 'N/A',
      record.codigo?.nivel_gravedad || 'N/A',
      record.maestro_aplicador ? `${record.maestro_aplicador.nombre} ${record.maestro_aplicador.apellido}` : 'N/A',
      record.maestro_aplicador?.materia_principal || 'N/A',
      record.observacion || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `conducta_estudiante_${studentId || profile?.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredConduct = (diaryData.conduct || [])
    .filter(record => gravityFilter === 'all' || record.codigo?.nivel_gravedad === gravityFilter)
    .sort((a, b) => {
      const dateA = new Date(a.fecha_aplicacion || 0);
      const dateB = new Date(b.fecha_aplicacion || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const absences = diaryData.attendance.filter(a => a.status === 'absent');

  return (
    <div className="p-6 md:p-10 font-poppins text-primary">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        <div className="flex flex-col mb-8 gap-6 relative z-20">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              {isCoordinatorView && (
                <button 
                  onClick={() => navigate('/dashboard/coordinator-students')}
                  className="p-3 bg-white rounded-xl shadow-card hover:shadow-elevated transition-all text-primary"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-black text-primary tracking-tight mb-1">
                  {isCoordinatorView ? 'Diario del Alumno' : 'Diario Pedagógico'}
                </h1>
                <p className="text-muted text-sm">Registro de conducta e inasistencias</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-primary/10 text-primary font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <Download size={18} />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
          
          <nav className="flex justify-around bg-primary p-4 mx-4 md:mx-0 md:w-full rounded-2xl shadow-elevated">
            {[1, 2, 3, 4].map(p => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-4 py-2.5 rounded-full font-bold text-[13px] md:text-sm transition-all duration-300 ${
                  selectedPeriod === p 
                    ? 'bg-white text-primary shadow-md scale-105' 
                    : 'bg-transparent text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Periodo {p}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            
            {/* Conduct Section */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-card border border-primary/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h2 className="text-2xl font-black text-primary flex items-center gap-3">
                  <div className="p-2 bg-mid-bg text-mid rounded-xl">
                    <AlertCircle size={24} />
                  </div>
                  Registro de Conducta
                </h2>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 bg-app-bg px-4 py-2 rounded-xl border border-primary/5">
                    <Filter size={16} className="text-muted" />
                    <select 
                      value={gravityFilter} 
                      onChange={(e) => setGravityFilter(e.target.value)}
                      className="bg-transparent text-sm font-bold text-primary outline-none cursor-pointer"
                    >
                      <option value="all">Todas las gravedades</option>
                      <option value="Positivo">Positivo</option>
                      <option value="Leve">Leve</option>
                      <option value="Grave">Grave</option>
                      <option value="Muy Grave">Muy Grave</option>
                    </select>
                  </div>

                  <button 
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-2 bg-app-bg px-4 py-2 rounded-xl border border-primary/5 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
                  >
                    <ArrowUpDown size={16} />
                    <span>{sortOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-muted text-[11px] font-black uppercase tracking-widest px-6">
                      <th className="px-6 py-2">Fecha y Hora</th>
                      <th className="px-6 py-2">Código</th>
                      <th className="px-6 py-2">Gravedad</th>
                      <th className="px-6 py-2">Aplicado por</th>
                      <th className="px-6 py-2">Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConduct.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-12 bg-app-bg rounded-3xl">
                          <p className="text-muted font-bold">Sin registros de conducta</p>
                        </td>
                      </tr>
                    ) : (
                      filteredConduct.map(record => (
                        <tr key={record.id} className="group">
                          <td className="bg-app-bg px-6 py-5 rounded-l-2xl border-y border-l border-primary/5">
                            <div className="flex items-center gap-3">
                              <Clock size={16} className="text-muted/50" />
                              <span className="text-sm font-bold text-primary">{formatDateTime(record.fecha_aplicacion)}</span>
                            </div>
                          </td>
                          <td className="bg-app-bg px-6 py-5 border-y border-primary/5">
                            <div>
                              <p className="text-sm font-black text-primary">{record.codigo?.nombre}</p>
                              <p className="text-[11px] text-muted font-medium line-clamp-1">{record.codigo?.descripcion}</p>
                            </div>
                          </td>
                          <td className="bg-app-bg px-6 py-5 border-y border-primary/5">
                            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${getCategoryColor(record.codigo?.nivel_gravedad)}`}>
                              {record.codigo?.nivel_gravedad}
                            </span>
                          </td>
                          <td className="bg-app-bg px-6 py-5 border-y border-primary/5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <User size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-primary leading-none mb-1">
                                  {record.maestro_aplicador ? `Prof. ${record.maestro_aplicador.nombre} ${record.maestro_aplicador.apellido}` : 'N/A'}
                                </p>
                                <p className="text-[10px] text-muted font-black uppercase tracking-tighter">
                                  {record.maestro_aplicador?.materia_principal || 'Info no disponible'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="bg-app-bg px-6 py-5 rounded-r-2xl border-y border-r border-primary/5">
                            <p className="text-sm text-muted font-medium italic">
                              {record.observacion ? `"${record.observacion}"` : 'Sin observaciones'}
                            </p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance Section */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-card border border-primary/5">
              <h2 className="text-2xl font-black text-primary mb-8 flex items-center gap-3">
                <div className="p-2 bg-bad-bg text-bad rounded-xl">
                  <Calendar size={24} />
                </div>
                Registro de Inasistencias
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {absences.length === 0 ? (
                  <div className="col-span-full text-center p-12 bg-app-bg rounded-3xl flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-good-bg text-good rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <CheckCircle size={32} />
                    </div>
                    <p className="text-lg font-black text-primary">¡Excelente asistencia!</p>
                    <p className="text-muted font-medium">No tienes faltas registradas en este periodo.</p>
                  </div>
                ) : (
                  absences.map(att => (
                    <div key={att.id} className="flex items-center gap-4 p-5 rounded-2xl bg-app-bg border border-primary/5 hover:border-bad/20 transition-colors group">
                      <div className="w-12 h-12 rounded-xl bg-bad-bg text-bad flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
                        <Calendar size={22} />
                      </div>
                      <div>
                        <p className="font-black text-primary">{new Date(att.date).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="text-[11px] text-bad font-black uppercase tracking-widest mt-0.5">Inasistencia</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </motion.div>
    </div>
  );
};

export default StudentDiary;
