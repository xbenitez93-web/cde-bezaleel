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
  Users
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser } = useApp();
  const { currentPalette } = useTheme();

  const role = currentUser.role;

  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, roles: ['admin', 'maestro', 'cocinera'] },
    { id: 'teachers', label: 'Maestros', icon: GraduationCap, roles: ['admin', 'maestro'] },
    { id: 'kitchen', label: 'Cocina', icon: Utensils, roles: ['admin', 'cocinera'] },
    { id: 'admin_management', label: 'Configuración', icon: Users, roles: ['admin'] },
    { id: 'agenda', label: 'Agenda', icon: Bell, roles: ['admin', 'maestro'] },
    { id: 'reports', label: 'Reportes', icon: FileSpreadsheet, roles: ['admin'] },
    { id: 'customization', label: 'Temas', icon: Palette, roles: ['admin'] }
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(role));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-2xl">
      <nav className="flex justify-around items-center max-w-lg mx-auto">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-white font-bold scale-105 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              style={{
                backgroundColor: isActive ? currentPalette.primary : undefined
              }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 leading-none font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
