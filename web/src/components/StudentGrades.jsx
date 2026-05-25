import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
<<<<<<< HEAD
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { FileText, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

const StudentGrades = () => {
  const [grades, setGrades] = useState([]);
  const [averages, setAverages] = useState([]);
=======
import api from '../utils/api';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

const StudentGrades = () => {
  const [grades, setGrades] = useState([]);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [expandedSubject, setExpandedSubject] = useState(null);

<<<<<<< HEAD
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
=======
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
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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
<<<<<<< HEAD
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

=======
    
    // Sumar al promedio (nota * porcentaje / 100)
    const percentage = parseFloat(grade.evaluation_activities?.percentage || 0);
    const score = parseFloat(grade.grade || 0);
    acc[subjectName].totalPoints += (score * percentage) / 100;
    
    return acc;
  }, {});

>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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
<<<<<<< HEAD
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
=======
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

      <main className="flex-1 p-5 md:p-8 max-w-4xl mx-auto w-full mt-4">
        {loading ? (
          <div className="flex justify-center p-12">
<<<<<<< HEAD
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
=======
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B1956]"></div>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {subjectsList.length === 0 ? (
<<<<<<< HEAD
              <div className="text-center p-10 bg-white rounded-[20px] shadow-card border border-primary/5">
                <p className="text-muted font-medium">No hay calificaciones registradas en este periodo.</p>
=======
              <div className="text-center p-10 bg-white rounded-[20px] shadow-sm border border-[#e0e0e0]">
                <p className="text-[#888] font-medium">No hay calificaciones registradas en este periodo.</p>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              </div>
            ) : (
              subjectsList.map((subject) => {
                const isExpanded = expandedSubject === subject.name;
                return (
<<<<<<< HEAD
                  <div key={subject.name} className="bg-white rounded-[20px] shadow-card border border-primary/5 overflow-hidden transition-all hover:shadow-elevated">
=======
                  <div key={subject.name} className="bg-white rounded-[20px] shadow-sm border border-[#e0e0e0] overflow-hidden transition-all hover:shadow-md">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                    <button 
                      onClick={() => toggleSubject(subject.name)}
                      className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${getSubjectColor(subject.name)}`}>
                          {subject.name.charAt(0)}
                        </div>
                        <div>
<<<<<<< HEAD
                          <h3 className="font-bold text-primary text-lg md:text-xl">{subject.name}</h3>
                          <p className="text-[12px] text-muted uppercase font-bold tracking-wider mt-0.5">Promedio Actual</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-2xl text-primary">{subject.totalPoints > 0 ? subject.totalPoints.toFixed(2) : '0.00'}</span>
                        <div className="p-2 bg-gray-50 rounded-full text-muted">
=======
                          <h3 className="font-bold text-[#0B1956] text-lg md:text-xl">{subject.name}</h3>
                          <p className="text-[12px] text-[#8a8da0] uppercase font-bold tracking-wider mt-0.5">Promedio Actual</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-2xl text-[#0B1956]">{subject.totalPoints.toFixed(2)}</span>
                        <div className="p-2 bg-[#f4f7f6] rounded-full text-[#8a8da0]">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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
<<<<<<< HEAD
                          className="overflow-hidden bg-gray-50/30 border-t border-primary/5"
                        >
                          <div className="p-5 md:p-6">
                            <table className="w-full text-left text-sm">
                              <thead className="text-muted uppercase text-[11px] font-bold tracking-wider">
=======
                          className="overflow-hidden bg-[#fafbfc] border-t border-[#f0f0f0]"
                        >
                          <div className="p-5 md:p-6">
                            <table className="w-full text-left text-sm">
                              <thead className="text-[#8a8da0] uppercase text-[11px] font-bold tracking-wider">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                                <tr>
                                  <th className="pb-3 pl-2">Actividad Evaluativa</th>
                                  <th className="pb-3 text-center">Ponderación</th>
                                  <th className="pb-3 pr-2 text-right">Nota</th>
                                </tr>
                              </thead>
<<<<<<< HEAD
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
=======
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
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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
<<<<<<< HEAD

};

export default StudentGrades;
=======
};

export default StudentGrades;
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
