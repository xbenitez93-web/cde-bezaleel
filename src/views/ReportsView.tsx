import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getDeduplicatedAttendance } from '../utils/attendanceUtils';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Printer,
  Calendar,
  UserCheck,
  CheckCircle2,
  PenTool,
  Plus,
  Trash2,
  Edit3,
  Check,
  Sliders,
  GripVertical,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export const ReportsView: React.FC = () => {
  const {
    students,
    sections,
    attendance,
    schoolName,
    schoolLogo,
    currentUser,
    attendanceSignatures,
    updateAttendanceSignatures
  } = useApp();
  const { currentPalette } = useTheme();

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSection, setSelectedSection] = useState('todas');
  const [selectedStatus, setSelectedStatus] = useState('todos');

  // Signatures configuration local state
  const [isEditingSignatures, setIsEditingSignatures] = useState(false);
  const [sigConfig, setSigConfig] = useState(attendanceSignatures);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const defaultOrder: ('teacher' | 'middle' | 'director')[] = ['teacher', 'middle', 'director'];

  // Sync sigConfig when context updates
  React.useEffect(() => {
    setSigConfig(attendanceSignatures);
  }, [attendanceSignatures]);

  const currentOrder = sigConfig.signaturesOrder && sigConfig.signaturesOrder.length > 0
    ? sigConfig.signaturesOrder
    : defaultOrder;

  const moveSignature = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= currentOrder.length) return;
    const newOrder = [...currentOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    const updated = { ...sigConfig, signaturesOrder: newOrder };
    setSigConfig(updated);
    updateAttendanceSignatures(updated);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    moveSignature(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSaveSignatures = () => {
    updateAttendanceSignatures(sigConfig);
    setIsEditingSignatures(false);
  };

  // Filter Attendance Records
  const filteredAttendance = getDeduplicatedAttendance(attendance).filter(record => {
    const isDateInRange = record.date >= startDate && record.date <= endDate;
    const isSectionMatch = selectedSection === 'todas' || record.sectionId === selectedSection;
    const isStatusMatch = selectedStatus === 'todos' || record.status === selectedStatus;
    return isDateInRange && isSectionMatch && isStatusMatch;
  });

  // Calculate Metrics
  const totalFiltered = filteredAttendance.length;
  const presentCount = filteredAttendance.filter(a => a.status === 'presente').length;
  const absentCount = filteredAttendance.filter(a => a.status === 'ausente').length;
  const lateCount = filteredAttendance.filter(a => a.status === 'retardo').length;
  const justifiedCount = filteredAttendance.filter(a => a.status === 'justificado').length;

  const handleExportExcel = () => {
    const dataRows = filteredAttendance.map(a => {
      const st = students.find(s => s.id === a.studentId);
      const sec = sections.find(s => s.id === a.sectionId);
      return {
        Fecha: a.date,
        'Sección/Grado': sec?.name || 'Desconocido',
        'Nombre Alumno': st?.fullName || 'Desconocido',
        'Estado Asistencia': a.status.toUpperCase(),
        'Tutor Responsable': st?.tutorName || '',
        'Teléfono Contacto': st?.tutorPhone || '',
        'Observaciones': a.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Asistencia');
    XLSX.writeFile(workbook, `SchoolSync_Asistencia_${startDate}_al_${endDate}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Primary Theme color from system
    const hexColor = currentPalette.primary || '#1e40af';
    const r = parseInt(hexColor.slice(1, 3), 16) || 30;
    const g = parseInt(hexColor.slice(3, 5), 16) || 64;
    const b = parseInt(hexColor.slice(5, 7), 16) || 175;

    // Top Header Banner
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${schoolName.toUpperCase()} - REPORTE OFICIAL DE ASISTENCIA`, 15, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${startDate} al ${endDate} | Registros Totales: ${totalFiltered}`, 15, 22);

    // Summary Box
    let y = 36;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y - 5, pageWidth - 30, 14, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y - 5, pageWidth - 30, 14, 2, 2, 'D');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Presentes: ${presentCount}   |   Ausentes: ${absentCount}   |   Retardos: ${lateCount}   |   Justificados: ${justifiedCount}`,
      20,
      y + 3
    );

    y += 16;

    // Helper to print table header
    const printTableHeader = (currentY: number) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY - 4, pageWidth - 30, 8, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(15, currentY - 4, pageWidth - 15, currentY - 4);
      doc.line(15, currentY + 4, pageWidth - 15, currentY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('FECHA', 18, currentY + 1);
      doc.text('ALUMNO', 48, currentY + 1);
      doc.text('SECCIÓN', 115, currentY + 1);
      doc.text('ESTADO', 165, currentY + 1);
      return currentY + 8;
    };

    y = printTableHeader(y);

    // Data Rows - All records with multi-page handling
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    if (filteredAttendance.length === 0) {
      doc.setTextColor(148, 163, 184);
      doc.text('No hay registros de asistencia para los filtros seleccionados.', 20, y + 4);
      y += 10;
    } else {
      filteredAttendance.forEach((a, idx) => {
        if (y > pageHeight - 45) {
          doc.addPage();
          // Header on new page
          doc.setFillColor(r, g, b);
          doc.rect(0, 0, pageWidth, 12, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`${schoolName} - Reporte de Asistencia (Continuación)`, 15, 8);
          y = printTableHeader(20);
        }

        const st = students.find(s => s.id === a.studentId);
        const sec = sections.find(s => s.id === a.sectionId);

        // Zebra background
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y - 3.5, pageWidth - 30, 6, 'F');
        }

        doc.setTextColor(30, 41, 59);
        doc.text(a.date, 18, y);
        doc.text((st?.fullName || 'Alumno').slice(0, 32), 48, y);
        doc.text((sec?.name || 'Sección').slice(0, 24), 115, y);

        // Status styling
        if (a.status === 'presente') {
          doc.setTextColor(16, 120, 60);
        } else if (a.status === 'ausente') {
          doc.setTextColor(190, 24, 24);
        } else if (a.status === 'retardo') {
          doc.setTextColor(180, 83, 9);
        } else {
          doc.setTextColor(r, g, b);
        }
        doc.setFont('helvetica', 'bold');
        doc.text(a.status.toUpperCase(), 165, y);
        doc.setFont('helvetica', 'normal');

        y += 6;
      });
    }

    // ------------------------------------------------------------------------
    // RENDER SIGNATURES BLOCK (TEACHER, CUSTOM MIDDLE, DIRECTOR)
    // ------------------------------------------------------------------------
    if (y > pageHeight - 40) {
      doc.addPage();
      y = pageHeight - 45;
    } else {
      y = Math.max(y + 16, pageHeight - 42);
    }

    const { teacherName, teacherTitle, showMiddleSignature, middleName, middleTitle, directorName, directorTitle } = sigConfig;

    doc.setDrawColor(148, 163, 184);

    if (showMiddleSignature) {
      // 3 Signatures: Left (Teacher), Center (Custom Middle), Right (Director)
      const colWidth = 52;
      const leftX = 18;
      const midX = 79;
      const rightX = 140;

      // Lines
      doc.line(leftX, y, leftX + colWidth, y);
      doc.line(midX, y, midX + colWidth, y);
      doc.line(rightX, y, rightX + colWidth, y);

      // Names
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(teacherName || 'Docente de Grupo', leftX + colWidth / 2, y + 4, { align: 'center' });
      doc.text(middleName || 'Firma Personalizada', midX + colWidth / 2, y + 4, { align: 'center' });
      doc.text(directorName || 'Dirección Escolar', rightX + colWidth / 2, y + 4, { align: 'center' });

      // Titles / Roles
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(teacherTitle || 'Maestro(a) Titular', leftX + colWidth / 2, y + 8, { align: 'center' });
      doc.text(middleTitle || 'Supervisor / Coordinador', midX + colWidth / 2, y + 8, { align: 'center' });
      doc.text(directorTitle || 'Directora del Plantel', rightX + colWidth / 2, y + 8, { align: 'center' });
    } else {
      // 2 Signatures: Left (Teacher), Right (Director)
      const colWidth = 65;
      const leftX = 25;
      const rightX = pageWidth - 25 - colWidth;

      // Lines
      doc.line(leftX, y, leftX + colWidth, y);
      doc.line(rightX, y, rightX + colWidth, y);

      // Names
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(teacherName || 'Docente de Grupo', leftX + colWidth / 2, y + 4.5, { align: 'center' });
      doc.text(directorName || 'Dirección Escolar', rightX + colWidth / 2, y + 4.5, { align: 'center' });

      // Titles / Roles
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(teacherTitle || 'Maestro(a) Titular', leftX + colWidth / 2, y + 9, { align: 'center' });
      doc.text(directorTitle || 'Directora del Plantel', rightX + colWidth / 2, y + 9, { align: 'center' });
    }

    // Page Numbering Footer
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Documento oficial generado por ${schoolName} - Página ${p} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    }

    doc.save(`Reporte_Asistencia_${startDate}_al_${endDate}.pdf`);
  };

  const handlePrintReport = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Print call failed:', e);
    }
    handleExportPDF();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="p-2 rounded-xl text-white font-bold text-xs"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Reportes de Asistencia y Firmas
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Filtra registros por fecha, sección y estado para imprimir o exportar directamente en PDF con firmas oficiales personalizables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition"
            style={{ backgroundColor: currentPalette.primary }}
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
        <div>
          <label className="block text-slate-500 mb-1">Fecha Inicio:</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
          />
        </div>

        <div>
          <label className="block text-slate-500 mb-1">Fecha Fin:</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
          />
        </div>

        <div>
          <label className="block text-slate-500 mb-1">Sección / Grado:</label>
          <select
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
          >
            <option value="todas">Todas las Secciones</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-500 mb-1">Estado Asistencia:</label>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
          >
            <option value="todos">Todos los Estados</option>
            <option value="presente">Presente</option>
            <option value="ausente">Ausente</option>
            <option value="retardo">Retardo</option>
            <option value="justificado">Justificado</option>
          </select>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center">
          <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Presentes</p>
          <h4 className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{presentCount}</h4>
        </div>
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-center">
          <p className="text-[10px] font-bold uppercase text-red-800 dark:text-red-300">Ausentes</p>
          <h4 className="text-2xl font-black text-red-700 dark:text-red-300">{absentCount}</h4>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-center">
          <p className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">Retardos</p>
          <h4 className="text-2xl font-black text-amber-700 dark:text-amber-300">{lateCount}</h4>
        </div>
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-center">
          <p className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300">Justificados</p>
          <h4 className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{justifiedCount}</h4>
        </div>
      </div>

      {/* Results Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
          Registros Filtrados ({totalFiltered})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-900 uppercase font-bold text-[10px] text-slate-500">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Alumno</th>
                <th className="p-3">Sección</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Tutor / Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredAttendance.map(a => {
                const st = students.find(s => s.id === a.studentId);
                const sec = sections.find(s => s.id === a.sectionId);
                return (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-3 font-semibold">{a.date}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{st?.fullName || 'Desconocido'}</td>
                    <td className="p-3">{sec?.name || 'S/N'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        a.status === 'presente' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        a.status === 'ausente' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3">{st?.tutorName} ({st?.tutorPhone})</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECCIÓN DE CONFIGURACIÓN Y VISTA PREVIA DE FIRMAS OFICIALES */}
      {/* ---------------------------------------------------------------------- */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <span
              className="p-2 rounded-xl text-white font-bold"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <PenTool className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Firmas Oficiales del Reporte de Asistencia
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Siempre incluye la firma del <strong>Maestro</strong> y de la <strong>Directora</strong>, con opción de añadir una <strong>firma intermedia personalizada</strong> en el centro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSigConfig(prev => ({ ...prev, showMiddleSignature: !prev.showMiddleSignature }));
                updateAttendanceSignatures({ ...sigConfig, showMiddleSignature: !sigConfig.showMiddleSignature });
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                sigConfig.showMiddleSignature
                  ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
                  : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {sigConfig.showMiddleSignature ? (
                <>
                  <Trash2 className="w-3.5 h-3.5 text-purple-500" />
                  <span>Quitar 3ra Firma Intermedia</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>+ Añadir Otra Firma en Medio</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsEditingSignatures(!isEditingSignatures)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingSignatures ? 'Cerrar Edición' : 'Editar Nombres y Cargos'}</span>
            </button>
          </div>
        </div>

        {/* Formulario de Edición de Nombres / Cargos */}
        {isEditingSignatures && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4 text-xs max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-indigo-600" />
                Configurar y Reordenar Firmas Oficiales
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                (Arrastra las tarjetas o usa las flechas ⬆️ ⬇️ para cambiar el orden)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentOrder.map((key, index) => {
                const isFirst = index === 0;
                const isLast = index === currentOrder.length - 1;

                if (key === 'teacher') {
                  return (
                    <div
                      key="teacher"
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`p-3.5 rounded-xl bg-white dark:bg-slate-800 border transition-all duration-150 space-y-2 ${
                        draggedIndex === index
                          ? 'opacity-40 border-dashed border-indigo-500 scale-[0.98]'
                          : 'border-slate-200 dark:border-slate-700 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition"
                            title="Arrastra para mover de lugar"
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <span className="font-extrabold text-[11px] uppercase text-indigo-600 dark:text-indigo-400 block">
                            {index + 1}. Maestro / Docente
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSignature(index, index - 1)}
                            disabled={isFirst}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                            title="Subir / Mover a la Izquierda"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSignature(index, index + 1)}
                            disabled={isLast}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                            title="Bajar / Mover a la Derecha"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Nombre del Maestro(a):</label>
                        <input
                          type="text"
                          value={sigConfig.teacherName}
                          onChange={e => setSigConfig({ ...sigConfig, teacherName: e.target.value })}
                          placeholder="Ej: Lic. Juan Carlos Morales"
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Cargo / Función:</label>
                        <input
                          type="text"
                          value={sigConfig.teacherTitle || ''}
                          onChange={e => setSigConfig({ ...sigConfig, teacherTitle: e.target.value })}
                          placeholder="Ej: Docente Titular de Grupo"
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  );
                }

                if (key === 'middle') {
                  return (
                    <div
                      key="middle"
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`p-3.5 rounded-xl border transition-all duration-150 space-y-2 ${
                        draggedIndex === index
                          ? 'opacity-40 border-dashed border-purple-500 scale-[0.98]'
                          : sigConfig.showMiddleSignature
                          ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
                          : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/50 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-purple-100/50 dark:hover:bg-purple-900/30 text-purple-400 hover:text-purple-600 transition"
                            title="Arrastra para mover de lugar"
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <span className="font-extrabold text-[11px] uppercase text-purple-700 dark:text-purple-300">
                            {index + 1}. Firma Intermedia
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={sigConfig.showMiddleSignature}
                            onChange={e => setSigConfig({ ...sigConfig, showMiddleSignature: e.target.checked })}
                            className="rounded text-purple-600 focus:ring-purple-500 mr-1"
                            title="Activar o desactivar firma intermedia"
                          />
                          <button
                            type="button"
                            onClick={() => moveSignature(index, index - 1)}
                            disabled={isFirst}
                            className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-30 text-purple-700 dark:text-purple-300 transition"
                            title="Subir / Mover a la Izquierda"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSignature(index, index + 1)}
                            disabled={isLast}
                            className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-30 text-purple-700 dark:text-purple-300 transition"
                            title="Bajar / Mover a la Derecha"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Nombre Personalizado:</label>
                        <input
                          type="text"
                          disabled={!sigConfig.showMiddleSignature}
                          value={sigConfig.middleName || ''}
                          onChange={e => setSigConfig({ ...sigConfig, middleName: e.target.value })}
                          placeholder="Ej: Mtro. Roberto Salazar"
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Cargo Personalizado:</label>
                        <input
                          type="text"
                          disabled={!sigConfig.showMiddleSignature}
                          value={sigConfig.middleTitle || ''}
                          onChange={e => setSigConfig({ ...sigConfig, middleTitle: e.target.value })}
                          placeholder="Ej: Coordinador Pedagógico / Supervisor"
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  );
                }

                if (key === 'director') {
                  return (
                    <div
                      key="director"
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`p-3.5 rounded-xl bg-white dark:bg-slate-800 border transition-all duration-150 space-y-2 ${
                        draggedIndex === index
                          ? 'opacity-40 border-dashed border-emerald-500 scale-[0.98]'
                          : 'border-slate-200 dark:border-slate-700 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-600 transition"
                            title="Arrastra para mover de lugar"
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <span className="font-extrabold text-[11px] uppercase text-emerald-600 dark:text-emerald-400 block">
                            {index + 1}. Directora / Dirección
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSignature(index, index - 1)}
                            disabled={isFirst}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                            title="Subir / Mover a la Izquierda"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSignature(index, index + 1)}
                            disabled={isLast}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                            title="Bajar / Mover a la Derecha"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Nombre de la Directora:</label>
                        <input
                          type="text"
                          value={sigConfig.directorName}
                          onChange={e => setSigConfig({ ...sigConfig, directorName: e.target.value })}
                          placeholder="Ej: Lic. Elena Ramos"
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Cargo / Función:</label>
                        <input
                          type="text"
                          value={sigConfig.directorTitle || ''}
                          onChange={e => setSigConfig({ ...sigConfig, directorTitle: e.target.value })}
                          placeholder="Ej: Directora del Plantel"
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
              <button
                type="button"
                onClick={handleSaveSignatures}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition hover:opacity-90"
                style={{ backgroundColor: currentPalette.primary }}
              >
                <Check className="w-4 h-4" />
                <span>Guardar Configuración de Firmas</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Visual Preview of Signatures Block */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-700 text-center">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-6">
            Vista Previa de Firmas en el Documento Oficial
          </p>

          {(() => {
            const activeKeys = currentOrder.filter(k => k !== 'middle' || sigConfig.showMiddleSignature);
            const getPreviewData = (key: 'teacher' | 'middle' | 'director') => {
              if (key === 'teacher') {
                return {
                  name: sigConfig.teacherName || 'Docente Titular',
                  title: sigConfig.teacherTitle || 'Firma del Maestro(a)',
                  isMiddle: false
                };
              }
              if (key === 'middle') {
                return {
                  name: sigConfig.middleName || 'Firma Personalizada',
                  title: sigConfig.middleTitle || 'Firma Intermedia',
                  isMiddle: true
                };
              }
              return {
                name: sigConfig.directorName || 'Dirección Escolar',
                title: sigConfig.directorTitle || 'Firma de la Directora',
                isMiddle: false
              };
            };

            return (
              <div
                className={`grid gap-6 ${
                  activeKeys.length === 3
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : activeKeys.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
                    : 'grid-cols-1 max-w-sm mx-auto'
                }`}
              >
                {activeKeys.map((key) => {
                  const data = getPreviewData(key);
                  if (data.isMiddle) {
                    return (
                      <div key={key} className="space-y-1.5 px-4 bg-purple-50/40 dark:bg-purple-950/20 p-2 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
                        <div className="h-10 border-b-2 border-purple-400 dark:border-purple-500"></div>
                        <strong className="block text-xs font-black text-purple-950 dark:text-purple-200">
                          {data.name}
                        </strong>
                        <span className="text-[11px] text-purple-600 dark:text-purple-300 block font-medium">
                          {data.title}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="space-y-1.5 px-4">
                      <div className="h-10 border-b-2 border-slate-400 dark:border-slate-600"></div>
                      <strong className="block text-xs font-black text-slate-900 dark:text-white">
                        {data.name}
                      </strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                        {data.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

      </div>

    </div>
  );
};
