import { Platform } from 'react-native';
import './textDecoderPolyfill';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { logoBase64, poppinsNormal } from './pdfResources';
import api from './api';

const generatePDFDocument = (student, gradesData, averagesData, period, allPeriodsData = null, diaryData = { conduct: [], attendance: [] }) => {
  const { jsPDF } = require('jspdf');
  const autoTableModule = require('jspdf-autotable');
  const autoTable = autoTableModule.default || autoTableModule;

  const doc = new jsPDF();
  const isPeriod4 = period === 4;
  const year = new Date().getFullYear();
  const nivelAcademico = student.level || 'BÁSICO';
  const periodName = period === 1 ? 'PRIMER' : period === 2 ? 'SEGUNDO' : period === 3 ? 'TERCER' : 'CUARTO';

  // Add Font
  doc.addFileToVFS('poppins.ttf', poppinsNormal);
  doc.addFont('poppins.ttf', 'Poppins', 'normal');
  doc.addFont('poppins.ttf', 'Poppins', 'bold');
  
  // Base font style
  doc.setFont("Poppins", "normal");

  // --- Header ---
  doc.setFont("Poppins", "bold");
  doc.setFontSize(14);
  doc.text("COKIE HALL", 15, 20);
  
  doc.setFontSize(11);
  doc.text(`INFORME DE CALIFICACIONES - ${nivelAcademico}`, 15, 26);
  doc.text(`${periodName} PERIODO - ${year}`, 15, 32);

  // Logo (Right side)
  // According to image, the logo is placed at the top right, approximately x:160, y:12, width:35, height:35
  doc.addImage(logoBase64, 'PNG', 160, 10, 35, 35);

  // --- Student Info ---
  doc.setFont("Poppins", "normal");
  doc.setFontSize(10);
  doc.setFont("Poppins", "bold");
  doc.text("Alumno (a):", 15, 55);
  doc.setFont("Poppins", "normal");
  doc.text(` ${student.full_name || ''}`, 37, 55);
  
  doc.setFont("Poppins", "bold");
  doc.text("Grado:", 15, 61);
  doc.setFont("Poppins", "normal");
  doc.text(` ${student.grade || ''}`, 28, 61);
  
  doc.setFont("Poppins", "bold");
  doc.text("Seccion:", 45, 61);
  doc.setFont("Poppins", "normal");
  doc.text(` ${student.section || 'A'}`, 61, 61);

  doc.setFont("Poppins", "bold");
  doc.text("Codigo:", 15, 67);
  doc.setFont("Poppins", "normal");
  doc.text(` ${student.institutional_code || ''}`, 30, 67);

  // --- Data Processing ---
  const groupedGrades = (gradesData || []).reduce((acc, grade) => {
    const subjectName = grade.subjects?.name || 'Desconocida';
    if (!acc[subjectName]) acc[subjectName] = [];
    acc[subjectName].push(grade);
    return acc;
  }, {});

  const getSubjectActivities = (subjectName) => {
    const subjectGrades = groupedGrades[subjectName] || [];
    const activities = { AU: '', PO: '', AI: '', EF: '', EX: '' };
    
    subjectGrades.forEach(g => {
      const name = (g.evaluation_activities?.name || '').toUpperCase();
      let actType = '';
      if (name.includes('AULA') || name.includes('AU')) actType = 'AU';
      else if (name.includes('OBJETIVA') || name.includes('PO')) actType = 'PO';
      else if (name.includes('INTEGRADORA') || name.includes('AI')) actType = 'AI';
      else if (name.includes('FORMATIVA') || name.includes('EF')) actType = 'EF';
      else if (name.includes('FINAL') || name.includes('EX')) actType = 'EX';

      if (actType) {
        activities[actType] = g.grade;
      } else {
        const keys = Object.keys(activities);
        const emptyKey = keys.find(k => !activities[k]);
        if (emptyKey) activities[emptyKey] = g.grade;
      }
    });
    return activities;
  };

  const getSubjectAverage = (subjectName) => {
    const avg = averagesData.find(a => a.subjects?.name === subjectName);
    return avg ? parseFloat(avg.final_average || 0).toFixed(2) : "0.00";
  };

  const getAccumulated = (subjectName) => {
    if (!allPeriodsData || allPeriodsData.length === 0) return "0.00";
    let sum = 0;
    allPeriodsData.forEach(pData => {
      const avg = pData.averages.find(a => a.subjects?.name === subjectName);
      if (avg) sum += parseFloat(avg.final_average || 0);
    });
    return (sum / 4).toFixed(2);
  };

  // --- Table Headers ---
  let headRow = [];
  if (isPeriod4) {
    headRow = ['ASIGNATURAS', 'P1', 'P2', 'P3', 'P4', 'PI', 'NF'];
  } else {
    headRow = ['ASIGNATURAS'];
    if (period > 1) headRow.push('P1');
    if (period > 2) headRow.push('P2');
    headRow.push('AU', 'PO', 'AI', 'EF', 'EX', 'PROM', 'ACC');
  }

  // --- Table Body ---
  let bodyRows = [];
  const subjects = Array.from(new Set([
    ...Object.keys(groupedGrades),
    ...averagesData.map(a => a.subjects?.name).filter(Boolean)
  ]));

  let totalAvgSum = 0;
  let totalAvgCount = 0;

  subjects.forEach(subject => {
    let row = [];
    if (isPeriod4) {
      const p1 = (allPeriodsData && allPeriodsData[0]?.averages.find(a => a.subjects?.name === subject)?.final_average) || 0;
      const p2 = (allPeriodsData && allPeriodsData[1]?.averages.find(a => a.subjects?.name === subject)?.final_average) || 0;
      const p3 = (allPeriodsData && allPeriodsData[2]?.averages.find(a => a.subjects?.name === subject)?.final_average) || 0;
      const p4 = getSubjectAverage(subject);
      
      const pi = ((parseFloat(p1) + parseFloat(p2) + parseFloat(p3) + parseFloat(p4)) / 4);
      const nf = Math.round(pi);

      totalAvgSum += pi;
      totalAvgCount++;

      row = [
        subject,
        parseFloat(p1).toFixed(2),
        parseFloat(p2).toFixed(2),
        parseFloat(p3).toFixed(2),
        parseFloat(p4).toFixed(2),
        pi.toFixed(2),
        nf.toString()
      ];
    } else {
      const acts = getSubjectActivities(subject);
      const prom = getSubjectAverage(subject);
      const acc = getAccumulated(subject);
      
      totalAvgSum += parseFloat(prom);
      totalAvgCount++;

      row.push(subject);
      if (period > 1) {
        const p1 = (allPeriodsData && allPeriodsData[0]?.averages.find(a => a.subjects?.name === subject)?.final_average) || 0;
        row.push(parseFloat(p1).toFixed(2));
      }
      if (period > 2) {
        const p2 = (allPeriodsData && allPeriodsData[1]?.averages.find(a => a.subjects?.name === subject)?.final_average) || 0;
        row.push(parseFloat(p2).toFixed(2));
      }
      
      row.push(acts.AU || '', acts.PO || '', acts.AI || '', acts.EF || '', acts.EX || '', prom, acc);
    }
    bodyRows.push(row);
  });

  const finalOverall = totalAvgCount > 0 ? (totalAvgSum / totalAvgCount).toFixed(2) : "0.00";

  // --- Draw Table ---
  doc.setFont("Poppins", "bold");
  doc.setFillColor(11, 25, 86);
  doc.setTextColor(255, 255, 255);
  // Title row of the table
  doc.rect(15, 80, 180, 10, 'F');
  doc.setFontSize(10);
  doc.text("ASIGNATURAS SEGÚN PERFILES DE 5 EVALUACIONES", 105, 87, { align: "center" });

  autoTable(doc, {
    startY: 90,
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    headStyles: { fillColor: [240, 245, 250], textColor: [11, 25, 86], halign: 'center', fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
      alternateRowStyles: { fillColor: [252, 252, 255] },
    bodyStyles: { textColor: 0, halign: 'center', font: 'Poppins', fontSize: 9, lineWidth: 0.1, lineColor: [0, 0, 0] },
    columnStyles: { 0: { halign: 'left', fontStyle: 'normal' } },
    styles: { font: 'Poppins', fontSize: 9, cellPadding: 4, lineColor: [210, 210, 210], lineWidth: 0.1 }
  });

  

    // --- Conduct & Absences ---
    let currentY = doc.lastAutoTable.finalY + 10;
    
    // Calculate totals
    const conductList = diaryData?.conduct || [];
    const attendanceList = diaryData?.attendance || [];
    
    const justifiedAbs = attendanceList.filter(a => a.status === 'justified').length;
    const unjustifiedAbs = attendanceList.filter(a => a.status === 'absent').length;
    
    let positivos = 0, leves = 0, graves = 0, muyGraves = 0;
    conductList.forEach(c => {
      const cat = (c.conduct_codes?.category || c.conduct_codes?.type || '').toLowerCase();
      if (cat.includes('muy grave') || cat.includes('muy_grave')) muyGraves++;
      else if (cat.includes('grave')) graves++;
      else if (cat.includes('leve')) leves++;
      else if (cat.includes('positivo') || cat.includes('merito') || cat.includes('mérito')) positivos++;
    });

    // Subheader for Conduct
    doc.setFont("Poppins", "bold");
    doc.setFillColor(11, 25, 86);
    doc.rect(15, currentY, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("RESUMEN DE CONDUCTA Y ASISTENCIA", 105, currentY + 5.5, { align: "center" });
    
    currentY += 8;

    autoTable(doc, {
      startY: currentY,
      head: [['Ausencias Justificadas', 'Ausencias Injustificadas', 'Códigos Positivos', 'Faltas Leves', 'Faltas Graves', 'Faltas Muy Graves']],
      body: [[
        justifiedAbs.toString(),
        unjustifiedAbs.toString(),
        positivos.toString(),
        leves.toString(),
        graves.toString(),
        muyGraves.toString()
      ]],
      theme: 'grid',
      headStyles: { fillColor: [240, 245, 250], textColor: [11, 25, 86], halign: 'center', fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200], fontSize: 8.5 },
      bodyStyles: { halign: 'center', font: 'Poppins', fontSize: 10, textColor: [50, 50, 50] },
      styles: { font: 'Poppins', lineWidth: 0.1, lineColor: [210, 210, 210], cellPadding: 3 }
    });

    currentY = doc.lastAutoTable.finalY + 5;

    if (conductList.length > 0) {
      const conductBody = conductList.map(c => {
        const rawDate = c.created_at || c.date;
        let formattedDate = 'N/A';
        if (rawDate) {
          try {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              formattedDate = `${day}/${month}/${year}`;
            }
          } catch (e) {
            formattedDate = 'N/A';
          }
        }
        return [
          formattedDate,
          c.conduct_codes?.category || c.conduct_codes?.type || 'Leve',
          c.conduct_codes?.description || c.conduct_codes?.name || 'Sin descripción',
          c.observation || 'N/A'
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Fecha', 'Gravedad', 'Código Aplicado', 'Observación']],
        body: conductBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 245, 250], textColor: [11, 25, 86], halign: 'left', fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
        bodyStyles: { halign: 'left', font: 'Poppins', fontSize: 8, textColor: [50, 50, 50] },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 25 }, 2: { cellWidth: 65 } },
        styles: { font: 'Poppins', lineWidth: 0.1, lineColor: [210, 210, 210], cellPadding: 3 }
      });
    }

    // --- Footer ---
    const finalY = doc.lastAutoTable.finalY;

  doc.setFont("Poppins", "normal");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  if (!isPeriod4) {
    doc.text("AU=ACTIVIDAD AULA   PO=PRUEBA OBJETIVA   AI= ACTIVIDAD INTEGRADORA", 105, finalY + 6, { align: "center" });
    doc.text("EF=EVALUACION FORMATIVA   EX=EXAMEN FINAL   PROM=PROMEDIO   ACC=ACUMULADO", 105, finalY + 11, { align: "center" });
  } else {
    doc.text("PI=PROMEDIO INDIVIDUAL   NF= NOTA FINAL", 105, finalY + 6, { align: "center" });
  }

  doc.setFont("Poppins", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  const label = isPeriod4 ? 'Promedio del Año: ' : 'Promedio del periodo: ';
  doc.text(label, 15, finalY + 25);
  
  const labelWidth = doc.getTextWidth(label);
  doc.setFont("Poppins", "normal");
  doc.text(`${finalOverall}`, 15 + labelWidth, finalY + 25);

  return doc;
};

