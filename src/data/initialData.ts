import { Student, Section, Teacher, UserProfile, AttendanceRecord, LessonPlan, MenuItem, EventAlert, ShoppingEventList } from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'u-1',
    name: 'Dra. María Elena Ramos',
    email: 'admin@bezaleel.edu',
    username: 'admin',
    password: '123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    themePalette: 'school_blue'
  }
];

export const INITIAL_SECTIONS: Section[] = [];

export const INITIAL_TEACHERS: Teacher[] = [];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_LESSON_PLANS: LessonPlan[] = [];

export const INITIAL_MENU_ITEMS: MenuItem[] = [];

export const INITIAL_ALERTS: EventAlert[] = [];

export const INITIAL_SHOPPING_EVENT_LISTS: ShoppingEventList[] = [
  {
    id: 'list-1',
    title: 'Lista de Compras - Festival de la Primavera',
    description: 'Materiales didácticos, decoración y refrigerios para el festival primaveral escolar.',
    type: 'compras',
    eventDate: '2026-03-21',
    budget: 1850,
    priority: 'alta',
    authorName: 'Dra. María Elena Ramos',
    createdAt: new Date().toISOString(),
    items: [
      { id: 'item-1', text: 'Cartulinas de colores brillantes (verde, amarillo, rosa)', quantity: '30', unit: 'piezas', estimatedPrice: 150, completed: true, category: 'Decoración' },
      { id: 'item-2', text: 'Pinturas acrílicas lavables y pinceles infantiles', quantity: '12', unit: 'sets', estimatedPrice: 380, completed: true, category: 'Arte' },
      { id: 'item-3', text: 'Globos biodegradables surtidos para arco', quantity: '3', unit: 'paquetes', estimatedPrice: 120, completed: false, category: 'Decoración' },
      { id: 'item-4', text: 'Vasos y platos compostables para el refrigerio', quantity: '100', unit: 'piezas', estimatedPrice: 200, completed: false, category: 'Alimentos' },
      { id: 'item-5', text: 'Fruta fresca de temporada (sandía, melón, uvas)', quantity: '10', unit: 'kg', estimatedPrice: 350, completed: false, category: 'Alimentos' },
      { id: 'item-6', text: 'Cintas adhesivas, silicón frío y tijeras punta redonda', quantity: '5', unit: 'sets', estimatedPrice: 220, completed: false, category: 'Papelería' }
    ]
  },
  {
    id: 'list-2',
    title: 'Checklist de Preparación - Kermés y Día Familiar',
    description: 'Coordinación logística, montaje de toldos, sonido y dinámicas recreativas.',
    type: 'evento',
    eventDate: '2026-04-18',
    budget: 3200,
    priority: 'alta',
    authorName: 'Coordinación Escolar',
    createdAt: new Date().toISOString(),
    items: [
      { id: 'ev-1', text: 'Verificar instalación de toldos y mesas en patio central', quantity: '1', unit: 'área', completed: true, category: 'Logística' },
      { id: 'ev-2', text: 'Probar equipo de audio y micrófonos inalámbricos', quantity: '2', unit: 'micrófonos', completed: true, category: 'Tecnología' },
      { id: 'ev-3', text: 'Instalar botiquín de primeros auxilios en módulo de enfermería', quantity: '1', unit: 'kit', completed: false, category: 'Seguridad' },
      { id: 'ev-4', text: 'Colocar señalizaciones de stands y juegos didácticos', quantity: '10', unit: 'letreros', completed: false, category: 'Montaje' },
      { id: 'ev-5', text: 'Recepción y refrigeración de aguas frescas e insumos de comida', quantity: '50', unit: 'litros', completed: false, category: 'Alimentos' }
    ]
  }
];

