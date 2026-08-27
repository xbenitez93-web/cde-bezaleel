// ============================================================================
// CONTEXTO GLOBAL DE LA APLICACIÓN ESCOLAR (APP CONTEXT - ESPAÑOL)
// ============================================================================
// Este archivo es el núcleo central del estado global. Administra:
// 1. Sesión y autenticación de usuarios (Administrador, Maestros, Cocina).
// 2. Colecciones de la escuela: Alumnos, Docentes, Secciones, Asistencias, Menú, Alertas, Planes de Clase.
// 3. Motor de sincronización dual: Firestore Cloud + Red P2P Local + Caché IndexedDB/LocalStorage.
// 4. Notificaciones Push y Alertas en tiempo real ante cualquier cambio en los datos.
// 5. Personalización institucional: Nombre del colegio y logotipos.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  UserRole,
  Student,
  Section,
  Teacher,
  AttendanceRecord,
  LessonPlan,
  MenuItem,
  EventAlert,
  ConnectivityState,
  AttendanceStatus,
  ShoppingEventList,
  ChecklistItem,
  AttendanceSignaturesConfig
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_SECTIONS,
  INITIAL_TEACHERS,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_LESSON_PLANS,
  INITIAL_MENU_ITEMS,
  INITIAL_ALERTS,
  INITIAL_SHOPPING_EVENT_LISTS
} from '../data/initialData';
import {
  initializeFirestoreDatabase,
  subscribeCollection,
  subscribeLocalSync,
  saveDocument,
  deleteDocument,
  saveBatchDocuments,
  deleteBatchDocuments
} from '../services/firebaseSyncService';
import { getDeduplicatedAttendance } from '../utils/attendanceUtils';
import { p2pEngine } from '../services/p2pSyncService';
import { pushNotificationService } from '../services/notificationService';

// ----------------------------------------------------------------------------
// INTERFAZ DE PROPIEDADES Y FUNCIONES EXPUESTAS POR EL CONTEXTO
// ----------------------------------------------------------------------------
export interface AppContextType {
  // Autenticación y Usuarios
  currentUser: UserProfile;                                           // Usuario actualmente autenticado
  allUsers: UserProfile[];                                             // Lista total de usuarios registrados
  isAuthenticated: boolean;                                           // Bandera de sesión activa
  login: (identifier: string, pass: string) => { success: boolean; message?: string }; // Iniciar sesión
  logout: () => void;                                                 // Cerrar sesión
  switchRole: (role: UserRole) => void;                               // Cambio rápido de perfil
  setCurrentUser: (user: UserProfile) => void;                         // Establecer usuario activo
  addUser: (userData: Omit<UserProfile, 'id'>) => void;               // Registrar nuevo usuario (Admin)
  updateUser: (userId: string, updates: Partial<UserProfile>) => void; // Modificar perfil
  updateUserRole: (userId: string, role: UserRole) => void;           // Modificar rol de acceso
  deleteUser: (userId: string) => void;                               // Eliminar usuario

  // Identidad Institucional y Logotipos
  schoolName: string;                                                 // Nombre del colegio
  setSchoolName: (name: string) => void;                              // Actualizar nombre del colegio
  schoolLogo: string;                                                 // Logo primario institucional
  setSchoolLogo: (logo: string) => void;                              // Actualizar logo primario
  secondaryLogo: string;                                              // Logo secundario o ministerial
  setSecondaryLogo: (logo: string) => void;                           // Actualizar logo secundario
  
  // Colecciones de Datos Escolares
  sections: Section[];                                                // Grados y secciones
  teachers: Teacher[];                                                // Plantilla de maestros
  students: Student[];                                                // Matrícula de alumnos
  attendance: AttendanceRecord[];                                     // Historial de asistencias
  lessonPlans: LessonPlan[];                                          // Planificaciones de clase
  menuItems: MenuItem[];                                              // Menú de comedor/cocina
  alerts: EventAlert[];                                               // Avisos y circulares escolares

  // Operaciones CRUD de Secciones
  addSection: (section: Omit<Section, 'id'>) => void;
  updateSection: (id: string, section: Partial<Section>) => void;
  deleteSection: (id: string) => void;

  // Operaciones CRUD de Docentes
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, teacher: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  // Operaciones CRUD de Alumnos
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, student: Partial<Student>) => void;
  deleteStudent: (id: string) => void;

  // Registro, Guardado y Desmarcado de Asistencia Diaria
  recordAttendance: (date: string, sectionId: string, records: { studentId: string; status?: AttendanceStatus | '' | null; notes?: string }[]) => void;
  unmarkAttendance: (date: string, sectionId: string, studentIds?: string[]) => void;

  // Operaciones CRUD de Planes de Clase
  addLessonPlan: (plan: Omit<LessonPlan, 'id' | 'createdAt'>) => LessonPlan;
  updateLessonPlan: (id: string, plan: Partial<LessonPlan>) => void;
  deleteLessonPlan: (id: string) => void;

  // Operaciones CRUD de Cocina / Comedor
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;

  // Operaciones CRUD de Avisos y Alertas
  addAlert: (alert: Omit<EventAlert, 'id' | 'createdAt'>) => void;
  updateAlert: (id: string, alert: Partial<EventAlert>) => void;
  deleteAlert: (id: string) => void;

  // Listas de Compras y Eventos (Checklists)
  shoppingEventLists: ShoppingEventList[];
  addShoppingEventList: (listData: Omit<ShoppingEventList, 'id' | 'createdAt'>) => ShoppingEventList;
  updateShoppingEventList: (id: string, updates: Partial<ShoppingEventList>) => void;
  deleteShoppingEventList: (id: string) => void;
  toggleChecklistItem: (listId: string, itemId: string) => void;
  addChecklistItem: (listId: string, itemData: Omit<ChecklistItem, 'id'>) => void;
  deleteChecklistItem: (listId: string, itemId: string) => void;
  updateChecklistItem: (listId: string, itemId: string, updates: Partial<ChecklistItem>) => void;

  // Configuración de Firmas de Asistencia (Maestro, Directora y Firma Intermedia)
  attendanceSignatures: AttendanceSignaturesConfig;
  setAttendanceSignatures: React.Dispatch<React.SetStateAction<AttendanceSignaturesConfig>>;
  updateAttendanceSignatures: (config: AttendanceSignaturesConfig) => void;

  // Estado de Conectividad y Sincronización
  connectivity: ConnectivityState;                                    // Estado de nube, P2P y offline
  toggleP2P: () => void;                                              // Activar/desactivar malla local
  toggleCloudSync: () => void;                                        // Activar/desactivar nube Firestore
  simulateP2PSync: () => void;                                        // Test de sincronización forzada

  // Modal de Impresión de Planificaciones
  printableLessonPlan: LessonPlan | null;
  setPrintableLessonPlan: (plan: LessonPlan | null) => void;

  // Asistente de bienvenida / Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
}

// Creación del Contexto de React
const AppContext = createContext<AppContextType | undefined>(undefined);

