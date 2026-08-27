import React from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  GraduationCap,
  Utensils,
  Bell,
  FileSpreadsheet,
  Palette,
  Users,
  ChevronRight
} from 'lucide-react';

interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser } = useApp();
  const { currentPalette, layoutStyle } = useTheme();

  const role = currentUser.role;

  // Filter accessible tabs by role
  const navItems = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: LayoutDashboard,
      roles: ['admin', 'maestro', 'cocinera'],
      badge: role === 'cocinera' ? 'Métricas Niños' : 'Métricas General'
    },
    {
      id: 'teachers',
      label: 'Área de Maestros',
      icon: GraduationCap,
      roles: ['admin', 'maestro'],
      subLabel: 'Asistencia y Planificador IA'
    },
    {
      id: 'kitchen',
      label: 'Área de Cocina',
      icon: Utensils,
      roles: ['admin', 'cocinera'],
      subLabel: 'Menú semanal con IA'
    },
    {
      id: 'admin_management',
      label: 'Configuración y Usuarios',
      icon: Users,
      roles: ['admin'],
      subLabel: 'Usuarios, Roles y Secciones'
    },
    {
      id: 'agenda',
      label: 'Agenda y Alertas',
      icon: Bell,
      roles: ['admin', 'maestro'],
      subLabel: 'Eventos y Comunicados'
    },
    {
      id: 'reports',
      label: 'Reportes y Exportación',
      icon: FileSpreadsheet,
      roles: ['admin'],
      subLabel: 'Filtros, PDF y Excel'
    },
    {
      id: 'customization',
      label: 'Personalización',
      icon: Palette,
      roles: ['admin'],
      subLabel: 'Temas, Colores e Identidad'
    }
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(role));

  // If classic layout style, render horizontal top tab strip
  if (layoutStyle === 'classic') {
    return (
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs px-4 sm:px-6">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 no-scrollbar">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                style={{
                  backgroundColor: isActive ? currentPalette.primary : undefined
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Dashboard / Sidebar layout (Optimized vertical panel so it doesn't waste height)
  return (
    <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between transition-all">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Módulos de Control ({role.toUpperCase()})
        </div>

        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left group ${
                isActive
                  ? 'text-white shadow-md font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
              style={{
                backgroundColor: isActive ? currentPalette.primary : undefined
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`} />
                <div className="truncate">
                  <div className="truncate leading-tight">{item.label}</div>
                  {item.subLabel && !isActive && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">
                      {item.subLabel}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 opacity-60 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            </button>
          );
        })}
      </div>

      {/* Role Notice Card */}
      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between mb-1">
          <span>Vista de Rol</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 uppercase font-semibold">
            {role}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed">
          {role === 'admin' && 'Acceso total a métricas completas, usuarios, asistencia y reportes.'}
          {role === 'maestro' && 'Gestión de asistencia de grupo y generador de clases con IA.'}
          {role === 'cocinera' && 'Gestión del menú semanal de comida con IA e indicadores de alumnos.'}
        </p>
      </div>
    </aside>
  );
};
