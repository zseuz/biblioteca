import { normalizeText } from './text';

/** Normalización de texto de las búsquedas: sin mayúsculas, tildes ni espacios sobrantes. */
describe('normalizeText', () => {
  it('ignora mayúsculas y tildes', () => {
    expect(normalizeText('García Márquez')).toBe('garcia marquez');
    expect(normalizeText('DÍAZ')).toBe('diaz');
  });

  it('trata la ñ como n, igual que el servidor', () => {
    expect(normalizeText('Cien años')).toBe('cien anos');
  });

  it('recorta y unifica los espacios', () => {
    expect(normalizeText('  Ana   Torres ')).toBe('ana torres');
  });

  it('acepta vacíos', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});
