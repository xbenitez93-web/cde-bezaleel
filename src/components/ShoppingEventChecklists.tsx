import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { ShoppingEventList, ChecklistItem } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit2,
  Download,
  Image as ImageIcon,
  FileText,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle2,
  AlertCircle,
  Filter,
  X,
  Copy,
  Sparkles,
  ShoppingBag,
  Layers,
  ChefHat,
  BookOpen,
  PartyPopper,
  Wrench,
  HelpCircle,
  School
} from 'lucide-react';

export const ShoppingEventChecklists: React.FC = () => {
  const {
    shoppingEventLists,
    addShoppingEventList,
    updateShoppingEventList,
    deleteShoppingEventList,
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
    currentUser,
    schoolName,
    schoolLogo
  } = useApp();

  const { currentPalette } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingEventList | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  // New list form state
  const [formData, setFormData] = useState<{
    title: string;
    category: ShoppingEventList['category'];
    eventDate: string;
    description: string;
    estimatedBudget?: number;
    initialItemsText: string;
  }>({
    title: '',
    category: 'compras_cocina',
    eventDate: new Date().toISOString().split('T')[0],
    description: '',
    estimatedBudget: 0,
    initialItemsText: ''
  });

  // Quick inline item addition state: map of listId -> { text, quantity, unit }
  const [quickInputs, setQuickInputs] = useState<Record<string, { text: string; quantity: string }>>({});

  // Filter lists
  const filteredLists = shoppingEventLists.filter(list => {
    const cat = list.category || 'compras_cocina';
    const matchCategory = selectedCategory === 'todas' || cat === selectedCategory;
    const matchQuery = !searchQuery.trim() || 
      list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.items.some(it => it.text.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchQuery;
  });

  // Global metrics
  const totalLists = shoppingEventLists.length;
  const allItems = shoppingEventLists.flatMap(l => l.items);
  const totalItemsCount = allItems.length;
  const completedItemsCount = allItems.filter(it => it.completed).length;
  const overallProgress = totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0;

  const handleOpenCreateModal = (list?: ShoppingEventList) => {
    if (list) {
      setEditingList(list);
      setFormData({
        title: list.title,
        category: list.category || 'compras_cocina',
        eventDate: list.eventDate || new Date().toISOString().split('T')[0],
        description: list.description || '',
        estimatedBudget: list.estimatedBudget || list.budget || 0,
        initialItemsText: list.items.map(it => `${it.text}${it.quantity ? ` (${it.quantity})` : ''}`).join('\n')
      });
    } else {
      setEditingList(null);
      setFormData({
        title: '',
        category: 'compras_cocina',
        eventDate: new Date().toISOString().split('T')[0],
        description: '',
        estimatedBudget: 0,
        initialItemsText: 'Arroz precocido (5 kg)\nAceite vegetal (2 L)\nFruta de temporada (Plátanos y Manzanas)\nServilletas y cubiertos biodegradables'
      });
    }
    setShowCreateModal(true);
  };

  const handleSaveList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingList) {
      updateShoppingEventList(editingList.id, {
        title: formData.title,
        category: formData.category,
        eventDate: formData.eventDate,
        description: formData.description,
        estimatedBudget: Number(formData.estimatedBudget) || 0
      });
    } else {
      const parsedItems: ChecklistItem[] = formData.initialItemsText
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map((line, idx) => {
          // Extract possible quantity in parenthesis, e.g. "Huevos (2 cajas)"
          const qtyMatch = line.match(/\((.*?)\)/);
          const text = line.replace(/\((.*?)\)/, '').trim();
          const quantity = qtyMatch ? qtyMatch[1] : undefined;
          return {
            id: `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
            text: text || line,
            quantity,
            completed: false
          };
        });

      addShoppingEventList({
        title: formData.title,
        category: formData.category,
        eventDate: formData.eventDate,
        authorName: currentUser.name,
        description: formData.description,
        estimatedBudget: Number(formData.estimatedBudget) || 0,
        items: parsedItems
      });
    }

    setShowCreateModal(false);
  };

  const handleAddQuickItem = (listId: string) => {
    const input = quickInputs[listId];
    if (!input || !input.text.trim()) return;

    addChecklistItem(listId, {
      text: input.text.trim(),
      quantity: input.quantity.trim() || undefined,
      completed: false
    });

    setQuickInputs(prev => ({
      ...prev,
      [listId]: { text: '', quantity: '' }
    }));
  };

  // ----------------------------------------------------------------------------
  // EXPORTAR A PDF CON LOGO, TEMA Y CHECKLIST
  // ----------------------------------------------------------------------------
  const handleExportPDF = (list: ShoppingEventList) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Primary Theme color from system
    const hexColor = currentPalette.primary || '#4f46e5';
    // Convert hex to rgb
    const r = parseInt(hexColor.slice(1, 3), 16) || 79;
    const g = parseInt(hexColor.slice(3, 5), 16) || 70;
    const b = parseInt(hexColor.slice(5, 7), 16) || 229;

    // Header Background Banner
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, 32, 'F');

    // System Title and School Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName.toUpperCase(), 15, 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const catLabel = (list.category || 'compras_cocina').toUpperCase().replace('_', ' ');
    doc.text(`LISTA OFICIAL DE COMPRAS Y EVENTOS - ${catLabel}`, 15, 22);

    doc.setFontSize(8);
    doc.text(`Fecha del Evento/Compra: ${list.eventDate || 'Sin fecha'} | Generado: ${new Date().toLocaleDateString('es-ES')}`, 15, 28);

    // List Metadata Card
    let y = 42;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y, pageWidth - 30, 22, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y, pageWidth - 30, 22, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(list.title, 20, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    if (list.description) {
      doc.text(doc.splitTextToSize(list.description, 160), 20, y + 14);
    } else {
      doc.text(`Responsable: ${list.authorName || currentUser.name} | Total Artículos: ${list.items.length}`, 20, y + 14);
    }

    const completed = list.items.filter(it => it.completed).length;
    const progress = list.items.length > 0 ? Math.round((completed / list.items.length) * 100) : 0;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r, g, b);
    doc.text(`Progreso: ${completed}/${list.items.length} completados (${progress}%)`, pageWidth - 80, y + 8);

    y += 30;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(15, y, pageWidth - 15, y);
    doc.line(15, y + 8, pageWidth - 15, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('ESTADO', 18, y + 5.5);
    doc.text('ARTÍCULO / TAREA', 45, y + 5.5);
    doc.text('CANTIDAD', 140, y + 5.5);

    y += 12;

    // Table Rows
    doc.setFontSize(9);
    list.items.forEach((item, idx) => {
      if (y > pageHeight - 35) {
        doc.addPage();
        y = 20;
      }

      // Zebra background
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y - 4, pageWidth - 30, 7.5, 'F');
      }

      // Checkbox visual
      if (item.completed) {
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.roundedRect(18, y - 3, 4, 4, 0.5, 0.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('v', 19.2, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`[x] ${item.text}`, 45, y);
      } else {
        doc.setDrawColor(148, 163, 184);
        doc.roundedRect(18, y - 3, 4, 4, 0.5, 0.5, 'D');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(`[ ] ${item.text}`, 45, y);
      }

      doc.setTextColor(71, 85, 105);
      doc.text(item.quantity || '-', 140, y);

      y += 7.5;
    });

    // Signature Block at Bottom
    if (y > pageHeight - 40) {
      doc.addPage();
      y = pageHeight - 40;
    } else {
      y = Math.max(y + 15, pageHeight - 35);
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(25, y, 85, y);
    doc.line(pageWidth - 85, y, pageWidth - 25, y);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('FIRMA RESPONSABLE DE COMPRAS / EVENTO', 55, y + 4, { align: 'center' });
    doc.text('FIRMA DIRECCIÓN / REVISIÓN', pageWidth - 55, y + 4, { align: 'center' });

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Sistema Escolar ${schoolName} • Documento de Checklist Oficial • Página ${p} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    }

    doc.save(`Checklist_${list.title.replace(/\s+/g, '_')}_${list.eventDate || 'General'}.pdf`);
  };

  // ----------------------------------------------------------------------------
  // EXPORTAR A IMAGEN JPG CON LOGO, TEMA Y CHECKLIST
  // ----------------------------------------------------------------------------
  const handleExportJPG = async (list: ShoppingEventList) => {
    setExportingId(list.id);
    const element = document.getElementById(`checklist-export-card-${list.id}`);
    if (!element) {
      setExportingId(null);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Checklist_${list.title.replace(/\s+/g, '_')}_${list.eventDate || 'Escolar'}.jpg`;
      link.click();
    } catch (err) {
      console.error('Error al exportar imagen JPG:', err);
    } finally {
      setExportingId(null);
    }
  };

  const getCategoryBadge = (cat?: ShoppingEventList['category']) => {
    switch (cat || 'compras_cocina') {
      case 'compras_cocina':
        return { label: 'Compras de Cocina', icon: ChefHat, bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
      case 'material_didactico':
        return { label: 'Material Didáctico', icon: BookOpen, bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' };
      case 'evento_escolar':
        return { label: 'Evento / Festival', icon: PartyPopper, bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
      case 'mantenimiento':
        return { label: 'Mantenimiento y Limpieza', icon: Wrench, bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
      default:
        return { label: 'General / Varios', icon: Tag, bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="p-2.5 rounded-xl text-white font-bold text-xs shadow-sm flex items-center justify-center"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <CheckSquare className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Listas de Compras y Eventos Escolares
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Crea checklists interactivos, controla insumos de cocina, compras de eventos y exporta en <strong>PDF</strong> o <strong>JPG</strong> con el logo y tema del colegio.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateModal()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md transition self-start sm:self-auto hover:opacity-90 active:scale-95"
          style={{ backgroundColor: currentPalette.primary }}
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Lista / Checklist</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Listas</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">{totalLists}</h4>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Completados</p>
            <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400">{completedItemsCount} / {totalItemsCount}</h4>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Pendientes</p>
            <h4 className="text-xl font-black text-amber-600 dark:text-amber-400">{totalItemsCount - completedItemsCount}</h4>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Progreso Global</p>
            <h4 className="text-xl font-black text-sky-600 dark:text-sky-400">{overallProgress}%</h4>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-bold no-scrollbar">
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'compras_cocina', label: '🍲 Cocina / Comedor' },
            { id: 'material_didactico', label: '🎨 Material Didáctico' },
            { id: 'evento_escolar', label: '🎉 Eventos y Festivales' },
            { id: 'mantenimiento', label: '🧹 Mantenimiento' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                selectedCategory === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar en checklists..."
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
          />
        </div>
      </div>

      {/* List Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredLists.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <h4 className="font-extrabold text-base text-slate-700 dark:text-slate-300">No hay listas de compras o eventos registradas</h4>
            <p className="text-xs mt-1">Crea una nueva lista haciendo clic en el botón de arriba para comenzar a coordinar insumos y tareas.</p>
          </div>
        ) : (
          filteredLists.map(list => {
            const badge = getCategoryBadge(list.category);
            const BadgeIcon = badge.icon;
            const completedCount = list.items.filter(it => it.completed).length;
            const listTotal = list.items.length;
            const progress = listTotal > 0 ? Math.round((completedCount / listTotal) * 100) : 0;
            const quick = quickInputs[list.id] || { text: '', quantity: '' };

            return (
              <div
                key={list.id}
                id={`checklist-export-card-${list.id}`}
                className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Decorative Theme Accent Top Bar for JPG Export */}
                <div
                  className="absolute top-0 left-0 right-0 h-2"
                  style={{ backgroundColor: currentPalette.primary }}
                />

                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${badge.bg}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                      {list.eventDate && (
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> {list.eventDate}
                        </span>
                      )}
                    </div>

                    {/* Action buttons (hidden from final print/screenshot layout if needed, or styled elegantly) */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExportJPG(list)}
                        disabled={exportingId === list.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold text-[11px] transition shadow-sm border border-amber-200/60 dark:border-amber-800"
                        title="Exportar como Imagen JPG con Logo y Tema"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{exportingId === list.id ? 'Generando...' : 'JPG'}</span>
                      </button>

                      <button
                        onClick={() => handleExportPDF(list)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] transition shadow-sm border border-indigo-200/60 dark:border-indigo-800"
                        title="Exportar en Documento PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>

                      <button
                        onClick={() => handleOpenCreateModal(list)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition"
                        title="Editar Información"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteShoppingEventList(list.id)}
                        className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-600 transition"
                        title="Eliminar Lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Institutional Watermark / Identity for Exports */}
                  <div className="mt-2.5 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">
                        {list.title}
                      </h3>
                      {list.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {list.description}
                        </p>
                      )}
                    </div>

                    {/* School Logo Brand Badge */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                      {schoolLogo ? (
                        <img src={schoolLogo} alt="Logo" className="w-5 h-5 object-contain" />
                      ) : (
                        <School className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                        {schoolName}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600 dark:text-slate-400">
                        {completedCount} de {listTotal} elementos listos
                      </span>
                      <span
                        className="font-extrabold"
                        style={{ color: currentPalette.primary }}
                      >
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: progress === 100 ? '#10b981' : currentPalette.primary
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive Checklist Items */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {list.items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No hay elementos en esta lista. Agrega uno abajo.</p>
                  ) : (
                    list.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => toggleChecklistItem(list.id, item.id)}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border transition cursor-pointer select-none ${
                          item.completed
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-slate-500 line-through'
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="text-xs font-semibold truncate">{item.text}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.quantity && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              item.completed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-300'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                              {item.quantity}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChecklistItem(list.id, item.id);
                            }}
                            className="p-1 text-slate-300 hover:text-red-500 transition rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Inline Quick Add Item */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center gap-2">
                  <input
                    type="text"
                    value={quick.text}
                    onChange={e => setQuickInputs(prev => ({
                      ...prev,
                      [list.id]: { ...quick, text: e.target.value }
                    }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddQuickItem(list.id);
                    }}
                    placeholder="Agregar artículo o tarea..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={quick.quantity}
                    onChange={e => setQuickInputs(prev => ({
                      ...prev,
                      [list.id]: { ...quick, quantity: e.target.value }
                    }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddQuickItem(list.id);
                    }}
                    placeholder="Cant. (ej: 2 kg)"
                    className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddQuickItem(list.id)}
                    className="p-2 rounded-xl text-white font-bold transition shadow-sm hover:opacity-90 shrink-0"
                    style={{ backgroundColor: currentPalette.primary }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card Footer Info */}
                <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between font-medium">
                  <span>Creado por: <strong className="text-slate-600 dark:text-slate-300">{list.authorName || currentUser.name}</strong></span>
                  <span>{schoolName}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT CHECKLIST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 my-auto text-xs text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span
                  className="p-2 rounded-xl text-white font-bold"
                  style={{ backgroundColor: currentPalette.primary }}
                >
                  <CheckSquare className="w-4 h-4" />
                </span>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {editingList ? 'Editar Lista / Evento' : 'Nueva Lista de Compras / Evento'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveList} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título de la Lista / Evento:
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Insumos de Despensa para Menú Semanal o Festival de Primavera"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Categoría:
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="compras_cocina">🍲 Compras de Cocina / Comedor</option>
                    <option value="material_didactico">🎨 Material Didáctico</option>
                    <option value="evento_escolar">🎉 Evento Escolar / Festival</option>
                    <option value="mantenimiento">🧹 Mantenimiento y Limpieza</option>
                    <option value="otro">📦 Otro / Varios</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha del Evento o Compra:
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={e => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notas / Descripción (Opcional):
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej: Compras para abastecimiento de 45 comensales de la semana"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {!editingList && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Elementos Iniciales de la Lista (uno por línea):
                    </label>
                    <span className="text-[10px] text-slate-400">Puedes incluir cantidades entre paréntesis</span>
                  </div>
                  <textarea
                    rows={4}
                    value={formData.initialItemsText}
                    onChange={e => setFormData({ ...formData, initialItemsText: e.target.value })}
                    placeholder="Ejemplo:&#10;Pechuga de pollo (4 kg)&#10;Zanahorias y papas (3 kg)&#10;Aceite vegetal (2 L)&#10;Vasos biodegradables (100 pzas)"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-extrabold text-white shadow-md transition hover:opacity-90"
                  style={{ backgroundColor: currentPalette.primary }}
                >
                  {editingList ? 'Guardar Cambios' : 'Crear Lista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
