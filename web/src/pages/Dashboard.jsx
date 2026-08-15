import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import { 
  Users, 
  UserCheck, 
  FileText, 
  Calendar, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  Sun, 
  Moon, 
  Globe, 
  Shield, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Sparkles,
  Award,
  Volume2,
  VideoOff,
  Mic,
  MicOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

// --- SUBMODULE 1: USUARIOS ---
const AdminUsers = () => {
  const { t } = useTranslation();
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student',
    level: '',
    grade: '',
    section: ''
  });

  const computeStudentLevel = (role, grade, explicitLevel) => {
    if (role === 'student' && grade) {
      const g = parseInt(grade);
      if (g >= 2 && g <= 6) return 'Primaria';
      if (g >= 7 && g <= 11) return 'Tercer Ciclo';
    }
    return explicitLevel || '';
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const response = await api.get('/admin/users', {
        params: { role: roleFilter || undefined }
      });
      const usersList = Array.isArray(response.data?.data) 
        ? response.data.data 
        : (Array.isArray(response.data) ? response.data : []);
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setFetching(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.institutional_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = !levelFilter || user.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const computedLevel = computeStudentLevel(formData.role, formData.grade, formData.level);
      await api.post('/admin/users', {
        ...formData,
        level: computedLevel
      });
      setIsModalOpen(false);
      setFormData({ full_name: '', email: '', password: '', role: 'student', level: '', grade: '', section: '' });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'student',
      level: user.level || '',
      grade: user.grade || '',
      section: user.section || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const computedLevel = computeStudentLevel(formData.role, formData.grade, formData.level);
      await api.put(`/admin/users/${editingUser.id}`, {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        level: computedLevel,
        grade: formData.grade,
        section: formData.section
      });
      setIsEditModalOpen(false);
      setEditingUser(null);
      setFormData({ full_name: '', email: '', password: '', role: 'student', level: '', grade: '', section: '' });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await api.delete(`/admin/users/${deletingUser.id}`);
      setDeletingUser(null);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || t('common.error'));
    }
  };

  const handleActivateUser = async (user) => {
    try {
      await api.put(`/admin/users/${user.id}`, { is_active: true });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || t('common.error'));
    }
  };

  const getRoleBadge = (role) => {
    const map = {
      super_admin: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      coordinator: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      teacher: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      student: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      cafetin: 'bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800'
    };
    return map[role] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Module Title & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-[#0B1956] dark:text-[#F6BE2F]" />
            {t('users.title', 'Gestión de Usuarios')}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('users.subtitle', 'Administra el personal docente, estudiantes, coordinadores y cuentas')}
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ full_name: '', email: '', password: '', role: 'student', level: '', grade: '', section: '' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B1956] hover:bg-[#122473] dark:bg-[#F6BE2F] dark:hover:bg-[#f8ca53] text-white dark:text-[#0B1956] font-bold text-sm rounded-xl shadow-lg shadow-indigo-900/10 dark:shadow-amber-500/10 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>{t('users.newUser', 'Nuevo Usuario')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#13192B] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('common.search', 'Buscar por nombre, correo o código...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer flex-1 md:flex-none"
          >
            <option value="">{t('users.roles.all', 'Todos los Roles')}</option>
            <option value="super_admin">Super Admin</option>
            <option value="coordinator">Coordinador</option>
            <option value="teacher">Docente</option>
            <option value="student">Estudiante</option>
            <option value="cafetin">Cafetín</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer flex-1 md:flex-none"
          >
            <option value="">{t('users.levels.all', 'Todos los Niveles')}</option>
            <option value="Primaria">Primaria</option>
            <option value="Tercer Ciclo">Tercer Ciclo</option>
          </select>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white dark:bg-[#13192B] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {fetching ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-600 dark:border-[#F6BE2F] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-medium">{t('common.loading', 'Cargando datos...')}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">{t('common.noRecords', 'No se encontraron registros.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-[#182038]/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3.5 px-4">{t('users.fullName', 'Usuario')}</th>
                  <th className="py-3.5 px-4">{t('users.code', 'Código')}</th>
                  <th className="py-3.5 px-4">{t('users.role', 'Rol')}</th>
                  <th className="py-3.5 px-4">{t('users.level', 'Nivel')}</th>
                  <th className="py-3.5 px-4">{t('users.grade', 'Grado / Secc')}</th>
                  <th className="py-3.5 px-4 text-right">{t('common.actions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-[#182038]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0B1956]/10 dark:bg-white/10 text-[#0B1956] dark:text-[#F6BE2F] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {user.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white leading-tight">{user.full_name}</p>
                          <p className="text-[11px] text-slate-400 leading-tight">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                      {user.institutional_code || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getRoleBadge(user.role)}`}>
                        {user.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {user.level || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {user.grade ? `${user.grade}º '${user.section || 'A'}'` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-[#F6BE2F] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {user.is_active === false ? (
                          <button
                            onClick={() => handleActivateUser(user)}
                            className="px-2.5 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 transition-colors flex items-center gap-1 font-bold text-xs"
                            title="Activar Usuario"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Activar</span>
                          </button>
                        ) : (
                          (user.id !== currentProfile?.id && (!(user.role === 'super_admin' || user.role === 'admin') || currentProfile?.full_name === 'Administrador Principal')) && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Eliminar / Desactivar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#13192B] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('users.newUser', 'Nuevo Usuario')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.fullName', 'Nombre Completo')}</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                  placeholder="Ej. María Fernanda López"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.email', 'Correo Electrónico')}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                  placeholder="usuario@gmail.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.password', 'Contraseña (Opcional)')}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                  placeholder="Si se deja vacío se auto-genera"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.role', 'Rol')}</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Docente</option>
                    <option value="coordinator">Coordinador</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="cafetin">Cafetín</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.level', 'Nivel')}</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="">Sin nivel</option>
                    <option value="Primaria">Primaria</option>
                    <option value="Tercer Ciclo">Tercer Ciclo</option>
                  </select>
                </div>
              </div>

              {(formData.role === 'student' || formData.role === 'coordinator') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.grade', 'Grado')}</label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                      placeholder="Ej. 7"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.section', 'Sección')}</label>
                    <input
                      type="text"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                      placeholder="Ej. A"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#0B1956] hover:bg-[#122473] dark:bg-[#F6BE2F] dark:hover:bg-[#f8ca53] text-white dark:text-[#0B1956] rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {loading ? t('common.loading', 'Cargando...') : t('common.create', 'Crear Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#13192B] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('users.editUser', 'Editar Usuario')}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.fullName', 'Nombre Completo')}</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.email', 'Correo Electrónico')}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.role', 'Rol')}</label>
                  <select
                    value={formData.role}
                    disabled={editingUser?.id === currentProfile?.id}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none ${editingUser?.id === currentProfile?.id ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Docente</option>
                    <option value="coordinator">Coordinador</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="cafetin">Cafetín</option>
                  </select>
                  {editingUser?.id === currentProfile?.id && (
                    <p className="text-[10px] text-amber-500 font-semibold mt-1">No puedes modificar tu propio rol.</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.level', 'Nivel')}</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="">Sin nivel</option>
                    <option value="Primaria">Primaria</option>
                    <option value="Tercer Ciclo">Tercer Ciclo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.grade', 'Grado')}</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('users.section', 'Sección')}</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#0B1956] hover:bg-[#122473] dark:bg-[#F6BE2F] dark:hover:bg-[#f8ca53] text-white dark:text-[#0B1956] rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {loading ? t('common.loading', 'Cargando...') : t('common.save', 'Guardar Cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#13192B] rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">{t('common.confirmDelete', 'Confirmar eliminación')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ¿Deseas eliminar al usuario <strong className="text-slate-700 dark:text-slate-200">{deletingUser.full_name}</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
              >
                {t('common.delete', 'Eliminar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- SUBMODULE 2: CATÁLOGO CONDUCTA ---
const AdminConduct = () => {
  const { t } = useTranslation();
  const [codes, setCodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [deletingCode, setDeletingCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'Leve'
  });

  useEffect(() => {
    fetchConductCodes();
  }, []);

  const fetchConductCodes = async () => {
    setFetching(true);
    try {
      const res = await api.get('/admin/conduct-codes');
      const codesList = Array.isArray(res.data?.data) 
        ? res.data.data 
        : (Array.isArray(res.data) ? res.data : []);
      setCodes(codesList);
    } catch (err) {
      console.error('Error fetching conduct codes:', err);
    } finally {
      setFetching(false);
    }
  };

  const filteredCodes = codes.filter(c => {
    const matchesSearch = 
      c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCode) {
        await api.put(`/admin/conduct-codes/${editingCode.id}`, formData);
      } else {
        await api.post('/admin/conduct-codes', formData);
      }
      setIsModalOpen(false);
      setEditingCode(null);
      setFormData({ code: '', name: '', description: '', category: 'Leve' });
      fetchConductCodes();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (code) => {
    setEditingCode(code);
    setFormData({
      code: code.code || '',
      name: code.name || '',
      description: code.description || '',
      category: code.category || 'Leve'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCode) return;
    try {
      await api.delete(`/admin/conduct-codes/${deletingCode.id}`);
      setDeletingCode(null);
      fetchConductCodes();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  };

  const getCategoryBadge = (cat) => {
    const map = {
      'Positivo': 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      'Leve': 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      'Grave': 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      'Muy Grave': 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    };
    return map[cat] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#0B1956] dark:text-[#F6BE2F]" />
            {t('conduct.title', 'Catálogo de Conducta')}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('conduct.subtitle', 'Configuración de faltas disciplinarias y méritos reconocidos')}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCode(null);
            setFormData({ code: '', name: '', description: '', category: 'Leve' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B1956] hover:bg-[#122473] dark:bg-[#F6BE2F] dark:hover:bg-[#f8ca53] text-white dark:text-[#0B1956] font-bold text-sm rounded-xl shadow-lg shadow-indigo-900/10 dark:shadow-amber-500/10 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>{t('conduct.newCode', 'Nuevo Código')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#13192B] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('common.search', 'Buscar por código, nombre o descripción...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-full md:w-auto"
        >
          <option value="">{t('conduct.severities.all', 'Todas las Categorías')}</option>
          <option value="Positivo">Mérito / Positivo</option>
          <option value="Leve">Falta Leve</option>
          <option value="Grave">Falta Grave</option>
          <option value="Muy Grave">Falta Muy Grave</option>
        </select>
      </div>

      {/* Conduct Codes Grid */}
      <div className="bg-white dark:bg-[#13192B] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {fetching ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-600 dark:border-[#F6BE2F] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-medium">{t('common.loading', 'Cargando datos...')}</p>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">{t('common.noRecords', 'No se encontraron registros.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-[#182038]/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3.5 px-4">{t('conduct.codeNumber', 'Código')}</th>
                  <th className="py-3.5 px-4">{t('conduct.name', 'Nombre del Reporte')}</th>
                  <th className="py-3.5 px-4">{t('conduct.description', 'Descripción')}</th>
                  <th className="py-3.5 px-4">{t('conduct.severity', 'Categoría')}</th>
                  <th className="py-3.5 px-4 text-right">{t('common.actions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-slate-50/50 dark:hover:bg-[#182038]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0B1956] dark:text-[#F6BE2F]">
                      {code.code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-white">
                      {code.name}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">
                      {code.description || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getCategoryBadge(code.category)}`}>
                        {code.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(code)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-[#F6BE2F] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCode(code)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create/Edit Code */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#13192B] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingCode ? t('conduct.editCode', 'Editar Código') : t('conduct.newCode', 'Nuevo Código')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('conduct.codeNumber', 'Código Identificador')}</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                  placeholder="Ej. FL-01, FG-03, M-01"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('conduct.name', 'Nombre del Reporte / Falta')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                  placeholder="Ej. Llegada tardía injustificada"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('conduct.description', 'Descripción')}</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white resize-none"
                  placeholder="Detalles sobre cuándo se aplica esta sanción o mérito..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('conduct.severity', 'Categoría Disciplinaria')}</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  <option value="Positivo">Mérito / Positivo</option>
                  <option value="Leve">Falta Leve</option>
                  <option value="Grave">Falta Grave</option>
                  <option value="Muy Grave">Falta Muy Grave</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#0B1956] hover:bg-[#122473] dark:bg-[#F6BE2F] dark:hover:bg-[#f8ca53] text-white dark:text-[#0B1956] rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {loading ? t('common.loading', 'Cargando...') : editingCode ? t('common.save', 'Guardar Cambios') : t('common.create', 'Crear Código')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#13192B] rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">{t('common.confirmDelete', 'Confirmar eliminación')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ¿Deseas eliminar el código de conducta <strong className="text-slate-700 dark:text-slate-200">{deletingCode.code} - {deletingCode.name}</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingCode(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
              >
                {t('common.delete', 'Eliminar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- SUBMODULE 3: EVENTOS ---
const AdminEvents = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [levelFilter, setLevelFilter] = useState('Todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '10:00',
    level: 'Todos'
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setFetching(true);
    try {
      const res = await api.get('/events');
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setFetching(false);
    }
  };

  const filteredEvents = events.filter(e => {
    if (levelFilter === 'Todos') return true;
    return e.level === levelFilter;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        start_time: formData.start_time.length === 5 ? `${formData.start_time}:00` : formData.start_time,
        end_time: formData.end_time.length === 5 ? `${formData.end_time}:00` : formData.end_time
      };

      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, payload);
      } else {
        await api.post('/events', payload);
      }
      setIsModalOpen(false);
      setEditingEvent(null);
      setFormData({ title: '', description: '', event_date: new Date().toISOString().split('T')[0], start_time: '08:00', end_time: '10:00', level: 'Todos' });
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      description: event.description || '',
      event_date: event.event_date || '',
      start_time: event.start_time?.substring(0, 5) || '08:00',
      end_time: event.end_time?.substring(0, 5) || '10:00',
      level: event.level || 'Todos'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;
    try {
      await api.delete(`/events/${deletingEvent.id}`);
      setDeletingEvent(null);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  };

  const getLevelBadge = (lvl) => {
    switch (lvl) {
      case 'Primaria': return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Tercer Ciclo': return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default: return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-7 h-7 text-[#0B1956] dark:text-[#F6BE2F]" />
            {t('events.title', 'Eventos Institucionales')}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('events.subtitle', 'Calendario de actividades y compromisos académicos')}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEvent(null);
            setFormData({ title: '', description: '', event_date: new Date().toISOString().split('T')[0], start_time: '08:00', end_time: '10:00', level: 'Todos' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B1956] hover:bg-[#122473] dark:bg-[#F6BE2F] dark:hover:bg-[#f8ca53] text-white dark:text-[#0B1956] font-bold text-sm rounded-xl shadow-lg shadow-indigo-900/10 dark:shadow-amber-500/10 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>{t('events.newEvent', 'Nuevo Evento')}</span>
        </button>
      </div>

      {/* Level Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['Todos', 'Primaria', 'Tercer Ciclo'].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevelFilter(lvl)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border shrink-0 ${
              levelFilter === lvl
                ? 'bg-[#0B1956] text-white dark:bg-[#F6BE2F] dark:text-[#0B1956] border-[#0B1956] dark:border-[#F6BE2F] shadow-sm'
                : 'bg-white dark:bg-[#13192B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {lvl === 'Todos' ? t('events.levels.all', 'Todos los Niveles') : lvl}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {fetching ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-[#13192B] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="w-8 h-8 border-2 border-indigo-600 dark:border-[#F6BE2F] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">{t('common.loading', 'Cargando datos...')}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-[#13192B] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold">{t('common.noRecords', 'No se encontraron registros.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((item) => (
            <div key={item.id} className="bg-white dark:bg-[#13192B] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getLevelBadge(item.level)}`}>
                    {item.level}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-[#0B1956] dark:text-[#F6BE2F]" />
                    <span>{item.event_date}</span>
                  </div>
                </div>

                <h4 className="text-base font-bold text-slate-800 dark:text-white leading-snug">{item.title}</h4>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.start_time?.substring(0, 5)} - {item.end_time?.substring(0, 5)} hrs</span>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 bg-slate-50 dark:bg-[#182038] p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleEdit(item)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-[#F6BE2F] hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{t('common.edit', 'Editar')}</span>
                </button>
                <button
                  onClick={() => setDeletingEvent(item)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('common.delete', 'Eliminar')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create/Edit Event */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#13192B] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingEvent ? t('events.editEvent', 'Editar Evento') : t('events.newEvent', 'Nuevo Evento')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('events.eventTitle', 'Título del Evento')}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                  placeholder="Ej. Feria Institucional de Ciencias 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('events.eventDate', 'Fecha')}</label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('events.level', 'Nivel Destinado')}</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="Todos">Todos los Niveles</option>
                    <option value="Primaria">Primaria</option>
                    <option value="Tercer Ciclo">Tercer Ciclo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('events.startTime', 'Hora Inicio')}</label>
                  <input
                    type="text"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                    placeholder="08:00"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('events.endTime', 'Hora Fin')}</label>
                  <input
                    type="text"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                    placeholder="10:00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('events.description', 'Descripción')}</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white resize-none"
                  placeholder="Detalles sobre el evento..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#0B1956] hover:bg-[#122473] dark:bg-[#F6BE2F] dark:hover:bg-[#f8ca53] text-white dark:text-[#0B1956] rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {loading ? t('common.loading', 'Cargando...') : editingEvent ? t('common.save', 'Guardar Cambios') : t('common.create', 'Crear Evento')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#13192B] rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">{t('common.confirmDelete', 'Confirmar eliminación')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ¿Deseas eliminar el evento <strong className="text-slate-700 dark:text-slate-200">{deletingEvent.title}</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingEvent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
              >
                {t('common.delete', 'Eliminar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- SUBMODULE 4: AVISOS ---
const AdminAnnouncements = () => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [targetFilter, setTargetFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_role: 'both'
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setFetching(true);
    try {
      const res = await api.get('/announcements');
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setFetching(false);
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (!targetFilter) return true;
    return a.target_role === targetFilter;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/announcements', formData);
      setIsModalOpen(false);
      setFormData({ title: '', message: '', target_role: 'both' });
      fetchAnnouncements();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await api.delete(`/announcements/${deletingItem.id}`);
      setDeletingItem(null);
      fetchAnnouncements();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  };

  const getTargetBadge = (target) => {
    switch (target) {
      case 'teachers': return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'students': return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default: return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-[#0B1956] dark:text-[#F6BE2F]" />
            {t('announcements.title', 'Avisos Institucionales')}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('announcements.subtitle', 'Publicación de comunicados oficiales para la comunidad')}
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ title: '', message: '', target_role: 'both' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B1956] hover:bg-[#122473] dark:bg-[#F6BE2F] dark:hover:bg-[#f8ca53] text-white dark:text-[#0B1956] font-bold text-sm rounded-xl shadow-lg shadow-indigo-900/10 dark:shadow-amber-500/10 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>{t('announcements.newAnnouncement', 'Nuevo Aviso')}</span>
        </button>
      </div>

      {/* Target Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: '', label: t('common.all', 'Todos') },
          { key: 'both', label: t('announcements.targets.both', 'Ambos (Docentes y Alumnos)') },
          { key: 'teachers', label: t('announcements.targets.teachers', 'Solo Docentes') },
          { key: 'students', label: t('announcements.targets.students', 'Solo Alumnos') }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTargetFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border shrink-0 ${
              targetFilter === tab.key
                ? 'bg-[#0B1956] text-white dark:bg-[#F6BE2F] dark:text-[#0B1956] border-[#0B1956] dark:border-[#F6BE2F] shadow-sm'
                : 'bg-white dark:bg-[#13192B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      {fetching ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-[#13192B] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="w-8 h-8 border-2 border-indigo-600 dark:border-[#F6BE2F] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">{t('common.loading', 'Cargando datos...')}</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-[#13192B] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold">{t('common.noRecords', 'No se encontraron registros.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((item) => (
            <div key={item.id} className="bg-white dark:bg-[#13192B] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getTargetBadge(item.target_role)}`}>
                    {item.target_role === 'both' ? 'Ambos' : item.target_role === 'teachers' ? 'Docentes' : 'Alumnos'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {new Date(item.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-800 dark:text-white leading-snug">{item.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.message}</p>

                {item.creator && (
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {t('announcements.createdBy', 'Publicado por')}: {item.creator?.full_name}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end shrink-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
                <button
                  onClick={() => setDeletingItem(item)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('common.delete', 'Eliminar')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Announcement */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#13192B] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('announcements.newAnnouncement', 'Nuevo Aviso')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('announcements.announcementTitle', 'Título del Aviso')}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white"
                  placeholder="Ej. Cambio de horario para reunión general"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('announcements.targetRole', 'Destinatarios')}</label>
                <select
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  <option value="both">Ambos (Docentes y Alumnos)</option>
                  <option value="teachers">Solo Docentes</option>
                  <option value="students">Solo Alumnos</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">{t('announcements.message', 'Mensaje del Comunicado')}</label>
                <textarea
                  required
                  rows="4"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#182038] border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#0B1956] dark:focus:border-[#F6BE2F] text-slate-800 dark:text-white resize-none"
                  placeholder="Escribe la información detallada del aviso..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#0B1956] hover:bg-[#122473] dark:bg-[#F6BE2F] dark:hover:bg-[#f8ca53] text-white dark:text-[#0B1956] rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {loading ? t('common.loading', 'Cargando...') : t('common.create', 'Publicar Aviso')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#13192B] rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">{t('common.confirmDelete', 'Confirmar eliminación')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ¿Deseas eliminar el aviso <strong className="text-slate-700 dark:text-slate-200">{deletingItem.title}</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
              >
                {t('common.delete', 'Eliminar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUBMODULE 5: INTÉRPRETE ISL EN TIEMPO REAL ---
const AdminInterpreter = () => {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [lastTranslation, setLastTranslation] = useState('');
  const [history, setHistory] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Conectando al servidor...');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const isCapturingRef = useRef(false);

  const unlockWebAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
        const silentUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(silentUtterance);
      } catch (e) {}
    }
  };

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SIGN_LANGUAGE_SERVER_URL || 'https://cokie-college.onrender.com';
    
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setStatusMessage('Conectado al Intérprete');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setStatusMessage('Desconectado del servidor');
    });

    socket.on('translation_result', (data) => {
      if (data && data.text) {
        setLastTranslation(data.text);
        setHistory((prev) => [
          { text: data.text, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 19),
        ]);

        if (!isMuted && typeof window !== 'undefined') {
          // Opción 1: Web Speech Synthesis (Nativa de navegador)
          if ('speechSynthesis' in window) {
            try {
              window.speechSynthesis.cancel();
              window.speechSynthesis.resume();
              const utterance = new SpeechSynthesisUtterance(data.text);
              utterance.lang = 'es-MX';
              utterance.rate = 1.0;
              utterance.volume = 1.0;
              window.speechSynthesis.speak(utterance);
            } catch (e) {
              console.warn('Speech error:', e);
            }
          }
        }
      }
    });

    // Opción 2: Respaldo HTML5 Audio en base64 desde el servidor
    socket.on('translation_audio', (data) => {
      if (!isMuted && data && data.audioBase64) {
        try {
          const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
          audio.play().catch(e => console.warn('HTML5 Audio playback prevented:', e));
        } catch (e) {}
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isMuted]);

  useEffect(() => {
    let stream = null;

    if (isActive) {
      navigator.mediaDevices
        .getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.warn);
          }
        })
        .catch((err) => {
          console.error('Error cámara:', err);
          setStatusMessage('No se pudo acceder a la cámara web');
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isActive]);

  useEffect(() => {
    let intervalId;

    if (isActive) {
      intervalId = setInterval(() => {
        if (!videoRef.current || !socketRef.current || !socketRef.current.connected || isCapturingRef.current) return;
        const video = videoRef.current;

        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          isCapturingRef.current = true;
          try {
            if (!canvasRef.current) {
              canvasRef.current = document.createElement('canvas');
            }
            const canvas = canvasRef.current;
            canvas.width = 480;
            canvas.height = Math.round(480 * (video.videoHeight / video.videoWidth));

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.35);
            const base64 = dataUrl.split(',')[1];

            if (base64) {
              socketRef.current.emit('process_frame', base64);
            }
          } catch (e) {
            console.warn('Frame capture error:', e);
          } finally {
            isCapturingRef.current = false;
          }
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#13192B] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Intérprete de Lenguaje de Señas (ISL)
            </h2>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Traducción e interpretación por voz y subtítulos en tiempo real para exposiciones escolares
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            isConnected 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span>{statusMessage}</span>
          </div>

          <button
            onClick={() => { unlockWebAudio(); setIsMuted(!isMuted); }}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
              isMuted
                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title={isMuted ? 'Voz desactivada' : 'Voz activada'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={() => { unlockWebAudio(); setIsActive(!isActive); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md ${
              isActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            {isActive ? 'Pausar Intérprete' : 'Iniciar Cámara'}
          </button>
        </div>
      </div>

      {/* Main Grid: Camera Video & Live Subtitles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Frame */}
        <div className="lg:col-span-2 relative bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {!isActive && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <VideoOff className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold">Cámara Pausada</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Haz clic en "Iniciar Cámara" para reanudar la captura de señas en tiempo real.
              </p>
            </div>
          )}

          {/* Classroom Subtitle Overlay (Modo Exposición) */}
          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur-md p-5 rounded-2xl border border-amber-400/40 shadow-2xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Volume2 className="w-4 h-4 animate-bounce" />
              <span className="text-[11px] font-black uppercase tracking-wider">Subtítulos de Presentación en Vivo</span>
            </div>

            {lastTranslation ? (
              <p className="text-2xl sm:text-3xl font-black text-white text-center leading-tight tracking-tight">
                "{lastTranslation}"
              </p>
            ) : (
              <p className="text-sm font-semibold text-slate-400 text-center italic">
                Coloca las manos frente a la cámara para interpretar en el salón de clases...
              </p>
            )}
          </div>
        </div>

        {/* Translation History Sidebar */}
        <div className="bg-white dark:bg-[#13192B] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-[480px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-[#0B1956] dark:text-[#F6BE2F]">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-sm font-black uppercase tracking-wider">Historial de Señas</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {history.length} registros
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                <Clock className="w-8 h-8 opacity-40" />
                <p className="text-xs font-semibold">Las señas traducidas aparecerán aquí ordenadas cronológicamente.</p>
              </div>
            ) : (
              history.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-slate-900 dark:text-white font-bold shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Detectado</span>
                    <span>{item.time}</span>
                  </div>
                  <p className="text-sm font-bold">{item.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- MAIN DASHBOARD LAYOUT ---
export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('language', nextLang);
  };

  const navItems = [
    { name: t('menu.users', 'Usuarios'), path: '/dashboard/users', icon: Users, alias: 'users' },
    { name: t('menu.interpreter', 'Intérprete (ISL)'), path: '/dashboard/interpreter', icon: Sparkles, alias: 'interpreter' },
    { name: t('menu.conduct_catalog', 'Catálogo Conducta'), path: '/dashboard/conduct', icon: FileText, alias: 'conduct' },
    { name: t('menu.events', 'Eventos'), path: '/dashboard/events', icon: Calendar, alias: 'events' },
    { name: t('menu.announcements', 'Avisos'), path: '/dashboard/announcements', icon: Bell, alias: 'announcements' }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0B1956] dark:bg-[#0d1326] text-white border-b border-white/10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/dashboard/users" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F6BE2F] flex items-center justify-center font-black text-[#0B1956] text-lg shadow-md">
                C
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight leading-none text-white">
                  Cokie <span className="text-[#F6BE2F]">College</span>
                </h1>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mt-0.5">
                  Superadmin Portal
                </p>
              </div>
            </Link>
          </div>

          {/* Right Utility Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{i18n.language?.toUpperCase() || 'ES'}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
              title="Cambiar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-white" />}
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/15">
              <div className="w-8 h-8 rounded-full bg-[#F6BE2F] text-[#0B1956] flex items-center justify-center font-bold text-xs">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="text-left leading-tight hidden lg:block">
                <p className="text-xs font-bold text-white">{profile?.full_name || 'Admin'}</p>
                <p className="text-[10px] text-white/60 font-semibold uppercase">{profile?.role?.replace('_', ' ')}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all ml-1"
              title={t('menu.logout', 'Cerrar Sesión')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Body Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex gap-6 w-full">
        
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:block w-64 shrink-0 space-y-2">
          <div className="bg-white dark:bg-[#13192B] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.includes(item.alias);
              return (
                <Link
                  key={item.alias}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                    isActive
                      ? 'bg-[#0B1956] text-white dark:bg-[#F6BE2F] dark:text-[#0B1956] shadow-md shadow-indigo-900/10 dark:shadow-amber-500/10'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-[#0B1956]' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="bg-gradient-to-br from-[#0B1956] to-[#1a2e7c] dark:from-[#13192B] dark:to-[#182038] text-white p-4 rounded-2xl border border-white/10 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">Superadmin Mode</span>
            </div>
            <p className="text-[11px] text-white/70 leading-relaxed">
              Plataforma optimizada con control total sobre cuentas, intérprete de señas, eventos y avisos institucionales.
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Sheet */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-start">
            <div className="bg-[#0B1956] dark:bg-[#0d1326] text-white w-72 h-full p-5 space-y-6 flex flex-col justify-between shadow-2xl">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/15">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F6BE2F] text-[#0B1956] flex items-center justify-center font-black">C</div>
                    <span className="font-bold text-sm">Cokie College</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X className="w-5 h-5 text-white/80" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.includes(item.alias);
                    return (
                      <Link
                        key={item.alias}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-[#F6BE2F] text-[#0B1956]'
                            : 'text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-white/15">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/20 text-rose-300 rounded-xl text-xs font-bold border border-rose-500/30"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('menu.logout', 'Cerrar Sesión')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace */}
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="users" element={<AdminUsers />} />
            <Route path="interpreter" element={<AdminInterpreter />} />
            <Route path="conduct" element={<AdminConduct />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="*" element={<Navigate to="/dashboard/users" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
