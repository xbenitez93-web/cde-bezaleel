// ============================================================================
// SERVICIO DE NOTIFICACIONES PUSH Y ALERTAS EN TIEMPO REAL (ESPAÑOL)
// ============================================================================
// Este módulo administra:
// 1. Notificaciones Push nativas del navegador (Web Notifications API).
// 2. Alertas visuales y sonoras con Web Audio API (sin dependencias externas).
// 3. Cola de notificaciones en tiempo real cuando ocurren cambios en la app o base de datos.
// ============================================================================

// Tipo de datos para las notificaciones internas
export interface AppNotification {
  id: string;                      // Identificador único de la notificación
  title: string;                   // Título principal (ej: "Asistencia Registrada")
  body: string;                    // Mensaje descriptivo con los detalles del cambio
  category: 'attendance' | 'student' | 'menu' | 'alert' | 'lessonPlan' | 'sync' | 'system'; // Categoría del cambio
  timestamp: number;               // Hora en milisegundos cuando se produjo
  read: boolean;                   // Estado de lectura para el centro de avisos
  actionUrl?: string;              // Enlace o pestaña a abrir opcionalmente
}

// Clase singleton para gestionar las notificaciones Push
class NotificationService {
  private permissionGranted: boolean = false;
  private isAudioEnabled: boolean = true;
  private isPushEnabled: boolean = true;
  private newListeners: ((notification: AppNotification) => void)[] = [];
  private historyListeners: ((history: AppNotification[]) => void)[] = [];
  private notificationsHistory: AppNotification[] = [];

  constructor() {
    // 1. Cargar preferencias guardadas en el almacenamiento local (localStorage)
    const storedPush = localStorage.getItem('schoolsync_push_enabled');
    this.isPushEnabled = storedPush !== null ? storedPush === 'true' : true;

    const storedAudio = localStorage.getItem('schoolsync_audio_enabled');
    this.isAudioEnabled = storedAudio !== null ? storedAudio === 'true' : true;

    // 2. Comprobar si el navegador soporta Notificaciones y si ya fueron aprobadas
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permissionGranted = Notification.permission === 'granted';
    }

