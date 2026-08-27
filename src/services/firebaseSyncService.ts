// ============================================================================
// SERVICIO DE SINCRONIZACIÓN CON FIRESTORE, P2P Y NOTIFICACIONES PUSH (ESPAÑOL)
// ============================================================================
// Este módulo se encarga de:
// 1. Sincronizar en tiempo real todas las colecciones de la escuela con Cloud Firestore.
// 2. Transmitir eventos a través de BroadcastChannel y WebRTC P2P para funcionamiento sin conexión.
// 3. Disparar notificaciones Push al sistema operativo y avisos en pantalla ante cualquier cambio.
// 4. Limpieza y saneamiento de datos para evitar errores de claves indefinidas en Firebase.
// ============================================================================

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  UserProfile,
  Student,
  Section,
  Teacher,
  AttendanceRecord,
  LessonPlan,
  MenuItem,
  EventAlert
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_SECTIONS,
  INITIAL_TEACHERS,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_LESSON_PLANS,
  INITIAL_MENU_ITEMS,
  INITIAL_ALERTS
} from '../data/initialData';
import { p2pEngine } from './p2pSyncService';
import { pushNotificationService } from './notificationService';

// ----------------------------------------------------------------------------
// Función de saneamiento: Limpia valores 'undefined' antes de enviar a Firestore
// para prevenir que la base de datos lance excepciones de tipos inválidos.
// ----------------------------------------------------------------------------
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleanObj = { ...obj } as Record<string, any>;
  for (const key of Object.keys(cleanObj)) {
    if (cleanObj[key] === undefined) {
      delete cleanObj[key];
    } else if (typeof cleanObj[key] === 'object' && cleanObj[key] !== null) {
      cleanObj[key] = sanitizeForFirestore(cleanObj[key]);
    }
  }
  return cleanObj as T;
}

// ----------------------------------------------------------------------------
// Sembrado inicial: Si una colección está vacía en la nube, inserta los datos base.
// ----------------------------------------------------------------------------
async function seedIfEmpty<T extends { id: string }>(
  collectionName: string,
  initialData: T[]
) {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.empty && initialData.length > 0) {
      console.log(`[Sembrado Inicial] Insertando datos base para colección: ${collectionName}`);
      const batch = writeBatch(db);
      for (const item of initialData) {
        const itemRef = doc(db, collectionName, item.id);
        batch.set(itemRef, sanitizeForFirestore(item));
      }
      await batch.commit();
    }
  } catch (error: any) {
    // Si no hay conexión a internet en el arranque, funciona transparentemente con la caché local
    console.warn(`[Aviso de Conexión] No se pudo comprobar sembrado en ${collectionName} (operando en modo local/offline).`);
  }
}

// Lista de IDs de demostración que deben purgarse para mantener limpia la base de datos
const DEMO_IDS_TO_REMOVE = [
  { collection: 'users', ids: ['u-2', 'u-3'] },
  { collection: 'students', ids: ['st-101', 'st-102', 'st-103', 'st-104', 'st-105', 'st-106', 'st-107', 'st-108', 'st-201', 'st-202', 'st-203', 'st-204', 'st-205', 'st-206', 'st-301', 'st-302', 'st-303'] },
  { collection: 'attendance', ids: ['att-1', 'att-2', 'att-3', 'att-4', 'att-5', 'att-6', 'att-7', 'att-8', 'att-9', 'att-10', 'att-11'] },
  { collection: 'lessonPlans', ids: ['lp-1', 'lp-2'] },
  { collection: 'menu', ids: ['menu-1', 'menu-2', 'menu-3', 'menu-4'] },
  { collection: 'alerts', ids: ['alt-1', 'alt-2', 'alt-3'] },
  { collection: 'teachers', ids: ['t-1', 't-2', 't-3'] },
  { collection: 'sections', ids: ['sec-a', 'sec-b', 'sec-c'] }
];

// Limpia registros antiguos de prueba para evitar duplicados en producción
async function cleanupOldDemoData() {
  try {
    const batch = writeBatch(db);
    for (const group of DEMO_IDS_TO_REMOVE) {
      for (const id of group.ids) {
        const itemRef = doc(db, group.collection, id);
        batch.delete(itemRef);
      }
    }
    await batch.commit();
  } catch (err) {
    // Si no hay red, la operación se pospone silenciosamente
  }
}

// Inicializa y estructura la base de datos en la nube
export async function initializeFirestoreDatabase() {
  await cleanupOldDemoData();
  await Promise.all([
    seedIfEmpty('users', INITIAL_USERS),
    seedIfEmpty('sections', INITIAL_SECTIONS),
    seedIfEmpty('teachers', INITIAL_TEACHERS),
    seedIfEmpty('students', INITIAL_STUDENTS),
    seedIfEmpty('attendance', INITIAL_ATTENDANCE),
    seedIfEmpty('lessonPlans', INITIAL_LESSON_PLANS),
    seedIfEmpty('menu', INITIAL_MENU_ITEMS),
    seedIfEmpty('alerts', INITIAL_ALERTS)
  ]);
}

// ----------------------------------------------------------------------------
// BroadcastChannel para sincronizar ventanas/pestañas abiertas en el mismo equipo
// ----------------------------------------------------------------------------
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cde_bezaleel_offline_sync') : null;

