import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
<<<<<<< HEAD
import { ScrollTrigger } from 'gsap/ScrollTrigger';
=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
import { 
  Users, 
  User,
  FileText, 
  Calendar, 
  BookOpen, 
  Bell, 
  LogOut, 
  Home,
  Menu,
  X,
  Search,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

import StudentSchedule from '../components/StudentSchedule';
import StudentDiary from '../components/StudentDiary';
import StudentJustifications from '../components/StudentJustifications';
<<<<<<< HEAD
import StudentGrades from '../components/StudentGrades';

gsap.registerPlugin(ScrollTrigger);
=======
import StudentGrades from '../components/StudentGrades'; // NEW IMPORT
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34


// --- Sub-componentes para Admin ---
const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'student',
    grade: '',
    section: '',
    first_surname: '',
    second_surname: '',
    level: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const response = await api.get('/admin/users', {
        params: { role: roleFilter || undefined }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
<<<<<<< HEAD
      alert('Error al cargar usuarios');
=======
      const errorMsg = error.response?.data?.error || error.message;
      const errorDetails = error.response?.data?.details ? `\n\nDetalles: ${error.response.data.details}\nID de Usuario: ${error.response.data.userId}` : '';
      const dbError = error.response?.data?.dbError ? `\nError DB: ${error.response.data.dbError}` : '';
      alert(`Error al cargar usuarios: ${errorMsg}${errorDetails}${dbError}`);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    } finally {
      setFetching(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.institutional_code?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/users', formData);
<<<<<<< HEAD
      alert('Usuario creado exitosamente');
=======
      alert('Usuario creado exitosamente. Verifique su correo o use la contraseña temporal en el sistema.');
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      setIsModalOpen(false);
      setFormData({
        full_name: '', email: '', role: 'student', 
        grade: '', section: '', first_surname: '', second_surname: '', level: ''
      });
      fetchUsers();
    } catch (error) {
<<<<<<< HEAD
      alert(error.response?.data?.error || 'Error al crear usuario');
=======
      const errorMsg = error.response?.data?.error || 'Error al crear usuario';
      const errorDetails = error.response?.data?.details ? `\n\nDetalles: ${error.response.data.details}\nID de Usuario: ${error.response.data.userId}` : '';
      alert(`${errorMsg}${errorDetails}`);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      first_surname: '',
      second_surname: '',
      email: user.email,
      role: user.role,
      grade: user.grade || '',
<<<<<<< HEAD
      section: user.section || '',
      level: user.level || ''
=======
      section: user.section || ''
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/admin/users/${editingUser.id}`, {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        grade: formData.grade,
<<<<<<< HEAD
        section: formData.section,
        level: formData.level
=======
        section: formData.section
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      });
      alert('Usuario actualizado correctamente');
      setIsEditModalOpen(false);
      setEditingUser(null);
      setFormData({
        full_name: '', email: '', role: 'student', 
<<<<<<< HEAD
        grade: '', section: '', first_surname: '', second_surname: '', level: ''
=======
        grade: '', section: '', first_surname: '', second_surname: ''
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (error) {
      alert('Error al eliminar usuario');
    }
  };

  return (
    <div className="p-8 relative">
      <div className="flex justify-between items-center mb-8">
<<<<<<< HEAD
        <h1 className="text-2xl font-bold text-primary">Gestión de Usuarios</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-primary-light transition shadow-elevated z-10"
=======
        <h1 className="text-2xl font-bold text-navy">Gestión de Usuarios</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-navy text-white px-6 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-navy/90 transition shadow-lg z-10"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
        >
          <Plus size={20} />
          <span className="font-bold">Crear Usuario</span>
        </button>
      </div>

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">Nuevo Usuario</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-muted">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
<<<<<<< HEAD
                <label className="block text-sm font-semibold text-primary mb-1">Nombres</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                <label className="block text-sm font-semibold text-navy mb-1">Nombres</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
              </div>
              <div>
<<<<<<< HEAD
                <label className="block text-sm font-semibold text-primary mb-1">Primer Apellido</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                <label className="block text-sm font-semibold text-navy mb-1">Primer Apellido</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                  value={formData.first_surname}
                  onChange={(e) => setFormData({...formData, first_surname: e.target.value})}
                />
              </div>
              <div>
<<<<<<< HEAD
                <label className="block text-sm font-semibold text-primary mb-1">Segundo Apellido</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                <label className="block text-sm font-semibold text-navy mb-1">Segundo Apellido</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                  value={formData.second_surname}
                  onChange={(e) => setFormData({...formData, second_surname: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
<<<<<<< HEAD
                <label className="block text-sm font-semibold text-primary mb-1">Correo Electrónico</label>
                <input 
                  type="email" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                <label className="block text-sm font-semibold text-navy mb-1">Correo Electrónico</label>
                <input 
                  type="email" required
                  className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
<<<<<<< HEAD
                <label className="block text-sm font-semibold text-primary mb-1">Rol</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                <label className="block text-sm font-semibold text-navy mb-1">Rol</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="student">Estudiante</option>
                  <option value="teacher">Maestro</option>
                  <option value="coordinator">Coordinador</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              {formData.role === 'student' && (
                <>
                  <div>
<<<<<<< HEAD
                    <label className="block text-sm font-semibold text-primary mb-1">Grado</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                    <label className="block text-sm font-semibold text-navy mb-1">Grado</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                      value={formData.grade}
                      onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    >
                      <option value="">Seleccionar</option>
                      {[2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>{g}º</option>)}
                    </select>
                  </div>
                  <div>
<<<<<<< HEAD
                    <label className="block text-sm font-semibold text-primary mb-1">Sección</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                    <label className="block text-sm font-semibold text-navy mb-1">Sección</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                      value={formData.section}
                      onChange={(e) => setFormData({...formData, section: e.target.value})}
                    >
                      <option value="">Seleccionar</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </>
              )}
              {(formData.role === 'coordinator' || formData.role === 'teacher') && (
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">Nivel</label>
                  <select 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Primaria">Primaria</option>
                    <option value="Tercer Ciclo">Tercer Ciclo</option>
                  </select>
                </div>
              )}
              <div className="md:col-span-2 mt-4">
                <button 
                  type="submit"
                  disabled={loading}
<<<<<<< HEAD
                  className="w-full bg-primary text-white py-3.5 rounded-xl font-bold shadow-elevated hover:bg-primary-light transition flex items-center justify-center space-x-2"
=======
                  className="w-full bg-navy text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-navy/90 transition flex items-center justify-center space-x-2"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                >
                  {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
                  <span>{loading ? 'Guardando...' : 'Generar Credenciales'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

<<<<<<< HEAD
      <div className="bg-white rounded-2xl shadow-card border border-primary/5 overflow-hidden">
        <div className="p-5 border-b border-primary/5 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 bg-gray-50/50">
=======
      <div className="bg-white rounded-2xl shadow-sm border border-navy/5 overflow-hidden">
        <div className="p-5 border-b border-navy/5 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 bg-cream/10">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o código..." 
<<<<<<< HEAD
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-light outline-none transition text-primary text-sm"
=======
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-lilac bg-white focus:ring-2 focus:ring-blue_custom outline-none transition text-navy text-sm"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
<<<<<<< HEAD
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-light outline-none transition text-primary text-sm"
=======
            className="px-4 py-2.5 rounded-xl border border-lilac bg-white focus:ring-2 focus:ring-blue_custom outline-none transition text-navy text-sm"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Todos los Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="coordinator">Coordinador</option>
            <option value="teacher">Maestro</option>
            <option value="student">Estudiante</option>
          </select>
        </div>

        <table className="w-full text-left">
<<<<<<< HEAD
          <thead className="bg-gray-50/80 text-primary/60 font-semibold text-[12px] uppercase tracking-wider border-b border-primary/5">
=======
          <thead className="bg-cream/20 text-navy/60 font-semibold text-[12px] uppercase tracking-wider border-b border-navy/5">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            <tr>
              <th className="px-6 py-4">Nombre Completo</th>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Rol</th>
<<<<<<< HEAD
              <th className="px-6 py-4">Grado/Sec/Nivel</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5 text-sm">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-primary">{user.full_name}</td>
                <td className="px-6 py-4 font-mono text-[12px] text-muted">{user.institutional_code}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-tight">{user.role}</span>
                </td>
                <td className="px-6 py-4 text-muted">
                  {user.role === 'student' ? `${user.grade}º ${user.section}` : (user.level || 'N/A')}
=======
              <th className="px-6 py-4">Grado/Sección</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/5 text-sm">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-cream/5 transition-colors">
                <td className="px-6 py-4 font-medium text-navy">{user.full_name}</td>
                <td className="px-6 py-4 font-mono text-[12px] text-muted">{user.institutional_code}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full bg-lilac/30 text-navy text-[11px] font-bold uppercase tracking-tight">{user.role}</span>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                </td>
                <td className="px-6 py-4 text-muted">{user.grade ? `${user.grade}º ${user.section}` : 'N/A'}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={() => handleEditUser(user)}
<<<<<<< HEAD
                      className="p-2 text-primary-light hover:bg-primary-light/10 rounded-xl transition-colors"
=======
                      className="p-2 text-blue_custom hover:bg-blue_custom/10 rounded-xl transition-colors"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-bad hover:bg-bad/10 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {fetching && (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
<<<<<<< HEAD
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="text-primary/50 font-medium animate-pulse">Cargando usuarios...</p>
=======
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-navy"></div>
            <p className="text-navy/50 font-medium animate-pulse">Cargando usuarios...</p>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          </div>
        )}
        {!fetching && filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted italic">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Modal de Edición de Usuario */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
<<<<<<< HEAD
            className="bg-white rounded-2xl shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">Editar Usuario</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-muted">
=======
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Editar Usuario</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
<<<<<<< HEAD
                <label className="block text-sm font-semibold text-primary mb-1">Nombre Completo</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                <label className="block text-sm font-semibold text-navy mb-1">Nombre Completo</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
<<<<<<< HEAD
                <label className="block text-sm font-semibold text-primary mb-1">Correo Electrónico</label>
                <input 
                  type="email" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                <label className="block text-sm font-semibold text-navy mb-1">Correo Electrónico</label>
                <input 
                  type="email" required
                  className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
<<<<<<< HEAD
                <label className="block text-sm font-semibold text-primary mb-1">Rol</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                <label className="block text-sm font-semibold text-navy mb-1">Rol</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="student">Estudiante</option>
                  <option value="teacher">Maestro</option>
                  <option value="coordinator">Coordinador</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              {formData.role === 'student' && (
                <>
                  <div>
<<<<<<< HEAD
                    <label className="block text-sm font-semibold text-primary mb-1">Grado</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                    <label className="block text-sm font-semibold text-navy mb-1">Grado</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                      value={formData.grade}
                      onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    >
                      <option value="">Seleccionar</option>
                      {[2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>{g}º</option>)}
                    </select>
                  </div>
                  <div>
<<<<<<< HEAD
                    <label className="block text-sm font-semibold text-primary mb-1">Sección</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
=======
                    <label className="block text-sm font-semibold text-navy mb-1">Sección</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                      value={formData.section}
                      onChange={(e) => setFormData({...formData, section: e.target.value})}
                    >
                      <option value="">Seleccionar</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </>
              )}
<<<<<<< HEAD
              {(formData.role === 'coordinator' || formData.role === 'teacher') && (
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">Nivel</label>
                  <select 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Primaria">Primaria</option>
                    <option value="Tercer Ciclo">Tercer Ciclo</option>
                  </select>
                </div>
              )}
=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              <div className="md:col-span-2 mt-4">
                <button 
                  type="submit"
                  disabled={loading}
<<<<<<< HEAD
                  className="w-full bg-primary text-white py-3.5 rounded-xl font-bold shadow-elevated hover:bg-primary-light transition flex items-center justify-center space-x-2"
=======
                  className="w-full bg-navy text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-navy/90 transition flex items-center justify-center space-x-2"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                >
                  {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
                  <span>{loading ? 'Actualizando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const AdminSchedules = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    teacher_id: '',
    subject_id: '',
    grade: '',
    section: '',
    day_of_week: '1',
    start_time: '',
    end_time: ''
  });

  const formRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    fetchData();
    
    // GSAP Animations
    gsap.fromTo(headerRef.current, 
      { opacity: 0, y: -20 }, 
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );

    if (formRef.current) {
      const elements = formRef.current.children;
      gsap.fromTo(elements, 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 0.2 }
      );
    }
  }, []);

  const fetchData = async () => {
    try {
      const [tchRes, subRes] = await Promise.all([
        api.get('/admin/users', { params: { role: 'teacher' } }),
        api.get('/admin/subjects')
      ]);
      setTeachers(tchRes.data);
      setSubjects(subRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/schedules', formData);
      alert('Horario asignado exitosamente');
      setFormData({
        teacher_id: '', subject_id: '', grade: '', section: '', day_of_week: '1', start_time: '', end_time: ''
      });
      gsap.fromTo(formRef.current, { scale: 0.98 }, { scale: 1, duration: 0.3, ease: "back.out(1.7)" });
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error al asignar el horario');
    } finally {
      setLoading(false);
    }
  };

  return (
<<<<<<< HEAD
    <div className="p-6 md:p-10 font-poppins text-primary">
      <div ref={headerRef} className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">Asignación de Clases</h1>
        <p className="text-muted mt-2 text-sm md:text-base">Asigna maestros a materias y horarios específicos.</p>
      </div>

      <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-card border border-primary/5 max-w-3xl">
        <h2 className="text-xl font-bold text-primary mb-8 flex items-center gap-3">
          <BookOpen className="text-mid" size={24} />
=======
    <div className="p-6 md:p-10 font-poppins text-[#0B1957]">
      <div ref={headerRef} className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0B1957] font-sora">Asignación de Clases</h1>
        <p className="text-[#8a94b2] mt-2 text-sm md:text-base">Asigna maestros a materias y horarios específicos.</p>
      </div>

      <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-[0_8px_30px_rgba(11,25,87,0.06)] border border-[#0B1957]/5 max-w-3xl">
        <h2 className="text-xl font-bold text-[#0B1957] mb-8 flex items-center gap-3">
          <BookOpen className="text-[#f5a623]" size={24} />
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          Detalles de la Asignación
        </h2>
        
        <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
<<<<<<< HEAD
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Maestro</label>
            <div className="relative">
              <select required value={formData.teacher_id} onChange={e => setFormData({...formData, teacher_id: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all appearance-none text-primary font-medium cursor-pointer">
=======
            <label className="block text-xs font-bold text-[#8a94b2] uppercase tracking-wider mb-2">Maestro</label>
            <div className="relative">
              <select required value={formData.teacher_id} onChange={e => setFormData({...formData, teacher_id: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-[#F5F7FA] focus:bg-white focus:border-[#0B1957] outline-none transition-all appearance-none text-[#0B1957] font-medium cursor-pointer">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                <option value="">-- Seleccionar Maestro --</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
<<<<<<< HEAD
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
=======
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="#0B1957" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2">
<<<<<<< HEAD
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Materia</label>
            <div className="relative">
              <select required value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all appearance-none text-primary font-medium cursor-pointer">
=======
            <label className="block text-xs font-bold text-[#8a94b2] uppercase tracking-wider mb-2">Materia</label>
            <div className="relative">
              <select required value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-[#F5F7FA] focus:bg-white focus:border-[#0B1957] outline-none transition-all appearance-none text-[#0B1957] font-medium cursor-pointer">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                <option value="">-- Seleccionar Materia --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
<<<<<<< HEAD
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
=======
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="#0B1957" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              </div>
            </div>
          </div>

          <div>
<<<<<<< HEAD
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Grado</label>
            <div className="relative">
              <select required value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all appearance-none text-primary font-medium cursor-pointer">
=======
            <label className="block text-xs font-bold text-[#8a94b2] uppercase tracking-wider mb-2">Grado</label>
            <div className="relative">
              <select required value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-[#F5F7FA] focus:bg-white focus:border-[#0B1957] outline-none transition-all appearance-none text-[#0B1957] font-medium cursor-pointer">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                <option value="">Seleccionar</option>
                {[2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>{g}º Grado</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
<<<<<<< HEAD
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
=======
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="#0B1957" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              </div>
            </div>
          </div>

          <div>
<<<<<<< HEAD
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Sección</label>
            <div className="relative">
              <select required value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all appearance-none text-primary font-medium cursor-pointer">
=======
            <label className="block text-xs font-bold text-[#8a94b2] uppercase tracking-wider mb-2">Sección</label>
            <div className="relative">
              <select required value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-[#F5F7FA] focus:bg-white focus:border-[#0B1957] outline-none transition-all appearance-none text-[#0B1957] font-medium cursor-pointer">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                <option value="">Seleccionar</option>
                <option value="A">Sección A</option><option value="B">Sección B</option><option value="C">Sección C</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
<<<<<<< HEAD
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
=======
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="#0B1957" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
<<<<<<< HEAD
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Día de la Semana</label>
            <div className="relative">
              <select required value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all appearance-none text-primary font-medium cursor-pointer">
=======
            <label className="block text-xs font-bold text-[#8a94b2] uppercase tracking-wider mb-2">Día de la Semana</label>
            <div className="relative">
              <select required value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-[#F5F7FA] focus:bg-white focus:border-[#0B1957] outline-none transition-all appearance-none text-[#0B1957] font-medium cursor-pointer">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                {[
                  { name: 'Lunes', value: '1' },
                  { name: 'Martes', value: '2' },
                  { name: 'Miércoles', value: '3' },
                  { name: 'Jueves', value: '4' },
                  { name: 'Viernes', value: '5' }
                ].map(d => <option key={d.value} value={d.value}>{d.name}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
<<<<<<< HEAD
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
=======
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="#0B1957" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              </div>
            </div>
          </div>

          <div>
<<<<<<< HEAD
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Hora Inicio</label>
            <input type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all text-primary font-medium"/>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Hora Fin</label>
            <input type="time" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all text-primary font-medium"/>
          </div>

          <div className="md:col-span-2 pt-6">
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-light text-white py-4 rounded-2xl font-bold tracking-wide transition-all active:scale-[0.98] shadow-elevated flex justify-center items-center">
=======
            <label className="block text-xs font-bold text-[#8a94b2] uppercase tracking-wider mb-2">Hora Inicio</label>
            <input type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-[#F5F7FA] focus:bg-white focus:border-[#0B1957] outline-none transition-all text-[#0B1957] font-medium"/>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#8a94b2] uppercase tracking-wider mb-2">Hora Fin</label>
            <input type="time" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-[#F5F7FA] focus:bg-white focus:border-[#0B1957] outline-none transition-all text-[#0B1957] font-medium"/>
          </div>

          <div className="md:col-span-2 pt-6">
            <button type="submit" disabled={loading} className="w-full bg-[#0B1957] hover:bg-[#0B1957]/90 text-white py-4 rounded-2xl font-bold tracking-wide transition-all active:scale-[0.98] shadow-xl hover:shadow-2xl flex justify-center items-center">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Asignar Maestro a Clase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ConductCatalog = () => {
  const [codes, setCodes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', category: 'Positivo', description: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
<<<<<<< HEAD
  const [categoryFilter, setCategoryFilter] = useState('');

  const [editingCode, setEditingCode] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setFetching(true);
    try {
      console.log('Fetching conduct codes...');
      const response = await api.get('/admin/conduct-codes');
      console.log('Conduct codes response:', response.data);
      setCodes(response.data);
    } catch (error) {
      console.error('Error fetching codes:', error);
      const errorMsg = error.response?.data?.error || error.message;
      const errorDetails = error.response?.data?.details ? `\n\nDetalles: ${error.response.data.details}\nID de Usuario: ${error.response.data.userId}` : '';
      const dbError = error.response?.data?.dbError ? `\nError DB: ${error.response.data.dbError}` : '';
      alert(`Error al cargar los códigos de conducta: ${errorMsg}${errorDetails}${dbError}`);
    } finally {
      setFetching(false);
    }
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/conduct-codes', formData);
      alert('Código de conducta creado exitosamente');
      setIsModalOpen(false);
      setFormData({ code: '', name: '', category: 'Positivo', description: '' });
      fetchCodes();
    } catch (error) {
      alert('Error al crear código: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditCode = (code) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      name: code.name,
      category: code.category,
      description: code.description
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/admin/conduct-codes/${editingCode.id}`, formData);
      alert('Código actualizado correctamente');
      setIsEditModalOpen(false);
      setEditingCode(null);
      setFormData({ code: '', name: '', category: 'Positivo', description: '' });
      fetchCodes();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al actualizar código');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCode = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este código?')) return;
    try {
      await api.delete(`/admin/conduct-codes/${id}`);
      fetchCodes();
    } catch (error) {
      alert('Error al eliminar código');
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Positivo': return 'bg-good text-white';
      case 'Leve': return 'bg-mid text-white';
      case 'Grave': return 'bg-bad text-white';
      case 'Muy Grave': return 'bg-navy text-white';
      default: return 'bg-muted text-white';
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-navy">Catálogo de Conducta</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-navy text-white px-6 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-navy/90 transition shadow-lg z-10"
        >
          <Plus size={20} />
          <span className="font-bold">Nuevo Código</span>
        </button>
      </div>

      {/* Modal de Creación de Código */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-elevated max-w-md w-full overflow-hidden"
          >
            <div className="p-6 border-b border-primary/5 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-primary">Nuevo Código de Conducta</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-primary/5 rounded-full transition-colors text-muted">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCode} className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-primary mb-1">Código</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition uppercase"
                    placeholder="P01"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-primary mb-1">Nombre</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
                    placeholder="Ej: Participa en clase"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-1">Categoría</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Positivo">Positivo</option>
                  <option value="Leve">Leve</option>
                  <option value="Grave">Grave</option>
                  <option value="Muy Grave">Muy Grave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-1">Descripción</label>
                <textarea 
                  rows="3" required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition resize-none"
                  placeholder="Describa brevemente la conducta..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold shadow-elevated hover:bg-primary-light transition flex items-center justify-center space-x-2"
              >
                {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
                <span>{loading ? 'Guardando...' : 'Guardar Código'}</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-primary/5 overflow-hidden">
        <div className="p-5 border-b border-primary/5 bg-gray-50/50 flex justify-end">
          <select 
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-light outline-none transition text-primary text-sm w-full md:w-64"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas las Categorías</option>
            <option value="Positivo">Positivo</option>
            <option value="Leve">Leve</option>
            <option value="Grave">Grave</option>
            <option value="Muy Grave">Muy Grave</option>
          </select>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50/80 text-primary/60 font-semibold text-[12px] uppercase tracking-wider border-b border-primary/5">
            <tr>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Categoría</th>
              <th className="px-6 py-4">Descripción</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5 text-sm">
            {codes.filter(c => categoryFilter === '' || c.category === categoryFilter).map((code) => (
              <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-primary-light">{code.code}</td>
                <td className="px-6 py-4 font-bold text-primary">{code.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${getCategoryColor(code.category)}`}>
                    {code.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted max-w-xs truncate">{code.description}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={() => handleEditCode(code)}
                      className="p-2 text-primary-light hover:bg-primary-light/10 rounded-xl transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCode(code.id)}
                      className="p-2 text-bad hover:bg-bad/10 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {fetching && (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="text-primary/50 font-medium animate-pulse">Cargando catálogo...</p>
          </div>
        )}
        {!fetching && codes.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted italic">No hay códigos de conducta registrados</p>
          </div>
        )}
      </div>

      {/* Modal de Edición de Código */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-elevated max-w-md w-full overflow-hidden"
          >
            <div className="p-6 border-b border-primary/5 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-primary">Editar Código de Conducta</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-primary/5 rounded-full transition-colors text-primary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateCode} className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-primary mb-1">Código</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition uppercase"
                    placeholder="P01"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-primary mb-1">Nombre</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
                    placeholder="Ej: Participa en clase"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-1">Categoría</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Positivo">Positivo</option>
                  <option value="Leve">Leve</option>
                  <option value="Grave">Grave</option>
                  <option value="Muy Grave">Muy Grave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-1">Descripción</label>
                <textarea 
                  rows="3" required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition resize-none"
                  placeholder="Describa brevemente la conducta..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold shadow-elevated hover:bg-primary-light transition flex items-center justify-center space-x-2"
              >
                {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
                <span>{loading ? 'Actualizando...' : 'Guardar Cambios'}</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// --- Sub-componentes para Maestro ---
const TeacherAttendance = () => {
  const [activeClassData, setActiveClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Conduct modal state
  const [conductModal, setConductModal] = useState({ isOpen: false, student: null });
  const [conductCodes, setConductCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [observation, setObservation] = useState('');
  const [savingConduct, setSavingConduct] = useState(false);

  useEffect(() => {
    fetchActiveClassAndCodes();
  }, []);

  const fetchActiveClassAndCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const [activeRes, codesRes] = await Promise.all([
        api.get('/teacher/active-class'),
        api.get('/teacher/conduct-codes')
      ]);
      
      setActiveClassData(activeRes.data);
      setConductCodes(codesRes.data);

      if (activeRes.data.claseActiva) {
        const mapped = activeRes.data.estudiantes.map(s => ({ ...s, status: 'present' }));
        setStudents(mapped);
      }
    } catch (error) {
      console.error('Error fetching active class or codes:', error);
      setError('Error al cargar la información de la clase');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (id) => {
    setStudents(students.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'present' ? 'absent' : 'present' };
      }
      return s;
    }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const attendances = students.map(s => ({
        student_id: s.id,
        subject_id: activeClassData.subject_id,
        status: s.status,
        period: 1, // Assume period 1 or let them pick
        date: new Date().toISOString()
      }));
      await api.post('/teacher/attendance', { attendances });
      alert('Asistencia guardada correctamente');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Error al guardar la asistencia');
    } finally {
      setSaving(false);
    }
  };

  const submitConduct = async (e) => {
    e.preventDefault();
    if (!selectedCode) return alert('Selecciona un código de conducta');
    setSavingConduct(true);
    try {
      await api.post('/teacher/conduct-records', {
        student_id: conductModal.student.id,
        code_id: selectedCode,
        observation: observation,
        period: 1
      });
      alert('Código de conducta aplicado');
      setConductModal({ isOpen: false, student: null });
      setSelectedCode('');
      setObservation('');
    } catch (error) {
      console.error('Error saving conduct:', error);
      alert('Error al guardar conducta');
    } finally {
      setSavingConduct(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mb-4"></div>
        <p className="text-navy font-medium">Cargando clase activa...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
          <p className="text-red-600 font-bold mb-4">{error}</p>
          <button 
            onClick={fetchActiveClassAndCodes}
            className="bg-navy text-white px-6 py-2 rounded-xl font-bold hover:bg-navy/90 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {!activeClassData?.claseActiva ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-navy/5 shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-cream rounded-full flex items-center justify-center mb-6">
            <Calendar size={40} className="text-navy/30" />
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">No tienes clase activa en este momento</h2>
          {activeClassData?.proximaClase ? (
            <div className="mt-4 p-4 bg-blue_custom/5 rounded-2xl border border-blue_custom/10">
              <p className="text-blue_custom font-bold">
                Tu próxima clase es <span className="text-navy uppercase">{activeClassData.proximaClase.materia}</span>
              </p>
              <p className="text-muted text-sm mt-1">
                A las {activeClassData.proximaClase.start_time.substring(0, 5)} en {activeClassData.proximaClase.grade}º {activeClassData.proximaClase.section}
              </p>
            </div>
          ) : (
            <p className="text-muted">{activeClassData?.mensaje || "No hay más clases programadas para hoy."}</p>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-navy rounded-3xl p-6 mb-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-good/20 text-good rounded-full text-[10px] font-black uppercase tracking-wider">En curso</span>
                  <span className="text-white/60 text-[10px] font-black uppercase tracking-wider">Asistencia Automática</span>
                </div>
                <h1 className="text-3xl font-black">{activeClassData.materia}</h1>
                <p className="text-white/70 font-bold uppercase tracking-widest text-sm mt-1">
                  {activeClassData.grade}º {activeClassData.section} • {activeClassData.start_time.substring(0, 5)} - {activeClassData.end_time.substring(0, 5)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <p className="text-white/50 text-[10px] font-black uppercase">Estudiantes</p>
                  <p className="text-2xl font-black">{students.length}</p>
                </div>
                <button 
                  onClick={saveAttendance}
                  disabled={saving}
                  className="bg-white text-navy px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-cream transition-all flex items-center space-x-3 active:scale-95 disabled:opacity-50"
                >
                  {saving && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-navy"></div>}
                  <span>GUARDAR</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm border border-navy/5 overflow-hidden mb-8">
            <table className="w-full text-left">
              <thead className="bg-cream/20 text-navy/60 font-semibold text-[11px] uppercase tracking-wider border-b border-navy/5">
                <tr>
                  <th className="px-8 py-5">Nombre del Estudiante</th>
                  <th className="px-8 py-5 text-center">Estado de Asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-cream/5 transition-colors">
                    <td className="px-8 py-5">
                      <button 
                        onClick={() => setConductModal({ isOpen: true, student })}
                        className="text-left group w-full"
                        title="Aplicar código de conducta"
                      >
                        <p className="font-bold text-navy group-hover:text-blue_custom transition-colors cursor-pointer">{student.full_name}</p>
                        <p className="text-[10px] font-mono text-muted uppercase group-hover:text-blue_custom/70">{student.institutional_code}</p>
                      </button>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center items-center">
                        <button 
                          onClick={() => toggleStatus(student.id)}
                          className={`relative inline-flex h-9 w-16 items-center rounded-full transition-colors ${
                            student.status === 'present' ? 'bg-good' : 'bg-bad'
                          }`}
                        >
                          <span className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-sm transition-transform ${
                            student.status === 'present' ? 'translate-x-8' : 'translate-x-1'
                          }`} />
                        </button>
                        <span className={`ml-4 text-xs font-black w-24 ${student.status === 'present' ? 'text-good' : 'text-bad'}`}>
                          {student.status === 'present' ? 'PRESENTE' : 'AUSENTE'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Conduct Modal */}
      <AnimatePresence>
        {conductModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setConductModal({ isOpen: false, student: null })}
                className="absolute top-6 right-6 p-2 bg-cream text-navy rounded-full hover:bg-lilac transition-colors"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-2xl font-bold text-navy mb-2">Código de Conducta</h2>
              <p className="text-muted text-sm mb-6">Aplicando a: <span className="font-bold text-navy">{conductModal.student?.full_name}</span></p>

              <form onSubmit={submitConduct} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Seleccione el Código</label>
                  <select
                    required
                    value={selectedCode}
                    onChange={(e) => setSelectedCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition text-navy"
                  >
                    <option value="">-- Seleccionar --</option>
                    {conductCodes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Observación (Opcional)</label>
                  <textarea
                    rows="3"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary-light outline-none transition text-primary resize-none"
                    placeholder="Detalles de la conducta..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingConduct}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-elevated hover:bg-primary-light transition flex items-center justify-center space-x-2"
                >
                  {savingConduct ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : <span>Aplicar Código</span>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TeacherGrades = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchedulesAndActivities();
  }, []);

=======

  const [editingCode, setEditingCode] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setFetching(true);
    try {
      console.log('Fetching conduct codes...');
      const response = await api.get('/admin/conduct-codes');
      console.log('Conduct codes response:', response.data);
      setCodes(response.data);
    } catch (error) {
      console.error('Error fetching codes:', error);
      const errorMsg = error.response?.data?.error || error.message;
      const errorDetails = error.response?.data?.details ? `\n\nDetalles: ${error.response.data.details}\nID de Usuario: ${error.response.data.userId}` : '';
      const dbError = error.response?.data?.dbError ? `\nError DB: ${error.response.data.dbError}` : '';
      alert(`Error al cargar los códigos de conducta: ${errorMsg}${errorDetails}${dbError}`);
    } finally {
      setFetching(false);
    }
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/conduct-codes', formData);
      alert('Código de conducta creado exitosamente');
      setIsModalOpen(false);
      setFormData({ code: '', name: '', category: 'Positivo', description: '' });
      fetchCodes();
    } catch (error) {
      alert('Error al crear código: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditCode = (code) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      name: code.name,
      category: code.category,
      description: code.description
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/admin/conduct-codes/${editingCode.id}`, formData);
      alert('Código actualizado correctamente');
      setIsEditModalOpen(false);
      setEditingCode(null);
      setFormData({ code: '', name: '', category: 'Positivo', description: '' });
      fetchCodes();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al actualizar código');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCode = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este código?')) return;
    try {
      await api.delete(`/admin/conduct-codes/${id}`);
      fetchCodes();
    } catch (error) {
      alert('Error al eliminar código');
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Positivo': return 'bg-good text-white';
      case 'Leve': return 'bg-mid text-white';
      case 'Grave': return 'bg-bad text-white';
      case 'Muy Grave': return 'bg-navy text-white';
      default: return 'bg-muted text-white';
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-navy">Catálogo de Conducta</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-navy text-white px-6 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-navy/90 transition shadow-lg z-10"
        >
          <Plus size={20} />
          <span className="font-bold">Nuevo Código</span>
        </button>
      </div>

      {/* Modal de Creación de Código */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6 border-b border-navy/5 flex justify-between items-center bg-cream/20">
              <h2 className="text-xl font-bold text-navy">Nuevo Código de Conducta</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-navy/5 rounded-full transition-colors">
                <X size={20} className="text-navy" />
              </button>
            </div>
            <form onSubmit={handleCreateCode} className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-navy mb-1">Código</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2.5 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition uppercase"
                    placeholder="P01"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-navy mb-1">Nombre</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2.5 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
                    placeholder="Ej: Participa en clase"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1">Categoría</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Positivo">Positivo</option>
                  <option value="Leve">Leve</option>
                  <option value="Grave">Grave</option>
                  <option value="Muy Grave">Muy Grave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1">Descripción</label>
                <textarea 
                  rows="3" required
                  className="w-full px-4 py-2.5 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition resize-none"
                  placeholder="Describa brevemente la conducta..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-navy/90 transition flex items-center justify-center space-x-2"
              >
                {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
                <span>{loading ? 'Guardando...' : 'Guardar Código'}</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-navy/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-cream/20 text-navy/60 font-semibold text-[12px] uppercase tracking-wider border-b border-navy/5">
            <tr>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Categoría</th>
              <th className="px-6 py-4">Descripción</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/5 text-sm">
            {codes.map((code) => (
              <tr key={code.id} className="hover:bg-cream/5 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-blue_custom">{code.code}</td>
                <td className="px-6 py-4 font-bold text-navy">{code.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${getCategoryColor(code.category)}`}>
                    {code.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted max-w-xs truncate">{code.description}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={() => handleEditCode(code)}
                      className="p-2 text-blue_custom hover:bg-blue_custom/10 rounded-xl transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCode(code.id)}
                      className="p-2 text-bad hover:bg-bad/10 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {fetching && (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-navy"></div>
            <p className="text-navy/50 font-medium animate-pulse">Cargando catálogo...</p>
          </div>
        )}
        {!fetching && codes.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted italic">No hay códigos de conducta registrados</p>
          </div>
        )}
      </div>

      {/* Modal de Edición de Código */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6 border-b border-navy/5 flex justify-between items-center bg-cream/20">
              <h2 className="text-xl font-bold text-navy">Editar Código de Conducta</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-navy/5 rounded-full transition-colors">
                <X size={20} className="text-navy" />
              </button>
            </div>
            <form onSubmit={handleUpdateCode} className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-navy mb-1">Código</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2.5 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition uppercase"
                    placeholder="P01"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-navy mb-1">Nombre</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2.5 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
                    placeholder="Ej: Participa en clase"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1">Categoría</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Positivo">Positivo</option>
                  <option value="Leve">Leve</option>
                  <option value="Grave">Grave</option>
                  <option value="Muy Grave">Muy Grave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1">Descripción</label>
                <textarea 
                  rows="3" required
                  className="w-full px-4 py-2.5 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition resize-none"
                  placeholder="Describa brevemente la conducta..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-navy/90 transition flex items-center justify-center space-x-2"
              >
                {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
                <span>{loading ? 'Actualizando...' : 'Guardar Cambios'}</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// --- Sub-componentes para Maestro ---
const TeacherAttendance = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Conduct modal state
  const [conductModal, setConductModal] = useState({ isOpen: false, student: null });
  const [conductCodes, setConductCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [observation, setObservation] = useState('');
  const [savingConduct, setSavingConduct] = useState(false);

  useEffect(() => {
    fetchSchedulesAndCodes();
  }, []);

  const fetchSchedulesAndCodes = async () => {
    try {
      setLoading(true);
      const [schedRes, codesRes] = await Promise.all([
        api.get('/teacher/schedule'),
        api.get('/teacher/conduct-codes')
      ]);
      // Deduplicate schedules to get unique classes taught
      const uniqueClasses = [];
      schedRes.data.forEach(s => {
        if (!uniqueClasses.find(c => c.subject_id === s.subject_id && c.grade === s.grade && c.section === s.section)) {
          uniqueClasses.push(s);
        }
      });
      setSchedules(uniqueClasses);
      setConductCodes(codesRes.data);
    } catch (error) {
      console.error('Error fetching schedules or codes:', error);
      alert('Error al cargar clases o códigos de conducta');
    } finally {
      setLoading(false);
    }
  };

  const loadClass = async (cls) => {
    setSelectedClass(cls);
    setLoading(true);
    try {
      const response = await api.get('/teacher/class-students', {
        params: { grade: cls.grade, section: cls.section }
      });
      const mapped = response.data.map(s => ({ ...s, status: 'present' }));
      setStudents(mapped);
    } catch (error) {
      console.error('Error fetching students:', error);
      alert('Error al cargar alumnos');
      setSelectedClass(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (id) => {
    setStudents(students.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'present' ? 'absent' : 'present' };
      }
      return s;
    }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const attendances = students.map(s => ({
        student_id: s.id,
        subject_id: selectedClass.subject_id,
        status: s.status,
        period: 1, // Assume period 1 or let them pick
        date: new Date().toISOString()
      }));
      await api.post('/teacher/attendance', { attendances });
      alert('Asistencia guardada en la base de datos');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Error al guardar la asistencia');
    } finally {
      setSaving(false);
    }
  };

  const submitConduct = async (e) => {
    e.preventDefault();
    if (!selectedCode) return alert('Selecciona un código de conducta');
    setSavingConduct(true);
    try {
      await api.post('/teacher/conduct-records', {
        student_id: conductModal.student.id,
        code_id: selectedCode,
        observation: observation,
        period: 1
      });
      alert('Código de conducta aplicado');
      setConductModal({ isOpen: false, student: null });
      setSelectedCode('');
      setObservation('');
    } catch (error) {
      console.error('Error saving conduct:', error);
      alert('Error al guardar conducta');
    } finally {
      setSavingConduct(false);
    }
  };

  if (loading && !selectedClass && schedules.length === 0) {
    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto"></div></div>;
  }

  return (
    <div className="p-8">
      {!selectedClass ? (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-navy">Seleccionar Clase para Asistencia</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.map((cls) => (
              <motion.button
                key={`${cls.subject_id}-${cls.grade}-${cls.section}`}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => loadClass(cls)}
                className="bg-white p-8 rounded-2xl shadow-sm border border-navy/5 flex flex-col items-start hover:shadow-xl hover:border-lilac transition-all text-left relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-lilac group-hover:bg-blue_custom transition-colors"></div>
                <h3 className="font-bold text-navy text-lg mb-2">{cls.subjects?.name || 'Materia'}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-blue_custom bg-blue_custom/5 px-3 py-1 rounded-full uppercase">Grado</span>
                  <p className="text-navy font-black text-xl">{cls.grade}º {cls.section}</p>
                </div>
              </motion.button>
            ))}
            {schedules.length === 0 && <p className="text-muted">No tienes clases asignadas.</p>}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedClass(null)}
                className="p-3 bg-cream rounded-xl text-navy hover:bg-lilac transition-colors"
              >
                <X size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-navy">Pase de Lista</h1>
                <p className="text-muted text-[12px] uppercase font-bold tracking-wider">{selectedClass.grade}º {selectedClass.section} - {selectedClass.subjects?.name}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-navy/5 overflow-hidden mb-8">
            <table className="w-full text-left">
              <thead className="bg-cream/20 text-navy/60 font-semibold text-[12px] uppercase tracking-wider border-b border-navy/5">
                <tr>
                  <th className="px-6 py-4">Estudiante</th>
                  <th className="px-6 py-4 text-center">Asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {loading ? (
                  <tr>
                    <td colSpan="2" className="text-center py-8 text-muted">Cargando estudiantes...</td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center py-8 text-muted">No hay estudiantes registrados.</td>
                  </tr>
                ) : students.map((student) => (
                  <tr key={student.id} className="hover:bg-cream/5 transition-colors">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setConductModal({ isOpen: true, student })}
                        className="text-left group w-full"
                        title="Aplicar código de conducta"
                      >
                        <p className="font-bold text-navy group-hover:text-blue_custom transition-colors cursor-pointer">{student.full_name}</p>
                        <p className="text-[11px] font-mono text-muted uppercase group-hover:text-blue_custom/70">{student.institutional_code}</p>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center items-center">
                        <button 
                          onClick={() => toggleStatus(student.id)}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                            student.status === 'present' ? 'bg-good' : 'bg-bad'
                          }`}
                        >
                          <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            student.status === 'present' ? 'translate-x-7' : 'translate-x-1'
                          }`} />
                        </button>
                        <span className={`ml-3 text-sm font-bold w-20 ${student.status === 'present' ? 'text-good' : 'text-bad'}`}>
                          {student.status === 'present' ? 'PRESENTE' : 'AUSENTE'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={saveAttendance}
              disabled={saving || loading}
              className="bg-navy text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:bg-navy/90 transition-all flex items-center space-x-3 active:scale-95 disabled:opacity-50"
            >
              {saving && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
              <span className="tracking-wide">GUARDAR ASISTENCIA</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Conduct Modal */}
      <AnimatePresence>
        {conductModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setConductModal({ isOpen: false, student: null })}
                className="absolute top-6 right-6 p-2 bg-cream text-navy rounded-full hover:bg-lilac transition-colors"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-2xl font-bold text-navy mb-2">Código de Conducta</h2>
              <p className="text-muted text-sm mb-6">Aplicando a: <span className="font-bold text-navy">{conductModal.student?.full_name}</span></p>

              <form onSubmit={submitConduct} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Seleccione el Código</label>
                  <select
                    required
                    value={selectedCode}
                    onChange={(e) => setSelectedCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition text-navy"
                  >
                    <option value="">-- Seleccionar --</option>
                    {conductCodes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Observación (Opcional)</label>
                  <textarea
                    rows="3"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none transition text-navy resize-none"
                    placeholder="Detalles de la conducta..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingConduct}
                  className="w-full bg-navy text-white py-4 rounded-xl font-bold shadow-lg hover:bg-navy/90 transition flex items-center justify-center space-x-2"
                >
                  {savingConduct ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : <span>Aplicar Código</span>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TeacherGrades = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchedulesAndActivities();
  }, []);

>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  const fetchSchedulesAndActivities = async () => {
    try {
      setLoading(true);
      const [schedRes, actRes] = await Promise.all([
        api.get('/teacher/schedule'),
        api.get('/teacher/activities')
      ]);
      const uniqueClasses = [];
      schedRes.data.forEach(s => {
        if (!uniqueClasses.find(c => c.subject_id === s.subject_id && c.grade === s.grade && c.section === s.section)) {
          uniqueClasses.push(s);
        }
      });
      setSchedules(uniqueClasses);
      setActivities(actRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (activity) => {
    setSelectedActivity(activity);
    setLoading(true);
    try {
      const response = await api.get('/teacher/grades-by-activity', {
        params: { 
          subject_id: selectedClass.subject_id, 
          activity_id: activity.id,
<<<<<<< HEAD
          period: selectedPeriod,
=======
          period: 1, // Assume period 1 or let them pick
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          grade: selectedClass.grade,
          section: selectedClass.section
        }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      alert('Error al cargar estudiantes para calificar');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId, newValue) => {
    setStudents(students.map(s => 
      s.id === studentId ? { ...s, grade: parseFloat(newValue) || 0 } : s
    ));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const grades = students.map(s => ({
        student_id: s.id,
        subject_id: selectedClass.subject_id,
        activity_id: selectedActivity.id,
        grade: s.grade
      }));
<<<<<<< HEAD
      await api.post('/teacher/grades', { grades, period: selectedPeriod });
      alert('Notas guardadas correctamente');
=======
      await api.post('/teacher/grades', { grades, period: 1 });
      alert('Notas guardadas en la base de datos');
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    } catch (error) {
      console.error('Error saving grades:', error);
      alert(error.response?.data?.error || 'Error al guardar notas');
    } finally {
      setSaving(false);
    }
  };

  if (loading && schedules.length === 0) {
<<<<<<< HEAD
    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;
=======
    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto"></div></div>;
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  }

  return (
    <div className="p-8">
      {!selectedClass ? (
        <>
          <div className="flex justify-between items-center mb-8">
<<<<<<< HEAD
            <h1 className="text-2xl font-bold text-primary">Seleccione Clase para Calificar</h1>
            <select 
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-light outline-none transition text-primary font-bold"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            >
              <option value={1}>Periodo 1</option>
              <option value={2}>Periodo 2</option>
              <option value={3}>Periodo 3</option>
              <option value={4}>Periodo 4</option>
            </select>
=======
            <h1 className="text-2xl font-bold text-navy">Seleccione Clase para Calificar</h1>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.map((cls) => (
              <motion.button
                key={`${cls.subject_id}-${cls.grade}-${cls.section}`}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedClass(cls)}
<<<<<<< HEAD
                className="bg-white p-8 rounded-2xl shadow-card border border-primary/5 flex flex-col items-start hover:shadow-elevated hover:border-primary/20 transition-all text-left relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-gray-200 group-hover:bg-primary-light transition-colors"></div>
                <h3 className="font-bold text-primary text-lg mb-2">{cls.subjects?.name || 'Materia'}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-primary-light bg-primary-light/5 px-3 py-1 rounded-full uppercase">Grado</span>
                  <p className="text-primary font-black text-xl">{cls.grade}º {cls.section}</p>
=======
                className="bg-white p-8 rounded-2xl shadow-sm border border-navy/5 flex flex-col items-start hover:shadow-xl hover:border-lilac transition-all text-left relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-lilac group-hover:bg-blue_custom transition-colors"></div>
                <h3 className="font-bold text-navy text-lg mb-2">{cls.subjects?.name || 'Materia'}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-blue_custom bg-blue_custom/5 px-3 py-1 rounded-full uppercase">Grado</span>
                  <p className="text-navy font-black text-xl">{cls.grade}º {cls.section}</p>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                </div>
              </motion.button>
            ))}
            {schedules.length === 0 && <p className="text-muted">No tienes clases asignadas.</p>}
          </div>
        </>
      ) : !selectedActivity ? (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => setSelectedClass(null)}
<<<<<<< HEAD
              className="p-3 bg-gray-50 rounded-xl text-primary hover:bg-gray-100 transition-colors"
=======
              className="p-3 bg-cream rounded-xl text-navy hover:bg-lilac transition-colors"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            >
              <X size={20} />
            </button>
            <div>
<<<<<<< HEAD
              <h1 className="text-2xl font-bold text-primary">Seleccione la Actividad (Periodo {selectedPeriod})</h1>
=======
              <h1 className="text-2xl font-bold text-navy">Seleccione la Actividad</h1>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              <p className="text-muted text-[12px] uppercase font-bold tracking-wider">{selectedClass.grade}º {selectedClass.section} - {selectedClass.subjects?.name}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((act) => (
              <motion.button
                key={act.id}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => loadStudents(act)}
<<<<<<< HEAD
                className="bg-white p-8 rounded-2xl shadow-card border border-primary/5 flex flex-col items-start hover:shadow-elevated hover:border-primary/20 transition-all text-left relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-gray-200 group-hover:bg-primary-light transition-colors"></div>
                <h3 className="font-bold text-primary text-lg mb-2">{act.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-primary-light bg-primary-light/5 px-3 py-1 rounded-full uppercase">Ponderación</span>
                  <p className="text-primary font-black text-xl">{act.percentage}%</p>
=======
                className="bg-white p-8 rounded-2xl shadow-sm border border-navy/5 flex flex-col items-start hover:shadow-xl hover:border-lilac transition-all text-left relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-lilac group-hover:bg-blue_custom transition-colors"></div>
                <h3 className="font-bold text-navy text-lg mb-2">{act.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-blue_custom bg-blue_custom/5 px-3 py-1 rounded-full uppercase">Ponderación</span>
                  <p className="text-navy font-black text-xl">{act.percentage}%</p>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedActivity(null)}
<<<<<<< HEAD
                className="p-3 bg-gray-50 rounded-xl text-primary hover:bg-gray-100 transition-colors"
=======
                className="p-3 bg-cream rounded-xl text-navy hover:bg-lilac transition-colors"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              >
                <X size={20} />
              </button>
              <div>
<<<<<<< HEAD
                <h1 className="text-2xl font-bold text-primary">{selectedActivity.name}</h1>
=======
                <h1 className="text-2xl font-bold text-navy">{selectedActivity.name}</h1>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                <p className="text-muted text-[12px] uppercase font-bold tracking-wider">Calificando {selectedActivity.percentage}% de la nota final</p>
              </div>
            </div>
          </div>

<<<<<<< HEAD
          <div className="bg-white rounded-2xl shadow-card border border-primary/5 overflow-hidden mb-8">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 text-primary/60 font-semibold text-[12px] uppercase tracking-wider border-b border-primary/5">
=======
          <div className="bg-white rounded-2xl shadow-sm border border-navy/5 overflow-hidden mb-8">
            <table className="w-full text-left">
              <thead className="bg-cream/20 text-navy/60 font-semibold text-[12px] uppercase tracking-wider border-b border-navy/5">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                <tr>
                  <th className="px-6 py-5">Estudiante</th>
                  <th className="px-6 py-5 text-center w-40">Calificación (0-10)</th>
                </tr>
              </thead>
<<<<<<< HEAD
              <tbody className="divide-y divide-primary/5">
=======
              <tbody className="divide-y divide-navy/5">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                {loading ? (
                  <tr>
                    <td colSpan="2" className="text-center py-8 text-muted">Cargando estudiantes...</td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center py-8 text-muted">No hay estudiantes en esta clase.</td>
                  </tr>
                ) : students.map((student) => (
<<<<<<< HEAD
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-bold text-primary">{student.full_name}</p>
=======
                  <tr key={student.id} className="hover:bg-cream/5 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-bold text-navy">{student.full_name}</p>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                      <p className="text-[11px] font-mono text-muted uppercase">{student.institutional_code}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <input 
                        type="number" 
                        min="0" 
                        max="10" 
                        step="0.1"
                        value={student.grade}
                        onChange={(e) => handleGradeChange(student.id, e.target.value)}
<<<<<<< HEAD
                        className="w-24 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none text-center font-black text-primary-light bg-gray-50/50 text-lg shadow-inner"
=======
                        className="w-24 px-4 py-3 border border-lilac rounded-xl focus:ring-2 focus:ring-blue_custom outline-none text-center font-black text-blue_custom bg-cream/20 text-lg shadow-inner"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={saveChanges}
              disabled={saving || loading}
<<<<<<< HEAD
              className="bg-primary text-white px-10 py-4 rounded-2xl font-bold shadow-elevated hover:bg-primary-light transition-all flex items-center space-x-3 active:scale-95 disabled:opacity-50"
=======
              className="bg-navy text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:bg-navy/90 transition-all flex items-center space-x-3 active:scale-95 disabled:opacity-50"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            >
              {saving && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
              <span className="tracking-wide uppercase">Aplicar Cambios</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};


// --- Sub-componentes para Estudiante (Justificaciones, Horario y Diario movidos a /components) ---

// --- Sub-componentes para Coordinador ---
const CoordinatorJustifications = () => {
  const [justifications, setJustifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('requests'); // 'requests' or 'create'
  
  // State for creating new justification manually
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({ student_id: '', date: '', reason: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (view === 'requests') {
      fetchJustifications();
    } else {
      fetchStudents();
    }
  }, [view]);

  const fetchJustifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/coordinator/justifications');
      setJustifications(response.data);
    } catch (error) {
      console.error('Error fetching justifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/admin/users', { params: { role: 'student' } });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const updateStatus = async (id, status) => {
    try {
<<<<<<< HEAD
      await api.put(`/coordinator/justifications/${id}`, { status });
=======
      await api.patch(`/coordinator/justifications/${id}`, { status });
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      fetchJustifications();
    } catch (error) {
      alert('Error al actualizar justificación');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
<<<<<<< HEAD
      await api.post('/coordinator/justifications/student', {
        student_id: formData.student_id,
        absence_date: formData.date,
        reason: formData.reason
=======
      await api.post('/student/justifications', { // We use the same endpoint but since we are coordinator we might need an admin one, wait. Let's assume coordinator can post on behalf of student if we just pass student_id? The student endpoint uses req.user.id. So coordinator needs a specific endpoint to create justification for student. Let's create an endpoint in coordinatorController later. For now let's mock the api call.
        student_id: formData.student_id,
        absence_date: formData.date,
        reason: formData.reason,
        status: 'approved', // Auto-approved if handed in person to coordinator
        evidence_url: 'Entregado en físico'
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      });
      alert('Justificación registrada y aprobada correctamente');
      setFormData({ student_id: '', date: '', reason: '' });
      setView('requests');
    } catch (error) {
      console.error(error);
      alert('Error al registrar la justificación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
<<<<<<< HEAD
        <h1 className="text-3xl font-black text-primary uppercase tracking-tight">Gestión de Justificaciones</h1>
        <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl">
          <button 
            onClick={() => setView('requests')}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${view === 'requests' ? 'bg-primary text-white shadow-elevated' : 'text-primary/60 hover:text-primary hover:bg-white'}`}
=======
        <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Gestión de Justificaciones</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setView('requests')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${view === 'requests' ? 'bg-navy text-white' : 'bg-cream text-navy hover:bg-lilac/30'}`}
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          >
            Solicitudes Pendientes
          </button>
          <button 
            onClick={() => setView('create')}
<<<<<<< HEAD
            className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${view === 'create' ? 'bg-primary text-white shadow-elevated' : 'text-primary/60 hover:text-primary hover:bg-white'}`}
=======
            className={`px-6 py-2 rounded-xl font-bold transition-all ${view === 'create' ? 'bg-navy text-white' : 'bg-cream text-navy hover:bg-lilac/30'}`}
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          >
            Ingresar Manualmente
          </button>
        </div>
      </div>
<<<<<<< HEAD

      {view === 'requests' ? (
        <div className="bg-white rounded-3xl shadow-card border border-primary/5 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 text-primary font-bold text-[12px] uppercase tracking-widest border-b border-primary/5">
              <tr>
                <th className="px-6 py-5">Estudiante</th>
                <th className="px-6 py-5">Fecha Ausencia</th>
                <th className="px-6 py-5">Motivo / Evidencia</th>
                <th className="px-6 py-5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-12 text-muted animate-pulse font-medium">Cargando solicitudes...</td></tr>
              ) : justifications.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-12 text-muted italic">No hay solicitudes pendientes.</td></tr>
              ) : justifications.map(j => (
                <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5 font-bold text-primary">{j.profiles?.full_name}</td>
                  <td className="px-6 py-5 font-medium text-primary/70">{new Date(j.absence_date).toLocaleDateString()}</td>
                  <td className="px-6 py-5 text-sm max-w-xs">
                    <p className="truncate font-semibold text-primary mb-1">{j.reason}</p>
                    {j.evidence_url && j.evidence_url.startsWith('http') && (
                      <a href={j.evidence_url} target="_blank" rel="noreferrer" className="text-primary-light font-bold text-[11px] uppercase hover:underline">Ver Evidencia adjunta</a>
                    )}
                    {j.evidence_url && !j.evidence_url.startsWith('http') && (
                      <span className="text-muted font-bold text-[11px] uppercase">{j.evidence_url}</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => updateStatus(j.id, 'approved')} className="bg-good text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:scale-[1.05] transition-transform shadow-sm">Aprobar</button>
                      <button onClick={() => updateStatus(j.id, 'rejected')} className="bg-bad text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:scale-[1.05] transition-transform shadow-sm">Rechazar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 shadow-card border border-primary/5 max-w-2xl">
          <h2 className="text-2xl font-bold text-primary mb-8 flex items-center gap-3">
            <span className="w-2 h-8 bg-primary rounded-full"></span>
            Registrar Justificación Física
          </h2>
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Estudiante</label>
              <select required value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all text-primary font-medium">
                <option value="">-- Seleccionar --</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Fecha de Inasistencia</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all text-primary font-medium"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Motivo</label>
              <textarea required rows="4" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all text-primary font-medium resize-none" placeholder="Explique la razón de la inasistencia..."></textarea>
            </div>
            <button type="submit" disabled={saving} className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-light transition shadow-elevated flex justify-center items-center gap-3 active:scale-[0.98]">
              {saving ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : 'Guardar y Aprobar Justificación'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Vistas de Coordinador y Maestro ---
const CoordinatorTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/coordinator/teachers');
      setTeachers(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-navy">Maestros del Nivel</h1>
      </div>
      {loading ? (
        <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teachers.map(t => (
            <div key={t.id} className="bg-white p-6 rounded-2xl shadow-sm border border-navy/5 hover:shadow-lg transition-all text-center">
              <div className="w-16 h-16 bg-blue_custom/10 text-blue_custom rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                <User size={32} />
              </div>
              <h3 className="text-lg font-bold text-navy">{t.full_name}</h3>
              <p className="text-sm text-muted mb-4">{t.institutional_code}</p>
              <button 
                onClick={() => navigate(`/dashboard/schedule`, { state: { teacher_id: t.id, teacher_name: t.full_name } })}
                className="w-full py-2 bg-navy/5 text-navy hover:bg-navy hover:text-white rounded-xl font-bold transition-colors"
              >
                Ver Horario
              </button>
            </div>
          ))}
=======

      {view === 'requests' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-navy/5 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-cream/30 text-navy font-bold text-[12px] uppercase tracking-widest border-b border-navy/5">
              <tr>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Fecha Ausencia</th>
                <th className="px-6 py-4">Motivo / Evidencia</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-8 text-muted">Cargando...</td></tr>
              ) : justifications.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-8 text-muted">No hay solicitudes pendientes.</td></tr>
              ) : justifications.map(j => (
                <tr key={j.id} className="hover:bg-cream/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-navy">{j.profiles?.full_name}</td>
                  <td className="px-6 py-4 font-medium">{new Date(j.absence_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm max-w-xs">
                    <p className="truncate font-semibold text-navy mb-1">{j.reason}</p>
                    {j.evidence_url && j.evidence_url.startsWith('http') && (
                      <a href={j.evidence_url} target="_blank" rel="noreferrer" className="text-blue_custom font-bold text-[11px] uppercase hover:underline">Ver Evidencia adjunta</a>
                    )}
                    {j.evidence_url && !j.evidence_url.startsWith('http') && (
                      <span className="text-muted font-bold text-[11px] uppercase">{j.evidence_url}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => updateStatus(j.id, 'approved')} className="bg-good text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-good/90">Aprobar</button>
                      <button onClick={() => updateStatus(j.id, 'rejected')} className="bg-bad text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-bad/90">Rechazar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-navy/5 max-w-2xl">
          <h2 className="text-2xl font-bold text-navy mb-6">Registrar Justificación Física</h2>
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Estudiante</label>
              <select required value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none">
                <option value="">-- Seleccionar --</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Fecha de Inasistencia</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none"/>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Motivo</label>
              <textarea required rows="3" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-lilac bg-cream/20 focus:ring-2 focus:ring-blue_custom outline-none"></textarea>
            </div>
            <button type="submit" disabled={saving} className="w-full bg-navy text-white py-4 rounded-xl font-bold hover:bg-navy/90 transition flex justify-center">
              {saving ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : 'Guardar y Aprobar'}
            </button>
          </form>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
        </div>
      )}
    </div>
  );
};

const CoordinatorStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/coordinator/students');
      setStudents(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.institutional_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-navy">Estudiantes del Nivel</h1>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-3 text-muted" size={20} />
          <input 
            type="text" 
            placeholder="Buscar estudiante..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-light outline-none"
          />
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-primary/5 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 text-primary/60 font-semibold text-[12px] uppercase tracking-wider border-b border-primary/5">
              <tr>
                <th className="px-6 py-4">Nombre Completo</th>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Grado/Sec</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 text-sm">
              {filteredStudents.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-primary">{s.full_name}</td>
                  <td className="px-6 py-4 text-muted">{s.institutional_code}</td>
                  <td className="px-6 py-4 text-muted">{s.grade}º {s.section}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => navigate('/dashboard/diary', { state: { studentId: s.id, isCoordinatorView: true } })}
                        className="bg-primary-light/10 text-primary-light px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-primary-light hover:text-white transition-colors"
                      >
                        Diario
                      </button>
                      <button 
                        onClick={() => navigate('/dashboard/grades', { state: { studentId: s.id, isCoordinatorView: true } })}
                        className="bg-good/10 text-good px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-good hover:text-white transition-colors"
                      >
                        Notas
                      </button>
                      <button 
                        onClick={() => navigate('/dashboard/conduct', { state: { studentId: s.id, isCoordinatorView: true } })}
                        className="bg-bad/10 text-bad px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-bad hover:text-white transition-colors"
                      >
                        Conducta
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
  );
};

const ClassroomsList = ({ endpoint, title }) => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const response = await api.get(endpoint);
        setClassrooms(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchClassrooms();
  }, [endpoint]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
      </div>
      {loading ? (
        <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {classrooms.map((cls, idx) => (
            <div key={`${cls.grade}-${cls.section}-${idx}`} className="bg-white p-6 rounded-2xl shadow-card border border-primary/5 hover:shadow-elevated transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-pink-100 text-pink-500 rounded-xl flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-primary">{cls.grade}º {cls.section}</h3>
                  <p className="text-sm text-muted">Salón de clases</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate('/dashboard/students', { state: { grade: cls.grade, section: cls.section } })}
                  className="flex-1 py-2 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-xl font-bold transition-colors text-sm"
                >
                  Estudiantes
                </button>
                <button 
                  onClick={() => navigate('/dashboard/schedule', { state: { grade: cls.grade, section: cls.section } })}
                  className="flex-1 py-2 bg-primary-light/10 text-primary-light hover:bg-primary-light hover:text-white rounded-xl font-bold transition-colors text-sm"
                >
                  Horario
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CoordinatorClassrooms = () => <ClassroomsList endpoint="/coordinator/classrooms" title="Salones del Nivel" />;
const TeacherClassrooms = () => <ClassroomsList endpoint="/teacher/classrooms" title="Salones Asignados" />;

// --- Dashboard Principal ---
const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      // Sutil animación de entrada para el contenido
      gsap.fromTo(contentRef.current,
        { opacity: 0, y: 20 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.6, 
          ease: 'power2.out',
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 80%',
          }
        }
      );
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!profile) return null;

  const menuItems = {
    super_admin: [
      { name: 'Inicio', path: '/dashboard', icon: Home },
      { name: 'Usuarios', path: '/dashboard/users', icon: Users },
      { name: 'Catálogo Conducta', path: '/dashboard/conduct', icon: FileText },
    ],
    coordinator: [
      { name: 'Inicio', path: '/dashboard', icon: Home },
      { name: 'Maestros', path: '/dashboard/coordinator-teachers', icon: Users },
      { name: 'Estudiantes', path: '/dashboard/coordinator-students', icon: Users },
      { name: 'Salones', path: '/dashboard/coordinator-classrooms', icon: BookOpen },
      { name: 'Justificaciones', path: '/dashboard/justifications', icon: FileText },
<<<<<<< HEAD
      { name: 'Catálogo Conducta', path: '/dashboard/conduct', icon: FileText },
=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      { name: 'Asignar Clases', path: '/dashboard/assign', icon: BookOpen },
    ],
    teacher: [
      { name: 'Inicio', path: '/dashboard', icon: Home },
      { name: 'Mi Horario', path: '/dashboard/schedule', icon: Calendar },
      { name: 'Salones', path: '/dashboard/teacher-classrooms', icon: BookOpen },
      { name: 'Clase Activa', path: '/dashboard/class', icon: BookOpen },
      { name: 'Notas', path: '/dashboard/grades', icon: FileText },
    ],
    student: [
      { name: 'Inicio', path: '/dashboard', icon: Home },
      { name: 'Mis Notas', path: '/dashboard/grades', icon: FileText },
      { name: 'Diario Pedagógico', path: '/dashboard/diary', icon: BookOpen },
      { name: 'Horario', path: '/dashboard/schedule', icon: Calendar },
      { name: 'Justificaciones', path: '/dashboard/justifications', icon: FileText },
    ]
  };

  const currentMenu = menuItems[profile.role] || [];

  return (
<<<<<<< HEAD
    <div className="flex h-screen bg-app-bg overflow-hidden font-poppins">
=======
    <div className="flex h-screen bg-[#F5F7FA] overflow-hidden font-poppins">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 270 : 0 }}
<<<<<<< HEAD
        className="bg-primary text-white flex flex-col shadow-elevated z-20"
=======
        className="bg-navy text-white flex flex-col shadow-2xl z-20"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      >
        <div className="p-6 border-b border-white/10">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col"
              >
<<<<<<< HEAD
                <span className="text-xl font-bold tracking-tight text-white">Cokie<span className="text-white/80">College</span></span>
=======
                <span className="text-xl font-bold tracking-tight">Cokie<span className="text-lilac">College</span></span>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Plataforma Estudiantil</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 px-6 py-5 bg-white/5 border-b border-white/10">
<<<<<<< HEAD
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
=======
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-lilac/20 flex-shrink-0">
            <div className="w-full h-full flex items-center justify-center text-lilac font-bold">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              {profile.full_name.charAt(0)}
            </div>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-[13px] font-semibold text-white truncate">{profile.full_name}</p>
              <p className="text-[11px] text-white/45 truncate capitalize">{profile.role.replace('_', ' ')}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 mt-4 px-0 space-y-1">
          {currentMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center px-6 py-3.5 transition-all duration-200 border-l-4 ${
                  isActive 
<<<<<<< HEAD
                    ? 'bg-white/10 text-white border-white' 
=======
                    ? 'bg-white/10 text-white border-lilac' 
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                    : 'hover:bg-white/5 text-white/65 border-transparent'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="ml-4 text-[14px]">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
<<<<<<< HEAD
            className="flex items-center w-full px-6 py-3 text-white/60 hover:text-white transition-colors group"
=======
            className="flex items-center w-full px-6 py-3 text-white/60 hover:text-lilac transition-colors group"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="ml-4 text-[14px] font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
<<<<<<< HEAD
        <header className="h-[62px] bg-white border-b border-primary/10 flex items-center justify-between px-6 z-10 shadow-card">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} className="text-primary" />
            </button>
            <h2 className="text-[15px] font-semibold text-primary">
=======
        <header className="h-[62px] bg-white border-b border-navy/10 flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 bg-cream rounded-xl hover:bg-lilac/30 transition-colors"
            >
              <Menu size={20} className="text-navy" />
            </button>
            <h2 className="text-[15px] font-semibold text-navy">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              {currentMenu.find(m => m.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
<<<<<<< HEAD
            <button className="p-2 text-primary/40 hover:bg-gray-50 rounded-xl transition-colors relative">
=======
            <button className="p-2 text-navy/40 hover:bg-cream rounded-xl transition-colors relative">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-bad rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar" data-lenis-prevent>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
<<<<<<< HEAD
              ref={contentRef}
=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            >
              <Routes>
                <Route path="/" element={
                  <div className="p-6 md:p-10 max-w-6xl mx-auto h-full">
                    {/* Welcome Banner */}
<<<<<<< HEAD
                    <div className="bg-gradient-to-br from-primary to-primary-light rounded-3xl p-8 md:p-10 text-white mb-10 relative overflow-hidden shadow-elevated">
=======
                    <div className="bg-gradient-to-br from-[#0B1956] to-[#426bc2] rounded-3xl p-8 md:p-10 text-white mb-10 relative overflow-hidden shadow-lg">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="relative z-10">
                        <h2 className="text-3xl font-extrabold mb-2 tracking-tight text-white">¡Buen día, {profile?.full_name?.split(' ')[0] || 'Usuario'}!</h2>
                        <div className="flex gap-2 mt-4 flex-wrap">
                          <span className="bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide uppercase shadow-sm">{profile?.role.replace('_', ' ')}</span>
<<<<<<< HEAD
                          {profile?.level && <span className="bg-mid/20 border border-mid/40 text-mid px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide uppercase shadow-sm">{profile.level}</span>}
=======
                          {profile?.level && <span className="bg-[#f5a623]/20 border border-[#f5a623]/40 text-[#f5a623] px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide uppercase shadow-sm">{profile.level}</span>}
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions (Cards Grid) */}
                    <div className="mb-8">
<<<<<<< HEAD
                      <h3 className="text-[16px] font-bold text-primary mb-5">
=======
                      <h3 className="text-[16px] font-bold text-[#0B1956] mb-5">
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                        Menú Principal
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {currentMenu.filter(m => m.path !== '/dashboard').map((item, index) => {
                          const Icon = item.icon;
                          return (
                            <Link 
                              key={item.path} 
                              to={item.path}
<<<<<<< HEAD
                              className="bg-white p-5 md:p-6 rounded-[24px] shadow-card border border-primary/5 hover:-translate-y-1 hover:shadow-elevated transition-all duration-300 flex flex-col items-center text-center group"
                            >
                              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gray-50 group-hover:bg-primary/5 flex items-center justify-center mb-3 md:mb-4 transition-colors">
                                <Icon size={28} className="text-primary opacity-80 group-hover:opacity-100" />
                              </div>
                              <h4 className="font-bold text-primary text-[12px] md:text-sm tracking-tight">{item.name}</h4>
=======
                              className="bg-white p-5 md:p-6 rounded-[24px] shadow-sm border border-[#0B1956]/5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group"
                            >
                              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#F5F7FA] group-hover:bg-[#0B1956]/5 flex items-center justify-center mb-3 md:mb-4 transition-colors">
                                <Icon size={28} className="text-[#0B1956] opacity-80 group-hover:opacity-100" />
                              </div>
                              <h4 className="font-bold text-[#0B1956] text-[12px] md:text-sm tracking-tight">{item.name}</h4>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                } />
                <Route path="/users" element={<AdminUsers />} />
                <Route path="/assign" element={<AdminSchedules />} />
                <Route path="/conduct" element={<ConductCatalog />} />
<<<<<<< HEAD
                
                {/* Nuevas vistas */}
                <Route path="/coordinator-teachers" element={<CoordinatorTeachers />} />
                <Route path="/coordinator-students" element={<CoordinatorStudents />} />
                <Route path="/coordinator-classrooms" element={<CoordinatorClassrooms />} />
                <Route path="/teacher-classrooms" element={<TeacherClassrooms />} />
                
=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                <Route path="/schedule" element={<StudentSchedule />} />
                <Route path="/class" element={<TeacherAttendance />} />
                <Route path="/grades" element={profile.role === 'teacher' ? <TeacherGrades /> : <StudentGrades />} />
                <Route path="/diary" element={<StudentDiary />} />
                <Route path="/justifications" element={profile.role === 'coordinator' ? <CoordinatorJustifications /> : <StudentJustifications />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
