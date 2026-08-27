// ============================================================================
// VISTA: PERSONALIZACIÓN DE TEMA E IDENTIDAD INSTITUCIONAL (ESPAÑOL)
// ============================================================================
// Este archivo permite al Administrador:
// 1. Configurar el nombre y logotipo institucional de la escuela (con persistencia).
// 2. Elegir la estructura y distribución visual (Móvil, Dashboard lateral, Clásico).
// 3. Activar y personalizar las 11 paletas de colores oficiales de la escuela al 100%.
// 4. Guardar la paleta activa a nivel institucional o asignarla a su perfil de usuario.
// 5. Visualizar una maqueta en vivo con botones, tarjetas, pestañas y acentos de color.
// ============================================================================

import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { ColorPaletteId } from '../types';
import {
  Palette,
  Sun,
  Moon,
  Layers,
  CheckCircle2,
  Sparkles,
  School,
  Upload,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Eye,
  CheckCircle,
  Sliders,
  UserCheck,
  Shield
} from 'lucide-react';

export const CustomizationView: React.FC = () => {
  const {
    paletteId,
    setPaletteId,
    currentPalette,
    colorPalettes,
    mode,
    toggleMode,
    layoutStyle,
    setLayoutStyle
  } = useTheme();

  const {
    schoolName,
    setSchoolName,
    schoolLogo,
    setSchoolLogo,
    currentUser,
    updateUser
  } = useApp();

  const [tempName, setTempName] = useState(schoolName);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('¡Cambios guardados con éxito!');
  const [tempLogoUrl, setTempLogoUrl] = useState('');

  // Solo administradores pueden gestionar la identidad y temas institucionales
  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
          <Palette className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Personalización Reservada para el Administrador
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          La personalización del nombre de la escuela, el logo institucional, las paletas de colores y los temas visuales solo pueden ser configurados por el <strong>Administrador Principal</strong>.
        </p>
        <div className="pt-2 text-[11px] font-semibold text-slate-400">
          Tu rol actual: <span className="uppercase font-bold text-slate-700 dark:text-slate-300">{currentUser.role}</span>
        </div>
      </div>
    );
  }

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    setSchoolName(tempName.trim());
    triggerSuccess('¡Nombre de la escuela actualizado!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSchoolLogo(reader.result);
          triggerSuccess('¡Logotipo institucional guardado!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlLogoSave = () => {
    if (tempLogoUrl.trim()) {
      setSchoolLogo(tempLogoUrl.trim());
      setTempLogoUrl('');
      triggerSuccess('¡Logotipo institucional guardado desde URL!');
    }
  };

  const handleResetLogo = () => {
    setSchoolLogo('');
    triggerSuccess('Logotipo restablecido al icono predeterminado.');
  };

  // Guardar paleta seleccionada como la predeterminada institucional
  const handleSaveGlobalPalette = () => {
    localStorage.setItem('schoolsync_palette_id', paletteId);
    triggerSuccess(`¡Paleta "${currentPalette.name.split(' (')[0]}" guardada como el tema institucional predeterminado!`);
  };

  // Asignar paleta seleccionada al perfil del usuario actual
  const handleSaveToUserProfile = () => {
    updateUser(currentUser.id, { themePalette: paletteId as ColorPaletteId });
    triggerSuccess(`¡Paleta "${currentPalette.name.split(' (')[0]}" asignada a tu perfil de usuario!`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="p-2 rounded-xl text-white font-bold text-xs shadow-md transition-colors"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <Palette className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Personalización de Tema e Identidad Institucional
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personaliza el nombre y logo oficial de la escuela, activa paletas de colores al 100%, y personaliza el diseño UI.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleMode}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 transition"
          >
            {mode === 'light' ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span>Modo: {mode === 'light' ? 'Claro' : 'Oscuro'}</span>
          </button>
        </div>
      </div>

      {/* Alerta flotante de confirmación */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200 font-bold shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-extrabold">Sincronizado</span>
        </div>
      )}

      {/* 1. SCHOOL IDENTITY SETTINGS (NAME AND LOGO) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="border-b pb-3 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <School className="w-5 h-5 text-amber-500" />
              1. Identidad Institucional de la Escuela (Nombre y Logo)
            </h3>
            <p className="text-xs text-slate-500">
              Estos datos se guardan en la base de datos y se actualizan en tiempo real en encabezados, reportes y PDFs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* School Name Form */}
          <form onSubmit={handleSaveName} className="space-y-3">
            <label className="block font-bold text-xs text-slate-700 dark:text-slate-300">
              Nombre Oficial de la Escuela o Institución:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                placeholder="Ej. Centro Escolar San Miguel"
                className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-xs text-slate-900 dark:text-white focus:ring-2"
                style={{ outlineColor: currentPalette.primary }}
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition hover:opacity-90 shrink-0"
                style={{ backgroundColor: currentPalette.primary }}
              >
                Guardar Nombre
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nombre actual guardado: <strong className="text-slate-800 dark:text-slate-200">{schoolName}</strong>
            </p>
          </form>

          {/* School Logo Upload & Preview */}
          <div className="space-y-3">
            <label className="block font-bold text-xs text-slate-700 dark:text-slate-300">
              Logo Personalizado de la Escuela:
            </label>
            
            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="Logo Escuela" className="w-full h-full object-contain p-1" />
                ) : (
                  <School className="w-8 h-8 text-amber-500" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-sm"
                    style={{ backgroundColor: currentPalette.primary }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Imagen</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  {schoolLogo && (
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Restablecer</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-1.5 items-center">
                  <input
                    type="url"
                    value={tempLogoUrl}
                    onChange={e => setTempLogoUrl(e.target.value)}
                    placeholder="O pega URL de imagen (https://...)"
                    className="flex-1 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleUrlLogoSave}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-[11px] font-bold"
                  >
                    Usar URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. COLOR PALETTES SELECTION (11 OFFICIAL SCHOOL PALETTES - 100% FUNCTIONAL) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div className="border-b pb-4 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: currentPalette.primary }} />
              2. Paletas de Colores Institucionales de la Escuela (100% Funcionales)
            </h3>
            <p className="text-xs text-slate-500">
              Haz clic en cualquier paleta para activarla instantáneamente en toda la aplicación.
            </p>
          </div>

          {/* Botones de acción para guardar paleta */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSaveToUserProfile}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition"
              title="Guardar esta paleta solo para mi usuario"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Guardar en Mi Perfil</span>
            </button>

            <button
              type="button"
              onClick={handleSaveGlobalPalette}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition hover:opacity-90"
              style={{ backgroundColor: currentPalette.primary }}
              title="Establecer como paleta por defecto para toda la escuela"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Guardar como Paleta Institucional</span>
            </button>
          </div>
        </div>

        {/* Paletas Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {colorPalettes.map(pal => {
            const isSelected = paletteId === pal.id;

            return (
              <button
                key={pal.id}
                onClick={() => setPaletteId(pal.id as ColorPaletteId)}
                className={`p-4 rounded-2xl border text-left transition-all relative space-y-3 ${
                  isSelected
                    ? 'border-2 shadow-lg ring-2 ring-offset-2 scale-[1.02] bg-white dark:bg-slate-800/90'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
                style={{
                  borderColor: isSelected ? pal.primary : undefined,
                  outlineColor: isSelected ? pal.primary : undefined
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                      {pal.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {pal.description}
                    </p>
                  </div>
                  {isSelected && (
                    <span
                      className="w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: pal.primary }}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* Muestras de Color (Primario, Secundario, Acento) */}
                <div className="space-y-1.5">
                  <div className="flex h-5 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                    <div className="flex-1" style={{ backgroundColor: pal.primary }} title={`Primario: ${pal.primary}`} />
                    <div className="flex-1" style={{ backgroundColor: pal.secondary || pal.accent }} title={`Secundario: ${pal.secondary || pal.accent}`} />
                    <div className="flex-1" style={{ backgroundColor: pal.accent }} title={`Acento: ${pal.accent}`} />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
                    <span>{pal.primary}</span>
                    <span>{pal.secondary || pal.accent}</span>
                    <span>{pal.accent}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 2.1 Live Theme Preview Showcase */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Eye className="w-4 h-4" style={{ color: currentPalette.primary }} />
              <span>Vista Previa en Vivo de Componentes con el Tema: <strong>{currentPalette.name}</strong></span>
            </h4>
            <span
              className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full text-white shadow-xs"
              style={{ backgroundColor: currentPalette.primary }}
            >
              Paleta Activa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Sample Button Preview */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Botones Principales</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-md"
                  style={{ backgroundColor: currentPalette.primary }}
                >
                  Guardar Datos
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border"
                  style={{ borderColor: currentPalette.primary, color: currentPalette.primary }}
                >
                  Secundario
                </button>
              </div>
            </div>

            {/* Sample Badge & Highlight Preview */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Insignias y Acentos</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ backgroundColor: currentPalette.badgeBg, color: currentPalette.primary }}
                >
                  Maternal A
                </span>
                <span
                  className="w-3 h-3 rounded-full animate-ping"
                  style={{ backgroundColor: currentPalette.accent }}
                />
                <span className="text-xs font-bold" style={{ color: currentPalette.accent }}>
                  Activo Hoy
                </span>
              </div>
            </div>

            {/* Sample Header & Stat Card */}
            <div
              className="p-3 rounded-xl text-white space-y-1 shadow-sm"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <span className="text-[10px] font-bold text-white/80 uppercase">Estadística Resumen</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-black">100% Asistencia</span>
                <Sparkles className="w-5 h-5 text-white/80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LAYOUT STYLE SELECTION */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="border-b pb-3 dark:border-slate-700">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5" style={{ color: currentPalette.primary }} />
            3. Selecciona la Estructura UI de la Aplicación
          </h3>
          <p className="text-xs text-slate-500">Cambia la navegación y distribución completa del sitio en tiempo real</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <button
            onClick={() => setLayoutStyle('mobile')}
            className={`p-5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
              layoutStyle === 'mobile'
                ? 'border-2 shadow-md bg-white dark:bg-slate-800'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
            style={{
              borderColor: layoutStyle === 'mobile' ? currentPalette.primary : undefined
            }}
          >
            <div>
              <div className="text-2xl mb-2">📱</div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Estilo App Móvil Nativa</h4>
              <p className="text-xs text-slate-500 mt-1">Barra de navegación flotante inferior con diseño táctil compacto.</p>
            </div>
            {layoutStyle === 'mobile' && (
              <CheckCircle2 className="w-5 h-5 absolute top-4 right-4" style={{ color: currentPalette.primary }} />
            )}
          </button>

          <button
            onClick={() => setLayoutStyle('dashboard')}
            className={`p-5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
              layoutStyle === 'dashboard'
                ? 'border-2 shadow-md bg-white dark:bg-slate-800'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
            style={{
              borderColor: layoutStyle === 'dashboard' ? currentPalette.primary : undefined
            }}
          >
            <div>
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Estilo Studio Dashboard</h4>
              <p className="text-xs text-slate-500 mt-1">Panel lateral vertical optimizado para escritorio y tabletas.</p>
            </div>
            {layoutStyle === 'dashboard' && (
              <CheckCircle2 className="w-5 h-5 absolute top-4 right-4" style={{ color: currentPalette.primary }} />
            )}
          </button>

          <button
            onClick={() => setLayoutStyle('classic')}
            className={`p-5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
              layoutStyle === 'classic'
                ? 'border-2 shadow-md bg-white dark:bg-slate-800'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
            style={{
              borderColor: layoutStyle === 'classic' ? currentPalette.primary : undefined
            }}
          >
            <div>
              <div className="text-2xl mb-2">🏫</div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Portal Escolar Clásico</h4>
              <p className="text-xs text-slate-500 mt-1">Tiras de pestañas superiores con navegación institucional tradicional.</p>
            </div>
            {layoutStyle === 'classic' && (
              <CheckCircle2 className="w-5 h-5 absolute top-4 right-4" style={{ color: currentPalette.primary }} />
            )}
          </button>

        </div>
      </div>

    </div>
  );
};
