import { describe, expect, it, vi } from 'vitest';
import { invalidateResource, invalidateTacheAndDependents, queryKeys } from '../queryKeys';

describe('queryKeys — taches', () => {
  it('all is a plain string tuple', () => {
    expect(queryKeys.taches.all).toEqual(['taches']);
  });

  it('lists extends all with "list"', () => {
    expect(queryKeys.taches.lists()).toEqual(['taches', 'list']);
  });

  it('list without filters equals lists()', () => {
    expect(queryKeys.taches.list()).toEqual(queryKeys.taches.lists());
  });

  it('list with filters appends the filters object', () => {
    const filters = { clientId: 1 };
    const key = queryKeys.taches.list(filters);
    expect(key).toEqual(['taches', 'list', filters]);
  });

  it('detail builds ["taches", "detail", id]', () => {
    expect(queryKeys.taches.detail(42)).toEqual(['taches', 'detail', 42]);
  });
});

describe('queryKeys — taskDetails', () => {
  it('builds photos / consommations / combined keys', () => {
    expect(queryKeys.taskDetails.photos(1)).toEqual(['taskDetails', 'photos', 1]);
    expect(queryKeys.taskDetails.consommations(1)).toEqual(['taskDetails', 'consommations', 1]);
    expect(queryKeys.taskDetails.combined(1)).toEqual(['taskDetails', 'combined', 1]);
  });
});

describe('queryKeys — distributions', () => {
  it('builds list / parJour / detail / historique keys', () => {
    expect(queryKeys.distributions.list()).toEqual(['distributions', 'list']);
    expect(queryKeys.distributions.parJour('2025-05-01')).toEqual([
      'distributions',
      'par-jour',
      '2025-05-01',
    ]);
    expect(queryKeys.distributions.detail(7)).toEqual(['distributions', 'detail', 7]);
    expect(queryKeys.distributions.historique(7)).toEqual(['distributions', 'historique', 7]);
  });
});

describe('queryKeys — reclamations', () => {
  it('stats without filters ends with "stats"', () => {
    expect(queryKeys.reclamations.stats()).toEqual(['reclamations', 'stats']);
  });

  it('stats with filters appends the object', () => {
    const f = { statut: 'OUVERT' };
    expect(queryKeys.reclamations.stats(f)).toEqual(['reclamations', 'stats', f]);
  });

  it('detail is keyed on id', () => {
    expect(queryKeys.reclamations.detail(12)).toEqual(['reclamations', 'detail', 12]);
  });
});

describe('queryKeys — referenceData + kpis + user', () => {
  it('referenceData keys are namespaced', () => {
    expect(queryKeys.referenceData.typesTaches()).toEqual(['referenceData', 'typesTaches']);
    expect(queryKeys.referenceData.equipes()).toEqual(['referenceData', 'equipes']);
  });

  it('kpis.current includes month + siteId', () => {
    expect(queryKeys.kpis.current('2025-05', 3)).toEqual(['kpis', 'current', '2025-05', 3]);
  });

  it('kpis.historique includes siteId + nbMois', () => {
    expect(queryKeys.kpis.historique(3, 12)).toEqual(['kpis', 'historique', 3, 12]);
  });

  it('user.current is a stable literal', () => {
    expect(queryKeys.user.current).toEqual(['user', 'current']);
  });
});

describe('queryKeys — sites / utilisateurs / clients / structures', () => {
  it.each([
    ['sites', queryKeys.sites],
    ['utilisateurs', queryKeys.utilisateurs],
    ['clients', queryKeys.clients],
    ['structures', queryKeys.structures],
  ] as const)('%s.list / detail follow the standard shape', (_name, group) => {
    expect(group.list()).toEqual([_name, 'list']);
    expect((group as any).detail(99)).toEqual([_name, 'detail', 99]);
  });

  it('sites.statistics is keyed per-site', () => {
    expect(queryKeys.sites.statistics('abc')).toEqual(['sites', 'statistics', 'abc']);
  });
});

describe('invalidateResource', () => {
  const mkClient = () => ({ invalidateQueries: vi.fn() });

  it('invalidates the group.all key when no id is given', () => {
    const qc = mkClient();
    invalidateResource(qc as never, 'taches');
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['taches'] });
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('invalidates both group.all AND group.detail(id) when id is provided', () => {
    const qc = mkClient();
    invalidateResource(qc as never, 'taches', 5);
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(2);
    expect(qc.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.taches.all,
    });
    expect(qc.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.taches.detail(5),
    });
  });

  it('works for reclamations', () => {
    const qc = mkClient();
    invalidateResource(qc as never, 'reclamations', 12);
    expect(qc.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.reclamations.detail(12),
    });
  });
});

describe('invalidateTacheAndDependents', () => {
  it('invalidates taches + taches.detail + photos + consommations + distributions', () => {
    const qc = { invalidateQueries: vi.fn() };
    invalidateTacheAndDependents(qc as never, 7);
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(5);
    const keys = qc.invalidateQueries.mock.calls.map((c) => c[0].queryKey);
    expect(keys).toContainEqual(queryKeys.taches.all);
    expect(keys).toContainEqual(queryKeys.taches.detail(7));
    expect(keys).toContainEqual(queryKeys.taskDetails.photos(7));
    expect(keys).toContainEqual(queryKeys.taskDetails.consommations(7));
    expect(keys).toContainEqual(queryKeys.distributions.all);
  });
});
