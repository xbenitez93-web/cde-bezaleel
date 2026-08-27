import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AlertItem } from '../types';
import { ShoppingEventChecklists } from '../components/ShoppingEventChecklists';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  Megaphone,
  Calendar,
  Users,
  Printer,
  Download,
  FileSpreadsheet,
  CheckSquare,
  Sparkles
} from 'lucide-react';

export const AgendaView: React.FC = () => {
  const { alerts, addAlert, updateAlert, deleteAlert, currentUser, schoolName } = useApp();
  const { currentPalette } = useTheme();

  const [activeTab, setActiveTab] = useState<'alerts' | 'checklists'>('alerts');
  const [filterCategory, setFilterCategory] = useState<string>('todas');

  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertItem | null>(null);

  const [formData, setFormData] = useState<Omit<AlertItem, 'id'>>({
    title: '',
    description: '',
    category: 'general',
    date: new Date().toISOString().split('T')[0],
    targetRole: 'todos',
    authorName: currentUser.name
  });

  const filteredAlerts = filterCategory === 'todas'
    ? alerts
    : alerts.filter(a => a.category === filterCategory);

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${schoolName.toUpperCase()} - COMUNICADOS Y AGENDA`, 15, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-ES')} | Total Avisos: ${filteredAlerts.length}`, 15, 22);

    let y = 38;
    filteredAlerts.forEach((alt, idx) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, y - 4, pageWidth - 30, 20, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y - 4, pageWidth - 30, 20, 2, 2, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${alt.title} [${alt.category.toUpperCase()}]`, 18, y + 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const splitDesc = doc.splitTextToSize(alt.description, 170);
      doc.text(splitDesc, 18, y + 8);

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Fecha: ${alt.date} | Dirigido a: ${alt.targetRole || 'Todos'} | Publicó: ${alt.authorName}`, 18, y + 14);

      y += 24;
    });

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Documento de Comunicados - ${schoolName} - Página ${p} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    doc.save(`Comunicados_Escolares_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (_) {}
    handleExportPDF();
  };

  const handleOpenModal = (alt?: AlertItem) => {
    if (alt) {
      setEditingAlert(alt);
      setFormData({
        title: alt.title,
        description: alt.description,
        category: alt.category,
        date: alt.date,
        targetRole: alt.targetRole || 'todos',
        authorName: alt.authorName
      });
    } else {
      setEditingAlert(null);
      setFormData({
        title: '',
        description: '',
        category: 'general',
        date: new Date().toISOString().split('T')[0],
        targetRole: 'todos',
        authorName: currentUser.name
      });
    }
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingAlert) {
      updateAlert(editingAlert.id, formData);
    } else {
      addAlert(formData);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Primary Sub-navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 w-fit">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'alerts'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-amber-500" />
          <span>Comunicados y Avisos</span>
        </button>

        <button
          onClick={() => setActiveTab('checklists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'checklists'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-indigo-500" />
          <span>Listas de Compras y Eventos (Checklist)</span>
        </button>
      </div>

      {activeTab === 'checklists' ? (
        <ShoppingEventChecklists />
      ) : (
        <>
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs">
                  <Bell className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Agenda Escolar y Comunicados
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Avisos importantes, reuniones de padres, suspensiones y fechas clave del calendario
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
                title="Imprimir Agenda / Comunicados"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition"
                title="Exportar en PDF"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar PDF</span>
              </button>

              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition self-start sm:self-auto"
                style={{ backgroundColor: currentPalette.primary }}
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Aviso</span>
              </button>
            </div>
          </div>

      {/* Category Filter Pills */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto no-scrollbar text-xs font-semibold">
        {[
          { id: 'todas', label: 'Todos los Avisos' },
          { id: 'urgente', label: '⚠ Urgentes' },
          { id: 'general', label: '📢 General' },
          { id: 'evento', label: '🎉 Eventos' },
          { id: 'reunion', label: '👨‍👩‍👧 Reuniones' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              filterCategory === cat.id
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs italic">No hay comunicados registrados en esta categoría.</p>
          </div>
        ) : (
          filteredAlerts.map(alt => (
            <div
              key={alt.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 relative"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    alt.category === 'urgente'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      : alt.category === 'evento'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {alt.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {alt.date}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenModal(alt)} className="p-1 text-slate-400 hover:text-indigo-600">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteAlert(alt.id)} className="p-1 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                {alt.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {alt.description}
              </p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Publicado por: <strong className="text-slate-700 dark:text-slate-300">{alt.authorName}</strong></span>
                <span>Dirigido a: <strong className="uppercase text-slate-700 dark:text-slate-300">{alt.targetRole}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingAlert ? 'Editar Comunicado' : 'Nuevo Comunicado / Evento'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Título del Aviso:</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Junta de Padres de Familia - Sección Maternal"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría:</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="general">General</option>
                    <option value="urgente">Urgente</option>
                    <option value="evento">Evento</option>
                    <option value="reunion">Reunión</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha:</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descripción / Mensaje:</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Escribe el cuerpo del aviso..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
                <button type="button" onClick={() => setShowModal(false)} className="px-3.5 py-2 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl font-bold text-white shadow-md" style={{ backgroundColor: currentPalette.primary }}>
                  Guardar Aviso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}

    </div>
  );
};
