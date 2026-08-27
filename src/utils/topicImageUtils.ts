/**
 * Generates 1 or 2 illustrative topic image URLs based on the lesson plan subject/theme.
 */
export function getTopicImages(subject: string): string[] {
  if (!subject) {
    return [
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=800&q=80'
    ];
  }

  const s = subject.toLowerCase();

  // Colores, Arte, Pintura
  if (s.includes('color') || s.includes('pintur') || s.includes('arte') || s.includes('textura') || s.includes('dibujo') || s.includes('creativ')) {
    return [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80'
    ];
  }

  // Matemáticas, Números, Conteo, Formas, Geometría
  if (s.includes('matem') || s.includes('número') || s.includes('numero') || s.includes('contar') || s.includes('conteo') || s.includes('forma') || s.includes('geometr')) {
    return [
      'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1618842676088-c4d48a6a7c9d?auto=format&fit=crop&w=800&q=80'
    ];
  }

  // Naturaleza, Medio Ambiente, Plantas, Animales, Tierra, Agua
  if (s.includes('natur') || s.includes('medio') || s.includes('planta') || s.includes('animal') || s.includes('ecolog') || s.includes('jard') || s.includes('agua') || s.includes('tierra')) {
    return [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80'
    ];
  }

  // Ciencia, Experimentos, Sistema Solar, Espacio, Descubrimiento
  if (s.includes('cienc') || s.includes('experim') || s.includes('espacio') || s.includes('solar') || s.includes('descubr') || s.includes('laborat')) {
    return [
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'
    ];
  }

  // Lectura, Cuentos, Letras, Lenguaje, Libros, Vocabulario
  if (s.includes('lectu') || s.includes('cuento') || s.includes('letra') || s.includes('lengua') || s.includes('libro') || s.includes('vocabular') || s.includes('palabra')) {
    return [
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80'
    ];
  }

  // Música, Sonido, Cantos, Baile, Danza, Ritmo
  if (s.includes('músic') || s.includes('music') || s.includes('canto') || s.includes('cancion') || s.includes('canción') || s.includes('baile') || s.includes('danza') || s.includes('ritmo')) {
    return [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
    ];
  }

  // Motricidad, Deportes, Juegos, Dinámicas
  if (s.includes('motric') || s.includes('deport') || s.includes('juego') || s.includes('cuerpo') || s.includes('movimien') || s.includes('ejercic')) {
    return [
      'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80'
    ];
  }

  // General Kinder Classroom & Activity Fallback
  return [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=800&q=80'
  ];
}
