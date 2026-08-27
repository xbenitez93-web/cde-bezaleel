import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AttendanceStatus, LessonPlan } from '../types';
import { generateClassPlanWithAI } from '../services/geminiService';
import { getDeduplicatedAttendance, getLocalDateString } from '../utils/attendanceUtils';
import { getTopicImages } from '../utils/topicImageUtils';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Sparkles,
  Printer,
  Calendar,
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  FileText,
  UserCheck,
  Users,
  UserX,
  RotateCcw,
  Eraser,
  Save,
  Utensils,
  Loader2,
  Image as ImageIcon,
  Upload
} from 'lucide-react';

export const TeachersView: React.FC = () => {
  const {
    currentUser,
    sections,
    students,
    attendance,
    recordAttendance,
    unmarkAttendance,
    lessonPlans,
    addLessonPlan,
    updateLessonPlan,
    deleteLessonPlan,
    setPrintableLessonPlan
  } = useApp();

  const { currentPalette } = useTheme();

  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'planner'>('attendance');

  // Attendance Controls State
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || 'sec-a');
  const [attendanceDate, setAttendanceDate] = useState<string>(getLocalDateString());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Local Attendance State for active roster
  const sectionStudents = students.filter(s => s.sectionId === selectedSectionId && s.active);
  const deduplicatedAtt = getDeduplicatedAttendance(attendance);
  const existingRecords = deduplicatedAtt.filter(a => a.date === attendanceDate && a.sectionId === selectedSectionId);

  const [localStatusMap, setLocalStatusMap] = useState<Record<string, { status?: AttendanceStatus; notes?: string }>>(() => {
    const map: Record<string, { status?: AttendanceStatus; notes?: string }> = {};
    sectionStudents.forEach(s => {
      const rec = existingRecords.find(r => r.studentId === s.id);
      map[s.id] = {
        status: rec ? rec.status : undefined,
        notes: rec?.notes || ''
      };
    });
    return map;
  });

  // Synchronize local map when section, date, or attendance context changes
  React.useEffect(() => {
    const secSts = students.filter(s => s.sectionId === selectedSectionId && s.active);
    const recs = getDeduplicatedAttendance(attendance).filter(a => a.date === attendanceDate && a.sectionId === selectedSectionId);
    const map: Record<string, { status?: AttendanceStatus; notes?: string }> = {};
    secSts.forEach(s => {
      const rec = recs.find(r => r.studentId === s.id);
      map[s.id] = { status: rec?.status, notes: rec?.notes || '' };
    });
    setLocalStatusMap(map);
  }, [selectedSectionId, attendanceDate, attendance, students]);

  // Update local map if section or date changes
  const handleSectionChange = (secId: string) => {
    setSelectedSectionId(secId);
  };

  const handleMarkAllPresent = () => {
    const map: Record<string, { status?: AttendanceStatus; notes?: string }> = {};
    sectionStudents.forEach(s => {
      map[s.id] = { status: 'presente', notes: localStatusMap[s.id]?.notes || '' };
    });
    setLocalStatusMap(map);
  };

  // Desmarcar todas las asistencias: Dejar en blanco y sincronizar con Firestore y dashboards (Cocina, Reportes, etc.)
  const handleUnmarkAll = () => {
    const map: Record<string, { status?: AttendanceStatus; notes?: string }> = {};
    sectionStudents.forEach(s => {
      map[s.id] = { status: undefined, notes: localStatusMap[s.id]?.notes || '' };
    });
    setLocalStatusMap(map);

    // Sincronización inmediata con base de datos en la nube y local
    unmarkAttendance(attendanceDate, selectedSectionId);
    
    setSaveSuccessMsg(`¡Asistencias desmarcadas y sincronizadas con la base de datos! La sección quedó en blanco (0 comensales en cocina).`);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4000);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setLocalStatusMap(prev => {
      const current = prev[studentId]?.status;
      // Si se hace clic en el mismo estado, se desmarca (queda en blanco)
      const newStatus = current === status ? undefined : status;
      return {
        ...prev,
        [studentId]: { ...prev[studentId], status: newStatus }
      };
    });
  };

  const handleClearStudent = (studentId: string) => {
    setLocalStatusMap(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status: undefined }
    }));
  };

  const handleNoteChange = (studentId: string, notes: string) => {
    setLocalStatusMap(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes }
    }));
  };

  const handleSaveAttendance = () => {
    const records = Object.entries(localStatusMap).map(([studentId, data]) => {
      const typedData = data as { status?: AttendanceStatus; notes?: string };
      return {
        studentId,
        status: typedData.status,
        notes: typedData.notes
      };
    });

    recordAttendance(attendanceDate, selectedSectionId, records);

    const presentCount = records.filter(r => r.status === 'presente').length;
    const lateCount = records.filter(r => r.status === 'retardo').length;
    const totalComensales = presentCount + lateCount;
    const totalMarked = records.filter(r => r.status).length;

    if (totalMarked === 0) {
      setSaveSuccessMsg(`¡Asistencias desmarcadas guardadas en blanco en la base de datos! Reflejado en cocina (0 comensales).`);
    } else {
      setSaveSuccessMsg(`¡Asistencia guardada y sincronizada correctamente para el ${attendanceDate}! Total comensales para cocina: ${totalComensales}.`);
    }

    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4000);
  };

  // Attendance summary metrics
  const activePresentCount = sectionStudents.filter(s => localStatusMap[s.id]?.status === 'presente').length;
  const activeLateCount = sectionStudents.filter(s => localStatusMap[s.id]?.status === 'retardo').length;
  const activeAbsentCount = sectionStudents.filter(s => localStatusMap[s.id]?.status === 'ausente').length;
  const activeJustifiedCount = sectionStudents.filter(s => localStatusMap[s.id]?.status === 'justificado').length;
  const activeUnmarkedCount = sectionStudents.filter(s => !localStatusMap[s.id]?.status).length;
  const activeKitchenComensales = activePresentCount + activeLateCount;

  // Class Planner State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const planImageInputRef = useRef<HTMLInputElement | null>(null);

  const [planFormData, setPlanFormData] = useState<Omit<LessonPlan, 'id' | 'createdAt'>>({
    teacherName: currentUser.name,
    teacherId: currentUser.id,
    sectionName: sections.find(s => s.id === selectedSectionId)?.name || 'Sección A - 3 Años',
    childrenAge: '3 a 4 años',
    date: new Date().toISOString().split('T')[0],
    subject: 'Conocimiento del Medio y Sensorial',
    objective: '',
    development: '',
    closing: '',
    materials: '',
    duration: '1 Semana',
    weeklyBreakdown: '',
    images: [],
    aiGenerated: false
  });

  const handleOpenPlanModal = (plan?: LessonPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanFormData({
        teacherName: plan.teacherName,
        teacherId: plan.teacherId,
        sectionName: plan.sectionName,
        childrenAge: plan.childrenAge,
        date: plan.date,
        subject: plan.subject,
        objective: plan.objective,
        development: plan.development,
        closing: plan.closing,
        materials: plan.materials || '',
        duration: plan.duration || '1 Semana',
        weeklyBreakdown: plan.weeklyBreakdown || '',
        images: plan.images || [],
        aiGenerated: plan.aiGenerated || false
      });
    } else {
      setEditingPlan(null);
      const activeSec = sections.find(s => s.id === selectedSectionId);
      const defaultSubj = 'Pensamiento Matemático y Conteo Infantil';
      setPlanFormData({
        teacherName: currentUser.name,
        teacherId: currentUser.id,
        sectionName: activeSec?.name || 'Sección A - 3 Años',
        childrenAge: activeSec?.ageGroup || '3 a 4 años',
        date: new Date().toISOString().split('T')[0],
        subject: defaultSubj,
        objective: '',
        development: '',
        closing: '',
        materials: '',
        duration: '1 Semana',
        weeklyBreakdown: '',
        images: getTopicImages(defaultSubj),
        aiGenerated: false
      });
    }
    setShowPlanModal(true);
  };

  const handlePlanImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 800;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedUrl = canvas.toDataURL('image/jpeg', 0.7);
              setPlanFormData(prev => ({
                ...prev,
                images: [...(prev.images || []), compressedUrl]
              }));
            }
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePlanImage = (indexToRemove: number) => {
    setPlanFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleGenerateClassPlanAI = async () => {
    setGeneratingAI(true);
    try {
      const aiResponse = await generateClassPlanWithAI({
        teacherName: planFormData.teacherName,
        childrenAge: planFormData.childrenAge,
        subject: planFormData.subject,
        objective: planFormData.objective,
        sectionName: planFormData.sectionName,
        duration: (planFormData.duration as any) || '1 Semana'
      });

      const topicImgs = aiResponse.images && aiResponse.images.length > 0
        ? aiResponse.images
        : getTopicImages(planFormData.subject);

      setPlanFormData(prev => ({
        ...prev,
        objective: aiResponse.objective,
        development: aiResponse.development,
        closing: aiResponse.closing,
        materials: aiResponse.materials,
        duration: aiResponse.duration || prev.duration || '1 Semana',
        weeklyBreakdown: aiResponse.weeklyBreakdown || '',
        images: topicImgs,
        aiGenerated: true
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planFormData.subject.trim()) return;

    if (editingPlan) {
      updateLessonPlan(editingPlan.id, planFormData);
    } else {
      addLessonPlan(planFormData);
    }

    setShowPlanModal(false);
  };

  const handleSaveAndPrintPlan = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!planFormData.subject.trim()) return;

    let savedPlan: LessonPlan;
    if (editingPlan) {
      updateLessonPlan(editingPlan.id, planFormData);
      savedPlan = { ...editingPlan, ...planFormData };
    } else {
      savedPlan = addLessonPlan(planFormData);
    }

    setShowPlanModal(false);
    setPrintableLessonPlan(savedPlan);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Área de Maestros y Docencia
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control directo de asistencia por grupo y planificador de clases asistido por IA Gemini
          </p>
        </div>

        {/* SubTab Navigation Switcher */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeSubTab === 'attendance'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            📋 Registro Asistencia
          </button>
          <button
            onClick={() => setActiveSubTab('planner')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeSubTab === 'planner'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            ✨ Planificador IA ({lessonPlans.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: CONTROL DE ASISTENCIA */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-6">
          
          {/* Success Banner */}
          {saveSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{saveSuccessMsg}</span>
              </div>
              <button onClick={() => setSaveSuccessMsg(null)} className="p-1 hover:opacity-70">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Controls Bar: Section & Date Selection */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Sección / Grado:
                </label>
                <select
                  value={selectedSectionId}
                  onChange={e => handleSectionChange(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white min-w-[200px]"
                >
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} ({sec.ageGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Fecha de Registro:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => {
                      setAttendanceDate(e.target.value);
                      handleSectionChange(selectedSectionId);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                  />
                  {attendanceDate !== getLocalDateString() && (
                    <button
                      type="button"
                      onClick={() => {
                        setAttendanceDate(getLocalDateString());
                        handleSectionChange(selectedSectionId);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 hover:underline"
                    >
                      Hoy
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Attendance Action Control Group: Desmarcar Asistencias ubicado arriba del botón Guardar Asistencia */}
            <div className="flex flex-col sm:items-end gap-2 w-full md:w-auto">
              <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                {/* Botón arriba de Guardar Asistencia: Desmarcar Asistencias (Dejar en blanco) */}
                <button
                  id="btn-desmarcar-asistencias"
                  onClick={handleUnmarkAll}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition flex items-center justify-center gap-1.5 shadow-xs"
                  title="Desmarcar y dejar en blanco todos los alumnos por si no llegó ninguno (Sincroniza 0 asistencias y 0 comensales con la base de datos)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                  <span>Desmarcar Asistencias</span>
                </button>

                <button
                  id="btn-marcar-todos-presentes"
                  onClick={handleMarkAllPresent}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition flex items-center justify-center gap-1.5"
                  title="Marcar todos los estudiantes de la sección como presentes"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Marcar Todos Presentes</span>
                </button>
              </div>

              {/* Botón Guardar Asistencia con sincronización instantánea */}
              <button
                id="btn-guardar-asistencia"
                onClick={handleSaveAttendance}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
                style={{ backgroundColor: currentPalette.primary }}
                title="Guardar y sincronizar con Firestore, Cocina y Reportes"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Asistencia</span>
              </button>
            </div>

          </div>

          {/* Real-time Summary Badge Bar with Kitchen Comensales Count */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mr-1">
                <Users className="w-4 h-4 text-slate-500" />
                Matrícula: <strong className="text-slate-900 dark:text-white">{sectionStudents.length}</strong>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Presentes: {activePresentCount}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Retardos: {activeLateCount}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-bold">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Ausentes: {activeAbsentCount}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                Justificados: {activeJustifiedCount}
              </span>

              {activeUnmarkedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-600">
                  ⚪ En Blanco: {activeUnmarkedCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
                <Utensils className="w-3.5 h-3.5 text-amber-600" />
                Comensales para Cocina: {activeKitchenComensales}
              </span>
            </div>
          </div>

          {/* Student Attendance Roster */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Lista de Estudiantes ({sectionStudents.length} alumnos)
                </h3>
                <p className="text-xs text-slate-500">
                  Haz clic en el estado correspondiente. Puedes desmarcar individualmente o dejar la lista en blanco.
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {attendanceDate}
              </span>
            </div>

            {sectionStudents.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">
                No hay alumnos asignados a esta sección.
              </p>
            ) : (
              <div className="space-y-3">
                {sectionStudents.map((st, index) => {
                  const currentData = localStatusMap[st.id] || {};
                  const isUnmarked = !currentData.status;

                  return (
                    <div
                      key={st.id}
                      className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isUnmarked
                          ? 'bg-slate-50/50 dark:bg-slate-900/30 border-dashed border-slate-300 dark:border-slate-700'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-solid border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{st.fullName}</h4>
                            {isUnmarked && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                ⚪ En Blanco (Sin marcar)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Edad: {st.age} años | Tutor: {st.tutorName} ({st.tutorPhone})
                            {st.allergies && <span className="text-amber-600 font-semibold ml-2">⚠ {st.allergies}</span>}
                          </p>
                        </div>
                      </div>

                      {/* Status Toggle Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'presente')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            currentData.status === 'presente'
                              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                              : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                          }`}
                          title="Marcar Presente (Haz clic de nuevo para desmarcar)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'retardo')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            currentData.status === 'retardo'
                              ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/40'
                              : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                          }`}
                          title="Marcar Retardo (Haz clic de nuevo para desmarcar)"
                        >
                          <Clock className="w-3.5 h-3.5" /> Retardo
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'ausente')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            currentData.status === 'ausente'
                              ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400/40'
                              : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                          }`}
                          title="Marcar Ausente (Haz clic de nuevo para desmarcar)"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Ausente
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'justificado')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            currentData.status === 'justificado'
                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/40'
                              : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                          }`}
                          title="Marcar Justificado (Haz clic de nuevo para desmarcar)"
                        >
                          <HelpCircle className="w-3.5 h-3.5" /> Justificado
                        </button>

                        {/* Botón individual para desmarcar y dejar en blanco */}
                        {!isUnmarked && (
                          <button
                            type="button"
                            onClick={() => handleClearStudent(st.id)}
                            className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Desmarcar este alumno (Dejar en blanco)"
                          >
                            <Eraser className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <input
                          type="text"
                          placeholder="Nota..."
                          value={currentData.notes || ''}
                          onChange={e => handleNoteChange(st.id, e.target.value)}
                          className="px-2.5 py-1 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-32"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Controls Bar */}
            {sectionStudents.length > 0 && (
              <div className="pt-4 border-t dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>Sincronización activa con Firestore y Cocina ({activeKitchenComensales} comensales listos).</span>
                </div>

                <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 w-full justify-end">
                    <button
                      id="btn-desmarcar-asistencias-bottom"
                      onClick={handleUnmarkAll}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition flex items-center gap-1.5"
                      title="Dejar en blanco la lista"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                      <span>Desmarcar Asistencias</span>
                    </button>
                    <button
                      onClick={handleMarkAllPresent}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition"
                    >
                      Marcar Todos
                    </button>
                  </div>

                  <button
                    id="btn-guardar-asistencia-bottom"
                    onClick={handleSaveAttendance}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
                    style={{ backgroundColor: currentPalette.primary }}
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Asistencia</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: PLANIFICADOR DE CLASES CON IA GEMINI */}
      {activeSubTab === 'planner' && (
        <div className="space-y-6">
          
          <div className="flex items-center justify-between p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Planificaciones Didácticas Registradas
              </h3>
              <p className="text-xs text-slate-500">
                Cada planificación puede imprimirse o exportarse en formato de documento oficial
              </p>
            </div>

            <button
              onClick={() => handleOpenPlanModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Planeación IA</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lessonPlans.map(plan => (
              <div
                key={plan.id}
                className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b pb-3 dark:border-slate-700">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {plan.sectionName}
                        </span>
                        {plan.duration && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            ⏱️ {plan.duration}
                          </span>
                        )}
                        {plan.aiGenerated && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> IA Gemini
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                        {plan.subject}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenPlanModal(plan)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteLessonPlan(plan.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p><strong>Maestro:</strong> {plan.teacherName}</p>
                    <p><strong>Edad Niños:</strong> {plan.childrenAge} | <strong>Fecha Inicio:</strong> {plan.date}</p>
                  </div>

                  {/* Objective & Weekly Breakdown Preview */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                    <div>
                      <strong className="block text-slate-900 dark:text-white font-bold mb-0.5">Objetivo:</strong>
                      <p className="line-clamp-2">{plan.objective}</p>
                    </div>

                    {plan.images && plan.images.length > 0 && (
                      <div className="border-t pt-2 dark:border-slate-800">
                        <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Imágenes del Desarrollo ({plan.images.length}):</span>
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {plan.images.slice(0, 2).map((img, imgIdx) => (
                            <div key={imgIdx} className="relative h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                              <img src={img} alt={`Desarrollo ${imgIdx+1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {plan.weeklyBreakdown && (
                      <div className="border-t pt-2 dark:border-slate-800">
                        <strong className="block text-indigo-600 dark:text-indigo-400 font-bold mb-0.5">Desglose Cronológico ({plan.duration}):</strong>
                        <p className="text-[11px] whitespace-pre-line line-clamp-3 font-mono leading-tight">{plan.weeklyBreakdown}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Print & Export Button */}
                <button
                  onClick={() => setPrintableLessonPlan(plan)}
                  className="w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Exportar Documento PDF</span>
                </button>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* LESSON PLAN FORM MODAL WITH GEMINI AI */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {editingPlan ? 'Editar Planeación Didáctica' : 'Nueva Planeación Didáctica con IA'}
                </h3>
              </div>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Maestro/a:</label>
                  <input
                    type="text"
                    required
                    value={planFormData.teacherName}
                    onChange={e => setPlanFormData({ ...planFormData, teacherName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Edad Niños:</label>
                  <input
                    type="text"
                    required
                    value={planFormData.childrenAge}
                    onChange={e => setPlanFormData({ ...planFormData, childrenAge: e.target.value })}
                    placeholder="Ej: 3 a 4 años"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Duración Plan:</label>
                  <select
                    value={planFormData.duration || '1 Semana'}
                    onChange={e => setPlanFormData({ ...planFormData, duration: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="1 Día">1 Día (Sesión)</option>
                    <option value="1 Semana">1 Semana (Unidad)</option>
                    <option value="2 Semanas">2 Semanas (Quincenal)</option>
                    <option value="1 Mes">1 Mes (Unidad Mensual)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha de Inicio:</label>
                  <input
                    type="date"
                    required
                    value={planFormData.date}
                    onChange={e => setPlanFormData({ ...planFormData, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="flex-1 w-full">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Materia / Tema Central:</label>
                  <input
                    type="text"
                    required
                    value={planFormData.subject}
                    onChange={e => setPlanFormData({ ...planFormData, subject: e.target.value })}
                    placeholder="Ej: Mezcla de Colores Secundarios y Texturas Naturales"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateClassPlanAI}
                  disabled={generatingAI}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-1.5 shrink-0 shadow-md disabled:opacity-50"
                >
                  {generatingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generando con IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generar Plan con IA</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">1. Objetivo Pedagógico:</label>
                <textarea
                  rows={2}
                  value={planFormData.objective}
                  onChange={e => setPlanFormData({ ...planFormData, objective: e.target.value })}
                  placeholder="Objetivo principal de aprendizaje..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">2. Desarrollo del Tema (Actividades):</label>
                <textarea
                  rows={4}
                  value={planFormData.development}
                  onChange={e => setPlanFormData({ ...planFormData, development: e.target.value })}
                  placeholder="Inicio, desarrollo de la sesión y dinámicas kinestésicas..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Images for Development Area */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                    <span>Imágenes Ilustrativas del Tema:</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPlanFormData(prev => ({ ...prev, images: getTopicImages(prev.subject) }))}
                      className="px-2.5 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center gap-1 transition"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generar según Tema</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => planImageInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Subir Imagen</span>
                    </button>

                    <input
                      type="file"
                      ref={planImageInputRef}
                      accept="image/*"
                      multiple
                      onChange={handlePlanImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Display thumbnail grid */}
                {planFormData.images && planFormData.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {planFormData.images.map((img, idx) => (
                      <div key={idx} className="relative h-24 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 group">
                        <img src={img} alt={`Imagen ${idx+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePlanImage(idx)}
                          className="absolute top-1 right-1 p-1 rounded-lg bg-red-600 text-white opacity-80 hover:opacity-100 transition shadow-md"
                          title="Eliminar imagen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Sin imágenes adjuntas. Puedes generar 1 o 2 imágenes ilustrativas según el tema o subir tus propias imágenes desde tu dispositivo.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">3. Cierre y Evaluación:</label>
                <textarea
                  rows={2}
                  value={planFormData.closing}
                  onChange={e => setPlanFormData({ ...planFormData, closing: e.target.value })}
                  placeholder="Estrategia de cierre y evaluación formativa..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Materiales e Insumos:</label>
                <input
                  type="text"
                  value={planFormData.materials}
                  onChange={e => setPlanFormData({ ...planFormData, materials: e.target.value })}
                  placeholder="Pinceles, papel, acuarelas, plastilina..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-3.5 py-2 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition text-xs"
                >
                  Guardar Planeación
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndPrintPlan}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white shadow-md transition text-xs hover:opacity-90"
                  style={{ backgroundColor: currentPalette.primary }}
                >
                  <Printer className="w-4 h-4" />
                  <span>Guardar y Ver Formato Imprimible</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
