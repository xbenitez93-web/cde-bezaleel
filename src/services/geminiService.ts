import { getTopicImages } from '../utils/topicImageUtils';

export interface ClassPlanRequest {
  teacherName: string;
  childrenAge: string;
  subject: string;
  objective?: string;
  sectionName?: string;
  duration?: '1 Día' | '1 Semana' | '2 Semanas' | '1 Mes';
}

export interface ClassPlanAIResponse {
  objective: string;
  development: string;
  closing: string;
  materials: string;
  duration?: string;
  weeklyBreakdown?: string;
  images?: string[];
}

export interface KitchenMenuRequest {
  dayOfWeek: string;
  mealType: string;
  targetAgeRange?: string;
  dietaryRestrictions?: string;
  difficultyLevel?: 'Fácil / Rápido' | 'Económico y Nutritivo' | 'Estándar' | 'Gourmet Infantil';
  studentCount?: number;
}

export interface IngredientCostAI {
  ingredient: string;
  quantity: string;
  estimatedCost: number;
}

export interface KitchenMenuAIResponse {
  dishName: string;
  description: string;
  ingredients: string[];
  allergensWarning?: string;
  preparationSteps?: string[];
  difficultyLevel?: string;
  studentCount?: number;
  costPerStudent?: number;
  totalBudget?: number;
  ingredientCosts?: IngredientCostAI[];
}

/**
 * Resolves the appropriate backend API endpoint depending on whether the app
 * is executing in standard Web, Android (Capacitor/Cordova) or Desktop Windows (Electron).
 */
function getApiEndpoint(route: string): string {
  try {
    const envApiUrl = (import.meta as any).env?.VITE_API_URL;
    if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim().length > 0) {
      return `${envApiUrl.trim().replace(/\/$/, '')}${route}`;
    }

    if (typeof window !== 'undefined' && window.location) {
      const { protocol, hostname } = window.location;
      // In native standalone environments (Android Capacitor, Electron file://, etc.)
      if (
        protocol === 'file:' ||
        protocol.startsWith('capacitor') ||
        protocol.startsWith('ionic') ||
        (hostname === 'localhost' && window.location.port !== '3000')
      ) {
        return `https://ais-dev-u3qf4v752x7xnu425ojpdx-439350273248.us-west2.run.app${route}`;
      }
    }
  } catch (_) {
    // Fallback to relative route
  }
  return route;
}

/**
 * Helper fetch with timeout to prevent hanging on mobile or desktop
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function generateClassPlanWithAI(req: ClassPlanRequest): Promise<ClassPlanAIResponse> {
  const endpoint = getApiEndpoint('/api/gemini/class-plan');

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    }, 18000);

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const data = await res.json();
    if (!data.images || data.images.length === 0) {
      data.images = getTopicImages(req.subject);
    }
    return data;
  } catch (err) {
    console.warn('Fallback to local pedagogic generator for Class Plan:', err);
    const durationLabel = req.duration || '1 Semana';
    return {
      objective: req.objective || `Fomentar el desarrollo integral y la curiosidad sobre "${req.subject}" en niños de ${req.childrenAge} (${durationLabel}).`,
      development: `1. Diagnóstico e Inicio (Fase 1): Actividades exploratorias, preguntas clave e introducción lúdica sobre ${req.subject}.\n2. Desarrollo Práctico y Talleres (Fase 2): Experimentos sensoriales, manipulación de formas y dinámicas de grupo guiadas por ${req.teacherName}.\n3. Aplicación y Proyecto Grupal (Fase 3): Creación colectiva de murales o maquetas temáticas y dramatización infantil.`,
      closing: 'Evaluación formativa continua mediante lista de cotejo cualitativa, asambleas diarias y portafolio de evidencias de los niños.',
      materials: 'Láminas educativas, pinturas biodegradables, bloques manipulables, papel kraft y crayones gruesos.',
      duration: durationLabel,
      weeklyBreakdown: `• Módulo 1: Descubrimiento y exploración sensorial de ${req.subject}.\n• Módulo 2: Actividades vivenciales y trabajo colaborativo.\n• Módulo 3: Presentación de logros y evaluación de competencias.`,
      images: getTopicImages(req.subject)
    };
  }
}

export async function generateKitchenMenuWithAI(req: KitchenMenuRequest): Promise<KitchenMenuAIResponse> {
  const endpoint = getApiEndpoint('/api/gemini/kitchen-menu');

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    }, 18000);

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Fallback to local nutrition engine for Kitchen Menu:', err);
    const count = req.studentCount || 35;
    const costPerChild = 16.5;
    const total = Math.round(count * costPerChild);

    return {
      dishName: `Menú ${req.difficultyLevel || 'Sencillo'} - ${req.dayOfWeek} (${req.mealType})`,
      description: `Opción muy fácil de preparar, nutritiva y deliciosa adaptada para ${count} alumnos de preescolar.`,
      ingredients: [
        `Pechuga de pollo fresca (${(count * 0.12).toFixed(1)} kg)`,
        `Verduras variadas al vapor (${(count * 0.08).toFixed(1)} kg)`,
        `Arroz integral o puré de papas (${(count * 0.1).toFixed(1)} kg)`,
        `Fruta fresca picada (${(count * 0.1).toFixed(1)} kg)`
      ],
      allergensWarning: req.dietaryRestrictions || 'Apto para preescolar. Sin frutos secos.',
      preparationSteps: [
        '1. Lavar y desinfectar cuidadosamente las verduras y frutas de estación.',
        '2. Cocinar la proteína a fuego medio con especias naturales (sin exceso de sal).',
        '3. Hervir las verduras al vapor manteniendo sus colores vibrantes y nutrientes.',
        '4. Servir porciones templadas en platos divididos infantiles para facil consumo.'
      ],
      difficultyLevel: req.difficultyLevel || 'Fácil / Rápido',
      studentCount: count,
      costPerStudent: costPerChild,
      totalBudget: total,
      ingredientCosts: [
        { ingredient: 'Pechuga de Pollo Fresca', quantity: `${(count * 0.12).toFixed(1)} kg`, estimatedCost: Math.round(total * 0.45) },
        { ingredient: 'Verduras al Vapor (Zanahoria, Calabaza)', quantity: `${(count * 0.08).toFixed(1)} kg`, estimatedCost: Math.round(total * 0.20) },
        { ingredient: 'Arroz / Puré de Papa', quantity: `${(count * 0.1).toFixed(1)} kg`, estimatedCost: Math.round(total * 0.15) },
        { ingredient: 'Fruta de Estación Picada', quantity: `${(count * 0.1).toFixed(1)} kg`, estimatedCost: Math.round(total * 0.20) }
      ]
    };
  }
}
