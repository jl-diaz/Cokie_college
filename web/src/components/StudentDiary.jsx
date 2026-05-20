import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';

const StudentDiary = () => {
  const [diaryData, setDiaryData] = useState({ conduct: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const { profile } = useAuth();

  useEffect(() => {
    fetchDiary();
  }, [selectedPeriod]);

  const fetchDiary = async () => {
    setLoading(true);
    try {
      const response = await api.get('/student/diary', { params: { period: selectedPeriod } });
      setDiaryData(response.data);
    } catch (error) {
      console.error('Error fetching diary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Positivo': return 'bg-[#eafaf1] text-[#2ecc71] border-[#2ecc71]/20';
      case 'Leve': return 'bg-[#fef9ec] text-[#f39c12] border-[#f39c12]/20';
      case 'Grave': return 'bg-[#fdf0ef] text-[#e74c3c] border-[#e74c3c]/20';
      case 'Muy Grave': return 'bg-[#0B1956]/10 text-[#0B1956] border-[#0B1956]/20';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

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
            {[1, 2, 3, 4].map(p => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-4 py-2.5 rounded-full font-bold text-[13px] md:text-sm transition-all duration-300 ${
                  selectedPeriod === p 
                    ? 'bg-white text-[#0B1956] shadow-md scale-105' 
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
              </div>
            </div>

            {/* Attendance Section */}
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
