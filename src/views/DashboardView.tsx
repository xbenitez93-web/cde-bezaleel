import React from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getDeduplicatedAttendance, getLocalDateString } from '../utils/attendanceUtils';
import {
  Users,
  UserCheck,
  ChefHat,
  GraduationCap,
  Calendar,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  Utensils,
  CheckCircle2,
  PieChart,
  UserX
} from 'lucide-react';

interface DashboardViewProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const { currentUser, students, sections, teachers, attendance, menuItems, alerts } = useApp();
  const { currentPalette } = useTheme();

  const role = currentUser.role;

  // Active Students
  const activeStudents = students.filter(s => s.active);
  const totalStudents = activeStudents.length;
  const activeStudentIds = new Set(activeStudents.map(s => s.id));

  // Today's Local Date
  const todayStr = getLocalDateString();
  const allDeduplicatedAttendance = getDeduplicatedAttendance(attendance);
  // STRICT: Only count attendance for students who actually exist and are currently active
  const todayAttendance = allDeduplicatedAttendance.filter(a => a.date === todayStr && activeStudentIds.has(a.studentId));
  const hasAttendanceToday = todayAttendance.length > 0;

  const presentCount = todayAttendance.filter(a => a.status === 'presente').length;
  const lateCount = todayAttendance.filter(a => a.status === 'retardo').length;
  const absentCount = todayAttendance.filter(a => a.status === 'ausente').length;
  const justifiedCount = todayAttendance.filter(a => a.status === 'justificado').length;

  // Comensales efectivos: Niños presentes físicamente (Presentes + Retardos), capped at active enrollment
  const rawComensales = presentCount + lateCount;
  const realComensalesToday = hasAttendanceToday ? Math.min(rawComensales, totalStudents) : 0;
  const attendanceRate = totalStudents > 0 && hasAttendanceToday
    ? Math.min(100, Math.round((presentCount / totalStudents) * 100))
    : 0;

  // Breakdown by section with live attendance stats
  const sectionBreakdown = sections.map(sec => {
    const secStudents = activeStudents.filter(s => s.sectionId === sec.id);
    const secStudentIds = new Set(secStudents.map(s => s.id));
    const secTodayAtt = todayAttendance.filter(a => secStudentIds.has(a.studentId));
    const secPresentCount = secTodayAtt.filter(a => a.status === 'presente').length;
    const secLateCount = secTodayAtt.filter(a => a.status === 'retardo').length;
    const secAbsentCount = secTodayAtt.filter(a => a.status === 'ausente').length;
    const secHasAttendance = secTodayAtt.length > 0;

    return {
      sectionId: sec.id,
      name: sec.name,
      ageGroup: sec.ageGroup,
      count: secStudents.length,
      capacity: sec.capacity,
      hasAttendance: secHasAttendance,
      presentToday: secPresentCount,
      lateToday: secLateCount,
      absentToday: secAbsentCount,
      comensales: secHasAttendance ? (secPresentCount + secLateCount) : 0
    };
  });

  // Current Day Name in Spanish
  const daysMap: Record<number, 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes'> = {
    1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes'
  };
  const currentDayIndex = new Date().getDay();
  const todayName = daysMap[currentDayIndex] || 'Lunes';
  const todayMenuItems = menuItems.filter(m => m.dayOfWeek === todayName);

  return (
    <div className="space-y-6">
      
      {/* Role Banner Greeting */}
      <div
        className="p-6 rounded-2xl text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{ backgroundColor: currentPalette.primary }}
      >
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
              Panel Principal • Rol: {role.toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ¡Bienvenido, {currentUser.name}!
          </h2>
          <p className="text-xs sm:text-sm opacity-90 max-w-xl">
            {role === 'admin' && 'Métricas generales en tiempo real, gestión de secciones, personal y supervisión.'}
            {role === 'maestro' && 'Gestión de asistencia de grupo, planificación de clases con IA y agenda escolar.'}
            {role === 'cocinera' && 'Conteo exacto y en vivo de comensales para cálculo de porciones y menú diario.'}
          </p>
        </div>

        <div className="relative z-10 flex gap-2">
          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('reports')}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition shadow-sm flex items-center gap-1.5"
            >
              <span>Ver Reportes</span> <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {role === 'maestro' && (
            <button
              onClick={() => setActiveTab('teachers')}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> <span>Planificar con IA</span>
            </button>
          )}
          {role === 'cocinera' && (
            <button
              onClick={() => setActiveTab('kitchen')}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition shadow-sm flex items-center gap-1.5"
            >
              <Utensils className="w-3.5 h-3.5 text-amber-600" /> <span>Ver Menú Cocina</span>
            </button>
          )}
        </div>
      </div>

      {/* ROL COCINERA - EXACT ATTENDANCE & COMENSALES METRICS */}
      {role === 'cocinera' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Children Enrolled */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Matrícula Activa</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{totalStudents}</h3>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Total inscritos</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Users className="w-7 h-7" />
              </div>
            </div>

            {/* Attendance Present Today Card - EXACT COUNT */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Niños Presentes Hoy</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {hasAttendanceToday ? presentCount : 0}
                </h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  {hasAttendanceToday
                    ? `${lateCount > 0 ? `+ ${lateCount} con retardo` : 'Confirmados en aula'}`
                    : 'Sin pase de lista hoy'}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <UserCheck className="w-7 h-7" />
              </div>
            </div>

            {/* Real Portions to Cook Card (Presentes + Retardos) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Porciones a Preparar</p>
                <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {realComensalesToday}
                </h3>
                <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                  {hasAttendanceToday
                    ? `${absentCount} ausente${absentCount !== 1 ? 's' : ''}${justifiedCount > 0 ? `, ${justifiedCount} justif.` : ''}`
                    : `0 de ${totalStudents} comensales`}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                <ChefHat className="w-7 h-7" />
              </div>
            </div>

            {/* Total Sections Count */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Grados / Secciones</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{sections.length}</h3>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">Aulas escolares</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                <PieChart className="w-7 h-7" />
              </div>
            </div>

          </div>

          {/* Breakdown By Grade/Section with Real-time attendance */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-amber-600" />
                  Desglose de Comensales por Grado y Sección ({todayStr})
                </h3>
                <p className="text-xs text-slate-500">
                  {hasAttendanceToday
                    ? `Pase de lista al día: ${presentCount} presentes, ${lateCount} retardos, ${absentCount} ausentes.`
                    : 'Aún no se ha registrado lista el día de hoy.'}
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 self-start sm:self-auto">
                Total a Cocinar: {realComensalesToday} raciones
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectionBreakdown.map(sec => (
                <div
                  key={sec.sectionId}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{sec.name}</h4>
                      <p className="text-xs text-slate-500">{sec.ageGroup}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {sec.comensales}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">porciones</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between text-slate-500">
                    <span>Inscritos: <strong className="text-slate-800 dark:text-slate-200">{sec.count}</strong></span>
                    {sec.hasAttendance ? (
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span className="text-emerald-600 font-bold">{sec.presentToday} pres.</span>
                        {sec.lateToday > 0 && <span className="text-amber-500 font-bold">{sec.lateToday} ret.</span>}
                        <span className="text-rose-600 font-bold">{sec.absentToday} aus.</span>
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">Sin pase de lista</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today Menu Preview for Cook */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-500" />
                Menú Programado para Hoy ({todayName})
              </h3>
              <button
                onClick={() => setActiveTab('kitchen')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Gestionar Menú
              </button>
            </div>

            {todayMenuItems.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No hay platillos registrados para el día de hoy en el sistema.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {todayMenuItems.map(m => (
                  <div key={m.id} className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                      {m.mealType}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-2">{m.dishName}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{m.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ROL ADMIN / MAESTRO - FULL DASHBOARD METRICS */
        <div className="space-y-6">
          
          {/* Main KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Estudiantes Activos</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{totalStudents}</h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> 100% matriculados
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Asistencia de Hoy</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{attendanceRate}%</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {hasAttendanceToday ? `${presentCount} de ${totalStudents} presentes` : 'Sin lista registrada hoy'}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Secciones / Profesores</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{sections.length} / {teachers.length}</h3>
                <p className="text-[11px] text-indigo-600 font-medium mt-0.5">Aulas operativas</p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Alertas Activas</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{alerts.length}</h3>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">Avisos escolares</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* Section Summary + Recent Alerts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sections List */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Resumen por Grados y Secciones
                </h3>
                {role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('admin_management')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Gestionar Grupos
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {sectionBreakdown.map(sec => (
                  <div
                    key={sec.sectionId}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{sec.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                          {sec.ageGroup}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Capacidad: {sec.capacity} alumnos | {sec.hasAttendance ? `${sec.presentToday} presentes hoy` : 'Sin lista registrada hoy'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-lg font-black text-slate-900 dark:text-white">{sec.count}</span>
                        <span className="text-xs text-slate-400 block font-medium">Inscritos</span>
                      </div>

                      {role === 'maestro' && (
                        <button
                          onClick={() => setActiveTab('teachers')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition"
                          style={{ backgroundColor: currentPalette.primary }}
                        >
                          Asistencia
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* School Alerts Sidebar */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Avisos Recientes
                </h3>
                <button
                  onClick={() => setActiveTab('agenda')}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Ver Todo
                </button>
              </div>

              <div className="space-y-3">
                {alerts.slice(0, 3).map(alt => (
                  <div key={alt.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        alt.category === 'urgente' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {alt.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{alt.date}</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1">{alt.title}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{alt.description}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

