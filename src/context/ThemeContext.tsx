// ============================================================================
// CONTEXTO DE TEMA Y PALETAS DE COLOR DE LA ESCUELA (THEME CONTEXT - ESPAÑOL)
// ============================================================================
// Este archivo administra:
// 1. Las 11 paletas de colores oficiales de la institución.
// 2. Aplicación dinámica de variables CSS (--theme-primary, --theme-accent, etc.) en el DOM.
// 3. Modos Claro / Oscuro con soporte completo de contraste.
// 4. Estilos de interfaz (Móvil, Dashboard lateral, Portal clásico).
// 5. Persistencia en LocalStorage y sincronización con el perfil de usuario.
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ColorPalette, ColorPaletteId, ThemeMode, UILayoutStyle } from '../types';

export const COLOR_PALETTES: Record<ColorPaletteId, ColorPalette> = {
  school_blue: {
    id: 'school_blue',
    name: 'Azul Escolar Institucional',
    description: 'Estilo profesional universitario e infantil clásico',
    primary: '#1e40af', // blue-800
    primaryHover: '#1d4ed8', // blue-700
    secondary: '#0284c7', // sky-600
    accent: '#38bdf8', // sky-400
    ring: 'rgba(30, 64, 175, 0.4)',
    bgLight: '#f8fafc',
    bgDark: '#0f172a',
    cardLight: '#ffffff',
    cardDark: '#1e293b',
    textLight: '#0f172a',
    textDark: '#f8fafc',
    badgeBg: '#dbeafe',
    previewGradient: 'from-blue-700 via-indigo-800 to-slate-900'
  },
  emerald_edu: {
    id: 'emerald_edu',
    name: 'Verde Esmeralda Educación',
    description: 'Tono fresco, dinámico y enfocado en el crecimiento pedagógico',
    primary: '#059669', // emerald-600
    primaryHover: '#047857',
    secondary: '#10b981',
    accent: '#34d399',
    ring: 'rgba(5, 150, 105, 0.4)',
    bgLight: '#f0fdf4',
    bgDark: '#064e3b',
    cardLight: '#ffffff',
    cardDark: '#065f46',
    textLight: '#064e3b',
    textDark: '#ecfdf5',
    badgeBg: '#d1fae5',
    previewGradient: 'from-emerald-600 via-teal-700 to-slate-900'
  },
  elegant_dark: {
    id: 'elegant_dark',
    name: 'Elegante Oscuro (Indigo & Zinc)',
    description: 'Diseño prémium en modo oscuro con lona negra refinada y acentos índigo',
    primary: '#4f46e5', // indigo-600
    primaryHover: '#4338ca', // indigo-700
    secondary: '#6366f1', // indigo-500
    accent: '#818cf8', // indigo-400
    ring: 'rgba(79, 70, 229, 0.4)',
    bgLight: '#f8fafc',
    bgDark: '#0a0a0b',
    cardLight: '#ffffff',
    cardDark: '#141417',
    textLight: '#09090b',
    textDark: '#e4e4e7',
    badgeBg: 'rgba(79, 70, 229, 0.18)',
    previewGradient: 'from-indigo-600 via-zinc-900 to-black'
  },
  sunset_amber: {
    id: 'sunset_amber',
    name: 'Ámbar Atardecer',
    description: 'Cálido, enérgico y acogedor para los más pequeños',
    primary: '#d97706', // amber-600
    primaryHover: '#b45309',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    ring: 'rgba(217, 119, 6, 0.4)',
    bgLight: '#fffbeb',
    bgDark: '#451a03',
    cardLight: '#ffffff',
    cardDark: '#78350f',
    textLight: '#451a03',
    textDark: '#fef3c7',
    badgeBg: '#fef3c7',
    previewGradient: 'from-amber-600 via-orange-700 to-stone-900'
  },
  soft_violet: {
    id: 'soft_violet',
    name: 'Violeta Pedagógico',
    description: 'Elegante, creativo y estimulante para la imaginación',
    primary: '#7c3aed', // violet-600
    primaryHover: '#6d28d9',
    secondary: '#8b5cf6',
    accent: '#a78bfa',
    ring: 'rgba(124, 58, 237, 0.4)',
    bgLight: '#f5f3ff',
    bgDark: '#2e1065',
    cardLight: '#ffffff',
    cardDark: '#3b0764',
    textLight: '#2e1065',
    textDark: '#f5f3ff',
    badgeBg: '#ede9fe',
    previewGradient: 'from-violet-600 via-purple-800 to-slate-950'
  },
  pastel_kinder: {
    id: 'pastel_kinder',
    name: 'Maternal Pastel',
    description: 'Combinación multicolor alegre y acogedora preescolar',
    primary: '#ea580c', // orange-600
    primaryHover: '#c2410c',
    secondary: '#ec4899', // pink-500
    accent: '#06b6d4', // cyan-500
    ring: 'rgba(234, 88, 12, 0.4)',
    bgLight: '#fdf4ff',
    bgDark: '#4a044e',
    cardLight: '#ffffff',
    cardDark: '#701a75',
    textLight: '#3b0764',
    textDark: '#fae8ff',
    badgeBg: '#fce7f3',
    previewGradient: 'from-pink-500 via-orange-500 to-indigo-600'
  },
  forest_green: {
    id: 'forest_green',
    name: 'Verde Bosque Natural',
    description: 'Inspirado en ambientes ecológicos y aprendizaje libre',
    primary: '#15803d', // green-700
    primaryHover: '#166534',
    secondary: '#22c55e',
    accent: '#4ade80',
    ring: 'rgba(21, 128, 61, 0.4)',
    bgLight: '#f7fee7',
    bgDark: '#14532d',
    cardLight: '#ffffff',
    cardDark: '#166534',
    textLight: '#14532d',
    textDark: '#f0fdf4',
    badgeBg: '#dcfce7',
    previewGradient: 'from-green-700 via-emerald-800 to-zinc-950'
  },
  warm_coral: {
    id: 'warm_coral',
    name: 'Coral Cálido',
    description: 'Vibrante, moderno y con excelente contraste visual',
    primary: '#e11d48', // rose-600
    primaryHover: '#be123c',
    secondary: '#f43f5e',
    accent: '#fb7185',
    ring: 'rgba(225, 29, 72, 0.4)',
    bgLight: '#fff1f2',
    bgDark: '#4c0519',
    cardLight: '#ffffff',
    cardDark: '#881337',
    textLight: '#4c0519',
    textDark: '#ffe4e6',
    badgeBg: '#ffe4e6',
    previewGradient: 'from-rose-600 via-red-800 to-stone-950'
  },
  midnight_indigo: {
    id: 'midnight_indigo',
    name: 'Medianoche Índigo',
    description: 'Tema oscuro de alto contraste y visión nocturna descansada',
    primary: '#4338ca', // indigo-700
    primaryHover: '#3730a3',
    secondary: '#6366f1',
    accent: '#38bdf8',
    ring: 'rgba(67, 56, 202, 0.4)',
    bgLight: '#eef2ff',
    bgDark: '#030712',
    cardLight: '#ffffff',
    cardDark: '#111827',
    textLight: '#1e1b4b',
    textDark: '#f3f4f6',
    badgeBg: '#e0e7ff',
    previewGradient: 'from-indigo-700 via-slate-900 to-black'
  },
  rose_minimal: {
    id: 'rose_minimal',
    name: 'Rosa Minimalista',
    description: 'Suave, limpio y con una estética contemporánea refinada',
    primary: '#db2777', // pink-600
    primaryHover: '#be185d',
    secondary: '#f472b6',
    accent: '#fb7185',
    ring: 'rgba(219, 39, 119, 0.4)',
    bgLight: '#fdf2f8',
    bgDark: '#500724',
    cardLight: '#ffffff',
    cardDark: '#831843',
    textLight: '#500724',
    textDark: '#fce7f3',
    badgeBg: '#fce7f3',
    previewGradient: 'from-pink-600 via-rose-800 to-stone-950'
  },
  deep_ocean: {
    id: 'deep_ocean',
    name: 'Océano Profundo',
    description: 'Tonos turquesa y marino relajante para mayor concentración',
    primary: '#0d9488', // teal-600
    primaryHover: '#0f766e',
    secondary: '#14b8a6',
    accent: '#2dd4bf',
    ring: 'rgba(13, 148, 136, 0.4)',
    bgLight: '#f0fdfa',
    bgDark: '#042f2e',
    cardLight: '#ffffff',
    cardDark: '#115e59',
    textLight: '#042f2e',
    textDark: '#ccfbf1',
    badgeBg: '#ccfbf1',
    previewGradient: 'from-teal-600 via-cyan-800 to-slate-950'
  }
};

