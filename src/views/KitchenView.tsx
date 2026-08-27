import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { MenuItem } from '../types';
import { generateKitchenMenuWithAI } from '../services/geminiService';
import { getDeduplicatedAttendance, getLocalDateString } from '../utils/attendanceUtils';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Utensils,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Printer,
  AlertTriangle,
  ChefHat,
  Calendar,
  CheckCircle2,
  X,
  Loader2,
  Users,
  UserCheck,
  Clock,
  XCircle,
  FileText,
  FileSpreadsheet,
  Download
} from 'lucide-react';

export const KitchenView: React.FC = () => {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem, schoolName, students, attendance, sections } = useApp();
  const { currentPalette } = useTheme();

  const [selectedDay, setSelectedDay] = useState<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes'>('Lunes');
  const [kitchenAttendanceDate, setKitchenAttendanceDate] = useState<string>(getLocalDateString());
  
  // Modal State for Add / Edit
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Modal State for Gemini AI Generator
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMealType, setAiMealType] = useState<'Desayuno' | 'Almuerzo' | 'Merienda'>('Almuerzo');
  const [aiDifficulty, setAiDifficulty] = useState<'Fácil / Rápido' | 'Económico y Nutritivo' | 'Estándar' | 'Gourmet Infantil'>('Fácil / Rápido');
  const [aiStudentCount, setAiStudentCount] = useState<number>(35);
  const [aiRestrictions, setAiRestrictions] = useState('Opción baja en azúcares refinados, apto para preescolar');
  const [loadingAI, setLoadingAI] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>({
    dayOfWeek: 'Lunes',
    mealType: 'Almuerzo',
    dishName: '',
    description: '',
    ingredients: [''],
    allergensWarning: '',
    portionCount: 35,
    preparationSteps: [],
    difficultyLevel: 'Fácil / Rápido',
    studentCount: 35,
    costPerStudent: 17,
    totalBudget: 595,
    ingredientCosts: []
  });

  // Interactive Live Budget Calculator State
  const [calcStudentCount, setCalcStudentCount] = useState<number>(35);
  const [selectedCalcItem, setSelectedCalcItem] = useState<MenuItem | null>(null);

  const daysList: ('Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes')[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  const filteredItems = menuItems.filter(m => m.dayOfWeek === selectedDay);

  const handleOpenAddModal = (mealType?: 'Desayuno' | 'Almuerzo' | 'Merienda') => {
    setEditingItem(null);
    setFormData({
      dayOfWeek: selectedDay,
      mealType: mealType || 'Almuerzo',
      dishName: '',
      description: '',
      ingredients: ['Pechuga de pollo', 'Puré de papas', 'Verduras al vapor'],
      allergensWarning: '',
      portionCount: 35,
      preparationSteps: ['1. Lavar ingredientes.', '2. Cocinar proteína.', '3. Servir en porciones infantiles.'],
      difficultyLevel: 'Fácil / Rápido',
      studentCount: 35,
      costPerStudent: 17,
      totalBudget: 595,
      ingredientCosts: []
    });
    setShowItemModal(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      dayOfWeek: item.dayOfWeek,
      mealType: item.mealType,
      dishName: item.dishName,
      description: item.description,
      ingredients: [...item.ingredients],
      allergensWarning: item.allergensWarning || '',
      portionCount: item.portionCount,
      preparationSteps: item.preparationSteps ? [...item.preparationSteps] : [],
      difficultyLevel: item.difficultyLevel || 'Fácil / Rápido',
      studentCount: item.studentCount || item.portionCount || 35,
      costPerStudent: item.costPerStudent || 17,
      totalBudget: item.totalBudget || (item.portionCount * 17),
      ingredientCosts: item.ingredientCosts ? [...item.ingredientCosts] : []
    });
    setShowItemModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dishName.trim()) return;

    if (editingItem) {
      updateMenuItem(editingItem.id, formData);
    } else {
      addMenuItem(formData);
    }

    setShowItemModal(false);
  };

  const handleGenerateAIMenu = async () => {
    setLoadingAI(true);
    try {
      const result = await generateKitchenMenuWithAI({
        dayOfWeek: selectedDay,
        mealType: aiMealType,
        difficultyLevel: aiDifficulty,
        studentCount: aiStudentCount,
        targetAgeRange: '3 a 5 años',
        dietaryRestrictions: aiRestrictions
      });

      // Populate form data with Gemini suggestion and open form
      setEditingItem(null);
      setFormData({
        dayOfWeek: selectedDay,
        mealType: aiMealType,
        dishName: result.dishName,
        description: result.description,
        ingredients: result.ingredients.length > 0 ? result.ingredients : ['Avena', 'Fruta picada'],
        allergensWarning: result.allergensWarning || '',
        portionCount: result.studentCount || aiStudentCount,
        preparationSteps: result.preparationSteps || ['1. Lavar y cortar ingredientes.', '2. Cocinar a fuego lento.', '3. Servir porciones.'],
        difficultyLevel: (result.difficultyLevel as any) || aiDifficulty,
        studentCount: result.studentCount || aiStudentCount,
        costPerStudent: result.costPerStudent || 17,
        totalBudget: result.totalBudget || (aiStudentCount * 17),
        ingredientCosts: result.ingredientCosts || []
      });

      setShowAIModal(false);
      setShowItemModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Print call restricted:', err);
    }
  };

  const handleExportKitchenPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFillColor(217, 119, 6); // amber-600
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`${schoolName.toUpperCase()} - MENÚ (${selectedDay.toUpperCase()})`, 15, 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Plan Alimenticio Escolar Nutritivo para Preescolar', 15, 22);

      let y = 38;
      const mealTypes: ('Desayuno' | 'Almuerzo' | 'Merienda')[] = ['Desayuno', 'Almuerzo', 'Merienda'];

      mealTypes.forEach(mType => {
        if (y > pageHeight - 35) {
          doc.addPage();
          y = 20;
        }

        const items = filteredItems.filter(i => i.mealType === mType);
        doc.setFillColor(254, 243, 199); // amber-100
        doc.rect(15, y - 4, pageWidth - 30, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(180, 83, 9);
        doc.text(`* ${mType.toUpperCase()} (${items.length} Platillo/s)`, 18, y + 1.5);
        y += 9;

        if (items.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.setTextColor(100, 116, 139);
          doc.text('Sin platillos registrados para este tiempo.', 20, y);
          y += 8;
        } else {
          items.forEach(item => {
            if (y > pageHeight - 30) {
              doc.addPage();
              y = 20;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`• ${item.dishName} (${item.portionCount} raciones)`, 20, y);
            y += 5;

            if (item.description) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              doc.setTextColor(71, 85, 105);
              const splitDesc = doc.splitTextToSize(item.description, 170);
              doc.text(splitDesc, 20, y);
              y += (splitDesc.length * 4) + 2;
            }

            if (item.ingredients && item.ingredients.length > 0) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              doc.setTextColor(100, 116, 139);
              doc.text(`Ingredientes: ${item.ingredients.join(', ')}`, 20, y);
              y += 5;
            }

            if (item.allergensWarning) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              doc.setTextColor(185, 28, 28);
              doc.text(`Alérgenos / Advertencia: ${item.allergensWarning}`, 20, y);
              y += 5;
            }

            y += 3;
          });
        }
        y += 4;
      });

      // Page footer
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Documento de Cocina - ${schoolName} - Página ${p} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }

      doc.save(`Menu_Cocina_${selectedDay}.pdf`);
    } catch (e) {
      console.error('Error generating kitchen PDF:', e);
    }
  };

  const handleExportKitchenExcel = () => {
    const dataRows = filteredItems.map(item => ({
      Día: item.dayOfWeek,
      'Tiempo de Comida': item.mealType,
      'Nombre del Platillo': item.dishName,
      'Porciones / Raciones': item.portionCount,
      'Descripción / Preparación': item.description || '',
      Ingredientes: (item.ingredients || []).join(', '),
      'Alérgenos / Alerta': item.allergensWarning || 'Ninguno',
      'Costo Estimado x Alumno': item.costPerStudent ? `$${item.costPerStudent}` : 'N/A',
      'Presupuesto Total': item.totalBudget ? `$${item.totalBudget}` : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Menú ${selectedDay}`);
    XLSX.writeFile(workbook, `SchoolSync_Menu_Cocina_${selectedDay}.xlsx`);
  };

  const handlePrintKitchenSheet = () => {
    handlePrint();
    handleExportKitchenPDF();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs">
              <ChefHat className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Área de Cocina y Menú Semanal
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Crea y organiza menús equilibrados para preescolar con sugerencias inteligentes de la IA Gemini
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sugerir con IA</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition"
            style={{ backgroundColor: currentPalette.primary }}
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Platillo</span>
          </button>

          <button
            onClick={handleExportKitchenExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            title="Exportar Menú a Excel (XLSX)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={handleExportKitchenPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition"
            title="Exportar Menú en PDF"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={handlePrintKitchenSheet}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
            title="Imprimir Hoja de Cocina"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time Attendance & Comensales Sync Banner for Kitchen */}
      {(() => {
        const todayStr = kitchenAttendanceDate || getLocalDateString();
        const activeStudents = students.filter(s => s.active);
        const activeStudentIds = new Set(activeStudents.map(s => s.id));
        const todayAttendance = getDeduplicatedAttendance(attendance.filter(a => a.date === todayStr && activeStudentIds.has(a.studentId)));
        const hasAttendance = todayAttendance.length > 0;

        const presentCount = todayAttendance.filter(a => a.status === 'presente').length;
        const lateCount = todayAttendance.filter(a => a.status === 'retardo').length;
        const absentCount = todayAttendance.filter(a => a.status === 'ausente').length;
        const justifiedCount = todayAttendance.filter(a => a.status === 'justificado').length;

        // Total comensales reales a preparar hoy (Presentes + Retardos), no excediendo matricula activa
        const rawComensales = presentCount + lateCount;
        const realComensalesToday = hasAttendance ? Math.min(rawComensales, activeStudents.length) : 0;
        const targetComensalesForCalc = hasAttendance ? realComensalesToday : activeStudents.length;

        // Present or late students with allergies ONLY
        const presentStudentIds = new Set(
          hasAttendance
            ? todayAttendance.filter(a => a.status === 'presente' || a.status === 'retardo').map(a => a.studentId)
            : []
        );
        const allergicPresentStudents = activeStudents.filter(s => presentStudentIds.has(s.id) && s.allergies && s.allergies.trim().length > 0);

        return (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-transparent border border-emerald-200 dark:border-emerald-900/50 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Sincronización en Tiempo Real de Comensales (Pase de Lista)
                  </h3>
                  
                  {/* Quick Date Selector */}
                  <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
                    <span className="text-[11px] text-slate-500 font-semibold">Fecha:</span>
                    <input
                      type="date"
                      value={kitchenAttendanceDate}
                      onChange={(e) => setKitchenAttendanceDate(e.target.value)}
                      className="px-2 py-0.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    {kitchenAttendanceDate !== getLocalDateString() && (
                      <button
                        type="button"
                        onClick={() => setKitchenAttendanceDate(getLocalDateString())}
                        className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Hoy
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  {hasAttendance
                    ? `Pase de lista registrado (${todayStr}): ${presentCount} presentes, ${lateCount} retardos, ${absentCount} ausentes, ${justifiedCount} justificados. (Total a cocinar: ${realComensalesToday} comensales).`
                    : `Aún no se ha registrado lista para la fecha seleccionada (${todayStr}). Matrícula total: ${activeStudents.length} alumnos.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCalcStudentCount(targetComensalesForCalc);
                  setAiStudentCount(targetComensalesForCalc);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition shrink-0 self-start sm:self-auto flex items-center gap-1.5"
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>
                  {hasAttendance
                    ? `Usar ${realComensalesToday} Comensales en Calculadora`
                    : `Usar Matrícula (${activeStudents.length}) en Calculadora`}
                </span>
              </button>
            </div>

            {/* Attendance Status Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-slate-500 font-semibold text-[11px]">Presentes</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-black">{hasAttendance ? presentCount : 0}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-slate-500 font-semibold text-[11px]">Retardos</span>
                <strong className="text-amber-600 dark:text-amber-400 font-black">{hasAttendance ? lateCount : 0}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-slate-500 font-semibold text-[11px]">Ausentes</span>
                <strong className="text-rose-600 dark:text-rose-400 font-black">{hasAttendance ? absentCount : 0}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-slate-500 font-semibold text-[11px]">Justificados</span>
                <strong className="text-sky-600 dark:text-sky-400 font-black">{hasAttendance ? justifiedCount : 0}</strong>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                <span className="text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px]">Porciones a Servir</span>
                <strong className="text-emerald-900 dark:text-emerald-200 font-black text-sm">{realComensalesToday}</strong>
              </div>
            </div>

            {/* Allergy Alerts for Present Students */}
            {allergicPresentStudents.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300 dark:border-amber-900/60 text-xs space-y-1">
                <span className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Atención Cocina: Alergias reportadas de alumnos presentes hoy ({allergicPresentStudents.length})
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {allergicPresentStudents.map(s => {
                    const sec = sections.find(sc => sc.id === s.sectionId);
                    return (
                      <span key={s.id} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900 text-[11px] text-slate-800 dark:text-slate-200">
                        <strong>{s.fullName}</strong> ({sec?.name || ''}): <span className="text-rose-600 font-semibold">{s.allergies}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Day Selector Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto no-scrollbar">
        {daysList.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedDay === day
                ? 'text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            style={{
              backgroundColor: selectedDay === day ? currentPalette.primary : undefined
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Food Items Cards by Meal Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['Desayuno', 'Almuerzo', 'Merienda'] as const).map(mType => {
          const itemsForType = filteredItems.filter(i => i.mealType === mType);

          return (
            <div
              key={mType}
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    {mType}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {itemsForType.length} registrado(s)
                  </span>
                </div>

                {itemsForType.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <Utensils className="w-8 h-8 mx-auto opacity-40" />
                    <p className="text-xs italic">Sin menú asignado para {mType} el {selectedDay}.</p>
                    <button
                      onClick={() => handleOpenAddModal(mType)}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      + Registrar {mType}
                    </button>
                  </div>
                ) : (
                  itemsForType.map(item => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {item.difficultyLevel && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-block mb-1">
                              ⚡ {item.difficultyLevel}
                            </span>
                          )}
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                            {item.dishName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 opacity-90">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMenuItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Preparation Steps if present */}
                      {item.preparationSteps && item.preparationSteps.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] space-y-1">
                          <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            👩‍🍳 Pasos de Preparación:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 leading-snug">
                            {item.preparationSteps.map((step, sIdx) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Ingredients list */}
                      {item.ingredients && item.ingredients.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Ingredientes calculados:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.ingredients.map((ing, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300"
                              >
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Allergens Warning */}
                      {item.allergensWarning && (
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                          <span>{item.allergensWarning}</span>
                        </div>
                      )}

                      {/* Student Budget Summary Badge */}
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        <span>👥 Alumnos: {item.studentCount || item.portionCount || 35}</span>
                        {item.totalBudget ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            ${item.totalBudget} MXN total (${item.costPerStudent || Math.round(item.totalBudget / (item.studentCount || 35))}/alumno)
                          </span>
                        ) : (
                          <span className="text-slate-400">{item.portionCount} raciones</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => handleOpenAddModal(mType)}
                className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                + Añadir platillo a {mType}
              </button>
            </div>
          );
        })}
      </div>

      {/* Interactive Budget Calculator Widget for X Students */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-900/50 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500 text-white font-extrabold text-xs">
              💰
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Calculadora de Presupuesto e Insumos para X Alumnos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calcula al instante cuánto dinero e insumos necesitas según la matrícula de niños asistiendo el día {selectedDay}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Cantidad de Alumnos (X):
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={calcStudentCount}
              onChange={e => setCalcStudentCount(Math.max(1, Number(e.target.value)))}
              className="w-20 p-1.5 text-center font-extrabold text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-amber-600 dark:text-amber-400"
            />
            <span className="text-xs font-semibold text-slate-500">niños</span>
          </div>
        </div>

        {/* Calculation Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {filteredItems.length === 0 ? (
            <div className="col-span-3 p-4 text-center text-xs text-slate-400 italic">
              Añade platillos al día {selectedDay} o genera un menú con IA para calcular el presupuesto estimado para {calcStudentCount} alumnos.
            </div>
          ) : (
            filteredItems.map(item => {
              const unitCost = item.costPerStudent || 17;
              const calcTotal = Math.round(unitCost * calcStudentCount);

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between border-b pb-2 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.mealType}: {item.dishName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {item.difficultyLevel || 'Fácil'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Costo por alumno:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">${unitCost} MXN</span>
                  </div>

                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-900/50">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      Presupuesto Total ({calcStudentCount} alumnos):
                    </span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      ${calcTotal} L.
                    </span>
                  </div>

                  {item.preparationSteps && item.preparationSteps.length > 0 && (
                    <div className="pt-2 text-[10px] text-slate-600 dark:text-slate-400">
                      <strong>Modo de Preparación:</strong> {item.preparationSteps[0]}...
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Generar Menú con IA Gemini
                </h3>
              </div>
              <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Obtén una propuesta nutricional equilibrada para preescolar adecuada al día <strong className="text-amber-600">{selectedDay}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Comida:
                  </label>
                  <select
                    value={aiMealType}
                    onChange={e => setAiMealType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Desayuno">Desayuno</option>
                    <option value="Almuerzo">Almuerzo</option>
                    <option value="Merienda">Merienda</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nivel de Dificultad:
                  </label>
                  <select
                    value={aiDifficulty}
                    onChange={e => setAiDifficulty(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-amber-600 dark:text-amber-400"
                  >
                    <option value="Fácil / Rápido">⚡ Fácil / Rápido (Poca preparación)</option>
                    <option value="Económico y Nutritivo">💡 Económico y Nutritivo</option>
                    <option value="Estándar">🥗 Estándar Balanceado</option>
                    <option value="Gourmet Infantil">🌟 Gourmet Infantil Especial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cantidad de Alumnos (X alumnos):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={aiStudentCount}
                    onChange={e => setAiStudentCount(Math.max(1, Number(e.target.value)))}
                    className="w-32 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-center"
                  />
                  <span className="text-slate-500 font-medium">alumnos registrados</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Restricciones o Notas de Dieta:
                </label>
                <input
                  type="text"
                  value={aiRestrictions}
                  onChange={e => setAiRestrictions(e.target.value)}
                  placeholder="Ej: Bajo en sal, sin frutos secos, opción libre de gluten"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
              <button
                onClick={() => setShowAIModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateAIMenu}
                disabled={loadingAI}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50"
              >
                {loadingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Consultando IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generar Menú</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT ITEM FORM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingItem ? 'Editar Platillo' : 'Nuevo Platillo para Menú'}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Día:</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    {daysList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo Comida:</label>
                  <select
                    value={formData.mealType}
                    onChange={e => setFormData({ ...formData, mealType: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Desayuno">Desayuno</option>
                    <option value="Almuerzo">Almuerzo</option>
                    <option value="Merienda">Merienda</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Platillo:</label>
                <input
                  type="text"
                  required
                  value={formData.dishName}
                  onChange={e => setFormData({ ...formData, dishName: e.target.value })}
                  placeholder="Ej: Pechuga de pollo a la plancha con puré de papa"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descripción:</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles de preparación, sazón o guarniciones..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dificultad / Estilo:
                  </label>
                  <select
                    value={formData.difficultyLevel || 'Fácil / Rápido'}
                    onChange={e => setFormData({ ...formData, difficultyLevel: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-amber-600 dark:text-amber-400"
                  >
                    <option value="Fácil / Rápido">⚡ Fácil / Rápido</option>
                    <option value="Económico y Nutritivo">💡 Económico y Nutritivo</option>
                    <option value="Estándar">🥗 Estándar</option>
                    <option value="Gourmet Infantil">🌟 Gourmet Infantil</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alumnos Calculados:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.studentCount || formData.portionCount || 35}
                    onChange={e => {
                      const count = Number(e.target.value);
                      const costEach = formData.costPerStudent || 17;
                      setFormData({
                        ...formData,
                        studentCount: count,
                        portionCount: count,
                        totalBudget: count * costEach
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pasos de Preparación (uno por línea):
                </label>
                <textarea
                  rows={3}
                  value={formData.preparationSteps?.join('\n') || ''}
                  onChange={e => setFormData({ ...formData, preparationSteps: e.target.value.split('\n').filter(Boolean) })}
                  placeholder="1. Lavar verduras&#10;2. Cocinar a fuego medio&#10;3. Servir en porciones"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ingredientes (separados por coma):
                </label>
                <input
                  type="text"
                  value={formData.ingredients.join(', ')}
                  onChange={e => setFormData({ ...formData, ingredients: e.target.value.split(',').map(s => s.trim()) })}
                  placeholder="Pollo, Papa, Zanahoria, Mantequilla"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Costo est. por alumno (L.):
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={formData.costPerStudent || 17}
                    onChange={e => {
                      const costEach = Number(e.target.value);
                      const count = formData.studentCount || 35;
                      setFormData({
                        ...formData,
                        costPerStudent: costEach,
                        totalBudget: Math.round(count * costEach)
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Presupuesto Total (L.):
                  </label>
                  <input
                    type="number"
                    value={formData.totalBudget || (formData.studentCount || 35) * (formData.costPerStudent || 17)}
                    readOnly
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Advertencia de Alérgenos:
                </label>
                <input
                  type="text"
                  value={formData.allergensWarning}
                  onChange={e => setFormData({ ...formData, allergensWarning: e.target.value })}
                  placeholder="Ej: Contiene lácteos / gluten"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-3.5 py-2 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-white shadow-md transition"
                  style={{ backgroundColor: currentPalette.primary }}
                >
                  Guardar Platillo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
