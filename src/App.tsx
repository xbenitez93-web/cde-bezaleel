// ============================================================================
// COMPONENTE RAÍZ PRINCIPAL DE LA APLICACIÓN (APP - ESPAÑOL)
// ============================================================================
// Este archivo coordina:
// 1. Los proveedores globales de Tema (ThemeContext) y Estado Escolar (AppContext).
// 2. Control de acceso y pantalla de inicio de sesión (LoginView).
// 3. Renderizado adaptable según el estilo de interfaz (Móvil, Dashboard lateral, Clásico).
// 4. Conmutación dinámica de vistas según la pestaña seleccionada.
// 5. Alertas flotantes (InAppNotificationToast), asistente inicial y visor de impresión.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { BottomNav } from './components/BottomNav';
import { OnboardingModal } from './components/OnboardingModal';
import { LessonPlanPrintModal } from './components/LessonPlanPrintModal';
import { InAppNotificationToast } from './components/InAppNotificationToast';
import { LoginView } from './components/LoginView';

// Importación de las vistas principales del sistema escolar
import { DashboardView } from './views/DashboardView';
import { TeachersView } from './views/TeachersView';
import { KitchenView } from './views/KitchenView';
import { AdminManagementView } from './views/AdminManagementView';
import { AgendaView } from './views/AgendaView';
import { ReportsView } from './views/ReportsView';
import { CustomizationView } from './views/CustomizationView';

// Componente interno con acceso a los contextos
const MainAppContent: React.FC = () => {
  // Verificación de estado de sesión y usuario activo
  const { isAuthenticated, currentUser } = useApp();
  
  // Estilo de interfaz activo y control de paleta de colores
  const { layoutStyle, setPaletteId, paletteId } = useTheme();

  // Estado de la pestaña activa en pantalla
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Sincronizar automáticamente la paleta de colores personalizada del usuario al iniciar sesión o cambiar de perfil
  useEffect(() => {
    if (currentUser?.themePalette && currentUser.themePalette !== paletteId) {
      setPaletteId(currentUser.themePalette as any);
    }
  }, [currentUser?.id, currentUser?.themePalette]);

  // Si no está autenticado, muestra la pantalla de inicio de sesión
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. Barra Superior con Identidad, Notificaciones y Perfiles */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Barra de Navegación Superior para el Diseño Clásico */}
      {layoutStyle === 'classic' && (
        <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
      )}

      {/* 3. Contenedor Principal Adaptable */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row pb-20 md:pb-8">
        
        {/* Barra Lateral Izquierda para el Diseño Dashboard */}
        {layoutStyle === 'dashboard' && (
          <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {/* 4. Escenario de Contenido Dinámico por Pestaña */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
          {activeTab === 'teachers' && <TeachersView />}
          {activeTab === 'kitchen' && <KitchenView />}
          {activeTab === 'admin_management' && <AdminManagementView />}
          {activeTab === 'agenda' && <AgendaView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'customization' && <CustomizationView />}
        </main>

      </div>

      {/* 5. Barra Inferior Flotante para el Diseño Móvil */}
      {layoutStyle === 'mobile' && (
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      )}

      {/* 6. Modal para Generación e Impresión de Planificaciones de Clase */}
      <LessonPlanPrintModal />

      {/* 7. Asistente y Guía Interactiva de Bienvenida */}
      <OnboardingModal />

      {/* 8. Avisos Visuales en Pantalla (Toasts de Notificaciones Push) */}
      <InAppNotificationToast />

    </div>
  );
};

// Componente Raíz que envuelve con los Providers globales
export function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
