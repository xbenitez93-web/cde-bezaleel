// ============================================================================
// COMPONENTE: BARRA SUPERIOR DE ENCABEZADO (HEADER - ESPAÑOL)
// ============================================================================
// Este componente administra:
// 1. Título e identidad del colegio con logotipos dinámicos.
// 2. Centro de Notificaciones Push y Alertas en tiempo real (con historial y pruebas).
// 3. Indicador de conectividad dual (Nube Firestore / Malla P2P / Modo Offline).
// 4. Selector de diseño de interfaz (Móvil, Dashboard lateral, Clásico).
// 5. Conmutador de modo claro / oscuro.
// 6. Cambio rápido y seguro de perfiles de usuario con verificación de contraseña.
// 7. Configuración de malla P2P entre dispositivos.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole, UserProfile } from '../types';
import { p2pEngine } from '../services/p2pSyncService';
import { pushNotificationService, AppNotification } from '../services/notificationService';
import {
  School,
  Shield,
  UserCheck,
  ChefHat,
  Wifi,
  WifiOff,
  Radio,
  Sun,
  Moon,
  HelpCircle,
  Palette,
  ChevronDown,
  Layers,
  LogOut,
  Smartphone,
  Copy,
  Check,
  CheckCheck,
  CheckCircle2,
  X,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  AlertTriangle,
  Bell,
  Volume2,
  VolumeX,
  Sparkles,
  Trash2,
  Database,
  BookOpen,
  UserPlus,
  RefreshCw,
  Clock,
  Filter
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  // Consumo del estado global del colegio
  const { 
    currentUser, 
    allUsers, 
    login, 
    logout, 
    connectivity, 
    toggleP2P, 
    toggleCloudSync, 
    setShowOnboarding, 
    schoolName, 
    schoolLogo 
  } = useApp();

  // Consumo del tema y diseño visual
  const { mode, toggleMode, layoutStyle, setLayoutStyle, currentPalette } = useTheme();
  
  // Estados para controlar los menús desplegables
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showConnDropdown, setShowConnDropdown] = useState(false);
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Estados de Notificaciones Push y Alertas
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pushGranted, setPushGranted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifFilter, setNotifFilter] = useState<'all' | 'attendance' | 'menu' | 'student' | 'system'>('all');

  // Cargar estado de notificaciones
  useEffect(() => {
    setNotifications(pushNotificationService.getHistory());
    setPushGranted(pushNotificationService.isPermissionGranted());
    setAudioEnabled(pushNotificationService.getAudioEnabled());
    setPushEnabled(pushNotificationService.getPushEnabled());

    const unsubscribe = pushNotificationService.onHistoryChange((updatedHistory) => {
      setNotifications(updatedHistory);
    });

    return () => unsubscribe();
  }, []);

  // Mensaje de estado al presionar permitir push
  const [pushStatusMessage, setPushStatusMessage] = useState<string>('');

  // Activar Notificaciones Push nativas en el navegador
  const handleRequestPushPermission = async () => {
    const result = await pushNotificationService.requestPermission();
    setPushGranted(result.granted);
    if (result.granted) {
      setPushStatusMessage('¡Notificaciones Push activadas con éxito!');
      pushNotificationService.notify(
        '🔔 Notificaciones Push Activadas',
        'Recibirás alertas instantáneas cuando ocurran cambios en la base de datos.',
        'system'
      );
    } else {
      setPushStatusMessage(result.reason || 'Permiso no otorgado por el navegador.');
    }
    setTimeout(() => setPushStatusMessage(''), 6000);
  };

  // Marcar notificación individual como leída y navegar si aplica
  const handleNotificationClick = (notif: AppNotification) => {
    pushNotificationService.markAsRead(notif.id);
    setNotifications(pushNotificationService.getHistory());
    if (notif.actionUrl) {
      if (notif.actionUrl.startsWith('#')) {
        window.location.hash = notif.actionUrl;
      }
    }
  };

  // Disparar una notificación de prueba
  const handleTestNotification = () => {
    pushNotificationService.notify(
      '✨ Notificación de Prueba',
      'El sistema de notificaciones push en tiempo real está funcionando correctamente.',
      'system'
    );
  };

  // Alternar sonido de alertas
  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    pushNotificationService.setAudioEnabled(next);
    if (next) pushNotificationService.playChimeSound();
  };

  // Estados del modal de cambio de usuario con contraseña
  const [userToSwitch, setUserToSwitch] = useState<UserProfile | null>(null);
  const [switchPassword, setSwitchPassword] = useState('');
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);
  const [switchError, setSwitchError] = useState('');

  // Estados del modal de vinculación P2P
  const [showP2PModal, setShowP2PModal] = useState(false);
  const [roomInput, setRoomInput] = useState('cde-bezaleel-mesh');
  const [targetPeerInput, setTargetPeerInput] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [p2pPingStatus, setP2pPingStatus] = useState('');

  // Manejar selección de usuario para cambio de rol
  const handleSelectUserToSwitch = (user: UserProfile) => {
    if (user.id === currentUser.id) {
      setShowRoleDropdown(false);
      return;
    }
    setUserToSwitch(user);
    setSwitchPassword('');
    setSwitchError('');
    setShowRoleDropdown(false);
  };

  // Confirmar cambio de usuario verificando contraseña
  const handleConfirmSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToSwitch) return;

    if (!switchPassword.trim()) {
      setSwitchError('Por favor ingresa la contraseña.');
      return;
    }

    const res = login(userToSwitch.username || userToSwitch.email || userToSwitch.id, switchPassword);
    if (res.success) {
      setUserToSwitch(null);
      setSwitchPassword('');
      setSwitchError('');
    } else {
      setSwitchError('Contraseña incorrecta. Inténtalo de nuevo.');
    }
  };

  // Badge y colores según el rol
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador', icon: Shield, bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
      case 'maestro':
        return { label: 'Maestro / Docente', icon: UserCheck, bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' };
      case 'cocinera':
        return { label: 'Área de Cocina', icon: ChefHat, bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
    }
  };

  const currentRoleBadge = getRoleBadge(currentUser.role);
  const RoleIcon = currentRoleBadge.icon;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm transition-colors duration-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Título Principal con Logotipo Dinámico del Colegio */}
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl text-white shadow-md flex items-center justify-center overflow-hidden transition-transform hover:scale-105 shrink-0"
              style={{ backgroundColor: currentPalette.primary }}
            >
              {schoolLogo ? (
                <img src={schoolLogo} alt="Logo Institucional" className="w-full h-full object-contain p-0.5 bg-white dark:bg-slate-900" />
              ) : (
                <School className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {schoolName}
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  v2.2 Notificaciones Push
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Plataforma Escolar de Asistencia y Planificación con IA
              </p>
            </div>
          </div>

          {/* Barra de Acciones y Controles Superiores */}
          <div className="flex flex-wrap items-center gap-2 justify-end pt-1 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            
            {/* 1. Centro de Notificaciones Push en Tiempo Real (Optimizado para Android & Móviles) */}
            <div className="relative">
              <button
                id="btn-notificaciones-header"
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                }}
                className="relative p-2 sm:p-2.5 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center cursor-pointer"
                title="Centro de Notificaciones y Cambios en el Sistema"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                {unreadCount > 0 && (
                  <span
                    id="badge-notif-oneui"
                    className="absolute -top-1.5 -right-2 px-1.5 py-0.5 min-w-[21px] h-[19px] bg-gradient-to-r from-[#FF3B30] via-[#FF5500] to-[#FF6B00] text-white rounded-full text-[11px] font-black tracking-tight flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900 animate-pulse"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Backdrop oscuro para dispositivos móviles y Android para evitar clics accidentales */}
              {showNotifDropdown && (
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:hidden"
                  onClick={() => setShowNotifDropdown(false)}
                />
              )}

              {/* Panel Desplegable del Centro de Notificaciones (Centrado y 100% visible en Android) */}
              {showNotifDropdown && (
                <div 
                  id="panel-notificaciones-live"
                  className="fixed inset-x-2 sm:inset-x-auto top-14 sm:top-auto sm:absolute sm:right-0 sm:mt-2 w-auto sm:w-[440px] max-w-lg bg-white dark:bg-slate-900 rounded-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 z-50 text-xs text-slate-800 dark:text-slate-200 space-y-3 max-h-[85vh] flex flex-col"
                >
                  {/* Encabezado del Panel */}
                  <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                          <span>Notificaciones del Sistema</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-[10px] font-black">
                            {notifications.length}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Cambios en Base de Datos, Asistencia y Cocina
                        </p>
                      </div>
                    </div>
                    
                    {/* Botones de acción rápida */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleToggleAudio}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                        title={audioEnabled ? 'Sonido Activado' : 'Sonido Silenciado'}
                      >
                        {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                      </button>
                      <button
                        onClick={() => {
                          pushNotificationService.clearHistory();
                          setNotifications([]);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition"
                        title="Limpiar Historial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowNotifDropdown(false)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition ml-1"
                        title="Cerrar Notificaciones"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Filtros de Categoría para Encontrar Cambios Rápidamente */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0">
                    {[
                      { id: 'all', label: 'Todas', icon: Bell },
                      { id: 'attendance', label: 'Asistencia', icon: CheckCircle2 },
                      { id: 'menu', label: 'Cocina', icon: ChefHat },
                      { id: 'student', label: 'Alumnos', icon: UserPlus },
                      { id: 'system', label: 'Base / Sistema', icon: Database }
                    ].map((f) => {
                      const FilterIcon = f.icon;
                      const active = notifFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setNotifFilter(f.id as any)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0 ${
                            active
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <FilterIcon className="w-3 h-3" />
                          <span>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Banner de Estado de Permisos Push del Navegador */}
                  {!pushGranted ? (
                    <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 space-y-2 shrink-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-tight">
                          Activa alertas Push para recibir cambios cuando tengas la app minimizada.
                        </div>
                        <button
                          onClick={handleRequestPushPermission}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-[10px] shrink-0 transition shadow-sm cursor-pointer"
                        >
                          Permitir Push
                        </button>
                      </div>
                      {pushStatusMessage && (
                        <div className="text-[10px] font-semibold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-900/60 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800">
                          {pushStatusMessage}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Notificaciones Push nativas activas en este dispositivo
                      </span>
                      <button
                        onClick={handleTestNotification}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Probar
                      </button>
                    </div>
                  )}

                  {/* Lista de Historial de Cambios en la Base de Datos */}
                  <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-[140px] max-h-[50vh]">
                    {(() => {
                      const seenIds = new Set<string>();
                      const filteredList = notifications
                        .filter(notif => {
                          if (!notif || !notif.id) return false;
                          if (seenIds.has(notif.id)) return false;
                          seenIds.add(notif.id);
                          if (notifFilter === 'all') return true;
                          if (notifFilter === 'attendance') return notif.category === 'attendance';
                          if (notifFilter === 'menu') return notif.category === 'menu';
                          if (notifFilter === 'student') return notif.category === 'student';
                          if (notifFilter === 'system') return notif.category === 'system' || notif.category === 'sync' || notif.category === 'alert' || notif.category === 'lessonPlan';
                          return true;
                        });

                      if (filteredList.length === 0) {
                        return (
                          <div className="py-8 text-center text-slate-400 space-y-1">
                            <Bell className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                            <div className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                              No hay notificaciones en esta categoría
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Los cambios en asistencias, comedor o base de datos aparecerán aquí en vivo.
                            </div>
                          </div>
                        );
                      }

                      return filteredList.map((notif, index) => {
                        // Color y etiqueta según categoría
                        const getCategoryBadge = (cat: string) => {
                          switch (cat) {
                            case 'attendance':
                              return { label: 'Asistencia', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
                            case 'menu':
                              return { label: 'Cocina / Menú', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
                            case 'student':
                              return { label: 'Alumnos', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
                            case 'lessonPlan':
                              return { label: 'Planificación', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
                            case 'alert':
                              return { label: 'Aviso Escolar', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
                            case 'sync':
                              return { label: 'Sincronización', bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800' };
                            default:
                              return { label: 'Sistema', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
                          }
                        };
                        const catBadge = getCategoryBadge(notif.category);

                        return (
                          <div
                            key={`${notif.id}-${index}`}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 rounded-2xl border text-[11px] space-y-1.5 transition shadow-xs cursor-pointer select-none active:scale-[0.99] ${
                              !notif.read
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100/90 dark:hover:bg-indigo-900/70'
                                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-75 hover:opacity-100'
                            }`}
                            title={!notif.read ? 'Toca para marcar como leída y descontar del contador' : 'Notificación leída'}
                          >
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                {!notif.read && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0 animate-ping" />
                                )}
                                <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                                  {notif.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${catBadge.bg}`}>
                                  {catBadge.label}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {notif.read ? (
                                  <Check className="w-3 h-3 text-slate-400" title="Leída" />
                                ) : (
                                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.2 rounded">
                                    Nueva
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-snug">
                              {notif.body}
                            </p>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Pie del Panel con Botón de Marcar como Leídas */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                    <button
                      onClick={() => {
                        pushNotificationService.markAllAsRead();
                        setNotifications(pushNotificationService.getHistory());
                      }}
                      className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Marcar todas como leídas
                    </button>
                    <span>{unreadCount > 0 ? `${unreadCount} pendientes` : 'Todas leídas'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Menú de Estado de Conectividad Híbrida (Firestore + P2P) */}
            <div className="relative">
              <button
                onClick={() => setShowConnDropdown(!showConnDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="Estado de Conexión Híbrida"
              >
                {connectivity.firebaseConnected ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="hidden lg:inline">
                  {connectivity.firebaseConnected ? 'Nube Firestore' : 'Modo Offline'}
                </span>
                {connectivity.p2pActive && (
                  <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 pl-1 border-l border-slate-300 dark:border-slate-700">
                    <Radio className="w-3 h-3 animate-pulse text-sky-500" />
                    <span className="text-[10px]">P2P ({connectivity.connectedPeers})</span>
                  </span>
                )}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showConnDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-50 text-xs text-slate-700 dark:text-slate-200 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white border-b pb-1.5 dark:border-slate-700">
                    Sistemas de Conectividad Híbrida
                  </div>
                  
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-900/50">
                    <div>
                      <div className="font-medium">Nube Firebase (Asistencias)</div>
                      <div className="text-[10px] text-slate-500">Sincronización en tiempo real</div>
                    </div>
                    <button
                      onClick={toggleCloudSync}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        connectivity.firebaseConnected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {connectivity.firebaseConnected ? 'Activa' : 'Pausada'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-900/50">
                    <div>
                      <div className="font-medium">Red Local Proximidad (P2P)</div>
                      <div className="text-[10px] text-slate-500">Malla Directa entre Dispositivos</div>
                    </div>
                    <button
                      onClick={toggleP2P}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        connectivity.p2pActive
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {connectivity.p2pActive ? 'Malla Activa' : 'Inactiva'}
                    </button>
                  </div>

                  <button
                    onClick={() => { setShowConnDropdown(false); setShowP2PModal(true); }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold text-[11px] hover:bg-sky-100 dark:hover:bg-sky-900 transition"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Configurar / Vincular Dispositivos P2P</span>
                  </button>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                    Última sincronización: <span className="font-semibold text-slate-700 dark:text-slate-300">{connectivity.lastSyncTime}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Selector de Estilo de Interfaz / Layout */}
            <div className="relative">
              <button
                onClick={() => setShowLayoutDropdown(!showLayoutDropdown)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="Diseño UI / Estilo de Interfaz"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline capitalize">Estilo: {layoutStyle}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showLayoutDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 text-xs text-slate-700 dark:text-slate-200 space-y-1">
                  <div className="px-2 py-1 font-bold text-slate-900 dark:text-white border-b dark:border-slate-700">
                    Selector de Diseño UI
                  </div>
                  <button
                    onClick={() => { setLayoutStyle('mobile'); setShowLayoutDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                      layoutStyle === 'mobile' ? 'bg-indigo-50 dark:bg-indigo-950/60 font-bold text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    📱 App Móvil Nativa (Barra Flotante)
                  </button>
                  <button
                    onClick={() => { setLayoutStyle('dashboard'); setShowLayoutDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                      layoutStyle === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-950/60 font-bold text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    📊 Dashboard Estudio (Panel Lateral)
                  </button>
                  <button
                    onClick={() => { setLayoutStyle('classic'); setShowLayoutDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                      layoutStyle === 'classic' ? 'bg-indigo-50 dark:bg-indigo-950/60 font-bold text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    🏫 Portal Escolar Clásico (Pestañas Superior)
                  </button>
                </div>
              )}
            </div>

            {/* 4. Acceso Rápido a Personalización Institucional (Admin) */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('customization')}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Ir a Personalización / Temas (Solo Admin)"
              >
                <Palette className="w-4 h-4 text-purple-500" />
              </button>
            )}

            {/* 5. Alternador de Modo Claro / Oscuro */}
            <button
              onClick={toggleMode}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={mode === 'light' ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
            >
              {mode === 'light' ? (
                <Moon className="w-4 h-4 text-indigo-600" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* 6. Botón de Guía Interactiva / Ayuda */}
            <button
              onClick={() => setShowOnboarding(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
              title="Guía Interactiva"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Guía / Ayuda</span>
            </button>

            {/* 7. Selector de Perfil y Cambio de Usuario */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium text-xs border border-transparent shadow-xs transition ${currentRoleBadge.bg}`}
              >
                <RoleIcon className="w-3.5 h-3.5" />
                <div className="text-left">
                  <div className="font-bold leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] opacity-80">{currentRoleBadge.label}</div>
                </div>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-50 text-xs space-y-1">
                  <div className="px-3 py-2 border-b dark:border-slate-700">
                    <p className="font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-500">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      Usuario Actual ({currentUser.role})
                    </span>
                  </div>

                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Cambiar de Usuario Registrado:
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {allUsers.map(user => {
                      const isCurrent = user.id === currentUser.id;
                      const badge = getRoleBadge(user.role);
                      const BadgeIcon = badge.icon;
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUserToSwitch(user)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                            isCurrent
                              ? 'bg-slate-100 dark:bg-slate-700/80 font-bold border border-slate-200 dark:border-slate-600'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 shrink-0 overflow-hidden">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                <BadgeIcon className="w-4 h-4 text-indigo-500" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-slate-900 dark:text-white truncate text-[11px]">{user.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{user.username || user.email}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t dark:border-slate-700">
                    <button
                      onClick={() => { setShowRoleDropdown(false); logout(); }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 font-bold transition text-xs"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* MODAL: CONFIGURACIÓN P2P LOCAL ENTRE DISPOSITIVOS */}
      {showP2PModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[85vh] overflow-y-auto my-auto p-5 sm:p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10 pt-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold shrink-0">
                  <Radio className="w-5 h-5 animate-pulse text-sky-500" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                    Sincronización P2P Directa entre Dispositivos
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Transmisión directa de datos sin requerir servidor o internet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowP2PModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">ID de Nodo de este Dispositivo:</span>
                <span className="font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono">
                  {connectivity.p2pActive ? (p2pEngine.getPeerId() || 'Inicializando...') : 'Red P2P Inactiva'}
                </span>
              </div>

              {p2pEngine.getPeerId() && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={p2pEngine.getPeerId()}
                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(p2pEngine.getPeerId());
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold shrink-0 flex items-center gap-1 hover:bg-indigo-100 transition"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedId ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-500">Dispositivos P2P Conectados:</span>
                <strong className="text-sky-600 dark:text-sky-400 font-black text-sm">
                  {connectivity.connectedPeers} dispositivos en malla
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-slate-900 dark:text-white">
                Código de Canal / Aula para Malla P2P Local:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value)}
                  placeholder="Ej: cde-bezaleel-mesh o AULA-101"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
                <button
                  onClick={() => {
                    const room = roomInput.trim() || 'cde-bezaleel-mesh';
                    p2pEngine.init(room, undefined, undefined, currentUser.role);
                    p2pEngine.requestFullSync();
                    setP2pPingStatus(`✓ Unido a la malla: ${room}. Sincronizando datos...`);
                    setTimeout(() => setP2pPingStatus(''), 4000);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 text-white font-bold shrink-0 hover:bg-sky-700 transition flex items-center gap-1.5"
                >
                  <Radio className="w-4 h-4" />
                  <span>Unirse a Malla</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Los dispositivos en la misma red Wi-Fi o Hotspot con el mismo código de canal se sincronizan automáticamente sin requerir internet.
              </p>
            </div>

            {/* Lista de Dispositivos Locales Detectados */}
            {p2pEngine.getLocalPeers().length > 0 && (
              <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-sky-900 dark:text-sky-200">
                  <span>Dispositivos Detectados en Red Local ({p2pEngine.getLocalPeers().length}):</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Red Local Activa
                  </span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {p2pEngine.getLocalPeers().map((peer) => (
                    <div key={peer.nodeId} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-sky-500" />
                        <div>
                          <strong className="text-slate-900 dark:text-white block">{peer.deviceName}</strong>
                          <span className="text-[9px] text-slate-500 font-mono">{peer.nodeId}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          p2pEngine.connectToPeer(peer.nodeId);
                          setP2pPingStatus(`Vinculando con ${peer.deviceName}...`);
                          setTimeout(() => setP2pPingStatus(''), 3000);
                        }}
                        className="px-2 py-1 rounded-lg bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold text-[10px] hover:bg-sky-200 transition"
                      >
                        Conectar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t dark:border-slate-800">
              <label className="block font-bold text-slate-900 dark:text-white">
                Conectar Directamente a un Dispositivo Específico:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={targetPeerInput}
                  onChange={e => setTargetPeerInput(e.target.value)}
                  placeholder="Pegar ID de Nodo de la otra tablet/teléfono"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                />
                <button
                  onClick={() => {
                    if (targetPeerInput.trim()) {
                      p2pEngine.connectToPeer(targetPeerInput.trim());
                      setP2pPingStatus(`Solicitud P2P enviada a ${targetPeerInput}`);
                      setTargetPeerInput('');
                      setTimeout(() => setP2pPingStatus(''), 3000);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold shrink-0 hover:bg-purple-700 transition"
                >
                  Vincular P2P
                </button>
              </div>
            </div>

            {p2pPingStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] text-center border border-emerald-200 dark:border-emerald-800">
                {p2pPingStatus}
              </div>
            )}

            {/* Guía rápida de conexión */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-200 block font-bold">
                📱 Guía Rápida para Conectar Múltiples Dispositivos:
              </strong>
              <p>
                <strong>Método 1 (Automático):</strong> En todos los dispositivos (celular, tablet o PC), abre esta ventana y coloca el <em>mismo Código de Canal</em> (ej: <code>AULA-PREESCOLAR</code>) y haz clic en <strong>Unirse a Malla</strong>.
              </p>
              <p>
                <strong>Método 2 (Directo):</strong> Copia el <em>ID de Nodo</em> de un dispositivo, pégalo en el campo <em>Conectar Directamente</em> del otro dispositivo y presiona <strong>Vincular P2P</strong>.
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Funciona tanto en la misma red Wi-Fi local como a través de Internet sin necesidad de configurar puertos.
              </p>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t dark:border-slate-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    p2pEngine.requestFullSync();
                    setP2pPingStatus('Solicitud de Sincronización Total enviada a la malla.');
                    setTimeout(() => setP2pPingStatus(''), 3000);
                  }}
                  className="px-3 py-2 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-200 transition text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sincronizar Todo</span>
                </button>

                <button
                  onClick={() => {
                    p2pEngine.broadcast({ type: 'PING' });
                    setP2pPingStatus('Señal de prueba enviada a todos los dispositivos en malla.');
                    setTimeout(() => setP2pPingStatus(''), 3000);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition text-xs"
                >
                  📡 Ping
                </button>
              </div>

              <button
                onClick={() => setShowP2PModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 transition text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: VERIFICACIÓN DE CONTRASEÑA PARA CAMBIO DE USUARIO */}
      {userToSwitch && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full my-auto p-6 space-y-5 text-xs text-slate-800 dark:text-slate-200">
            
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold shrink-0">
                  <Lock className="w-5 h-5 text-indigo-600" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                    Confirmar Contraseña
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Acceso para cambio de usuario
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setUserToSwitch(null); setSwitchPassword(''); setSwitchError(''); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white font-black flex items-center justify-center overflow-hidden shrink-0 shadow-sm text-sm">
                {userToSwitch.avatar ? (
                  <img src={userToSwitch.avatar} alt={userToSwitch.name} className="w-full h-full object-cover" />
                ) : (
                  userToSwitch.name.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-slate-900 dark:text-white truncate">{userToSwitch.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{userToSwitch.email}</p>
                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Rol: {userToSwitch.role}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmSwitch} className="space-y-4">
              {switchError && (
                <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="font-bold text-xs">{switchError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Contraseña de {userToSwitch.name.split(' ')[0]}:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showSwitchPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={switchPassword}
                    onChange={e => setSwitchPassword(e.target.value)}
                    placeholder="Ingresa la contraseña"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showSwitchPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setUserToSwitch(null); setSwitchPassword(''); setSwitchError(''); }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md transition flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Ingresar</span>
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
