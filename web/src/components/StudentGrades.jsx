import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { FileText, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

const StudentGrades = () => {
  const [grades, setGrades] = useState([]);
  const [averages, setAverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [expandedSubject, setExpandedSubject] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { studentId, isCoordinatorView } = location.state || {};

  useEffect(() => {
    fetchGradesAndAverages();
  }, [selectedPeriod, studentId]);

  const fetchGradesAndAverages = async () => {
    setLoading(true);
    try {
      let gradesEndpoint = '/student/grades';
      let averagesEndpoint = '/student/averages';
      
      if (isCoordinatorView && studentId) {
        gradesEndpoint = `/coordinator/students/${studentId}/grades`;
        averagesEndpoint = `/coordinator/students/${studentId}/averages`;
      }
      
      const [gradesRes, averagesRes] = await Promise.all([
        api.get(gradesEndpoint, { params: { period: selectedPeriod } }),
        api.get(averagesEndpoint, { params: { period: selectedPeriod } })
      ]);
      setGrades(gradesRes.data);
      setAverages(averagesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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
    return acc;
  }, {});

  // Asignar promedios del backend a cada materia
  const subjectNames = Object.keys(subjectsData);
  subjectNames.forEach(name => {
    const avg = averages.find(a => a.subjects?.name === name);
    if (avg) {
      subjectsData[name].totalPoints = parseFloat(avg.final_average || 0);
    } else {
      subjectsData[name].totalPoints = 0;
    }
  });

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
    if (n.includes('ingl') || n.includes('english')) return 'bg-primary-light/10 text-primary-light';
    if (n.includes('mate') || n.includes('math')) return 'bg-bad/10 text-bad';
    if (n.includes('quim') || n.includes('chem')) return 'bg-primary/10 text-primary';
    if (n.includes('fisi') || n.includes('phys')) return 'bg-mid/10 text-mid';
    if (n.includes('soci') || n.includes('hist')) return 'bg-good/10 text-good';
    if (n.includes('biol') || n.includes('bio')) return 'bg-good/20 text-good';
    if (n.includes('leng') || n.includes('lit')) return 'bg-mid/20 text-mid';
    return 'bg-primary/10 text-primary';
  };

  return (
    <div className="flex flex-col min-h-full bg-app-bg font-poppins">
      <div className="bg-gradient-to-br from-primary to-primary-light text-white p-6 md:p-10 rounded-b-[30px] shadow-elevated relative z-10 flex flex-col items-center">
        <div className="flex w-full justify-between items-center max-w-4xl">
          {isCoordinatorView ? (
            <button 
              onClick={() => navigate('/dashboard/coordinator-students')}
              className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all text-white"
            >
              <ArrowLeft size={24} />
            </button>
          ) : <div className="w-10"></div>}
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              {isCoordinatorView ? 'Notas del Alumno' : 'Sistema de Notas'}
            </h2>
            <p className="text-[13px] mt-2 opacity-90 uppercase tracking-widest font-medium">Selecciona un periodo</p>
          </div>
          <div className="w-10"></div>
        </div>
      </div>
      
      <nav className="flex justify-around bg-primary p-4 mx-4 md:mx-auto md:w-3/4 -mt-6 rounded-2xl shadow-elevated relative z-20">
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

      <main className="flex-1 p-5 md:p-8 max-w-4xl mx-auto w-full mt-4">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {subjectsList.length === 0 ? (
              <div className="text-center p-10 bg-white rounded-[20px] shadow-card border border-primary/5">
                <p className="text-muted font-medium">No hay calificaciones registradas en este periodo.</p>
              </div>
            ) : (
              subjectsList.map((subject) => {
                const isExpanded = expandedSubject === subject.name;
                return (
                  <div key={subject.name} className="bg-white rounded-[20px] shadow-card border border-primary/5 overflow-hidden transition-all hover:shadow-elevated">
                    <button 
                      onClick={() => toggleSubject(subject.name)}
                      className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${getSubjectColor(subject.name)}`}>
                          {subject.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-primary text-lg md:text-xl">{subject.name}</h3>
                          <p className="text-[12px] text-muted uppercase font-bold tracking-wider mt-0.5">Promedio Actual</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-2xl text-primary">{subject.totalPoints > 0 ? subject.totalPoints.toFixed(2) : '0.00'}</span>
                        <div className="p-2 bg-gray-50 rounded-full text-muted">
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
                          className="overflow-hidden bg-gray-50/30 border-t border-primary/5"
                        >
                          <div className="p-5 md:p-6">
                            <table className="w-full text-left text-sm">
                              <thead className="text-muted uppercase text-[11px] font-bold tracking-wider">
                                <tr>
                                  <th className="pb-3 pl-2">Actividad Evaluativa</th>
                                  <th className="pb-3 text-center">Ponderación</th>
                                  <th className="pb-3 pr-2 text-right">Nota</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-primary/5">
                                {subject.grades.map(grade => (
                                  <tr key={grade.id}>
                                    <td className="py-3 pl-2 font-medium text-primary">
                                      {grade.evaluation_activities?.name}
                                    </td>
                                    <td className="py-3 text-center text-muted font-medium">
                                      {grade.evaluation_activities?.percentage}%
                                    </td>
                                    <td className="py-3 pr-2 text-right font-bold text-primary">
                                      {parseFloat(grade.grade) > 0 ? parseFloat(grade.grade).toFixed(2) : <span className="text-muted text-xs italic">No asignada</span>}
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