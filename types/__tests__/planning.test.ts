import { describe, expect, it } from 'vitest';
import {
  EMPTY_PLANNING_FILTERS,
  countActivePlanningFilters,
  type PlanningFilters,
} from '../planning';

describe('EMPTY_PLANNING_FILTERS', () => {
  it('has every field nulled / empty', () => {
    expect(EMPTY_PLANNING_FILTERS).toEqual({
      clientId: null,
      siteId: null,
      equipeId: null,
      statuts: [],
      dateDebut: null,
      dateFin: null,
      typeTacheId: null,
    });
  });

  it('is considered zero active filters', () => {
    expect(countActivePlanningFilters(EMPTY_PLANNING_FILTERS)).toBe(0);
  });
});

describe('countActivePlanningFilters', () => {
  const withPatch = (patch: Partial<PlanningFilters>): PlanningFilters => ({
    ...EMPTY_PLANNING_FILTERS,
    ...patch,
  });

  it('counts each scalar filter independently', () => {
    expect(countActivePlanningFilters(withPatch({ clientId: 1 }))).toBe(1);
    expect(countActivePlanningFilters(withPatch({ siteId: 2 }))).toBe(1);
    expect(countActivePlanningFilters(withPatch({ equipeId: 3 }))).toBe(1);
    expect(countActivePlanningFilters(withPatch({ typeTacheId: 4 }))).toBe(1);
  });

  it('counts a non-empty statuts array as one active filter', () => {
    expect(countActivePlanningFilters(withPatch({ statuts: [] }))).toBe(0);
    expect(countActivePlanningFilters(withPatch({ statuts: ['PLANIFIEE'] }))).toBe(1);
    expect(countActivePlanningFilters(withPatch({ statuts: ['PLANIFIEE', 'EN_COURS'] }))).toBe(1);
  });

  it('counts date range as a single filter regardless of which bound is set', () => {
    expect(countActivePlanningFilters(withPatch({ dateDebut: '2025-01-01' }))).toBe(1);
    expect(countActivePlanningFilters(withPatch({ dateFin: '2025-12-31' }))).toBe(1);
    expect(
      countActivePlanningFilters(withPatch({ dateDebut: '2025-01-01', dateFin: '2025-12-31' })),
    ).toBe(1);
  });

  it('sums multiple active filters correctly', () => {
    expect(
      countActivePlanningFilters(
        withPatch({
          clientId: 1,
          siteId: 2,
          equipeId: 3,
          statuts: ['EN_COURS'],
          dateDebut: '2025-01-01',
          typeTacheId: 4,
        }),
      ),
    ).toBe(6);
  });
});