interface ThemeContextType {
  mode: ThemeMode;
  layoutStyle: UILayoutStyle;
  paletteId: ColorPaletteId;
  currentPalette: ColorPalette;
  colorPalettes: ColorPalette[];
  toggleMode: () => void;
  setLayoutStyle: (style: UILayoutStyle) => void;
  setPaletteId: (id: ColorPaletteId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('schoolsync_theme_mode') as ThemeMode) || 'dark';
  });

  const [layoutStyle, setLayoutStyleState] = useState<UILayoutStyle>(() => {
    return (localStorage.getItem('schoolsync_layout_style') as UILayoutStyle) || 'dashboard';
  });

  const [paletteId, setPaletteIdState] = useState<ColorPaletteId>(() => {
    const saved = localStorage.getItem('schoolsync_palette_id') as ColorPaletteId;
    return saved && COLOR_PALETTES[saved] ? saved : 'school_blue';
  });

  const toggleMode = () => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('schoolsync_theme_mode', next);
      return next;
    });
  };

  const setLayoutStyle = (style: UILayoutStyle) => {
    setLayoutStyleState(style);
    localStorage.setItem('schoolsync_layout_style', style);
  };

  const setPaletteId = (id: ColorPaletteId) => {
    if (COLOR_PALETTES[id]) {
      setPaletteIdState(id);
      localStorage.setItem('schoolsync_palette_id', id);
    }
  };

  const currentPalette = COLOR_PALETTES[paletteId] || COLOR_PALETTES.school_blue;
  const colorPalettes = Object.values(COLOR_PALETTES);

  // Aplicar modo claro/oscuro en el elemento raíz
  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  // Aplicar variables CSS dinámicas de la paleta activa
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', currentPalette.primary);
    root.style.setProperty('--theme-primary-hover', currentPalette.primaryHover);
    root.style.setProperty('--theme-secondary', currentPalette.secondary || currentPalette.primary);
    root.style.setProperty('--theme-accent', currentPalette.accent);
    root.style.setProperty('--theme-ring', currentPalette.ring || 'rgba(30, 64, 175, 0.4)');
    root.style.setProperty('--theme-badge-bg', currentPalette.badgeBg);
    root.style.setProperty('--theme-bg-light', currentPalette.bgLight);
    root.style.setProperty('--theme-bg-dark', currentPalette.bgDark);
    root.style.setProperty('--theme-card-light', currentPalette.cardLight);
    root.style.setProperty('--theme-card-dark', currentPalette.cardDark);
    root.style.setProperty('--theme-text-light', currentPalette.textLight);
    root.style.setProperty('--theme-text-dark', currentPalette.textDark);
  }, [currentPalette, mode]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        layoutStyle,
        paletteId,
        currentPalette,
        colorPalettes,
        toggleMode,
        setLayoutStyle,
        setPaletteId
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return context;
};
