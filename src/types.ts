export type UserRole = 'admin' | 'maestro' | 'cocinera';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  assignedGrade?: string; // E.g. "Sección A - 3 Años"
  avatar?: string;
  themePalette?: ColorPaletteId;
}

export type User = UserProfile;

export interface Student {
  id: string;
  fullName: string;
  sectionId: string; // Grade / Section ID
  age: number;
  tutorName: string;
  tutorPhone: string;
  allergies?: string;
  notes?: string;
  active: boolean;
}

export interface Section {
  id: string;
  name: string; // e.g., "Maternal A", "Sección B - 4 Años"
  ageGroup: string; // e.g., "3 a 4 años"
  capacity: number;
  assignedTeacherId?: string;
  mainTeacherId?: string;
  roomNumber?: string;
}

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  sectionId?: string;
  assignedSectionId?: string;
  specialty?: string;
  status?: 'activo' | 'licencia' | 'inactivo';
  active?: boolean;
}

export type AttendanceStatus = 'presente' | 'ausente' | 'retardo' | 'justificado';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  sectionId: string;
  status: AttendanceStatus;
  notes?: string;
  registeredBy: string; // User ID / name
  timestamp: string;
}

export interface LessonPlan {
  id: string;
  teacherName: string;
  teacherId: string;
  sectionName: string;
  childrenAge: string;
  date: string; // YYYY-MM-DD
  subject: string;
  objective: string;
  development: string; // Topic development, activities
  closing: string; // Evaluation & closing
  materials?: string;
  duration?: string; // '1 Día', '1 Semana', '2 Semanas', '1 Mes'
  weeklyBreakdown?: string;
  images?: string[]; // 1 or 2 illustrative images for topic development
  aiGenerated?: boolean;
  createdAt: string;
}

export interface IngredientCostItem {
  ingredient: string;
  quantity: string;
  estimatedCost: number;
}

export interface MenuItem {
  id: string;
  dayOfWeek: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';
  mealType: 'Desayuno' | 'Almuerzo' | 'Merienda';
  dishName: string;
  description: string;
  ingredients: string[];
  allergensWarning?: string;
  portionCount: number;
  preparationSteps?: string[];
  difficultyLevel?: 'Fácil / Rápido' | 'Económico y Nutritivo' | 'Estándar' | 'Gourmet Infantil';
  studentCount?: number;
  costPerStudent?: number;
  totalBudget?: number;
  ingredientCosts?: IngredientCostItem[];
}

export interface EventAlert {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  category: 'urgente' | 'general' | 'actividad' | 'reunion' | 'evento';
  targetAudience?: 'todos' | 'maestros' | 'padres' | 'cocina';
  targetRole?: string;
  author?: string;
  authorName?: string;
  createdAt?: string;
}

export type AlertItem = EventAlert;

export type UILayoutStyle = 'mobile' | 'dashboard' | 'classic';
export type ThemeMode = 'light' | 'dark';

export type ColorPaletteId = 
  | 'elegant_dark'
  | 'school_blue'
  | 'emerald_edu'
  | 'sunset_amber'
  | 'soft_violet'
  | 'pastel_kinder'
  | 'forest_green'
  | 'warm_coral'
  | 'midnight_indigo'
  | 'rose_minimal'
  | 'deep_ocean';

export interface ColorPalette {
  id: ColorPaletteId;
  name: string;
  description: string;
  primary: string;
  primaryHover: string;
  secondary?: string;
  accent: string;
  ring?: string;
  bgLight: string;
  bgDark: string;
  cardLight: string;
  cardDark: string;
  textLight: string;
  textDark: string;
  badgeBg: string;
  previewGradient: string;
}

export type ConnectivityMode = 'hybrid' | 'p2p_local' | 'cloud_firebase';

export interface ConnectivityState {
  mode: ConnectivityMode;
  firebaseConnected: boolean;
  p2pActive: boolean;
  connectedPeers: number;
  pendingSyncCount: number;
  lastSyncTime: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  quantity?: string;
  unit?: string;
  estimatedPrice?: number;
  completed: boolean;
  notes?: string;
  category?: string;
}

export interface ShoppingEventList {
  id: string;
  title: string;
  description?: string;
  type?: 'compras' | 'evento' | 'insumos' | 'actividad' | 'general';
  category?: 'compras_cocina' | 'material_didactico' | 'evento_escolar' | 'mantenimiento' | 'otro';
  eventDate?: string;
  budget?: number;
  estimatedBudget?: number;
  items: ChecklistItem[];
  authorName: string;
  createdAt: string;
  priority?: 'alta' | 'media' | 'normal';
}

export interface AttendanceSignaturesConfig {
  teacherName: string;
  teacherTitle?: string;
  teacherRole?: string;
  showMiddleSignature: boolean;
  middleName?: string;
  middleTitle?: string;
  middleSignatureName?: string;
  middleSignatureRole?: string;
  directorName: string;
  directorTitle?: string;
  principalName?: string;
  principalRole?: string;
  signaturesOrder?: ('teacher' | 'middle' | 'director')[];
  layoutOrientation?: 'horizontal' | 'vertical';
}

