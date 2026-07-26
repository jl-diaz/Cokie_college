import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Send, Bell, Users, User, X, Info } from 'lucide-react';
import api from '../utils/api';

const LEVELS = ['Todos', 'Preescolar', 'Primaria', 'Secundaria', 'Bachillerato'];

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_role: 'both',
    level: 'Todos'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements');
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert('Error al cargar avisos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setFormData({
      title: '',
      message: '',
      target_role: 'both',
      level: 'Todos'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/announcements', formData);
      alert('¡Aviso enviado con éxito! Se ha notificado al instante a los usuarios seleccionados.');
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error al enviar el aviso');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este aviso?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      alert('Error al eliminar el aviso');
    }
  };

  const getTargetBadge = (target) => {
    switch (target) {
      case 'teachers': return { label: 'Maestros', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
      case 'students': return { label: 'Alumnos', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' };
      default: return { label: 'Todos (Ambos)', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto font-poppins">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0B1956] dark:text-white">Gestión de Avisos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Envío de comunicados oficiales e instantáneos a la comunidad educativa</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-[#0B1956] hover:bg-[#1a2d7d] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition-all duration-200 hover:scale-105"
        >
          <Send size={18} />
          <span>Nuevo Aviso</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B1956]"></div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-[#13192B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Bell size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No se han enviado avisos aún</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(item => {
            const badge = getTargetBadge(item.target_role);
            return (
              <div key={item.id} className="bg-white dark:bg-[#13192B] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-xl text-xs font-semibold">
                      Nivel: {item.level}
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs font-medium">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">{item.message}</p>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-medium">
                  <span>Enviado por: {item.profiles?.full_name || 'Super Admin'}</span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex items-center gap-1 text-red-500 font-bold hover:underline"
                  >
                    <Trash2 size={14} />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#13192B] rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Enviar Nuevo Aviso</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">Título del Aviso *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej. Comunicado sobre horarios"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">Destinatarios *</label>
                    <select
                      value={formData.target_role}
                      onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none"
                    >
                      <option value="both">Ambos (Maestros y Alumnos)</option>
                      <option value="teachers">Solo Maestros</option>
                      <option value="students">Solo Alumnos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">Nivel Académico</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none"
                    >
                      {LEVELS.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">Mensaje del Aviso *</label>
                  <textarea
                    rows="4"
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Escribe aquí la información del aviso..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none"
                  ></textarea>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-xs flex items-center gap-2">
                  <Info size={16} className="flex-shrink-0" />
                  <span>Este aviso enviará una notificación push al instante a los usuarios destinatarios.</span>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-[#0B1956] text-white rounded-xl font-semibold text-sm hover:bg-[#1a2d7d] disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send size={16} />
                    <span>{submitting ? 'Enviando...' : 'Enviar Aviso'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminAnnouncements;
