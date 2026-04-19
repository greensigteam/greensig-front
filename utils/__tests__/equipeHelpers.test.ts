import { describe, expect, it } from 'vitest';
import { getEquipeName, formatEquipesList } from '../equipeHelpers';

describe('getEquipeName', () => {
  it('returns camelCase nomEquipe when present', () => {
    expect(getEquipeName({ nomEquipe: 'Alpha' })).toBe('Alpha');
  });

  it('falls back to snake_case nom_equipe when camelCase is missing', () => {
    expect(getEquipeName({ nom_equipe: 'Bravo' })).toBe('Bravo');
  });

  it('prefers camelCase over snake_case when both are set', () => {
    expect(getEquipeName({ nomEquipe: 'Alpha', nom_equipe: 'Bravo' })).toBe('Alpha');
  });

  it('returns the fallback when equipe is null or undefined', () => {
    expect(getEquipeName(null)).toBe('-');
    expect(getEquipeName(undefined, 'N/A')).toBe('N/A');
  });

  it('returns the fallback when both name fields are nullish', () => {
    expect(getEquipeName({}, 'N/A')).toBe('N/A');
    expect(getEquipeName({ nomEquipe: null, nom_equipe: null })).toBe('-');
  });
});

describe('formatEquipesList', () => {
  it('returns the fallback for empty or nullish lists', () => {
    expect(formatEquipesList([])).toBe('-');
    expect(formatEquipesList(null, 'N/A')).toBe('N/A');
    expect(formatEquipesList(undefined)).toBe('-');
  });

  it('joins multiple names with commas, ignoring empty values', () => {
    expect(
      formatEquipesList([{ nomEquipe: 'Alpha' }, { nom_equipe: 'Bravo' }, { nomEquipe: null }]),
    ).toBe('Alpha, Bravo');
  });

  it('returns fallback when every entry resolves to empty', () => {
    expect(formatEquipesList([{}, { nomEquipe: null }], 'N/A')).toBe('N/A');
  });
});
