import { COMMON_GENRES, mergeGenres } from './genres';

/** Lista de géneros del formulario: sugeridos + los del catálogo, sin repetidos y en orden. */
describe('mergeGenres', () => {
  it('incluye los géneros sugeridos aunque no haya libros', () => {
    const result = mergeGenres([]);
    expect(result).toEqual(expect.arrayContaining(['Novela', 'Terror', 'Ciencia ficción']));
    expect(result.length).toBe(COMMON_GENRES.length);
  });

  it('añade los géneros ya usados en el catálogo, también los que no son sugeridos', () => {
    expect(mergeGenres(['Cyberpunk', 'Novela'])).toContain('Cyberpunk');
  });

  it('no repite géneros que solo cambian en mayúsculas, tildes o espacios y prefiere la grafía del catálogo', () => {
    const result = mergeGenres(['ciencia ficcion', '  TERROR ']);
    expect(result.filter((g) => g.toLowerCase().startsWith('ciencia fic'))).toEqual(['ciencia ficcion']);
    expect(result.filter((g) => g.toLowerCase() === 'terror')).toEqual(['TERROR']);
  });

  it('ignora vacíos y devuelve la lista ordenada', () => {
    const result = mergeGenres(['', '   ']);
    expect(result).toEqual([...result].sort((a, b) => a.localeCompare(b, 'es')));
    expect(result).not.toContain('');
  });
});
