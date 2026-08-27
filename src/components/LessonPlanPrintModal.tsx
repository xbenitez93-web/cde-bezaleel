import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  Printer,
  Download,
  X,
  ArrowLeft,
  FileText,
  Upload,
  Image as ImageIcon,
  Trash2,
  Loader2,
  CheckCircle2,
  PenTool,
  Plus,
  Edit3,
  Check,
  Sliders,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  MoveVertical
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { AttendanceSignaturesConfig } from '../types';

function getSubjectArea(subject: string): string {
  if (!subject) return 'PEDAGÓGICA';
  const s = subject.toLowerCase();
  if (s.includes('físic') || s.includes('fisic') || s.includes('deport') || s.includes('motric')) return 'FÍSICA';
  if (s.includes('matem') || s.includes('númer') || s.includes('contar') || s.includes('forma') || s.includes('geometr')) return 'MATEMÁTICAS';
  if (s.includes('cienc') || s.includes('natur') || s.includes('experim') || s.includes('agua') || s.includes('tierra')) return 'CIENCIA Y NATURALEZA';
  if (s.includes('lengu') || s.includes('lectur') || s.includes('cuent') || s.includes('letra') || s.includes('libro')) return 'LENGUAJE';
  if (s.includes('arte') || s.includes('pintur') || s.includes('músic') || s.includes('color') || s.includes('dibujo')) return 'ARTE Y CULTURA';
  if (s.includes('espirit') || s.includes('bíbli') || s.includes('dios') || s.includes('orac')) return 'ESPIRITUAL';
  if (s.includes('socio') || s.includes('emocion') || s.includes('valore')) return 'SOCIOEMOCIONAL';
  return 'PEDAGÓGICA';
}

