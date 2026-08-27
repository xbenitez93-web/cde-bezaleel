// ============================================================================
// COMPONENTE VISUAL: TOAST DE NOTIFICACIONES PUSH EN PANTALLA (ESPAÑOL)
// ============================================================================
// Este componente escucha las notificaciones generadas por cualquier cambio
// en la base de datos o en la aplicación y muestra una tarjeta flotante elegante
// con icono temático, título, descripción y botón para cerrarla o verla.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { pushNotificationService, AppNotification } from '../services/notificationService';
import { 
  Bell, 
  CheckCircle2, 
  UserPlus, 
  ChefHat, 
  BookOpen, 
  AlertTriangle, 
  RefreshCw, 
  X 
} from 'lucide-react';

export const InAppNotificationToast: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  // Lista de notificaciones visibles activas en la esquina
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);

  useEffect(() => {
    // Suscribirse a nuevas notificaciones en tiempo real
    const unsubscribe = pushNotificationService.onNewNotification((notif) => {
      if (!notif || !notif.id) return;

      setActiveToasts((prev) => [notif, ...prev.filter((t) => t.id !== notif.id)].slice(0, 4));

      // Auto-remover la notificación después de 6 segundos
      setTimeout(() => {
        setActiveToasts((current) => current.filter((t) => t.id !== notif.id));
      }, 6000);
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (activeToasts.length === 0) return null;

  // Icono y color según la categoría del cambio en la base de datos
  const getCategoryDetails = (cat: AppNotification['category']) => {
    switch (cat) {
      case 'attendance':
        return { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-800' };
      case 'student':
        return { icon: UserPlus, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/80 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-800' };
      case 'menu':
        return { icon: ChefHat, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-800' };
      case 'lessonPlan':
        return { icon: BookOpen, color: 'text-purple-600 bg-purple-100 dark:bg-purple-950/80 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-800' };
      case 'alert':
        return { icon: AlertTriangle, color: 'text-rose-600 bg-rose-100 dark:bg-rose-950/80 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-800' };
      case 'sync':
        return { icon: RefreshCw, color: 'text-sky-600 bg-sky-100 dark:bg-sky-950/80 dark:text-sky-400', border: 'border-sky-300 dark:border-sky-800' };
      default:
        return { icon: Bell, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-400', border: 'border-indigo-300 dark:border-indigo-800' };
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2 no-print">
      {activeToasts.map((toast, index) => {
        const details = getCategoryDetails(toast.category);
        const IconComponent = details.icon;

        return (
          <div
            key={`${toast.id}-${index}`}
            className={`pointer-events-auto bg-white dark:bg-slate-900 border ${details.border} shadow-2xl rounded-2xl p-3 flex items-start gap-3 transition-all duration-300 transform translate-y-0 animate-fadeIn`}
          >
            {/* Icono temático */}
            <div className={`p-2 rounded-xl shrink-0 ${details.color}`}>
              <IconComponent className="w-5 h-5" />
            </div>

            {/* Texto y detalles */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {toast.title}
                </h4>
                <button
                  onClick={() => handleDismiss(toast.id)}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight mt-0.5 line-clamp-2">
                {toast.body}
              </p>

              <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-400">
                <span>Notificación en vivo</span>
                <span>{new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