export const generateAndDownloadStudentReport = async (studentId, period, studentDetails) => {
  try {
    let gradesData = [];
    let averagesData = [];
    let allPeriodsData = [];
    let diaryData = { conduct: [], attendance: [] };

    // Si no hay studentId explícito (es el estudiante en su propia pantalla) o falla la ruta de coordinador
    if (!studentId) {
      const gradesRes = await api.get('/student/grades', { params: { period } });
        const averagesRes = await api.get('/student/averages', { params: { period } });
        try {
          const diaryRes = await api.get('/student/diary', { params: { period } });
          diaryData = diaryRes.data || { conduct: [], attendance: [] };
        } catch(e) {}
      gradesData = gradesRes.data || [];
      averagesData = averagesRes.data || [];

      for (let p = 1; p <= period; p++) {
        try {
          const pAvg = await api.get('/student/averages', { params: { period: p } });
          allPeriodsData.push({ period: p, averages: pAvg.data || [] });
        } catch (e) {
          allPeriodsData.push({ period: p, averages: [] });
        }
      }
    } else {
      try {
        const gradesRes = await api.get(`/coordinator/students/${studentId}/grades`, { params: { period } });
        const averagesRes = await api.get(`/coordinator/students/${studentId}/averages`, { params: { period } });
        try {
          const diaryRes = await api.get(`/coordinator/students/${studentId}/diary`, { params: { period } });
          diaryData = diaryRes.data || { conduct: [], attendance: [] };
        } catch(e) {}
        gradesData = gradesRes.data || [];
        averagesData = averagesRes.data || [];

        for (let p = 1; p <= period; p++) {
          try {
            const pAvg = await api.get(`/coordinator/students/${studentId}/averages`, { params: { period: p } });
            allPeriodsData.push({ period: p, averages: pAvg.data || [] });
          } catch (e) {
            allPeriodsData.push({ period: p, averages: [] });
          }
        }
      } catch (coordErr) {
        // Si el usuario actual es estudiante accediendo a su propio reporte
        const gradesRes = await api.get('/student/grades', { params: { period } });
        const averagesRes = await api.get('/student/averages', { params: { period } });
        try {
          const diaryRes = await api.get('/student/diary', { params: { period } });
          diaryData = diaryRes.data || { conduct: [], attendance: [] };
        } catch(e) {}
        gradesData = gradesRes.data || [];
        averagesData = averagesRes.data || [];

        for (let p = 1; p <= period; p++) {
          try {
            const pAvg = await api.get('/student/averages', { params: { period: p } });
            allPeriodsData.push({ period: p, averages: pAvg.data || [] });
          } catch (e) {
            allPeriodsData.push({ period: p, averages: [] });
          }
        }
      }
    }

    const doc = generatePDFDocument(studentDetails, gradesData, averagesData, period, allPeriodsData, diaryData);
    const fileName = `Boletin_${(studentDetails.full_name || 'Estudiante').replace(/\s+/g, '_')}_P${period}.pdf`;

    if (Platform.OS === 'web') {
      doc.save(fileName);
    } else {
      const base64 = doc.output('datauristring').split(',')[1];
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { dialogTitle: 'Descargar Boletín', UTI: 'com.adobe.pdf' });
      }
    }
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw error;
  }
};