export const LessonPlanPrintModal: React.FC = () => {
  const {
    printableLessonPlan,
    setPrintableLessonPlan,
    schoolName,
    schoolLogo,
    setSchoolLogo,
    secondaryLogo,
    setSecondaryLogo,
    allUsers,
    currentUser,
    attendanceSignatures,
    updateAttendanceSignatures
  } = useApp();
  const { currentPalette } = useTheme();

  const printableSheetRef = useRef<HTMLDivElement>(null);
  const leftLogoInputRef = useRef<HTMLInputElement>(null);
  const rightLogoInputRef = useRef<HTMLInputElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Signatures configuration local state
  const [isEditingSignatures, setIsEditingSignatures] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const adminUser = allUsers?.find(u => u.role === 'admin') || (currentUser?.role === 'admin' ? currentUser : null);
  const adminName = adminUser?.name || currentUser?.name || 'Administración';

  const defaultOrder: ('teacher' | 'middle' | 'director')[] = ['teacher', 'middle', 'director'];

  const [sigConfig, setSigConfig] = useState<AttendanceSignaturesConfig>(() => {
    return {
      teacherName: printableLessonPlan?.teacherName || attendanceSignatures.teacherName || 'Docente Titular',
      teacherTitle: attendanceSignatures.teacherTitle || attendanceSignatures.teacherRole || 'Docente Titular / Tutor',
      showMiddleSignature: attendanceSignatures.showMiddleSignature ?? false,
      middleName: attendanceSignatures.middleName || attendanceSignatures.middleSignatureName || 'Firma Personalizada',
      middleTitle: attendanceSignatures.middleTitle || attendanceSignatures.middleSignatureRole || 'Coordinación / Supervisión',
      directorName: attendanceSignatures.directorName || attendanceSignatures.principalName || adminName || 'Dirección del Plantel',
      directorTitle: attendanceSignatures.directorTitle || attendanceSignatures.principalRole || 'Directora / Dirección Escolar',
      signaturesOrder: attendanceSignatures.signaturesOrder || defaultOrder,
      layoutOrientation: attendanceSignatures.layoutOrientation || 'horizontal'
    };
  });

  // Sync sigConfig when printableLessonPlan or attendanceSignatures changes
  useEffect(() => {
    if (printableLessonPlan) {
      setSigConfig(prev => ({
        ...prev,
        teacherName: printableLessonPlan.teacherName || prev.teacherName || attendanceSignatures.teacherName || 'Docente Titular',
        teacherTitle: prev.teacherTitle || attendanceSignatures.teacherTitle || attendanceSignatures.teacherRole || 'Docente Titular / Tutor',
        showMiddleSignature: prev.showMiddleSignature ?? attendanceSignatures.showMiddleSignature ?? false,
        middleName: prev.middleName || attendanceSignatures.middleName || attendanceSignatures.middleSignatureName || 'Firma Personalizada',
        middleTitle: prev.middleTitle || attendanceSignatures.middleTitle || attendanceSignatures.middleSignatureRole || 'Coordinación / Supervisión',
        directorName: prev.directorName || attendanceSignatures.directorName || attendanceSignatures.principalName || adminName || 'Dirección del Plantel',
        directorTitle: prev.directorTitle || attendanceSignatures.directorTitle || attendanceSignatures.principalRole || 'Directora / Dirección Escolar',
        signaturesOrder: prev.signaturesOrder || attendanceSignatures.signaturesOrder || defaultOrder,
        layoutOrientation: prev.layoutOrientation || attendanceSignatures.layoutOrientation || 'horizontal'
      }));
    }
  }, [printableLessonPlan, attendanceSignatures, adminName]);

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
    setStatusMessage('¡Configuración de firmas guardada con éxito!');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleToggleMiddleSignature = () => {
    const updated = { ...sigConfig, showMiddleSignature: !sigConfig.showMiddleSignature };
    setSigConfig(updated);
    updateAttendanceSignatures(updated);
  };

  if (!printableLessonPlan) return null;

  const areaName = getSubjectArea(printableLessonPlan.subject);
  const displayAppName = schoolName || 'CDE BEZALEEL';

  const handleLeftLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSchoolLogo(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRightLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSecondaryLogo(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateLetterCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!printableSheetRef.current) {
      throw new Error('Elemento de impresión no encontrado');
    }

    const canvas = await html2canvas(printableSheetRef.current, {
      scale: 2.2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        const noPrintElements = clonedDoc.querySelectorAll('.no-print');
        noPrintElements.forEach(el => ((el as HTMLElement).style.display = 'none'));
      }
    });

    return canvas;
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setStatusMessage('Generando PDF tamaño Carta...');
    try {
      const canvas = await generateLetterCanvas();
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pdfWidth = 215.9;
      const pdfHeight = 279.4;
      const margin = 8;
      const printWidth = pdfWidth - (margin * 2);
      const printHeight = pdfHeight - (margin * 2);

      const canvasAspect = canvas.width / canvas.height;
      let drawWidth = printWidth;
      let drawHeight = printWidth / canvasAspect;

      if (drawHeight > printHeight) {
        drawHeight = printHeight;
        drawWidth = printHeight * canvasAspect;
      }

      const drawX = margin + (printWidth - drawWidth) / 2;
      const drawY = margin + (printHeight - drawHeight) / 2;

      pdf.addImage(imgData, 'JPEG', drawX, drawY, drawWidth, drawHeight);
      
      const safeTeacher = (printableLessonPlan.teacherName || 'Docente').replace(/\s+/g, '_');
      const safeDate = (printableLessonPlan.date || 'Fecha').replace(/\//g, '-');
      const safeSubject = (printableLessonPlan.subject || 'Plan').replace(/\s+/g, '_').slice(0, 20);
      
      pdf.save(`Plan_${safeSubject}_${safeTeacher}_${safeDate}.pdf`);
      setStatusMessage('¡PDF exportado con éxito!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      setStatusMessage('Error al exportar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const planImages = (printableLessonPlan.images || []).filter(img => Boolean(img));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md p-2 sm:p-4 flex items-center justify-center overflow-y-auto">
      
      {/* Hidden File Inputs for Logo Uploads */}
      <input
        type="file"
        ref={leftLogoInputRef}
        onChange={handleLeftLogoUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={rightLogoInputRef}
        onChange={handleRightLogoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[96vh] flex flex-col my-auto overflow-hidden">
        
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-30 shrink-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-md no-print">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintableLessonPlan(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver Atrás</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-slate-600">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                Previsualización de Planificación (Hoja Carta)
              </span>
            </div>
          </div>

          {/* Quick Logo Upload Buttons & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              onClick={() => leftLogoInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition"
              title="Cambiar Logo Izquierdo"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Logo Izq</span>
            </button>

            <button
              onClick={() => rightLogoInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition"
              title="Cambiar Logo Derecho"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Logo Der</span>
            </button>

            {/* Toggle 3ra Firma en Medio */}
            <button
              onClick={handleToggleMiddleSignature}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                sigConfig.showMiddleSignature
                  ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700 shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-300'
              }`}
              title="Añadir o quitar 3ra firma intermedia"
            >
              <PenTool className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>{sigConfig.showMiddleSignature ? '3ra Firma: Activada' : '+ 3ra Firma en Medio'}</span>
            </button>

            {/* Toggle Editor de Firmas */}
            <button
              onClick={() => setIsEditingSignatures(!isEditingSignatures)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition shadow-sm"
              title="Configurar nombres y cargos de firmas"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingSignatures ? 'Ocultar Editor' : 'Editar Firmas'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition shadow-sm disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: currentPalette.primary }}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExporting ? 'Generando...' : 'Exportar PDF'}</span>
            </button>

            <button
              onClick={() => setPrintableLessonPlan(null)}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition ml-1"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Formulario de Edición de Firmas Desplegable */}
        {isEditingSignatures && (
          <div className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 p-3 sm:p-4 text-xs shadow-inner no-print max-h-[55vh] overflow-y-auto overscroll-contain touch-pan-y space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-indigo-600" />
                <span className="font-extrabold text-slate-800 dark:text-white">
                  Configurar y Reordenar Firmas de la Planificación
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
                  (Arrastra las tarjetas o usa las flechas ⬆️ ⬇️ para subir/bajar su posición)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSignatures}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-white shadow-sm transition hover:opacity-90"
                  style={{ backgroundColor: currentPalette.primary }}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
                <button
                  onClick={() => setIsEditingSignatures(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid of Draggable / Reorderable Signature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      className={`p-3 rounded-xl bg-white dark:bg-slate-900 border transition-all duration-150 space-y-2.5 ${
                        draggedIndex === index
                          ? 'opacity-40 border-dashed border-indigo-500 scale-[0.98]'
                          : 'border-slate-200 dark:border-slate-700 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition"
                            title="Arrastra para mover de lugar"
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <span className="font-extrabold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                            {index + 1}. Maestro / Docente
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSignature(index, index - 1)}
                            disabled={isFirst}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                            title="Subir / Mover a la Izquierda"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSignature(index, index + 1)}
                            disabled={isLast}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                            title="Bajar / Mover a la Derecha"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-0.5 text-[10px]">Nombre:</label>
                        <input
                          type="text"
                          value={sigConfig.teacherName}
                          onChange={e => setSigConfig({ ...sigConfig, teacherName: e.target.value })}
                          placeholder="Nombre del maestro(a)"
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-semibold mb-0.5 text-[10px]">Cargo / Leyenda:</label>
                        <input
                          type="text"
                          value={sigConfig.teacherTitle || ''}
                          onChange={e => setSigConfig({ ...sigConfig, teacherTitle: e.target.value })}
                          placeholder="Ej: Docente Titular de Grupo"
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
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
                      className={`p-3 rounded-xl border transition-all duration-150 space-y-2.5 ${
                        draggedIndex === index
                          ? 'opacity-40 border-dashed border-purple-500 scale-[0.98]'
                          : sigConfig.showMiddleSignature
                          ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 shadow-xs'
                          : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 opacity-60'
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
                          <span className="font-extrabold text-[11px] text-purple-700 dark:text-purple-300 uppercase tracking-tight">
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
                        <label className="block text-slate-500 font-semibold mb-0.5 text-[10px]">Nombre:</label>
                        <input
                          type="text"
                          disabled={!sigConfig.showMiddleSignature}
                          value={sigConfig.middleName || ''}
                          onChange={e => setSigConfig({ ...sigConfig, middleName: e.target.value })}
                          placeholder="Ej: Mtro. Roberto Salazar"
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-semibold mb-0.5 text-[10px]">Cargo / Función:</label>
                        <input
                          type="text"
                          disabled={!sigConfig.showMiddleSignature}
                          value={sigConfig.middleTitle || ''}
                          onChange={e => setSigConfig({ ...sigConfig, middleTitle: e.target.value })}
                          placeholder="Ej: Coordinador Pedagógico / Supervisor"
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
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
                      className={`p-3 rounded-xl bg-white dark:bg-slate-900 border transition-all duration-150 space-y-2.5 ${
                        draggedIndex === index
                          ? 'opacity-40 border-dashed border-emerald-500 scale-[0.98]'
                          : 'border-slate-200 dark:border-slate-700 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 transition"
                            title="Arrastra para mover de lugar"
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <span className="font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                            {index + 1}. Directora / Dirección
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSignature(index, index - 1)}
                            disabled={isFirst}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                            title="Subir / Mover a la Izquierda"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSignature(index, index + 1)}
                            disabled={isLast}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                            title="Bajar / Mover a la Derecha"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-0.5 text-[10px]">Nombre:</label>
                        <input
                          type="text"
                          value={sigConfig.directorName}
                          onChange={e => setSigConfig({ ...sigConfig, directorName: e.target.value })}
                          placeholder="Nombre de la directora"
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-semibold mb-0.5 text-[10px]">Cargo / Leyenda:</label>
                        <input
                          type="text"
                          value={sigConfig.directorTitle || ''}
                          onChange={e => setSigConfig({ ...sigConfig, directorTitle: e.target.value })}
                          placeholder="Ej: Directora del Plantel"
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveSignatures}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: currentPalette.primary }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Configuración de Firmas</span>
              </button>
            </div>
          </div>
        )}

        {/* Status Toast Banner */}
        {statusMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs transition animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="p-1 hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* PRINTABLE DOCUMENT SHEET CONTAINER (With generous outer padding & margin) */}
        <div className="p-3 sm:p-6 bg-slate-200/80 dark:bg-slate-950 printable-area overflow-y-auto overflow-x-auto flex-1 flex justify-center items-start">
          
          {/* THE MASTER PRINTABLE SHEET (Exact Letter Format with visible margins) */}
          <div 
            ref={printableSheetRef}
            className="bg-white text-black p-6 sm:p-8 shadow-2xl border border-slate-300 w-full max-w-[700px] flex flex-col justify-between my-2 rounded-xs"
            style={{ 
              boxSizing: 'border-box',
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
            }}
          >
            
            <div className="space-y-0">
              {/* 1. Header Box (3 Columns) */}
              <div className="grid grid-cols-12 border-2 border-black text-black">
                {/* Left Column: Logo ONLY */}
                <div 
                  onClick={() => leftLogoInputRef.current?.click()}
                  className="col-span-3 p-1.5 border-r-2 border-black flex flex-col items-center justify-center text-center bg-white relative group cursor-pointer hover:bg-blue-50/50 transition min-h-[64px]"
                  title="Haga clic para cambiar el Logo Izquierdo"
                >
                  {schoolLogo ? (
                    <img src={schoolLogo} alt="Logo Izquierdo" className="max-h-12 max-w-full object-contain" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-slate-100 border border-dashed border-slate-400 flex flex-col items-center justify-center text-slate-600 p-0.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="text-[7.5px] font-bold">Logo</span>
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-[7px] bg-blue-900 text-white font-bold px-1 rounded transition no-print">
                    Editar
                  </span>
                </div>

                {/* Center Column: Header Titles */}
                <div className="col-span-6 p-1.5 border-r-2 border-black flex flex-col items-center justify-center text-center bg-white">
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-black uppercase leading-tight">
                    {displayAppName}
                  </h1>
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-black mt-0.5">
                    TUTOR: <span className="font-black text-black">{printableLessonPlan.teacherName}</span>
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-black">
                    GRUPO DE EDAD: <span className="font-black">{printableLessonPlan.childrenAge}</span> ({printableLessonPlan.sectionName})
                  </p>
                </div>

                {/* Right Column: Secondary Logo */}
                <div 
                  onClick={() => rightLogoInputRef.current?.click()}
                  className="col-span-3 p-1.5 flex flex-col items-center justify-center text-center bg-white relative group cursor-pointer hover:bg-purple-50/50 transition min-h-[64px]"
                  title="Haga clic para subir/cambiar el Logo Derecho"
                >
                  {secondaryLogo ? (
                    <div className="relative inline-block">
                      <img src={secondaryLogo} alt="Logo Derecho" className="max-h-12 max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSecondaryLogo('');
                        }}
                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition no-print"
                        title="Quitar este logo"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded bg-slate-100 border border-dashed border-slate-400 flex flex-col items-center justify-center text-slate-600 p-0.5">
                      <Upload className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-[7.5px] font-bold text-slate-700">Logo</span>
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-[7px] bg-purple-900 text-white font-bold px-1 rounded transition no-print">
                    Editar
                  </span>
                </div>
              </div>

              {/* 2. Sub-header Bar: Fecha & Tiempo */}
              <div className="grid grid-cols-2 border-x-2 border-b-2 border-black bg-emerald-100 text-[9.5px] font-bold text-black py-1 px-3">
                <div className="border-r-2 border-black pr-2">
                  <span className="uppercase tracking-wide">FECHA:</span>{' '}
                  <span className="font-black underline">{printableLessonPlan.date}</span>
                </div>
                <div className="pl-2">
                  <span className="uppercase tracking-wide">TIEMPO:</span>{' '}
                  <span className="font-black">{printableLessonPlan.duration || '45 minutos'}</span>
                </div>
              </div>

              {/* 3. Table Column Headers Bar */}
              <div className="grid grid-cols-12 bg-emerald-800 text-white font-black text-[9.5px] uppercase text-center tracking-wider py-1 border-x-2 border-b-2 border-black">
                <div className="col-span-1 border-r border-emerald-600">ÁREA</div>
                <div className="col-span-2 border-r border-emerald-600">TEMA</div>
                <div className="col-span-3 border-r border-emerald-600">OBJETIVO</div>
                <div className="col-span-6">ACTIVIDAD</div>
              </div>

              {/* 4. Main Body: Perfectly Structured 2-Column Split */}
              <div className="grid grid-cols-12 border-x-2 border-b-2 border-black text-[9px] bg-white">
                
                {/* LEFT SIDE (6 OF 12 COLS): ÁREA, TEMA, OBJETIVO, RECURSOS, EVALUACIÓN */}
                <div className="col-span-6 border-r-2 border-black flex flex-col">
                  
                  {/* Top Sub-Row: ÁREA + TEMA + OBJETIVO */}
                  <div className="grid grid-cols-6 border-b-2 border-black">
                    {/* ÁREA (1 col) */}
                    <div className="col-span-1 border-r-2 border-black bg-white p-1 flex items-center justify-center text-center">
                      <span 
                        className="font-black uppercase tracking-widest text-[9px] text-black select-none block"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                      >
                        {areaName}
                      </span>
                    </div>

                    {/* TEMA (2 cols) */}
                    <div className="col-span-2 border-r-2 border-black p-1.5 font-black text-center text-blue-900 bg-blue-50/30 flex items-center justify-center leading-snug break-words uppercase text-[9px]">
                      {printableLessonPlan.subject}
                    </div>

                    {/* OBJETIVO (3 cols) */}
                    <div className="col-span-3 p-1.5 font-medium text-black flex items-center leading-tight break-words text-[8.5px] bg-white">
                      {printableLessonPlan.objective}
                    </div>
                  </div>

                  {/* Middle Sub-Row: RECURSOS */}
                  <div className="flex flex-col border-b-2 border-black">
                    <div className="bg-emerald-800 text-white font-black py-0.5 px-2 uppercase text-[8.5px] tracking-wider border-b border-black">
                      RECURSOS
                    </div>
                    <div className="p-1.5 leading-tight font-medium whitespace-pre-wrap text-black bg-white break-words text-[8px]">
                      {printableLessonPlan.materials || '• Contenido de la Web sobre el tema\n• Pizarra y marcador\n• Cuaderno y lápiz\n• Trabajo colaborativo'}
                    </div>
                  </div>

                  {/* Bottom Sub-Row: EVALUACIÓN */}
                  <div className="flex flex-col flex-1">
                    <div className="bg-emerald-800 text-white font-black py-0.5 px-2 uppercase text-[8.5px] tracking-wider border-b border-black">
                      EVALUACIÓN
                    </div>
                    <div className="p-1.5 leading-tight font-medium whitespace-pre-wrap text-black bg-white break-words text-[8px] flex-1">
                      {printableLessonPlan.closing || '• Realizar preguntas al inicio y final de la clase sobre lo aprendido.\n• Registro de observación cualitativa.'}
                    </div>
                  </div>

                </div>

                {/* RIGHT SIDE (6 OF 12 COLS): ACTIVIDAD */}
                <div className="col-span-6 p-2 flex flex-col justify-between space-y-2 text-black bg-white">
                  
                  <div className="space-y-1.5">
                    <div className="font-bold text-emerald-900 text-[8.5px] border-b border-slate-200 pb-1 leading-tight">
                      <p>• Bienvenida</p>
                      <p>• Oración</p>
                      <p>• 2 cantos</p>
                    </div>

                    <div>
                      <h4 className="font-black text-black text-[9px] mb-0.5 uppercase tracking-tight">
                        Desarrollo del tema:
                      </h4>
                      <div className="whitespace-pre-wrap font-medium text-black leading-snug text-[8px] break-words">
                        {printableLessonPlan.development}
                      </div>
                    </div>
                  </div>

                  {/* Dedicated Image Gallery Box inside ACTIVIDAD */}
                  {planImages.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-200 space-y-1">
                      <div className="flex items-center gap-1 text-black font-bold text-[8px] uppercase tracking-wide">
                        <ImageIcon className="w-2.5 h-2.5 text-blue-600" />
                        <span>Imágenes Ilustrativas ({planImages.length}):</span>
                      </div>

                      <div className={`grid ${planImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-1`}>
                        {planImages.slice(0, 2).map((imgUrl, idx) => (
                          <div key={idx} className="relative group rounded overflow-hidden border border-slate-300 h-16 bg-slate-50 flex items-center justify-center p-0.5">
                            <img 
                              src={imgUrl} 
                              alt={`Ilustración ${idx + 1}`} 
                              className="max-h-full max-w-full object-contain" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>

            {/* 5. Signatures Footer */}
            <div className="pt-5 text-center text-black">
              {(() => {
                const activeKeys = currentOrder.filter(k => k !== 'middle' || sigConfig.showMiddleSignature);
                const getSigData = (key: 'teacher' | 'middle' | 'director') => {
                  if (key === 'teacher') {
                    return {
                      name: sigConfig.teacherName || printableLessonPlan.teacherName,
                      title: sigConfig.teacherTitle || 'Firma del Maestro Docente / Tutor'
                    };
                  }
                  if (key === 'middle') {
                    return {
                      name: sigConfig.middleName || sigConfig.middleSignatureName || 'Firma Personalizada',
                      title: sigConfig.middleTitle || sigConfig.middleSignatureRole || 'Firma de Coordinación / Supervisión'
                    };
                  }
                  return {
                    name: sigConfig.directorName || sigConfig.principalName || adminName,
                    title: sigConfig.directorTitle || sigConfig.principalRole || 'Firma de Dirección Escolar'
                  };
                };

                return (
                  <div
                    className={`grid gap-3 text-[8.5px] font-bold ${
                      activeKeys.length === 3
                        ? 'grid-cols-3'
                        : activeKeys.length === 2
                        ? 'grid-cols-2 gap-8'
                        : 'grid-cols-1 max-w-xs mx-auto'
                    }`}
                  >
                    {activeKeys.map((key) => {
                      const sig = getSigData(key);
                      return (
                        <div key={key} className="border-t-2 border-black pt-1 px-1">
                          <p className="font-black text-[8.5px] leading-tight text-black">
                            {sig.name}
                          </p>
                          <p className="text-[7.5px] text-slate-700 font-medium">
                            {sig.title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
