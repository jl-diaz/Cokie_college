import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
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
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

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
    second_surname: ''
  });
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Aquí se llamaría a la API del backend
      console.log('Creando usuario:', formData);
      alert('Usuario creado y correo enviado exitosamente');
      setIsModalOpen(false);
      setFormData({
        full_name: '', email: '', role: 'student', 
        grade: '', section: '', first_surname: '', second_surname: ''
      });
    } catch (error) {
      alert('Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-900 transition"
        >
          <Plus size={20} />
          <span>Crear Usuario</span>
        </button>
      </div>

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Nuevo Usuario</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primer Apellido</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                  value={formData.first_surname}
                  onChange={(e) => setFormData({...formData, first_surname: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Apellido</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                  value={formData.second_surname}
                  onChange={(e) => setFormData({...formData, second_surname: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input 
                  type="email" required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grado</label>
                    <select 
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                      value={formData.grade}
                      onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    >
                      <option value="">Seleccionar</option>
                      {[2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>{g}º</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sección</label>
                    <select 
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
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
              <div className="md:col-span-2 mt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-purple-900 transition flex items-center justify-center space-x-2"
                >
                  {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
                  <span>{loading ? 'Guardando...' : 'Generar Credenciales'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o código..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
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
          <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Nombre Completo</th>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4">Grado/Sección</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Mock Data */}
            <tr>
              <td className="px-6 py-4">Juan Pérez</td>
              <td className="px-6 py-4">JP20261234</td>
              <td className="px-6 py-4 capitalize">Estudiante</td>
              <td className="px-6 py-4">5º A</td>
              <td className="px-6 py-4">
                <div className="flex space-x-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ConductCatalog = () => {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Catálogo de Conducta</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-900 transition">
          <Plus size={20} />
          <span>Nuevo Código</span>
        </button>
      </div>
      {/* Implementar lista similar a usuarios */}
    </div>
  );
};

// --- Sub-componentes para Maestro ---
const TeacherAttendance = () => {
  const [students, setStudents] = useState([
    { id: 's1', full_name: 'Ana García', institutional_code: 'AG2026001', status: 'present' },
    { id: 's2', full_name: 'Carlos López', institutional_code: 'CL2026002', status: 'present' },
    { id: 's3', full_name: 'Elena Martínez', institutional_code: 'EM2026003', status: 'present' },
  ]);
  const [saving, setSaving] = useState(false);

  const toggleStatus = (id, status) => {
    setStudents(students.map(s => s.id === id ? { ...s, status } : s));
  };

  const saveAttendance = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Asistencia guardada');
    }, 1000);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Pase de Lista - 5º A</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Estudiante</th>
              <th className="px-6 py-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-800">{student.full_name}</p>
                  <p className="text-xs text-gray-500">{student.institutional_code}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => toggleStatus(student.id, 'present')}
                      className={`px-4 py-1 rounded-full text-sm font-bold transition ${
                        student.status === 'present' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      Presente
                    </button>
                    <button 
                      onClick={() => toggleStatus(student.id, 'absent')}
                      className={`px-4 py-1 rounded-full text-sm font-bold transition ${
                        student.status === 'absent' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      Ausente
                    </button>
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
          disabled={saving}
          className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-900 transition flex items-center space-x-2"
        >
          {saving && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
          <span>Guardar Asistencia</span>
        </button>
      </div>
    </div>
  );
};

const TeacherGrades = () => {
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mock data para selección (esto vendría del horario seleccionado)
  const currentClass = { subject_id: 'math-uuid', grade: '5', section: 'A', period: 1 };

  useEffect(() => {
    // Cargar actividades
    setActivities([
      { id: '1', name: 'Tarea Aula', percentage: 10 },
      { id: '2', name: 'Objetiva', percentage: 20 },
      { id: '3', name: 'Integradora', percentage: 30 },
      { id: '4', name: 'Formativa', percentage: 10 },
      { id: '5', name: 'Examen Final', percentage: 30 },
    ]);
  }, []);

  const loadStudents = (activity) => {
    setSelectedActivity(activity);
    setLoading(true);
    // Simular carga de estudiantes con notas
    setTimeout(() => {
      setStudents([
        { id: 's1', full_name: 'Ana García', institutional_code: 'AG2026001', grade: 8.5 },
        { id: 's2', full_name: 'Carlos López', institutional_code: 'CL2026002', grade: 9.0 },
        { id: 's3', full_name: 'Elena Martínez', institutional_code: 'EM2026003', grade: 7.5 },
      ]);
      setLoading(false);
    }, 500);
  };

  const handleGradeChange = (studentId, newValue) => {
    setStudents(students.map(s => 
      s.id === studentId ? { ...s, grade: parseFloat(newValue) || 0 } : s
    ));
  };

  const saveChanges = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Cambios aplicados correctamente');
    }, 1000);
  };

  return (
    <div className="p-8">
      {!selectedActivity ? (
        <>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Registro de Notas - {currentClass.grade}º {currentClass.section}</h1>
          <p className="text-gray-600 mb-8">Seleccione la actividad que desea calificar:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((act) => (
              <motion.button
                key={act.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => loadStudents(act)}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow"
              >
                <div className="text-left">
                  <h3 className="font-bold text-gray-800 text-lg">{act.name}</h3>
                  <p className="text-primary font-medium">{act.percentage}% de la nota</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-full text-primary">
                  <Plus size={24} />
                </div>
              </motion.button>
            ))}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center space-x-4 mb-8">
            <button 
              onClick={() => setSelectedActivity(null)}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
            >
              <X size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Notas: {selectedActivity.name} ({selectedActivity.percentage}%)</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Estudiante</th>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4 w-32">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 font-medium text-gray-800">{student.full_name}</td>
                    <td className="px-6 py-4 text-gray-500">{student.institutional_code}</td>
                    <td className="px-6 py-4">
                      <input 
                        type="number" 
                        min="0" 
                        max="10" 
                        step="0.1"
                        value={student.grade}
                        onChange={(e) => handleGradeChange(student.id, e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-center font-bold text-primary"
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
              disabled={saving}
              className={`bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-purple-900 transition flex items-center space-x-2 ${saving ? 'opacity-70' : ''}`}
            >
              {saving ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : null}
              <span>Aplicar Cambios</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// --- Sub-componentes para Estudiante ---
const StudentGrades = () => {
  const [grades, setGrades] = useState([
    { id: '1', activity: 'Tarea Aula', percentage: 10, grade: 9.0 },
    { id: '2', activity: 'Objetiva', percentage: 20, grade: 8.5 },
    { id: '3', activity: 'Integradora', percentage: 30, grade: 10.0 },
    { id: '4', activity: 'Formativa', percentage: 10, grade: 9.0 },
    { id: '5', activity: 'Examen Final', percentage: 30, grade: 8.0 },
  ]);

  const calculateAverage = () => {
    return grades.reduce((acc, curr) => acc + (curr.grade * (curr.percentage / 100)), 0).toFixed(2);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Mis Notas - Periodo 1</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Actividad</th>
              <th className="px-6 py-4">Ponderación</th>
              <th className="px-6 py-4">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {grades.map((g) => (
              <tr key={g.id}>
                <td className="px-6 py-4 font-medium text-gray-800">{g.activity}</td>
                <td className="px-6 py-4 text-gray-500">{g.percentage}%</td>
                <td className="px-6 py-4 font-bold text-primary">{g.grade.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-purple-50 border-t-2 border-primary">
            <tr>
              <td colSpan="2" className="px-6 py-6 text-right font-bold text-gray-800 text-lg">PROMEDIO FINAL</td>
              <td className="px-6 py-6 font-black text-primary text-2xl">{calculateAverage()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const StudentJustification = () => {
  const [formData, setFormData] = useState({ date: '', reason: '', file: null });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Solicitud enviada al coordinador');
      setFormData({ date: '', reason: '', file: null });
    }, 1500);
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Solicitar Justificación</h1>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de la Ausencia</label>
          <input 
            type="date" required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de la Falta</label>
          <textarea 
            required rows="4"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none resize-none"
            placeholder="Explique el motivo de su ausencia..."
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia (Imagen/PDF)</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary transition cursor-pointer relative">
            <div className="space-y-1 text-center">
              <Plus className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <span className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-purple-500 focus-within:outline-none">
                  Subir archivo
                </span>
                <p className="pl-1">o arrastrar y soltar</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, PDF hasta 10MB</p>
            </div>
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
            />
          </div>
          {formData.file && <p className="mt-2 text-sm text-green-600 font-medium">Archivo seleccionado: {formData.file.name}</p>}
        </div>
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg hover:bg-purple-900 transition flex items-center justify-center space-x-2"
        >
          {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>}
          <span>Enviar Solicitud</span>
        </button>
      </form>
    </div>
  );
};

// --- Dashboard Principal ---
const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();

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
      { name: 'Estudiantes', path: '/dashboard/students', icon: Users },
      { name: 'Justificaciones', path: '/dashboard/justifications', icon: FileText },
    ],
    teacher: [
      { name: 'Mi Horario', path: '/dashboard/schedule', icon: Calendar },
      { name: 'Clase Activa', path: '/dashboard/class', icon: BookOpen },
      { name: 'Notas', path: '/dashboard/grades', icon: FileText },
    ],
    student: [
      { name: 'Mis Notas', path: '/dashboard/grades', icon: FileText },
      { name: 'Diario Pedagógico', path: '/dashboard/diary', icon: BookOpen },
      { name: 'Horario', path: '/dashboard/schedule', icon: Calendar },
    ]
  };

  const currentMenu = menuItems[profile.role] || [];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className="bg-primary text-white flex flex-col shadow-2xl z-20"
      >
        <div className="p-4 flex items-center justify-between">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.img 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src="/CokieCollegeMockUp/img/CokieCollege.png" 
                alt="Logo" 
                className="h-10 brightness-200"
              />
            )}
          </AnimatePresence>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-purple-900 rounded-lg">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-6 px-2 space-y-2">
          {currentMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-secondary text-white shadow-lg' : 'hover:bg-purple-900 text-purple-100'
                }`}
              >
                <Icon size={24} />
                {sidebarOpen && <span className="ml-4 font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-purple-800">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-xl hover:bg-purple-900 text-purple-100 transition-colors"
          >
            <LogOut size={24} />
            {sidebarOpen && <span className="ml-4 font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {currentMenu.find(m => m.path === location.pathname)?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center space-x-3 border-l pl-4 border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800">{profile.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{profile.role.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-primary font-bold">
                {profile.full_name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Routes>
                <Route path="/" element={<div className="p-8"><h1>Bienvenido al Panel de Control</h1></div>} />
                <Route path="/users" element={<AdminUsers />} />
                <Route path="/conduct" element={<AdminUsers />} />
                <Route path="/schedule" element={<div className="p-8"><h1>Mi Horario</h1></div>} />
                <Route path="/class" element={<TeacherAttendance />} />
                <Route path="/grades" element={profile.role === 'teacher' ? <TeacherGrades /> : <StudentGrades />} />
                <Route path="/diary" element={<StudentJustification />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