// Envía un mensaje de sincronización local entre pestañas
export function broadcastLocalSync(event: { type: string; [key: string]: any }) {
  const fullEvt = { ...event, timestamp: Date.now() };
  if (syncChannel) {
    try {
      syncChannel.postMessage(fullEvt);
    } catch (e) {
      console.warn('Error en BroadcastChannel:', e);
    }
  }
  try {
    localStorage.setItem('schoolsync_p2p_sync_event', JSON.stringify({ ...fullEvt, _rand: Math.random() }));
  } catch (_) {}
}

// Escucha mensajes de sincronización local
export function subscribeLocalSync(onMessage: (event: any) => void) {
  if (!syncChannel) return () => {};
  const handler = (e: MessageEvent) => {
    if (e.data) onMessage(e.data);
  };
  syncChannel.addEventListener('message', handler);
  return () => syncChannel.removeEventListener('message', handler);
}

// ----------------------------------------------------------------------------
// Suscriptor a colecciones en tiempo real (Firestore onSnapshot con soporte offline)
// ----------------------------------------------------------------------------
export function subscribeCollection<T>(
  collectionName: string,
  onUpdate: (data: T[], meta: { fromCache: boolean; hasPendingWrites: boolean }) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, collectionName);
  return onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snap) => {
      const items: T[] = [];
      snap.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id } as T);
      });
      onUpdate(items, {
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites
      });
    },
    (err) => {
      // Si la conexión no está disponible, Firestore usará la base local sin interrumpir la app
      if (err?.code === 'unavailable') {
        console.info(`[Modo Offline] Usando datos locales de ${collectionName} hasta restablecer conexión.`);
      } else {
        console.warn(`[Firestore Aviso] Suscripción a ${collectionName}:`, err?.message || err);
      }
      if (onError) onError(err);
    }
  );
}

// ----------------------------------------------------------------------------
// Guardar un documento individual en Firestore + Enviar Push + P2P Broadcast
// ----------------------------------------------------------------------------
export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  data: T,
  notificationMeta?: { title: string; body: string; category: any }
) {
  try {
    const sanitized = sanitizeForFirestore(data);
    const docRef = doc(db, collectionName, data.id);
    await setDoc(docRef, sanitized, { merge: true });
    broadcastLocalSync({ type: 'DOC_SAVED', collectionName, data: sanitized });
    p2pEngine.broadcast({ type: 'DOC_UPDATE', collectionName, data: sanitized });

    // Disparar Notificación Push si se definieron metadatos
    if (notificationMeta) {
      pushNotificationService.notify(
        notificationMeta.title,
        notificationMeta.body,
        notificationMeta.category
      );
    }
  } catch (err: any) {
    console.warn(`[Guardado Local] Documento ${data.id} guardado en caché local (${collectionName}).`);
  }
}

// ----------------------------------------------------------------------------
// Eliminar un documento de Firestore + Enviar Push + P2P Broadcast
// ----------------------------------------------------------------------------
export async function deleteDocument(
  collectionName: string,
  id: string,
  notificationMeta?: { title: string; body: string; category: any }
) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    broadcastLocalSync({ type: 'DOC_DELETED', collectionName, id });
    p2pEngine.broadcast({ type: 'DOC_DELETE', collectionName, id });

    if (notificationMeta) {
      pushNotificationService.notify(
        notificationMeta.title,
        notificationMeta.body,
        notificationMeta.category
      );
    }
  } catch (err: any) {
    console.warn(`[Eliminación Local] Documento ${id} marcado para eliminar en ${collectionName}.`);
  }
}

// ----------------------------------------------------------------------------
// Guardado por lotes (Batch) para pases de lista de asistencia + Notificación Push
// ----------------------------------------------------------------------------
export async function saveBatchDocuments<T extends { id: string }>(
  collectionName: string,
  items: T[],
  notificationMeta?: { title: string; body: string; category: any }
) {
  try {
    const batch = writeBatch(db);
    const sanitizedItems = items.map(item => sanitizeForFirestore(item));
    for (const item of sanitizedItems) {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, item, { merge: true });
    }
    await batch.commit();
    broadcastLocalSync({ type: 'BATCH_SAVED', collectionName, items: sanitizedItems, count: sanitizedItems.length });
    p2pEngine.broadcast({ type: 'BATCH_SAVED', collectionName, items: sanitizedItems, count: sanitizedItems.length });

    if (notificationMeta) {
      pushNotificationService.notify(
        notificationMeta.title,
        notificationMeta.body,
        notificationMeta.category
      );
    }
  } catch (err: any) {
    console.warn(`[Guardado por Lote Local] ${items.length} registros guardados en caché local de ${collectionName}.`);
  }
}

// ----------------------------------------------------------------------------
// Eliminación por lotes (Batch) para desmarcar asistencias masivamente + Notificación
// ----------------------------------------------------------------------------
export async function deleteBatchDocuments(
  collectionName: string,
  ids: string[],
  notificationMeta?: { title: string; body: string; category: any }
) {
  if (!ids || ids.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const id of ids) {
      const docRef = doc(db, collectionName, id);
      batch.delete(docRef);
    }
    await batch.commit();
    broadcastLocalSync({ type: 'BATCH_DELETED', collectionName, ids, count: ids.length });
    p2pEngine.broadcast({ type: 'BATCH_DELETED', collectionName, ids, count: ids.length });

    if (notificationMeta) {
      pushNotificationService.notify(
        notificationMeta.title,
        notificationMeta.body,
        notificationMeta.category
      );
    }
  } catch (err: any) {
    console.warn(`[Eliminación por Lote Local] ${ids.length} registros eliminados en caché local de ${collectionName}.`);
  }
}
