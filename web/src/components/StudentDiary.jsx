import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
<<<<<<< HEAD
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, AlertCircle, CheckCircle, ArrowLeft, Download, Filter, ArrowUpDown, Clock, User } from 'lucide-react';
=======
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

const StudentDiary = () => {
  const [diaryData, setDiaryData] = useState({ conduct: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
<<<<<<< HEAD
  const [gravityFilter, setGravityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const { profile } = useAuth();
  
  const location = useLocation();
  const navigate = useNavigate();
  const { studentId, isCoordinatorView } = location.state || {};

  useEffect(() => {
    fetchDiary();
  }, [selectedPeriod, studentId]);
=======
  const { profile } = useAuth();

  useEffect(() => {
    fetchDiary();
  }, [selectedPeriod]);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

  const fetchDiary = async () => {
    setLoading(true);
    try {
<<<<<<< HEAD
      let endpoint = '/student/diary';
      if (isCoordinatorView && studentId) {
        endpoint = `/coordinator/students/${studentId}/diary`;
      }
      const response = await api.get(endpoint, { params: { period: selectedPeriod } });
=======
      const response = await api.get('/student/diary', { params: { period: selectedPeriod } });
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      setDiaryData(response.data);
    } catch (error) {
      console.error('Error fetching diary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
<<<<<<< HEAD
      case 'Positivo': return 'bg-good/10 text-good border-good/20';
      case 'Leve': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'Grave': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Muy Grave': return 'bg-red-100 text-red-600 border-red-200';
=======
      case 'Positivo': return 'bg-[#eafaf1] text-[#2ecc71] border-[#2ecc71]/20';
      case 'Leve': return 'bg-[#fef9ec] text-[#f39c12] border-[#f39c12]/20';
      case 'Grave': return 'bg-[#fdf0ef] text-[#e74c3c] border-[#e74c3c]/20';
      case 'Muy Grave': return 'bg-[#0B1956]/10 text-[#0B1956] border-[#0B1956]/20';
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

<<<<<<< HEAD
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
=======
  const absences = diaryData.attendance.filter(a => a.status === 'absent');

  return (
    <div className="p-6 md:p-10 font-poppins text-[#1a1a2e]">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        <div className="flex flex-col mb-8 gap-6 relative z-20">
          <div className="text-center md:text-left px-4">
            <h1 className="text-3xl font-black text-[#0B1956] tracking-tight mb-1">Diario Pedagógico</h1>
            <p className="text-[#8a8da0] text-sm">Registro de conducta e inasistencias</p>
          </div>
          
          <nav className="flex justify-around bg-[#0B1956] p-4 mx-4 md:mx-0 md:w-full rounded-2xl shadow-xl">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            {[1, 2, 3, 4].map(p => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-4 py-2.5 rounded-full font-bold text-[13px] md:text-sm transition-all duration-300 ${
                  selectedPeriod === p 
<<<<<<< HEAD
                    ? 'bg-white text-primary shadow-md scale-105' 
=======
                    ? 'bg-white text-[#0B1956] shadow-md scale-105' 
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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
<<<<<<< HEAD
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
=======
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B1956]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Conduct Section */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#0B1956]/5">
              <h2 className="text-xl font-bold text-[#0B1956] mb-6 flex items-center gap-2">
                <AlertCircle className="text-[#f5a623]" />
                Registro de Conducta
              </h2>
              
              <div className="space-y-4">
                {diaryData.conduct.length === 0 ? (
                  <div className="text-center p-8 bg-[#F5F7FA] rounded-2xl">
                    <p className="text-[#8a8da0] font-medium">No hay registros de conducta en este periodo.</p>
                  </div>
                ) : (
                  diaryData.conduct.map(record => (
                    <div key={record.id} className={`p-5 rounded-2xl border ${getCategoryColor(record.conduct_codes?.category)}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-[15px]">{record.conduct_codes?.name}</span>
                        <span className="text-[11px] font-black uppercase px-2 py-1 rounded-lg bg-white/50">{record.conduct_codes?.category}</span>
                      </div>
                      {record.observation && (
                        <p className="text-sm opacity-90 mt-2 font-medium">{record.observation}</p>
                      )}
                      <div className="text-[11px] font-bold mt-4 opacity-70 uppercase tracking-widest">
                        {new Date(record.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              </div>
            </div>

            {/* Attendance Section */}
<<<<<<< HEAD
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
=======
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#0B1956]/5">
              <h2 className="text-xl font-bold text-[#0B1956] mb-6 flex items-center gap-2">
                <Calendar className="text-[#f5a623]" />
                Registro de Inasistencias
              </h2>

              <div className="space-y-4">
                {absences.length === 0 ? (
                  <div className="text-center p-8 bg-[#F5F7FA] rounded-2xl flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-[#eafaf1] text-[#2ecc71] rounded-full flex items-center justify-center mb-3">
                      <CheckCircle size={24} />
                    </div>
                    <p className="text-[#8a8da0] font-medium">¡Excelente asistencia! No tienes faltas en este periodo.</p>
                  </div>
                ) : (
                  absences.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-5 rounded-2xl bg-[#F5F7FA] border border-[#0B1956]/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#fdf0ef] text-[#e74c3c] flex items-center justify-center font-bold">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-[#0B1956]">{new Date(att.date).toLocaleDateString()}</p>
                          <p className="text-[12px] text-[#8a8da0] font-medium uppercase mt-0.5">Inasistencia</p>
                        </div>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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
