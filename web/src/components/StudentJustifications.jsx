import React, { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, FileText } from 'lucide-react';

const StudentJustifications = () => {
  const [formData, setFormData] = useState({ date: '', reason: '', file: null, category: '' });
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let evidence_url = '';
      if (formData.file) {
        // Simulación temporal:
        evidence_url = `https://mock.supabase.co/storage/v1/object/public/evidences/${formData.file.name}`;
      }

      await api.post('/student/justifications', {
        absence_date: formData.date,
        reason: `[${formData.category}] ${formData.reason}`,
        evidence_url: evidence_url
      });

      alert('Solicitud enviada a coordinación');
      setFormData({ date: '', reason: '', file: null, category: '' });
    } catch (error) {
      console.error('Error enviando solicitud:', error);
      alert(error.response?.data?.error || 'Error al enviar la solicitud de justificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-app-bg font-poppins px-4 py-6 md:p-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto w-full">
        
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">Solicitud de Permisos</h2>
          <p className="text-muted text-sm md:text-[15px]">Por este medio puedes solicitar permiso para justificar tu ausencia en la institución.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-card border border-primary/5 p-6 mb-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 border border-primary/5">
             <div className="w-full h-full flex items-center justify-center text-primary font-bold text-2xl">
               {profile?.full_name?.charAt(0)}
             </div>
          </div>
          <div>
            <h4 className="font-bold text-primary text-lg">{profile?.full_name}</h4>
            <p className="text-sm text-muted mt-0.5">Carnet: {profile?.institutional_code}</p>
            <p className="text-sm text-muted">Sección y grado: {profile?.grade}º {profile?.section}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl shadow-elevated border border-primary/5 space-y-6">
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-primary uppercase tracking-[0.5px] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center"><FileText size={14} className="text-primary"/></span>
              Fecha del permiso
            </label>
            <input 
              type="date" required
              className="w-full px-5 py-4 bg-gray-50 focus:bg-white border-2 border-transparent focus:border-primary rounded-[16px] text-[15px] outline-none transition-all text-primary font-medium"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-bold text-primary uppercase tracking-[0.5px]">
               Tipo de solicitud
            </label>
            <div className="relative">
              <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-4 bg-gray-50 focus:bg-white border-2 border-transparent focus:border-primary rounded-[16px] text-[15px] outline-none transition-all appearance-none text-primary font-medium cursor-pointer">
                  <option value="" disabled>Seleccione motivo...</option>
                  <option value="Cita Médica">Cita Médica</option>
                  <option value="Justificación Médica">Justificación Médica</option>
                  <option value="Motivo Familiar">Motivo Familiar</option>
                  <option value="Otro">Otro</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-bold text-primary uppercase tracking-[0.5px]">
                Detalles del motivo
            </label>
            <textarea 
              required rows="4"
              className="w-full px-5 py-4 bg-gray-50 focus:bg-white border-2 border-transparent focus:border-primary rounded-[16px] text-[15px] outline-none transition-all resize-none text-primary font-medium"
              placeholder="Escriba aquí los detalles importantes..."
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-bold text-primary uppercase tracking-[0.5px] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center"><UploadCloud size={14} className="text-primary"/></span>
              Comprobante / Evidencia
            </label>
            <div className="mt-2 flex flex-col items-center justify-center p-8 border-2 border-gray-200 border-dashed rounded-[20px] hover:border-primary transition-colors cursor-pointer relative bg-gray-50/50 group">
              <UploadCloud className="w-12 h-12 text-muted group-hover:text-primary transition-colors mb-3" />
              <div className="text-center">
                <p className="text-[15px] font-bold text-primary">
                  Adjuntar justificante
                </p>
                <p className="text-[13px] text-muted mt-1">(Imagen o PDF)</p>
              </div>
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
                accept="image/*,application/pdf"
              />
            </div>
            {formData.file && (
              <div className="mt-3 p-3 bg-good-bg border border-good/20 rounded-xl text-good font-bold text-sm flex items-center gap-2">
                <FileText size={16} />
                <span className="truncate">{formData.file.name}</span>
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-light text-white py-4 rounded-[16px] font-bold tracking-[0.5px] transition-all active:scale-[0.98] shadow-elevated flex justify-center items-center mt-2"
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : 'Enviar a Coordinación'}
          </button>
        </form>

      </motion.div>
    </div>
  );

};

export default StudentJustifications;
