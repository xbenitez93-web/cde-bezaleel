import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sparkles,
  Shield,
  UserCheck,
  ChefHat,
  Palette,
  Layers,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Utensils,
  Wifi
} from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { currentUser, showOnboarding, setShowOnboarding } = useApp();
  const { layoutStyle, setLayoutStyle, setPaletteId, paletteId, currentPalette } = useTheme();

  const [step, setStep] = useState(1);

  if (!showOnboarding) return null;

  const role = currentUser.role;

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else setShowOnboarding(false);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Top Header */}
        <div
          className="p-5 text-white flex items-center justify-between"
          style={{ backgroundColor: currentPalette.primary }}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 animate-spin-slow" />
            <div>
              <h2 className="font-extrabold text-lg leading-tight">
                Bienvenido a CDE Bezaleel
              </h2>
              <p className="text-xs opacity-90">
                Guía de Usuario según tu Rol: <span className="font-bold underline capitalize">{role}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOnboarding(false)}
            className="p-1 rounded-lg hover:bg-white/20 transition text-white"
            title="Cerrar Guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Steps */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-700 dark:text-slate-300 text-sm">
          
          {step === 1 && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center gap-3">
                {role === 'admin' && <Shield className="w-8 h-8 text-indigo-600 shrink-0" />}
                {role === 'maestro' && <UserCheck className="w-8 h-8 text-blue-600 shrink-0" />}
                {role === 'cocinera' && <ChefHat className="w-8 h-8 text-amber-600 shrink-0" />}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Hola, {currentUser.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Has iniciado sesión con el rol de <strong className="capitalize">{role}</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Módulos habilitados para ti:
                </p>

                {role === 'admin' && (
                  <ul className="space-y-1.5 text-xs">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Control total de métricas y resumen escolar.</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Creación y gestión de Secciones, Profesores y Estudiantes.</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Supervisión de asistencias, planificaciones y menús de cocina.</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Exportación de Reportes a PDF y Excel con filtros por fecha.</li>
                  </ul>
                )}

                {role === 'maestro' && (
                  <ul className="space-y-1.5 text-xs">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Registro directo de asistencia de alumnos por sección.</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Generador de Planeaciones Didácticas asistidas por la IA Gemini.</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Vista e impresión de planes de clase exportables.</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Consulta y registro de avisos en la Agenda Escolar.</li>
                  </ul>
                )}

                {role === 'cocinera' && (
                  <ul className="space-y-1.5 text-xs">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Inicio simplificado: Conteo total de niños y desglose por grado (ej. Sección A: 20, Sección B: 15).</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Creación y organización de menús de Desayuno, Almuerzo y Merienda.</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sugerencias nutricionales infantiles generadas por IA Gemini.</li>
                  </ul>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>3 Diseños UI Dinámicos</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                CDE Bezaleel te permite cambiar la estructura completa de la interfaz en tiempo real según tu preferencia o dispositivo:
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => setLayoutStyle('mobile')}
                  className={`p-2.5 rounded-xl border text-center transition text-xs ${
                    layoutStyle === 'mobile'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-base mb-1">📱</div>
                  App Móvil
                  <div className="text-[10px] opacity-70 font-normal">Barra flotante</div>
                </button>

                <button
                  onClick={() => setLayoutStyle('dashboard')}
                  className={`p-2.5 rounded-xl border text-center transition text-xs ${
                    layoutStyle === 'dashboard'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-base mb-1">📊</div>
                  Studio
                  <div className="text-[10px] opacity-70 font-normal">Panel lateral</div>
                </button>

                <button
                  onClick={() => setLayoutStyle('classic')}
                  className={`p-2.5 rounded-xl border text-center transition text-xs ${
                    layoutStyle === 'classic'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-base mb-1">🏫</div>
                  Portal
                  <div className="text-[10px] opacity-70 font-normal">Pestañas arriba</div>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Palette className="w-5 h-5 text-purple-500" />
                <span>ThemeManager y 10 Paletas de Colores</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Puedes personalizar fondos, encabezados y botones con 10 paletas temáticas y alternar en cualquier momento entre Modo Día y Noche.
              </p>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-semibold">Probar rápida paleta:</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'school_blue', name: 'Azul Escolar', bg: 'bg-blue-600' },
                    { id: 'emerald_edu', name: 'Esmeralda', bg: 'bg-emerald-600' },
                    { id: 'sunset_amber', name: 'Ámbar', bg: 'bg-amber-600' },
                    { id: 'soft_violet', name: 'Violeta', bg: 'bg-purple-600' },
                    { id: 'pastel_kinder', name: 'Maternal', bg: 'bg-orange-600' }
                  ].map(pal => (
                    <button
                      key={pal.id}
                      onClick={() => setPaletteId(pal.id as any)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white font-medium shadow-xs ${pal.bg} ${
                        paletteId === pal.id ? 'ring-2 ring-slate-900 dark:ring-white scale-105' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span>{pal.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Wifi className="w-5 h-5 text-emerald-500" />
                <span>Asistente IA Gemini &amp; Conectividad Híbrida</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Planificador con IA:</strong> Genera planeaciones didácticas completas (Objetivo, Desarrollo, Cierre e Impresión/Exportación PDF).
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                  <Utensils className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Sugeridor de Menú:</strong> Recomienda opciones equilibradas de desayuno, almuerzo y merienda considerando alergias.
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-start gap-2">
                  <Wifi className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Conexión Doble:</strong> Funciona con la nube Firebase (Asistencias) y con Red Local Proximidad (P2P Mesh &lt;10m) sin internet.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-all ${
                  s === step ? 'w-5 bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Anterior
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1"
              style={{ backgroundColor: currentPalette.primary }}
            >
              {step === 4 ? 'Comenzar a Usar' : 'Siguiente'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