    // 3. Cargar historial previo de notificaciones locales (eliminando posibles duplicados)
    try {
      const history = localStorage.getItem('schoolsync_notifications_history');
      if (history) {
        const parsed = JSON.parse(history);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          this.notificationsHistory = parsed.filter((item: AppNotification) => {
            if (!item || !item.id || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          }).slice(0, 50);
        }
      }
    } catch (_) {
      this.notificationsHistory = [];
    }
  }

  // Solicitar permiso al usuario para mostrar Notificaciones Push en su navegador/dispositivo
  public async requestPermission(): Promise<{ granted: boolean; status: string; reason?: string }> {
    if (typeof window === 'undefined') {
      return { granted: false, status: 'unsupported', reason: 'Entorno no compatible.' };
    }

    if (!('Notification' in window)) {
      console.warn('Este navegador o entorno no soporta la API nativa de notificaciones.');
      return { 
        granted: false, 
        status: 'unsupported', 
        reason: 'Tu navegador o entorno embebido no soporta notificaciones de sistema. Las notificaciones internas dentro de la app seguirán activas.' 
      };
    }

    try {
      // Si ya está concedido
      if (Notification.permission === 'granted') {
        this.permissionGranted = true;
        return { granted: true, status: 'granted' };
      }

      // Si está bloqueado/denegado por el usuario o navegador
      if (Notification.permission === 'denied') {
        this.permissionGranted = false;
        return { 
          granted: false, 
          status: 'denied', 
          reason: 'El permiso fue denegado previamente en la configuración de tu navegador. Puedes desbloquearlo haciendo clic en el ícono de candado junto a la URL.' 
        };
      }

      // Solicitar permiso interactivo
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return { 
        granted: this.permissionGranted, 
        status: permission,
        reason: permission === 'granted' ? undefined : 'No se concedió el permiso de notificaciones.'
      };
    } catch (error: any) {
      console.error('Error solicitando permisos de notificación:', error);
      // Puede fallar si está en un iframe sin permisos delegados
      return { 
        granted: false, 
        status: 'error', 
        reason: error?.message || 'No se pudo abrir el cuadro de diálogo de permisos. Abre la aplicación en una pestaña nueva para otorgar permisos nativos.' 
      };
    }
  }

  // Activar o desactivar notificaciones push
  public setPushEnabled(enabled: boolean) {
    this.isPushEnabled = enabled;
    localStorage.setItem('schoolsync_push_enabled', String(enabled));
    if (enabled && !this.permissionGranted) {
      this.requestPermission();
    }
  }

  // Activar o desactivar sonido de aviso
  public setAudioEnabled(enabled: boolean) {
    this.isAudioEnabled = enabled;
    localStorage.setItem('schoolsync_audio_enabled', String(enabled));
  }

  public getPushEnabled(): boolean {
    return this.isPushEnabled;
  }

  public getAudioEnabled(): boolean {
    return this.isAudioEnabled;
  }

  public isPermissionGranted(): boolean {
    return this.permissionGranted;
  }

  // Reproducir un suave sonido tipo "ding/campanita" usando Web Audio API puro
  public playChimeSound() {
    if (!this.isAudioEnabled || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Oscilador 1: Tono agudo primario
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // Nota La (A5)
      osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // Nota Mi (E6)

      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Cierre del contexto de audio tras finalizar
      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close();
      }, 500);
    } catch (_) {
      // Ignorar restricciones de autoplay si el usuario aún no ha interactuado
    }
  }

  // Disparar una Notificación Push para cualquier cambio en la base de datos o aplicación
  public notify(title: string, body: string, category: AppNotification['category'] = 'system', actionUrl?: string) {
    const uniqueSuffix = `${Math.random().toString(36).substring(2, 9)}-${Math.floor(Math.random() * 100000)}`;
    const notification: AppNotification = {
      id: `notif-${Date.now()}-${uniqueSuffix}`,
      title,
      body,
      category,
      timestamp: Date.now(),
      read: false,
      actionUrl
    };

    // 1. Guardar en el historial local evitando cualquier duplicado
    this.notificationsHistory = [notification, ...this.notificationsHistory.filter(n => n.id !== notification.id)].slice(0, 50);
    try {
      localStorage.setItem('schoolsync_notifications_history', JSON.stringify(this.notificationsHistory));
    } catch (_) {}

    // 2. Avisar a los componentes de NUEVA notificación (para toasts flotantes)
    this.newListeners.forEach(callback => {
      try {
        callback(notification);
      } catch (err) {
        console.error('Error en listener de nueva notificación:', err);
      }
    });

    // 3. Avisar a los componentes de actualización de historial (para el header y contadores)
    this.notifyHistoryListeners();

    // 4. Reproducir sonido suave
    this.playChimeSound();

    // 5. Enviar notificación nativa Push al sistema operativo / navegador si está permitido
    if (this.isPushEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const nativeNotif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: category,
          badge: '/favicon.ico',
          silent: !this.isAudioEnabled
        });

        nativeNotif.onclick = () => {
          window.focus();
          if (actionUrl && window.location.hash !== actionUrl) {
            window.location.hash = actionUrl;
          }
          nativeNotif.close();
        };
      } catch (e) {
        console.warn('No se pudo enviar notificación nativa push:', e);
      }
    }
  }

  // Suscribirse a NUEVAS notificaciones generadas en tiempo real (para Toasts)
  public onNewNotification(callback: (notification: AppNotification) => void): () => void {
    this.newListeners.push(callback);
    return () => {
      this.newListeners = this.newListeners.filter(cb => cb !== callback);
    };
  }

  // Suscribirse a cambios en el historial completo (para Header / Contadores)
  public onHistoryChange(callback: (history: AppNotification[]) => void): () => void {
    this.historyListeners.push(callback);
    return () => {
      this.historyListeners = this.historyListeners.filter(cb => cb !== callback);
    };
  }

  // Compatibilidad hacia atrás
  public subscribe(callback: (notification: AppNotification) => void): () => void {
    return this.onNewNotification(callback);
  }

  // Obtener el historial completo de notificaciones (copia inmutable)
  public getHistory(): AppNotification[] {
    return this.notificationsHistory.map(n => ({ ...n }));
  }

  // Marcar una notificación individual como leída
  public markAsRead(id: string) {
    let changed = false;
    this.notificationsHistory = this.notificationsHistory.map(n => {
      if (n.id === id && !n.read) {
        changed = true;
        return { ...n, read: true };
      }
      return n;
    });

    if (changed) {
      try {
        localStorage.setItem('schoolsync_notifications_history', JSON.stringify(this.notificationsHistory));
      } catch (_) {}
      this.notifyHistoryListeners();
    }
  }

  // Notificar a los componentes de cambios en el historial
  private notifyHistoryListeners() {
    const freshHistory = this.getHistory();
    this.historyListeners.forEach(callback => {
      try {
        callback(freshHistory);
      } catch (_) {}
    });
  }

  // Marcar todas como leídas
  public markAllAsRead() {
    this.notificationsHistory = this.notificationsHistory.map(n => ({ ...n, read: true }));
    try {
      localStorage.setItem('schoolsync_notifications_history', JSON.stringify(this.notificationsHistory));
    } catch (_) {}
    this.notifyHistoryListeners();
  }

  // Limpiar historial
  public clearHistory() {
    this.notificationsHistory = [];
    try {
      localStorage.removeItem('schoolsync_notifications_history');
    } catch (_) {}
    this.notifyHistoryListeners();
  }
}

// Instancia única exportada para toda la aplicación
export const pushNotificationService = new NotificationService();
