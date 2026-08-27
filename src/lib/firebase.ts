// ============================================================================
// CONFIGURACIÓN E INICIALIZACIÓN DE GOOGLE FIREBASE FIRESTORE (ESPAÑOL)
// ============================================================================
// Este archivo inicializa la conexión con la base de datos en la nube (Cloud Firestore).
// Incluye soporte para persistencia sin conexión (IndexedDB con múltiples pestañas)
// para que el sistema funcione perfectamente incluso si se interrumpe el internet.
// ============================================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// 1. Inicializar la app de Firebase si no ha sido creada previamente
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Determinar el identificador de la base de datos Firestore
const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

// 3. Inicializar Firestore con caché persistente para múltiples pestañas sin desconexiones
let firestoreInstance: Firestore;

try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager() // Permite sincronizar múltiples pestañas abiertas simultáneamente
    })
  }, databaseId);
} catch (error) {
  // Si ya estaba inicializado o el navegador restringe inicialización secundaria
  firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

// 4. Exportar la instancia de base de datos activa
export const db = firestoreInstance;

// 5. Exportar la configuración del proyecto escolar
export { firebaseConfig };
