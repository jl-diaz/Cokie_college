import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

const StudentGrades = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    fetchGrades();
  }, [selectedPeriod]);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const response = await api.get('/student/grades', { params: { period: selectedPeriod } });
      setGrades(response.data);
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar notas por materia
  const subjectsData = grades.reduce((acc, grade) => {
    const subjectName = grade.subjects?.name || 'Materia Desconocida';
    if (!acc[subjectName]) {
      acc[subjectName] = {
        name: subjectName,
        grades: [],
        totalPoints: 0
      };
    }
    acc[subjectName].grades.push(grade);
    
    // Sumar al promedio (nota * porcentaje / 100)
    const percentage = parseFloat(grade.evaluation_activities?.percentage || 0);
    const score = parseFloat(grade.grade || 0);
    acc[subjectName].totalPoints += (score * percentage) / 100;
    
    return acc;
  }, {});

  const subjectsList = Object.values(subjectsData).sort((a, b) => a.name.localeCompare(b.name));

  const toggleSubject = (subjectName) => {
    if (expandedSubject === subjectName) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subjectName);
    }
  };

  const getSubjectColor = (name) => {
    const n = name.toLowerCase();
    if (n.includes('ingl') || n.includes('english')) return 'bg-[#48DBFB]/10 text-[#48DBFB]';
    if (n.includes('mate') || n.includes('math')) return 'bg-[#FF6B6B]/10 text-[#FF6B6B]';
    if (n.includes('quim') || n.includes('chem')) return 'bg-[#A55EE1]/10 text-[#A55EE1]';
    if (n.includes('fisi') || n.includes('phys')) return 'bg-[#FFD93D]/10 text-[#f5a623]';
    if (n.includes('soci') || n.includes('hist')) return 'bg-[#1DD1A1]/10 text-[#1DD1A1]';
    if (n.includes('biol') || n.includes('bio')) return 'bg-[#10AC84]/10 text-[#10AC84]';
    if (n.includes('leng') || n.includes('lit')) return 'bg-[#FF9F43]/10 text-[#FF9F43]';
    return 'bg-[#0B1956]/10 text-[#0B1956]'; // Default
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f4f7f6] font-poppins">
      <div className="bg-gradient-to-br from-[#0B1956] to-[#426bc2] text-white p-6 md:p-10 text-center rounded-b-[30px] shadow-lg relative z-10">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Sistema de Notas</h2>
        <p className="text-[13px] mt-2 opacity-90 uppercase tracking-widest font-medium">Selecciona un periodo</p>
      </div>
      
      <nav className="flex justify-around bg-[#0B1956] p-4 mx-4 md:mx-auto md:w-3/4 -mt-6 rounded-2xl shadow-xl relative z-20">
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

      <main className="flex-1 p-5 md:p-8 max-w-4xl mx-auto w-full mt-4">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B1956]"></div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {subjectsList.length === 0 ? (
              <div className="text-center p-10 bg-white rounded-[20px] shadow-sm border border-[#e0e0e0]">
                <p className="text-[#888] font-medium">No hay calificaciones registradas en este periodo.</p>
              </div>
            ) : (
              subjectsList.map((subject) => {
                const isExpanded = expandedSubject === subject.name;
                return (
                  <div key={subject.name} className="bg-white rounded-[20px] shadow-sm border border-[#e0e0e0] overflow-hidden transition-all hover:shadow-md">
                    <button 
                      onClick={() => toggleSubject(subject.name)}
                      className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${getSubjectColor(subject.name)}`}>
                          {subject.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-[#0B1956] text-lg md:text-xl">{subject.name}</h3>
                          <p className="text-[12px] text-[#8a8da0] uppercase font-bold tracking-wider mt-0.5">Promedio Actual</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-2xl text-[#0B1956]">{subject.totalPoints.toFixed(2)}</span>
                        <div className="p-2 bg-[#f4f7f6] rounded-full text-[#8a8da0]">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-[#fafbfc] border-t border-[#f0f0f0]"
                        >
                          <div className="p-5 md:p-6">
                            <table className="w-full text-left text-sm">
                              <thead className="text-[#8a8da0] uppercase text-[11px] font-bold tracking-wider">
                                <tr>
                                  <th className="pb-3 pl-2">Actividad Evaluativa</th>
                                  <th className="pb-3 text-center">Ponderación</th>
                                  <th className="pb-3 pr-2 text-right">Nota</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#f0f0f0]">
                                {subject.grades.map(grade => (
                                  <tr key={grade.id}>
                                    <td className="py-3 pl-2 font-medium text-[#0B1956]">
                                      {grade.evaluation_activities?.name}
                                    </td>
                                    <td className="py-3 text-center text-[#8a8da0] font-medium">
                                      {grade.evaluation_activities?.percentage}%
                                    </td>
                                    <td className="py-3 pr-2 text-right font-bold text-[#0B1956]">
                                      {parseFloat(grade.grade).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default StudentGrades;
