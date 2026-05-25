import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
<<<<<<< HEAD
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

const StudentSchedule = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { teacherId, studentId, isCoordinatorView } = location.state || {};

=======
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StudentSchedule = () => {
  const { profile } = useAuth();
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1); // 1 = Lunes

  const days = [
    { id: 1, name: 'LUN', full: 'Lunes' },
    { id: 2, name: 'MAR', full: 'Martes' },
    { id: 3, name: 'MIE', full: 'Miércoles' },
    { id: 4, name: 'JUE', full: 'Jueves' },
    { id: 5, name: 'VIE', full: 'Viernes' }
  ];

  useEffect(() => {
    if (profile) {
      fetchSchedule();
    }
<<<<<<< HEAD
  }, [profile, teacherId, studentId]);
=======
  }, [profile]);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

  const fetchSchedule = async () => {
    setLoading(true);
    try {
<<<<<<< HEAD
      let endpoint = profile?.role === 'teacher' ? '/teacher/schedule' : '/student/schedule';
      
      if (isCoordinatorView) {
        if (teacherId) {
          endpoint = `/coordinator/teachers/${teacherId}/schedule`;
        } else if (studentId) {
          endpoint = `/coordinator/students/${studentId}/schedule`;
        }
      }
      
=======
      const endpoint = profile?.role === 'teacher' ? '/teacher/schedule' : '/student/schedule';
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      const response = await api.get(endpoint);
      setSchedules(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const getSchedulesForDay = (dayId) => {
    if (!Array.isArray(schedules)) return [];
    return schedules
      .filter(s => s && parseInt(s.day_of_week) === dayId)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const currentDaySchedules = getSchedulesForDay(activeDay);

  // Helper function to format time (e.g., "07:00:00" -> "7:00 AM")
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${minutes} ${ampm}`;
  };

  // Helper function to assign a color class based on subject name
  const getSubjectColor = (name) => {
    const n = name.toLowerCase();
<<<<<<< HEAD
    if (n.includes('ingl') || n.includes('english')) return 'border-l-[6px] border-primary-light';
    if (n.includes('mate') || n.includes('math')) return 'border-l-[6px] border-bad';
    if (n.includes('quim') || n.includes('chem')) return 'border-l-[6px] border-primary';
    if (n.includes('fisi') || n.includes('phys')) return 'border-l-[6px] border-mid';
    if (n.includes('soci') || n.includes('hist')) return 'border-l-[6px] border-good';
    if (n.includes('biol') || n.includes('bio')) return 'border-l-[6px] border-good';
    if (n.includes('leng') || n.includes('lit')) return 'border-l-[6px] border-mid';
    return 'border-l-[6px] border-primary'; // Default
  };

  return (
    <div className="flex flex-col min-h-full bg-app-bg font-poppins">
      <div className="bg-gradient-to-br from-primary to-primary-light text-white p-6 md:p-10 text-center rounded-b-[30px] shadow-elevated relative z-10">
=======
    if (n.includes('ingl') || n.includes('english')) return 'border-l-[6px] border-[#48DBFB]';
    if (n.includes('mate') || n.includes('math')) return 'border-l-[6px] border-[#FF6B6B]';
    if (n.includes('quim') || n.includes('chem')) return 'border-l-[6px] border-[#A55EE1]';
    if (n.includes('fisi') || n.includes('phys')) return 'border-l-[6px] border-[#FFD93D]';
    if (n.includes('soci') || n.includes('hist')) return 'border-l-[6px] border-[#1DD1A1]';
    if (n.includes('biol') || n.includes('bio')) return 'border-l-[6px] border-[#10AC84]';
    if (n.includes('leng') || n.includes('lit')) return 'border-l-[6px] border-[#FF9F43]';
    return 'border-l-[6px] border-[#0B1956]'; // Default
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f4f7f6] font-poppins">
      <div className="bg-gradient-to-br from-[#0B1956] to-[#426bc2] text-white p-6 md:p-10 text-center rounded-b-[30px] shadow-lg relative z-10">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Mi Horario de clases</h2>
        <p className="text-[13px] mt-2 opacity-90 uppercase tracking-widest font-medium">Selecciona un día</p>
      </div>
      
<<<<<<< HEAD
      <nav className="flex justify-around bg-primary p-4 mx-4 md:mx-auto md:w-3/4 -mt-6 rounded-2xl shadow-elevated relative z-20">
=======
      <nav className="flex justify-around bg-[#0B1956] p-4 mx-4 md:mx-auto md:w-3/4 -mt-6 rounded-2xl shadow-xl relative z-20">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
        {days.map(day => (
          <button 
            key={day.id}
            onClick={() => setActiveDay(day.id)}
            className={`px-4 py-2.5 rounded-full font-bold text-[13px] md:text-sm transition-all duration-300 ${
              activeDay === day.id 
<<<<<<< HEAD
                ? 'bg-white text-primary shadow-md scale-105' 
=======
                ? 'bg-white text-[#0B1956] shadow-md scale-105' 
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                : 'bg-transparent text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {day.name}
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
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDay}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {currentDaySchedules.length === 0 ? (
<<<<<<< HEAD
                <div className="text-center p-10 bg-white rounded-[20px] shadow-card border border-primary/5">
                  <p className="text-muted font-medium">No hay clases programadas para este día.</p>
                </div>
              ) : (
                currentDaySchedules.map((schedule, idx) => (
                  <div key={schedule.id || idx} className={`flex bg-white rounded-[16px] shadow-card border border-primary/5 overflow-hidden hover:shadow-elevated transition-shadow ${getSubjectColor(schedule.subjects?.name || '')}`}>
                    <div className="p-4 md:p-5 min-w-[100px] md:min-w-[120px] text-center flex flex-col justify-center border-r-[2px] border-dotted border-gray-100">
                      <span className="font-bold text-muted text-[13px] md:text-sm">{formatTime(schedule.start_time)}</span>
                      <span className="font-bold text-muted text-[13px] md:text-sm">{formatTime(schedule.end_time)}</span>
                    </div>
                    <div className="p-4 md:p-5 flex-grow flex flex-col justify-center">
                      <span className="font-bold text-primary text-lg md:text-xl mb-1">{schedule.subjects?.name || 'Materia'}</span>
                      <span className="text-muted text-[13px] md:text-sm font-medium">{schedule.profiles?.full_name || 'Profesor'}</span>
=======
                <div className="text-center p-10 bg-white rounded-[20px] shadow-sm border border-[#e0e0e0]">
                  <p className="text-[#888] font-medium">No hay clases programadas para este día.</p>
                </div>
              ) : (
                currentDaySchedules.map((schedule, idx) => (
                  <div key={schedule.id || idx} className={`flex bg-white rounded-[16px] shadow-sm border border-[#e0e0e0] overflow-hidden hover:shadow-md transition-shadow ${getSubjectColor(schedule.subjects?.name || '')}`}>
                    <div className="p-4 md:p-5 min-w-[100px] md:min-w-[120px] text-center flex flex-col justify-center border-r-[2px] border-dotted border-[#e0e0e0]">
                      <span className="font-bold text-[#888] text-[13px] md:text-sm">{formatTime(schedule.start_time)}</span>
                      <span className="font-bold text-[#888] text-[13px] md:text-sm">{formatTime(schedule.end_time)}</span>
                    </div>
                    <div className="p-4 md:p-5 flex-grow flex flex-col justify-center">
                      <span className="font-bold text-[#333] text-lg md:text-xl mb-1">{schedule.subjects?.name || 'Materia'}</span>
                      <span className="text-[#888] text-[13px] md:text-sm font-medium">{schedule.profiles?.full_name || 'Profesor'}</span>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
<<<<<<< HEAD

=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
};

export default StudentSchedule;