// ----------------------------------------------------------------------------
// PROVEEDOR PRINCIPAL DEL CONTEXTO (APP PROVIDER)
// ----------------------------------------------------------------------------
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Referencia para no disparar notificaciones masivas durante el arranque inicial
  const isInitialMount = useRef(true);

  // 1. Estado de Personalización Escolar
  const [schoolName, setSchoolNameState] = useState<string>(() => {
    return localStorage.getItem('schoolsync_school_name') || 'CDE Bezaleel - Control Escolar';
  });

  const [schoolLogo, setSchoolLogoState] = useState<string>(() => {
    return localStorage.getItem('schoolsync_school_logo') || '';
  });

  const [secondaryLogo, setSecondaryLogoState] = useState<string>(() => {
    return localStorage.getItem('schoolsync_secondary_logo') || '';
  });

  // 2. Estado de Conectividad Híbrida
  const [connectivity, setConnectivity] = useState<ConnectivityState>({
    mode: 'hybrid',
    firebaseConnected: true,
    p2pActive: true,
    connectedPeers: 0,
    pendingSyncCount: 0,
    lastSyncTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  });

  // Funciones para actualizar datos institucionales con notificación push
  const setSchoolName = (name: string) => {
    setSchoolNameState(name);
    localStorage.setItem('schoolsync_school_name', name);
    saveDocument('schoolSettings', { id: 'main', schoolName: name, schoolLogo, secondaryLogo }, {
      title: '🏫 Identidad Actualizada',
      body: `El nombre del centro educativo se actualizó a: ${name}`,
      category: 'system'
    });
    triggerSyncNotification();
  };

  const setSchoolLogo = (logo: string) => {
    setSchoolLogoState(logo);
    localStorage.setItem('schoolsync_school_logo', logo);
    saveDocument('schoolSettings', { id: 'main', schoolName, schoolLogo: logo, secondaryLogo }, {
      title: '🖼️ Logotipo Principal Actualizado',
      body: 'Se guardó un nuevo logotipo institucional.',
      category: 'system'
    });
    triggerSyncNotification();
  };

  const setSecondaryLogo = (logo: string) => {
    setSecondaryLogoState(logo);
    localStorage.setItem('schoolsync_secondary_logo', logo);
    saveDocument('schoolSettings', { id: 'main', schoolName, schoolLogo, secondaryLogo: logo }, {
      title: '🖼️ Logotipo Secundario Actualizado',
      body: 'Se actualizó el logotipo derecho/ministerial.',
      category: 'system'
    });
    triggerSyncNotification();
  };

  // 3. Usuarios y Sesión
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('schoolsync_all_users');
    if (saved) {
      try {
        const parsed: UserProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(u => {
            const initMatch = INITIAL_USERS.find(i => i.id === u.id || i.email.toLowerCase() === u.email.toLowerCase());
            const emailPrefix = u.email ? u.email.split('@')[0].toLowerCase() : 'usuario';
            return {
              ...u,
              username: u.username || initMatch?.username || emailPrefix,
              password: u.password || initMatch?.password || '123'
            };
          });
        }
      } catch (e) {
        console.error('Error analizando usuarios guardados:', e);
      }
    }
    return INITIAL_USERS;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const sessionAuth = localStorage.getItem('schoolsync_auth_active');
    return sessionAuth === 'true';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const activeUserId = localStorage.getItem('schoolsync_active_userid');
    if (activeUserId) {
      const found = allUsers.find(u => u.id === activeUserId);
      if (found) return found;
    }
    return allUsers[0] || INITIAL_USERS[0];
  });

  // 4. Funciones auxiliares de Caché Local Offline (IndexedDB / LocalStorage)
  const loadInitialDataWithCache = <T,>(key: string, defaultData: T[]): T[] => {
    try {
      const saved = localStorage.getItem(`schoolsync_cache_${key}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn(`Error al leer caché local de ${key}:`, e);
    }
    return defaultData;
  };

  const saveToLocalCache = (key: string, data: any) => {
    try {
      localStorage.setItem(`schoolsync_cache_${key}`, JSON.stringify(data));
    } catch (_) {}
  };

  // 5. Estados de las Colecciones Escolares
  const [sections, setSections] = useState<Section[]>(() => loadInitialDataWithCache('sections', INITIAL_SECTIONS));
  const [teachers, setTeachers] = useState<Teacher[]>(() => loadInitialDataWithCache('teachers', INITIAL_TEACHERS));
  const [students, setStudents] = useState<Student[]>(() => loadInitialDataWithCache('students', INITIAL_STUDENTS));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => loadInitialDataWithCache('attendance', INITIAL_ATTENDANCE));
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>(() => loadInitialDataWithCache('lessonPlans', INITIAL_LESSON_PLANS));
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => loadInitialDataWithCache('menu', INITIAL_MENU_ITEMS));
  const [alerts, setAlerts] = useState<EventAlert[]>(() => loadInitialDataWithCache('alerts', INITIAL_ALERTS));
  const [shoppingEventLists, setShoppingEventLists] = useState<ShoppingEventList[]>(() => loadInitialDataWithCache('shoppingEventLists', INITIAL_SHOPPING_EVENT_LISTS));

  // 6. Configuración de Firmas de Asistencia (Maestro, Directora y Firma Intermedia Personalizada)
  const [attendanceSignatures, setAttendanceSignaturesState] = useState<AttendanceSignaturesConfig>(() => {
    const saved = localStorage.getItem('schoolsync_attendance_signatures');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
    return {
      teacherName: 'Mtro. Docente Titular',
      teacherRole: 'Firma del Maestro / Docente',
      showMiddleSignature: false,
      middleSignatureName: 'Lic. Roberto Morales (Supervisor Escolar)',
      middleSignatureRole: 'Firma de Coordinación / Supervisión',
      principalName: 'Dra. María Elena Ramos',
      principalRole: 'Firma de la Directora / Dirección'
    };
  });

  const setAttendanceSignatures: React.Dispatch<React.SetStateAction<AttendanceSignaturesConfig>> = (action) => {
    setAttendanceSignaturesState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('schoolsync_attendance_signatures', JSON.stringify(next));
      } catch (_) {}
      saveDocument('schoolSettings', { id: 'attendanceSignatures', ...next }, {
        title: '✍️ Firmas de Asistencia Actualizadas',
        body: 'Se guardó la configuración de firmas oficiales para los reportes de asistencia.',
        category: 'system'
      });
      return next;
    });
  };

  const updateAttendanceSignatures = (config: AttendanceSignaturesConfig) => {
    setAttendanceSignatures(config);
  };

  // ----------------------------------------------------------------------------
  // Sincronizador de eventos entre pestañas locales y malla P2P
  // ----------------------------------------------------------------------------
  const handleIncomingP2PSyncEvent = (evt: any) => {
    if (!evt || typeof evt !== 'object') return;

    setConnectivity(prev => ({
      ...prev,
      lastSyncTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }));

    const { type, collectionName, data, items, id, payload } = evt;

    if (type === 'FULL_SYNC_REQUEST') {
      p2pEngine.broadcast({
        type: 'FULL_SYNC_RESPONSE',
        payload: {
          attendance,
          students,
          sections,
          teachers,
          menu: menuItems,
          lessonPlans,
          alerts,
          shoppingEventLists,
          attendanceSignatures,
          users: allUsers,
          schoolSettings: { schoolName, schoolLogo, secondaryLogo, attendanceSignatures }
        }
      });
      return;
    }

    if (type === 'FULL_SYNC_RESPONSE' && payload) {
      if (Array.isArray(payload.attendance) && payload.attendance.length > 0) {
        setAttendance(prev => {
          const merged = getDeduplicatedAttendance([...prev, ...payload.attendance]);
          saveToLocalCache('attendance', merged);
          return merged;
        });
      }
      if (Array.isArray(payload.shoppingEventLists) && payload.shoppingEventLists.length > 0) {
        setShoppingEventLists(prev => {
          const map = new Map(prev.map(l => [l.id, l]));
          payload.shoppingEventLists.forEach((l: ShoppingEventList) => map.set(l.id, l));
          const merged = Array.from(map.values());
          saveToLocalCache('shoppingEventLists', merged);
          return merged;
        });
      }
      if (payload.attendanceSignatures) {
        setAttendanceSignaturesState(payload.attendanceSignatures);
        localStorage.setItem('schoolsync_attendance_signatures', JSON.stringify(payload.attendanceSignatures));
      }
      if (Array.isArray(payload.students) && payload.students.length > 0) {
        setStudents(prev => {
          const map = new Map(prev.map(s => [s.id, s]));
          payload.students.forEach((s: Student) => map.set(s.id, s));
          const merged = Array.from(map.values());
          saveToLocalCache('students', merged);
          return merged;
        });
      }
      if (Array.isArray(payload.sections) && payload.sections.length > 0) {
        setSections(prev => {
          const map = new Map(prev.map(s => [s.id, s]));
          payload.sections.forEach((s: Section) => map.set(s.id, s));
          const merged = Array.from(map.values());
          saveToLocalCache('sections', merged);
          return merged;
        });
      }
      if (Array.isArray(payload.teachers) && payload.teachers.length > 0) {
        setTeachers(prev => {
          const map = new Map(prev.map(t => [t.id, t]));
          payload.teachers.forEach((t: Teacher) => map.set(t.id, t));
          const merged = Array.from(map.values());
          saveToLocalCache('teachers', merged);
          return merged;
        });
      }
      if (Array.isArray(payload.menu) && payload.menu.length > 0) {
        setMenuItems(prev => {
          const map = new Map(prev.map(m => [m.id, m]));
          payload.menu.forEach((m: MenuItem) => map.set(m.id, m));
          const merged = Array.from(map.values());
          saveToLocalCache('menu', merged);
          return merged;
        });
      }
      if (Array.isArray(payload.lessonPlans) && payload.lessonPlans.length > 0) {
        setLessonPlans(prev => {
          const map = new Map(prev.map(lp => [lp.id, lp]));
          payload.lessonPlans.forEach((lp: LessonPlan) => map.set(lp.id, lp));
          const merged = Array.from(map.values());
          saveToLocalCache('lessonPlans', merged);
          return merged;
        });
      }
      if (Array.isArray(payload.alerts) && payload.alerts.length > 0) {
        setAlerts(prev => {
          const map = new Map(prev.map(a => [a.id, a]));
          payload.alerts.forEach((a: EventAlert) => map.set(a.id, a));
          const merged = Array.from(map.values());
          saveToLocalCache('alerts', merged);
          return merged;
        });
      }
      if (payload.schoolSettings?.schoolName) {
        setSchoolNameState(payload.schoolSettings.schoolName);
        localStorage.setItem('schoolsync_school_name', payload.schoolSettings.schoolName);
      }
      return;
    }

    if (!collectionName) return;

    if (collectionName === 'attendance') {
      if (type === 'BATCH_SAVED' || type === 'DOC_SAVED' || type === 'DOC_UPDATE') {
        const newItems: AttendanceRecord[] = items || (Array.isArray(data) ? data : (data ? [data] : []));
        if (newItems.length > 0) {
          setAttendance(prev => {
            const updatedStudentIds = new Set(newItems.map(r => r.studentId));
            const date = newItems[0].date;
            const filtered = prev.filter(att => !(att.date === date && updatedStudentIds.has(att.studentId)));
            const merged = getDeduplicatedAttendance([...filtered, ...newItems]);
            saveToLocalCache('attendance', merged);
            return merged;
          });
        }
      } else if (type === 'BATCH_DELETED' && Array.isArray(evt.ids)) {
        setAttendance(prev => {
          const idSet = new Set(evt.ids);
          const filtered = prev.filter(att => !idSet.has(att.id));
          saveToLocalCache('attendance', filtered);
          return filtered;
        });
      } else if ((type === 'DOC_DELETED' || type === 'DOC_DELETE') && id) {
        setAttendance(prev => {
          const filtered = prev.filter(att => att.id !== id);
          saveToLocalCache('attendance', filtered);
          return filtered;
        });
      }
    } else if (collectionName === 'students') {
      if ((type === 'DOC_SAVED' || type === 'DOC_UPDATE') && data) {
        setStudents(prev => {
          const merged = [...prev.filter(s => s.id !== data.id), data];
          saveToLocalCache('students', merged);
          return merged;
        });
      } else if ((type === 'DOC_DELETED' || type === 'DOC_DELETE') && id) {
        setStudents(prev => {
          const merged = prev.filter(s => s.id !== id);
          saveToLocalCache('students', merged);
          return merged;
        });
      }
    } else if (collectionName === 'sections') {
      if ((type === 'DOC_SAVED' || type === 'DOC_UPDATE') && data) {
        setSections(prev => {
          const merged = [...prev.filter(s => s.id !== data.id), data];
          saveToLocalCache('sections', merged);
          return merged;
        });
      } else if ((type === 'DOC_DELETED' || type === 'DOC_DELETE') && id) {
        setSections(prev => {
          const merged = prev.filter(s => s.id !== id);
          saveToLocalCache('sections', merged);
          return merged;
        });
      }
    } else if (collectionName === 'teachers') {
      if ((type === 'DOC_SAVED' || type === 'DOC_UPDATE') && data) {
        setTeachers(prev => {
          const merged = [...prev.filter(t => t.id !== data.id), data];
          saveToLocalCache('teachers', merged);
          return merged;
        });
      } else if ((type === 'DOC_DELETED' || type === 'DOC_DELETE') && id) {
        setTeachers(prev => {
          const merged = prev.filter(t => t.id !== id);
          saveToLocalCache('teachers', merged);
          return merged;
        });
      }
    } else if (collectionName === 'menu') {
      if ((type === 'DOC_SAVED' || type === 'DOC_UPDATE') && data) {
        setMenuItems(prev => {
          const merged = [...prev.filter(m => m.id !== data.id), data];
          saveToLocalCache('menu', merged);
          return merged;
        });
      } else if ((type === 'DOC_DELETED' || type === 'DOC_DELETE') && id) {
        setMenuItems(prev => {
          const merged = prev.filter(m => m.id !== id);
          saveToLocalCache('menu', merged);
          return merged;
        });
      }
    } else if (collectionName === 'alerts') {
      if ((type === 'DOC_SAVED' || type === 'DOC_UPDATE') && data) {
        setAlerts(prev => {
          const merged = [data, ...prev.filter(a => a.id !== data.id)];
          saveToLocalCache('alerts', merged);
          return merged;
        });
      } else if ((type === 'DOC_DELETED' || type === 'DOC_DELETE') && id) {
        setAlerts(prev => {
          const merged = prev.filter(a => a.id !== id);
          saveToLocalCache('alerts', merged);
          return merged;
        });
      }
    } else if (collectionName === 'shoppingEventLists') {
      if ((type === 'DOC_SAVED' || type === 'DOC_UPDATE') && data) {
        setShoppingEventLists(prev => {
          const merged = [data, ...prev.filter(l => l.id !== data.id)];
          saveToLocalCache('shoppingEventLists', merged);
          return merged;
        });
      } else if ((type === 'DOC_DELETED' || type === 'DOC_DELETE') && id) {
        setShoppingEventLists(prev => {
          const merged = prev.filter(l => l.id !== id);
          saveToLocalCache('shoppingEventLists', merged);
          return merged;
        });
      }
    } else if (collectionName === 'lessonPlans') {
      if ((type === 'DOC_SAVED' || type === 'DOC_UPDATE') && data) {
        setLessonPlans(prev => {
          const merged = [data, ...prev.filter(lp => lp.id !== data.id)];
          saveToLocalCache('lessonPlans', merged);
          return merged;
        });
      } else if ((type === 'DOC_DELETED' || type === 'DOC_DELETE') && id) {
        setLessonPlans(prev => {
          const merged = prev.filter(lp => lp.id !== id);
          saveToLocalCache('lessonPlans', merged);
          return merged;
        });
      }
    } else if (collectionName === 'schoolSettings') {
      if (data?.schoolName) {
        setSchoolNameState(data.schoolName);
        localStorage.setItem('schoolsync_school_name', data.schoolName);
      }
      if (data?.schoolLogo !== undefined) {
        setSchoolLogoState(data.schoolLogo);
        localStorage.setItem('schoolsync_school_logo', data.schoolLogo);
      }
    }
  };

  // Escuchar eventos de almacenamiento en otras pestañas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'schoolsync_p2p_sync_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingP2PSyncEvent(parsed);
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Guardar lista de usuarios al cambiar
  useEffect(() => {
    localStorage.setItem('schoolsync_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  // ----------------------------------------------------------------------------
  // Suscripciones en tiempo real a Firebase Cloud Firestore
  // ----------------------------------------------------------------------------
  useEffect(() => {
    initializeFirestoreDatabase()
      .then(() => {
        setTimeout(() => {
          isInitialMount.current = false;
        }, 1500);
      })
      .catch(err => console.error('Error inicializando base Firestore:', err));

    const onDataReceived = (meta?: { fromCache: boolean; hasPendingWrites: boolean }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setConnectivity(prev => ({
        ...prev,
        firebaseConnected: isOnline,
        pendingSyncCount: meta?.hasPendingWrites ? Math.max(1, prev.pendingSyncCount) : 0,
        lastSyncTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      }));
    };

    const onErrorReceived = (err: any) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setConnectivity(prev => ({ ...prev, firebaseConnected: isOnline }));
    };

    const handleOnline = () => {
      setConnectivity(prev => ({
        ...prev,
        firebaseConnected: true,
        lastSyncTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      }));
      pushNotificationService.notify('🌐 Conexión Restablecida', 'El sistema se ha conectado exitosamente con la nube.', 'sync');
    };

    const handleOffline = () => {
      setConnectivity(prev => ({
        ...prev,
        firebaseConnected: false,
        lastSyncTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      }));
      pushNotificationService.notify('📡 Modo Sin Conexión', 'Trabajando en modo local con base de datos IndexedDB.', 'sync');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubLocalSync = subscribeLocalSync((evt) => {
      handleIncomingP2PSyncEvent(evt);
    });

    // Suscriptores a colecciones
    const unsubscribes = [
      subscribeCollection<UserProfile>('users', (data, meta) => {
        const clean = data.filter(u => !['u-2', 'u-3'].includes(u.id));
        if (clean && clean.length > 0) setAllUsers(clean);
        onDataReceived(meta);
      }, onErrorReceived),

      subscribeCollection<Section>('sections', (data, meta) => {
        const clean = data.filter(s => !['sec-a', 'sec-b', 'sec-c'].includes(s.id));
        setSections(prev => {
          const map = new Map<string, Section>();
          clean.forEach(s => map.set(s.id, s));
          prev.forEach(s => {
            if (!['sec-a', 'sec-b', 'sec-c'].includes(s.id) && !map.has(s.id)) {
              map.set(s.id, s);
            }
          });
          const merged = Array.from(map.values());
          saveToLocalCache('sections', merged);
          return merged;
        });
        onDataReceived(meta);
      }, onErrorReceived),

      subscribeCollection<Teacher>('teachers', (data, meta) => {
        const clean = data.filter(t => !['t-1', 't-2', 't-3'].includes(t.id));
        setTeachers(prev => {
          const map = new Map<string, Teacher>();
          clean.forEach(t => map.set(t.id, t));
          prev.forEach(t => {
            if (!['t-1', 't-2', 't-3'].includes(t.id) && !map.has(t.id)) {
              map.set(t.id, t);
            }
          });
          const merged = Array.from(map.values());
          saveToLocalCache('teachers', merged);
          return merged;
        });
        onDataReceived(meta);
      }, onErrorReceived),

      subscribeCollection<Student>('students', (data, meta) => {
        const clean = data.filter(st => !['st-101', 'st-102', 'st-103', 'st-104', 'st-105', 'st-106', 'st-107', 'st-108', 'st-201', 'st-202', 'st-203', 'st-204', 'st-205', 'st-206', 'st-301', 'st-302', 'st-303'].includes(st.id));
        setStudents(prev => {
          const map = new Map<string, Student>();
          clean.forEach(st => map.set(st.id, st));
          prev.forEach(st => {
            if (!map.has(st.id)) {
              map.set(st.id, st);
            }
          });
          const merged = Array.from(map.values());
          saveToLocalCache('students', merged);
          return merged;
        });
        onDataReceived(meta);
      }, onErrorReceived),

      subscribeCollection<AttendanceRecord>('attendance', (data, meta) => {
        const clean = data.filter(a => !['att-1', 'att-2', 'att-3', 'att-4', 'att-5', 'att-6', 'att-7', 'att-8', 'att-9', 'att-10', 'att-11'].includes(a.id));
        setAttendance(prev => {
          const dedupped = getDeduplicatedAttendance([...prev, ...clean]);
          saveToLocalCache('attendance', dedupped);
          return dedupped;
        });
        onDataReceived(meta);
      }, onErrorReceived),

      subscribeCollection<LessonPlan>('lessonPlans', (data, meta) => {
        const clean = data.filter(lp => !['lp-1', 'lp-2'].includes(lp.id));
        setLessonPlans(prev => {
          const map = new Map<string, LessonPlan>();
          clean.forEach(lp => map.set(lp.id, lp));
          prev.forEach(lp => {
            if (!['lp-1', 'lp-2'].includes(lp.id) && !map.has(lp.id)) {
              map.set(lp.id, lp);
            }
          });
          const merged = Array.from(map.values());
          saveToLocalCache('lessonPlans', merged);
          return merged;
        });
        onDataReceived(meta);
      }, onErrorReceived),

      subscribeCollection<MenuItem>('menu', (data, meta) => {
        const clean = data.filter(m => !['menu-1', 'menu-2', 'menu-3', 'menu-4'].includes(m.id));
        setMenuItems(prev => {
          const map = new Map<string, MenuItem>();
          clean.forEach(m => map.set(m.id, m));
          prev.forEach(m => {
            if (!['menu-1', 'menu-2', 'menu-3', 'menu-4'].includes(m.id) && !map.has(m.id)) {
              map.set(m.id, m);
            }
          });
          const merged = Array.from(map.values());
          saveToLocalCache('menu', merged);
          return merged;
        });
        onDataReceived(meta);
      }, onErrorReceived),

      subscribeCollection<EventAlert>('alerts', (data, meta) => {
        const clean = data.filter(a => !['alt-1', 'alt-2', 'alt-3'].includes(a.id));
        setAlerts(prev => {
          const map = new Map<string, EventAlert>();
          clean.forEach(a => map.set(a.id, a));
          prev.forEach(a => {
            if (!['alt-1', 'alt-2', 'alt-3'].includes(a.id) && !map.has(a.id)) {
              map.set(a.id, a);
            }
          });
          const merged = Array.from(map.values());
          saveToLocalCache('alerts', merged);
          return merged;
        });
        onDataReceived(meta);
      }, onErrorReceived),

      subscribeCollection<ShoppingEventList>('shoppingEventLists', (data, meta) => {
        if (data && data.length > 0) {
          setShoppingEventLists(prev => {
            const map = new Map<string, ShoppingEventList>();
            data.forEach(l => map.set(l.id, l));
            prev.forEach(l => {
              if (!map.has(l.id)) {
                map.set(l.id, l);
              }
            });
            const merged = Array.from(map.values());
            saveToLocalCache('shoppingEventLists', merged);
            return merged;
          });
        }
        onDataReceived(meta);
      }, onErrorReceived),

      subscribeCollection<{ id: string; schoolName?: string; schoolLogo?: string; teacherName?: string; showMiddleSignature?: boolean; middleSignatureName?: string; middleSignatureRole?: string; principalName?: string; principalRole?: string }>('schoolSettings', (data, meta) => {
        const mainSettings = data.find(s => s.id === 'main');
        if (mainSettings) {
          if (mainSettings.schoolName) setSchoolNameState(mainSettings.schoolName);
          if (mainSettings.schoolLogo !== undefined) setSchoolLogoState(mainSettings.schoolLogo);
        }
        const sigSettings = data.find(s => s.id === 'attendanceSignatures');
        if (sigSettings) {
          setAttendanceSignaturesState(prev => ({
            ...prev,
            teacherName: sigSettings.teacherName || prev.teacherName,
            showMiddleSignature: sigSettings.showMiddleSignature ?? prev.showMiddleSignature,
            middleSignatureName: sigSettings.middleSignatureName || prev.middleSignatureName,
            middleSignatureRole: sigSettings.middleSignatureRole || prev.middleSignatureRole,
            principalName: sigSettings.principalName || prev.principalName,
            principalRole: sigSettings.principalRole || prev.principalRole
          }));
        }
        onDataReceived(meta);
      }, onErrorReceived)
    ];

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubLocalSync();
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // ----------------------------------------------------------------------------
  // Motor WebRTC P2P y Malla LAN Local (Zero Internet)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (connectivity.p2pActive) {
      p2pEngine.init(
        'cde-bezaleel-mesh',
        (event) => handleIncomingP2PSyncEvent(event),
        (connectedCount) => {
          setConnectivity(prev => ({
            ...prev,
            connectedPeers: connectedCount,
            lastSyncTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          }));
        },
        currentUser.role
      );
    } else {
      p2pEngine.destroy();
      setConnectivity(prev => ({ ...prev, connectedPeers: 0 }));
    }

    return () => {
      p2pEngine.destroy();
    };
  }, [connectivity.p2pActive, currentUser.role]);

  // ----------------------------------------------------------------------------
  // Inicio de Sesión / Autenticación
  // ----------------------------------------------------------------------------
  const login = (identifier: string, pass: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    const userMatch = allUsers.find(u => {
      const emailMatch = u.email ? u.email.toLowerCase() === cleanId : false;
      const usernameVal = u.username ? u.username.toLowerCase() : (u.email ? u.email.split('@')[0].toLowerCase() : '');
      const usernameMatch = usernameVal === cleanId;
      const nameMatch = u.name ? u.name.toLowerCase() === cleanId : false;

      const userPass = u.password || '123';
      const passMatch = cleanPass === userPass;

      return (emailMatch || usernameMatch || nameMatch) && passMatch;
    });

    if (userMatch) {
      setCurrentUser(userMatch);
      setIsAuthenticated(true);
      localStorage.setItem('schoolsync_auth_active', 'true');
      localStorage.setItem('schoolsync_active_userid', userMatch.id);
      pushNotificationService.notify('👋 Bienvenido', `Sesión iniciada como: ${userMatch.name}`, 'system');
      return { success: true };
    }

    return { success: false, message: 'Usuario/correo o contraseña incorrectos. Verifica tus credenciales.' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('schoolsync_auth_active');
    pushNotificationService.notify('🔒 Sesión Finalizada', 'Has cerrado tu sesión en el sistema.', 'system');
  };

  // ----------------------------------------------------------------------------
  // Gestión de Usuarios
  // ----------------------------------------------------------------------------
  const addUser = (userData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...userData,
      id: `u-${Date.now()}`
    };
    setAllUsers(prev => [...prev, newUser]);
    saveDocument('users', newUser, {
      title: '👤 Nuevo Usuario Registrado',
      body: `Se ha registrado al usuario: ${newUser.name} (${newUser.role}).`,
      category: 'system'
    });
    triggerSyncNotification();
  };

  const updateUser = (userId: string, updates: Partial<UserProfile>) => {
    const existing = allUsers.find(u => u.id === userId);
    if (existing) {
      const updated = { ...existing, ...updates };
      setAllUsers(prev => prev.map(u => (u.id === userId ? updated : u)));
      if (currentUser.id === userId) {
        setCurrentUser(updated);
      }
      saveDocument('users', updated, {
        title: '👤 Perfil Actualizado',
        body: `Se modificaron los datos de: ${updated.name}.`,
        category: 'system'
      });
    }
    triggerSyncNotification();
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    const existing = allUsers.find(u => u.id === userId);
    if (existing) {
      const updated = { ...existing, role };
      setAllUsers(prev => prev.map(u => (u.id === userId ? updated : u)));
      if (currentUser.id === userId) {
        setCurrentUser(updated);
      }
      saveDocument('users', updated, {
        title: '🔑 Rol de Usuario Modificado',
        body: `El usuario ${updated.name} ahora tiene rol de: ${role}.`,
        category: 'system'
      });
    }
    triggerSyncNotification();
  };

  const deleteUser = (userId: string) => {
    const existing = allUsers.find(u => u.id === userId);
    setAllUsers(prev => prev.filter(u => u.id !== userId));
    deleteDocument('users', userId, {
      title: '🗑️ Usuario Eliminado',
      body: `Se eliminó al usuario ${existing?.name || userId}.`,
      category: 'system'
    });
    triggerSyncNotification();
  };
  
  const [printableLessonPlan, setPrintableLessonPlan] = useState<LessonPlan | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  // Cambio de rol rápido
  const switchRole = (role: UserRole) => {
    const targetUser = allUsers.find(u => u.role === role) || {
      id: `u-${Date.now()}`,
      name: role === 'admin' ? 'Administrador Principal' : role === 'maestro' ? 'Prof. Carlos Mendoza' : 'Sra. Rosa Beltrán',
      email: `${role}@bezaleel.edu`,
      role
    };
    setCurrentUser(targetUser);
    localStorage.setItem('schoolsync_active_userid', targetUser.id);
    pushNotificationService.notify('🔄 Cambio de Rol', `Cambiado a perfil de: ${role.toUpperCase()}`, 'system');
  };

  // ----------------------------------------------------------------------------
  // Operaciones de Secciones Escolares (CRUD)
  // ----------------------------------------------------------------------------
  const addSection = (sectionData: Omit<Section, 'id'>) => {
    const newSection: Section = { ...sectionData, id: `sec-${Date.now()}` };
    setSections(prev => {
      const updated = [...prev.filter(s => s.id !== newSection.id), newSection];
      saveToLocalCache('sections', updated);
      return updated;
    });
    saveDocument('sections', newSection, {
      title: '🏫 Nueva Sección Creada',
      body: `Se creó la sección "${newSection.name}" (${newSection.ageGroup}).`,
      category: 'system'
    });
    triggerSyncNotification();
  };

  const updateSection = (id: string, sectionData: Partial<Section>) => {
    setSections(prev => {
      const updated = prev.map(s => (s.id === id ? { ...s, ...sectionData } : s));
      saveToLocalCache('sections', updated);
      return updated;
    });
    const current = sections.find(s => s.id === id);
    saveDocument('sections', current ? { ...current, ...sectionData } : { id, ...sectionData }, {
      title: '🏫 Sección Modificada',
      body: `Se actualizaron los datos de la sección.`,
      category: 'system'
    });
    triggerSyncNotification();
  };

  const deleteSection = (id: string) => {
    setSections(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveToLocalCache('sections', updated);
      return updated;
    });
    deleteDocument('sections', id, {
      title: '🗑️ Sección Eliminada',
      body: 'Se eliminó la sección del registro escolar.',
      category: 'system'
    });
    triggerSyncNotification();
  };

  // ----------------------------------------------------------------------------
  // Operaciones de Docentes (CRUD)
  // ----------------------------------------------------------------------------
  const addTeacher = (teacherData: Omit<Teacher, 'id'>) => {
    const newTeacher: Teacher = { ...teacherData, id: `t-${Date.now()}` };
    setTeachers(prev => {
      const updated = [...prev.filter(t => t.id !== newTeacher.id), newTeacher];
      saveToLocalCache('teachers', updated);
      return updated;
    });
    saveDocument('teachers', newTeacher, {
      title: '👩‍🏫 Docente Registrado',
      body: `Se agregó al docente: ${newTeacher.fullName} (${newTeacher.specialty || 'Titular'}).`,
      category: 'system'
    });
    triggerSyncNotification();
  };

  const updateTeacher = (id: string, teacherData: Partial<Teacher>) => {
    setTeachers(prev => {
      const updated = prev.map(t => (t.id === id ? { ...t, ...teacherData } : t));
      saveToLocalCache('teachers', updated);
      return updated;
    });
    const current = teachers.find(t => t.id === id);
    saveDocument('teachers', current ? { ...current, ...teacherData } : { id, ...teacherData }, {
      title: '👩‍🏫 Datos de Docente Actualizados',
      body: 'Se guardaron las modificaciones del docente.',
      category: 'system'
    });
    triggerSyncNotification();
  };

  const deleteTeacher = (id: string) => {
    setTeachers(prev => {
      const updated = prev.filter(t => t.id !== id);
      saveToLocalCache('teachers', updated);
      return updated;
    });
    deleteDocument('teachers', id, {
      title: '🗑️ Docente Eliminado',
      body: 'Se removió al docente de la plantilla.',
      category: 'system'
    });
    triggerSyncNotification();
  };

  // ----------------------------------------------------------------------------
  // Operaciones de Alumnos (CRUD)
  // ----------------------------------------------------------------------------
  const addStudent = (studentData: Omit<Student, 'id'>) => {
    const newStudent: Student = { ...studentData, id: `st-${Date.now()}` };
    setStudents(prev => {
      const updated = [...prev.filter(st => st.id !== newStudent.id), newStudent];
      saveToLocalCache('students', updated);
      return updated;
    });
    saveDocument('students', newStudent, {
      title: '👨‍🎓 Nuevo Alumno Matriculado',
      body: `Se inscribió a ${newStudent.fullName}.`,
      category: 'student'
    });
    triggerSyncNotification();
  };

  const updateStudent = (id: string, studentData: Partial<Student>) => {
    setStudents(prev => {
      const updated = prev.map(st => (st.id === id ? { ...st, ...studentData } : st));
      saveToLocalCache('students', updated);
      return updated;
    });
    const current = students.find(st => st.id === id);
    saveDocument('students', current ? { ...current, ...studentData } : { id, ...studentData }, {
      title: '✏️ Expediente de Alumno Actualizado',
      body: `Se actualizaron los datos del alumno.`,
      category: 'student'
    });
    triggerSyncNotification();
  };

  const deleteStudent = (id: string) => {
    const target = students.find(s => s.id === id);
    setStudents(prev => {
      const updated = prev.filter(st => st.id !== id);
      saveToLocalCache('students', updated);
      return updated;
    });
    setAttendance(prev => {
      const updated = prev.filter(att => att.studentId !== id);
      saveToLocalCache('attendance', updated);
      return updated;
    });
    deleteDocument('students', id, {
      title: '🗑️ Alumno Eliminado',
      body: `Se dio de baja a ${target ? target.fullName : 'el alumno'}.`,
      category: 'student'
    });
    triggerSyncNotification();
  };

  // ----------------------------------------------------------------------------
  // Registro Diario de Asistencia Escolar (Pase de Lista) y Desmarcado Masivo
  // ----------------------------------------------------------------------------
  const recordAttendance = (
    date: string,
    sectionId: string,
    records: { studentId: string; status?: AttendanceStatus | '' | null; notes?: string }[]
  ) => {
    const timestamp = new Date().toISOString();
    const targetSection = sections.find(s => s.id === sectionId);
    const sectionName = targetSection ? targetSection.name : 'el aula';

    // Separar los registros marcados (con estado activo) de los desmarcados (en blanco)
    const markedRecords = records.filter(r => r.status && r.status.trim() !== '');
    const unmarkedRecords = records.filter(r => !r.status || r.status.trim() === '');
    const allProcessedStudentIds = new Set(records.map(r => r.studentId));

    const newRecords: AttendanceRecord[] = markedRecords.map((r) => ({
      id: `att-${date}-${r.studentId}`,
      date,
      sectionId,
      studentId: r.studentId,
      status: r.status as AttendanceStatus,
      notes: r.notes,
      registeredBy: currentUser.name,
      timestamp
    }));

    const presentCount = newRecords.filter(r => r.status === 'presente').length;
    const lateCount = newRecords.filter(r => r.status === 'retardo').length;
    const absentCount = newRecords.filter(r => r.status === 'ausente').length;
    const justifiedCount = newRecords.filter(r => r.status === 'justificado').length;

    // Actualizar estado local eliminando registros antiguos de los alumnos procesados y añadiendo los nuevos marcados
    setAttendance(prev => {
      const filtered = prev.filter(att => !(att.date === date && allProcessedStudentIds.has(att.studentId)));
      const merged = getDeduplicatedAttendance([...filtered, ...newRecords]);
      saveToLocalCache('attendance', merged);
      return merged;
    });

    // 1. Guardar en Firestore los registros que tienen estado marcado
    if (newRecords.length > 0) {
      saveBatchDocuments('attendance', newRecords, {
        title: `📋 Pase de Lista: ${sectionName}`,
        body: `Asistencia guardada (${date}): ${presentCount} presentes, ${lateCount} retardos, ${absentCount} ausentes, ${justifiedCount} justificados.`,
        category: 'attendance'
      });
    }

    // 2. Eliminar de Firestore los alumnos que quedaron desmarcados/en blanco
    if (unmarkedRecords.length > 0) {
      const idsToDelete = unmarkedRecords.map(r => `att-${date}-${r.studentId}`);
      deleteBatchDocuments('attendance', idsToDelete, {
        title: `⚪ Asistencias en Blanco: ${sectionName}`,
        body: `Se actualizaron ${unmarkedRecords.length} alumnos en blanco sin marcar para el ${date}.`,
        category: 'attendance'
      });
    }

    triggerSyncNotification();
  };

  // Desmarcar todas las asistencias de una sección o alumnos específicos (Dejar en blanco)
  const unmarkAttendance = (date: string, sectionId: string, studentIds?: string[]) => {
    const secStudents = studentIds && studentIds.length > 0
      ? studentIds
      : students.filter(s => s.sectionId === sectionId).map(s => s.id);

    const targetSection = sections.find(s => s.id === sectionId);
    const sectionName = targetSection ? targetSection.name : 'el aula';
    const targetSet = new Set(secStudents);
    const idsToDelete = secStudents.map(stId => `att-${date}-${stId}`);

    // Limpiar del estado local inmediatamente para reflejarse en todos los dashboards
    setAttendance(prev => {
      const filtered = prev.filter(att => !(att.date === date && targetSet.has(att.studentId)));
      saveToLocalCache('attendance', filtered);
      return filtered;
    });

    // Eliminar documentos de Firestore en la nube y propagar por P2P y LocalStorage
    deleteBatchDocuments('attendance', idsToDelete, {
      title: `⚪ Asistencias Desmarcadas: ${sectionName}`,
      body: `Se desmarcó la asistencia del grupo para el ${date}. Quedan en blanco (0 comensales en cocina).`,
      category: 'attendance'
    });

    triggerSyncNotification();
  };

  // ----------------------------------------------------------------------------
  // Planificaciones Didácticas y Clases
  // ----------------------------------------------------------------------------
  const addLessonPlan = (planData: Omit<LessonPlan, 'id' | 'createdAt'>): LessonPlan => {
    const newPlan: LessonPlan = {
      ...planData,
      id: `lp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    setLessonPlans(prev => {
      const updated = [newPlan, ...prev.filter(p => p.id !== newPlan.id)];
      saveToLocalCache('lessonPlans', updated);
      return updated;
    });
    saveDocument('lessonPlans', newPlan, {
      title: '📖 Nueva Planificación Didáctica',
      body: `${newPlan.subject} (${newPlan.childrenAge}) por ${newPlan.teacherName}.`,
      category: 'lessonPlan'
    });
    triggerSyncNotification();
    return newPlan;
  };

  const updateLessonPlan = (id: string, planData: Partial<LessonPlan>) => {
    setLessonPlans(prev => {
      const updated = prev.map(p => (p.id === id ? { ...p, ...planData } : p));
      saveToLocalCache('lessonPlans', updated);
      return updated;
    });
    const current = lessonPlans.find(p => p.id === id);
    saveDocument('lessonPlans', current ? { ...current, ...planData } : { id, ...planData }, {
      title: '📖 Planificación Actualizada',
      body: `Se modificó la planificación de ${planData.subject || 'la materia'}.`,
      category: 'lessonPlan'
    });
    triggerSyncNotification();
  };

  const deleteLessonPlan = (id: string) => {
    setLessonPlans(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveToLocalCache('lessonPlans', updated);
      return updated;
    });
    deleteDocument('lessonPlans', id, {
      title: '🗑️ Planificación Eliminada',
      body: 'Se eliminó la planificación de clases.',
      category: 'lessonPlan'
    });
    triggerSyncNotification();
  };

  // ----------------------------------------------------------------------------
  // Menú del Comedor / Cocina
  // ----------------------------------------------------------------------------
  const addMenuItem = (itemData: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = { ...itemData, id: `menu-${Date.now()}` };
    setMenuItems(prev => {
      const updated = [...prev.filter(m => m.id !== newItem.id), newItem];
      saveToLocalCache('menu', updated);
      return updated;
    });
    saveDocument('menu', newItem, {
      title: '🍲 Nuevo Menú de Cocina',
      body: `${newItem.dayOfWeek}: ${newItem.dishName} (${newItem.portionCount} porciones).`,
      category: 'menu'
    });
    triggerSyncNotification();
  };

  const updateMenuItem = (id: string, itemData: Partial<MenuItem>) => {
    setMenuItems(prev => {
      const updated = prev.map(m => (m.id === id ? { ...m, ...itemData } : m));
      saveToLocalCache('menu', updated);
      return updated;
    });
    const current = menuItems.find(m => m.id === id);
    saveDocument('menu', current ? { ...current, ...itemData } : { id, ...itemData }, {
      title: '🍲 Menú de Cocina Actualizado',
      body: `Se actualizaron los platillos e ingredientes del comedor escolar.`,
      category: 'menu'
    });
    triggerSyncNotification();
  };

  const deleteMenuItem = (id: string) => {
    setMenuItems(prev => {
      const updated = prev.filter(m => m.id !== id);
      saveToLocalCache('menu', updated);
      return updated;
    });
    deleteDocument('menu', id, {
      title: '🗑️ Platillo Eliminado',
      body: 'Se eliminó el registro del menú de cocina.',
      category: 'menu'
    });
    triggerSyncNotification();
  };

  // ----------------------------------------------------------------------------
  // Avisos y Alertas Escolares
  // ----------------------------------------------------------------------------
  const addAlert = (alertData: Omit<EventAlert, 'id' | 'createdAt'>) => {
    const newAlert: EventAlert = {
      ...alertData,
      id: `alt-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setAlerts(prev => {
      const updated = [newAlert, ...prev.filter(a => a.id !== newAlert.id)];
      saveToLocalCache('alerts', updated);
      return updated;
    });
    saveDocument('alerts', newAlert, {
      title: `📢 Alerta: ${newAlert.title}`,
      body: newAlert.description.slice(0, 100) + (newAlert.description.length > 100 ? '...' : ''),
      category: 'alert'
    });
    triggerSyncNotification();
  };

  const updateAlert = (id: string, alertData: Partial<EventAlert>) => {
    setAlerts(prev => {
      const updated = prev.map(a => (a.id === id ? { ...a, ...alertData } : a));
      saveToLocalCache('alerts', updated);
      return updated;
    });
    const current = alerts.find(a => a.id === id);
    saveDocument('alerts', current ? { ...current, ...alertData } : { id, ...alertData }, {
      title: '📢 Alerta Escolar Modificada',
      body: 'Se actualizó la circular o comunicado escolar.',
      category: 'alert'
    });
    triggerSyncNotification();
  };

  const deleteAlert = (id: string) => {
    setAlerts(prev => {
      const updated = prev.filter(a => a.id !== id);
      saveToLocalCache('alerts', updated);
      return updated;
    });
    deleteDocument('alerts', id, {
      title: '🗑️ Alerta Retirada',
      body: 'Se archivó o eliminó el comunicado escolar.',
      category: 'alert'
    });
    triggerSyncNotification();
  };

  // ----------------------------------------------------------------------------
  // Listas de Compras y Eventos (Checklist)
  // ----------------------------------------------------------------------------
  const addShoppingEventList = (listData: Omit<ShoppingEventList, 'id' | 'createdAt'>): ShoppingEventList => {
    const newList: ShoppingEventList = {
      ...listData,
      id: `list-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setShoppingEventLists(prev => {
      const updated = [newList, ...prev.filter(l => l.id !== newList.id)];
      saveToLocalCache('shoppingEventLists', updated);
      return updated;
    });
    saveDocument('shoppingEventLists', newList, {
      title: `📝 Nueva Lista: ${newList.title}`,
      body: `Se creó la lista con ${newList.items?.length || 0} elementos checklist.`,
      category: 'alert'
    });
    triggerSyncNotification();
    return newList;
  };

  const updateShoppingEventList = (id: string, updates: Partial<ShoppingEventList>) => {
    setShoppingEventLists(prev => {
      const updated = prev.map(l => (l.id === id ? { ...l, ...updates } : l));
      saveToLocalCache('shoppingEventLists', updated);
      return updated;
    });
    const current = shoppingEventLists.find(l => l.id === id);
    const finalDoc = current ? { ...current, ...updates } : { id, ...updates };
    saveDocument('shoppingEventLists', finalDoc, {
      title: '📝 Lista Actualizada',
      body: `Se guardaron los cambios en la lista "${finalDoc.title || 'de compras/eventos'}".`,
      category: 'alert'
    });
    triggerSyncNotification();
  };

  const deleteShoppingEventList = (id: string) => {
    setShoppingEventLists(prev => {
      const updated = prev.filter(l => l.id !== id);
      saveToLocalCache('shoppingEventLists', updated);
      return updated;
    });
    deleteDocument('shoppingEventLists', id, {
      title: '🗑️ Lista Eliminada',
      body: 'Se eliminó la lista de compras o eventos.',
      category: 'alert'
    });
    triggerSyncNotification();
  };

  const toggleChecklistItem = (listId: string, itemId: string) => {
    setShoppingEventLists(prev => {
      const updated = prev.map(l => {
        if (l.id !== listId) return l;
        const updatedItems = l.items.map(it => it.id === itemId ? { ...it, completed: !it.completed } : it);
        return { ...l, items: updatedItems };
      });
      saveToLocalCache('shoppingEventLists', updated);
      const targetList = updated.find(l => l.id === listId);
      if (targetList) {
        saveDocument('shoppingEventLists', targetList);
      }
      return updated;
    });
    triggerSyncNotification();
  };

  const addChecklistItem = (listId: string, itemData: Omit<ChecklistItem, 'id'>) => {
    const newItem: ChecklistItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    };
    setShoppingEventLists(prev => {
      const updated = prev.map(l => {
        if (l.id !== listId) return l;
        return { ...l, items: [...l.items, newItem] };
      });
      saveToLocalCache('shoppingEventLists', updated);
      const targetList = updated.find(l => l.id === listId);
      if (targetList) {
        saveDocument('shoppingEventLists', targetList);
      }
      return updated;
    });
    triggerSyncNotification();
  };

  const deleteChecklistItem = (listId: string, itemId: string) => {
    setShoppingEventLists(prev => {
      const updated = prev.map(l => {
        if (l.id !== listId) return l;
        return { ...l, items: l.items.filter(it => it.id !== itemId) };
      });
      saveToLocalCache('shoppingEventLists', updated);
      const targetList = updated.find(l => l.id === listId);
      if (targetList) {
        saveDocument('shoppingEventLists', targetList);
      }
      return updated;
    });
    triggerSyncNotification();
  };

  const updateChecklistItem = (listId: string, itemId: string, updates: Partial<ChecklistItem>) => {
    setShoppingEventLists(prev => {
      const updated = prev.map(l => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: l.items.map(it => it.id === itemId ? { ...it, ...updates } : it)
        };
      });
      saveToLocalCache('shoppingEventLists', updated);
      const targetList = updated.find(l => l.id === listId);
      if (targetList) {
        saveDocument('shoppingEventLists', targetList);
      }
      return updated;
    });
    triggerSyncNotification();
  };

  // ----------------------------------------------------------------------------
  // Conectividad y Sincronización
  // ----------------------------------------------------------------------------
  const toggleP2P = () => {
    setConnectivity(prev => {
      const next = !prev.p2pActive;
      pushNotificationService.notify(
        next ? '📡 Malla P2P Activada' : '📡 Malla P2P Pausada',
        next ? 'Buscando dispositivos cercanos en la red local.' : 'Sincronización directa P2P detenida.',
        'sync'
      );
      return { ...prev, p2pActive: next };
    });
  };

  const toggleCloudSync = () => {
    setConnectivity(prev => {
      const next = !prev.firebaseConnected;
      pushNotificationService.notify(
        next ? '☁️ Sincronización en la Nube Activada' : '☁️ Modo Local Exclusivo',
        next ? 'Sincronizando con base de datos Cloud Firestore.' : 'Trabajando con base de datos en dispositivo.',
        'sync'
      );
      return { ...prev, firebaseConnected: next };
    });
  };

  const triggerSyncNotification = () => {
    setConnectivity(prev => ({
      ...prev,
      lastSyncTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      pendingSyncCount: prev.p2pActive || prev.firebaseConnected ? 0 : prev.pendingSyncCount + 1
    }));
  };

  const simulateP2PSync = () => {
    setConnectivity(prev => ({
      ...prev,
      connectedPeers: Math.floor(Math.random() * 4) + 2,
      lastSyncTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      pendingSyncCount: 0
    }));
    pushNotificationService.notify('🔄 Sincronización Completada', 'Todos los registros escolares se han sincronizado.', 'sync');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        isAuthenticated,
        login,
        logout,
        switchRole,
        setCurrentUser,
        addUser,
        updateUser,
        updateUserRole,
        deleteUser,
        schoolName,
        setSchoolName,
        schoolLogo,
        setSchoolLogo,
        secondaryLogo,
        setSecondaryLogo,
        sections,
        teachers,
        students,
        attendance,
        lessonPlans,
        menuItems,
        alerts,
        addSection,
        updateSection,
        deleteSection,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addStudent,
        updateStudent,
        deleteStudent,
        recordAttendance,
        unmarkAttendance,
        addLessonPlan,
        updateLessonPlan,
        deleteLessonPlan,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addAlert,
        updateAlert,
        deleteAlert,
        shoppingEventLists,
        addShoppingEventList,
        updateShoppingEventList,
        deleteShoppingEventList,
        toggleChecklistItem,
        addChecklistItem,
        deleteChecklistItem,
        updateChecklistItem,
        attendanceSignatures,
        setAttendanceSignatures,
        updateAttendanceSignatures,
        connectivity,
        toggleP2P,
        toggleCloudSync,
        simulateP2PSync,
        printableLessonPlan,
        setPrintableLessonPlan,
        showOnboarding,
        setShowOnboarding
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Hook personalizado para consumir el contexto en cualquier componente
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser utilizado dentro de un AppProvider');
  }
  return context;
};