export const generateClassroomReportsZip = async (classroomId, period, studentsList) => {
  try {
    if (Platform.OS === 'web') {
      const JSZipModule = require('jszip');
      const JSZip = JSZipModule.default || JSZipModule;
      const zip = new JSZip();
      
      for (const student of studentsList) {
        const gradesRes = await api.get(`/coordinator/students/${student.id}/grades`, { params: { period } });
        const averagesRes = await api.get(`/coordinator/students/${student.id}/averages`, { params: { period } });
        let diaryData = { conduct: [], attendance: [] };
        try {
          const diaryRes = await api.get(`/coordinator/students/${student.id}/diary`, { params: { period } });
          diaryData = diaryRes.data || { conduct: [], attendance: [] };
        } catch(e) {}
        
        let allPeriodsData = [];
        for (let p = 1; p <= period; p++) {
          const pAvg = await api.get(`/coordinator/students/${student.id}/averages`, { params: { period: p } });
          allPeriodsData.push({ period: p, averages: pAvg.data });
        }
        
        const doc = generatePDFDocument(student, gradesRes.data, averagesRes.data, period, allPeriodsData, diaryData);
        const arrayBuffer = doc.output('arraybuffer');
        zip.file(`Boletin_${student.full_name}_P${period}.pdf`, arrayBuffer);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Boletines_Salon_P${period}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      throw new Error("La descarga masiva (ZIP) por salón está optimizada para la versión Web. Por favor, ingresa desde un navegador de PC.");
    }
  } catch (error) {
    console.error('Error al generar ZIP:', error);
    throw error;
  }
};
