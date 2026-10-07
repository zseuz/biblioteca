/**
 * Géneros literarios sugeridos al crear o editar un libro. Son solo sugerencias: el campo también
 * admite escribir un género distinto, y los géneros que ya tengan los libros registrados se
 * añaden a la lista.
 */
export const COMMON_GENRES: readonly string[] = [
  'Autoayuda',
  'Autobiografía',
  'Aventura',
  'Biografía',
  'Ciencia',
  'Ciencia ficción',
  'Clásicos',
  'Cocina',
  'Cómic y novela gráfica',
  'Cuento',
  'Distopía',
  'Drama',
  'Economía y negocios',
  'Ensayo',
  'Fábula',
  'Fantasía',
  'Filosofía',
  'Historia',
  'Humor',
  'Infantil',
  'Informática',
  'Juvenil',
  'Misterio',
  'Novela',
  'Novela histórica',
  'Novela negra',
  'Poesía',
  'Psicología',
  'Realismo mágico',
  'Religión y espiritualidad',
  'Romance',
  'Teatro',
  'Tecnología',
  'Terror',
  'Viajes',
];

/** Normaliza para comparar sin distinguir mayúsculas, tildes ni espacios sobrantes. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Une los géneros sugeridos con los ya usados por los libros, sin repetir (aunque cambien
 * mayúsculas o tildes) y ordenados alfabéticamente. Si un género existe en ambos lados, gana la
 * grafía de los libros registrados, para que la lista refleje lo que ya hay en el catálogo.
 */
export function mergeGenres(existing: readonly string[]): string[] {
  const byKey = new Map<string, string>();
  for (const genre of COMMON_GENRES) {
    byKey.set(normalize(genre), genre);
  }
  for (const genre of existing) {
    const clean = genre?.trim();
    if (clean) byKey.set(normalize(clean), clean);
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, 'es'));
}
