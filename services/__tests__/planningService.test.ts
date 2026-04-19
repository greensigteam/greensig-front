import { describe, expect, it, vi, beforeEach } from 'vitest';
import { planningService } from '../planningService';

vi.mock('../api', () => ({
  apiFetch: vi.fn(async () => ({
    ok: true,
    json: async () => ({ id: 1, titre: 'ok' }),
  })),
}));

import { apiFetch } from '../api';

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

const okJson = (data: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data),
});
const errJson = (status: number, body: unknown) => ({
  ok: false,
  status,
  json: () => Promise.resolve(body),
});

describe('planningService.createTache — date validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws locally when date_debut_planifiee > date_fin_planifiee', async () => {
    const data: any = {
      titre: 'Test',
      date_debut_planifiee: '2026-05-10',
      date_fin_planifiee: '2026-05-05',
    };

    await expect(planningService.createTache(data)).rejects.toMatchObject({
      message: expect.stringContaining('antérieure'),
      fieldErrors: {
        date_debut_planifiee: expect.any(Array),
        date_fin_planifiee: expect.any(Array),
      },
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('allows equal start and end dates', async () => {
    const data: any = {
      titre: 'Test',
      date_debut_planifiee: '2026-05-10',
      date_fin_planifiee: '2026-05-10',
    };
    await planningService.createTache(data);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('allows missing dates without throwing', async () => {
    const data: any = { titre: 'Test' };
    await planningService.createTache(data);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('allows valid ordered dates', async () => {
    const data: any = {
      titre: 'Test',
      date_debut_planifiee: '2026-05-01',
      date_fin_planifiee: '2026-05-31',
    };
    await planningService.createTache(data);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});

describe('planningService.updateTache — date validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws locally when update would invert the planned window', async () => {
    const data: any = {
      date_debut_planifiee: '2026-06-15',
      date_fin_planifiee: '2026-06-01',
    };

    await expect(planningService.updateTache(42, data)).rejects.toMatchObject({
      message: expect.stringContaining('antérieure'),
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('allows partial update that touches only one date', async () => {
    const data: any = { date_fin_planifiee: '2026-06-30' };
    await planningService.updateTache(42, data);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Extended coverage tests
// ============================================================================

describe('planningService — taches CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('getTaches builds query params', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [], count: 0 }));
    await planningService.getTaches({ start_date: '2026-04-01', equipe_id: 3 });
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain('start_date=2026-04-01');
    expect(url).toContain('equipe_id=3');
  });

  it('getTaches with no params calls base URL', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [], count: 0 }));
    await planningService.getTaches();
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/taches/');
  });

  it('getTaches throws on non-ok response', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(planningService.getTaches()).rejects.toThrow(
      'Erreur lors du chargement des tâches',
    );
  });

  it('getTache returns task', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 5, reference: 'T-005' }));
    const result = await planningService.getTache(5);
    expect(result.id).toBe(5);
  });

  it('getTache throws on 404', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });
    await expect(planningService.getTache(999)).rejects.toThrow('Tâche non trouvée');
  });

  it('createTache throws validation error from API', async () => {
    mockApiFetch.mockResolvedValue(errJson(400, { titre: ['Ce champ est requis'] }));
    await expect(
      planningService.createTache({
        date_debut_planifiee: '2026-04-01',
        date_fin_planifiee: '2026-04-05',
      } as any),
    ).rejects.toThrow('Ce champ est requis');
  });

  it('updateTache strips datetime to date for real dates', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
    await planningService.updateTache(1, {
      date_debut_reelle: '2026-04-01T10:30:00Z',
      date_fin_reelle: '2026-04-05T15:00:00Z',
    } as any);
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.date_debut_reelle).toBe('2026-04-01');
    expect(body.date_fin_reelle).toBe('2026-04-05');
  });

  it('deleteTache sends DELETE', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, status: 204 });
    await planningService.deleteTache(1);
    expect(mockApiFetch.mock.calls[0]![1].method).toBe('DELETE');
  });

  it('deleteTache throws specific message on 404', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });
    await expect(planningService.deleteTache(999)).rejects.toThrow('déjà été supprimée');
  });

  it('deleteTache uses API error message', async () => {
    mockApiFetch.mockResolvedValue(errJson(400, { message: 'Tâche liée à une réclamation' }));
    await expect(planningService.deleteTache(1)).rejects.toThrow('Tâche liée à une réclamation');
  });
});

describe('planningService — types taches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getTypesTaches unwraps array', async () => {
    mockApiFetch.mockResolvedValue(okJson([{ id: 1, nom: 'Taille' }]));
    const result = await planningService.getTypesTaches();
    expect(result).toEqual([{ id: 1, nom: 'Taille' }]);
  });

  it('getTypesTaches unwraps paginated', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [{ id: 1 }] }));
    const result = await planningService.getTypesTaches();
    expect(result).toEqual([{ id: 1 }]);
  });

  it('getApplicableTypesTaches with empty types returns all', async () => {
    mockApiFetch.mockResolvedValue(okJson([{ id: 1 }]));
    const result = await planningService.getApplicableTypesTaches([]);
    expect(result.types_objets_demandes).toEqual([]);
  });

  it('getApplicableTypesTaches normalizes array response', async () => {
    mockApiFetch.mockResolvedValue(okJson([{ id: 1 }]));
    const result = await planningService.getApplicableTypesTaches(['Arbre']);
    expect(result.types_taches).toEqual([{ id: 1 }]);
  });

  it('getCompatibleObjectTypes', async () => {
    mockApiFetch.mockResolvedValue(
      okJson({ type_tache_id: 1, types_objets_compatibles: ['Arbre'] }),
    );
    const result = await planningService.getCompatibleObjectTypes(1);
    expect(result.types_objets_compatibles).toContain('Arbre');
  });

  it('deleteTypeTache throws structured error', async () => {
    mockApiFetch.mockResolvedValue(
      errJson(400, { message: 'Utilisé par des tâches', error: 'protected' }),
    );
    try {
      await planningService.deleteTypeTache(1);
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.message).toBe('Utilisé par des tâches');
      expect(e.errorCode).toBe('protected');
    }
  });
});

describe('planningService — changeStatut', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets date_debut_reelle for EN_COURS', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1, statut: 'EN_COURS' }));
    await planningService.changeStatut(1, 'EN_COURS');
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.statut).toBe('EN_COURS');
    expect(body.date_debut_reelle).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('sets date_fin_reelle for TERMINEE', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1, statut: 'TERMINEE' }));
    await planningService.changeStatut(1, 'TERMINEE');
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.date_fin_reelle).toBeDefined();
  });

  it('includes motif for ANNULEE', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
    await planningService.changeStatut(1, 'ANNULEE', {
      motif_annulation: 'METEO' as any,
      commentaire_annulation: 'Pluie',
    });
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.motif_annulation).toBe('METEO');
    expect(body.commentaire_annulation).toBe('Pluie');
  });
});

describe('planningService — validerTache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends POST with etat and commentaire', async () => {
    mockApiFetch.mockResolvedValue(okJson({ message: 'Validée', tache: { id: 1 } }));
    await planningService.validerTache(1, 'VALIDEE', 'RAS');
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.etat).toBe('VALIDEE');
    expect(body.commentaire).toBe('RAS');
  });
});

describe('planningService — ratios', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getRatios with params', async () => {
    mockApiFetch.mockResolvedValue(okJson([{ id: 1 }]));
    const result = await planningService.getRatios({ type_tache_id: 5 });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('getRatios unwraps paginated', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [{ id: 1 }] }));
    const result = await planningService.getRatios();
    expect(result).toEqual([{ id: 1 }]);
  });

  it('createRatio sends POST', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
    await planningService.createRatio({ id_type_tache: 1, type_objet: 'Arbre', ratio: 10 } as any);
    expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
  });

  it('getRatiosPaginated includes page param', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [], count: 0, next: null, previous: null }));
    await planningService.getRatiosPaginated(2, { search: 'test' });
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('search=test');
  });

  it('getRatio by id', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 3 }));
    const result = await planningService.getRatio(3);
    expect(result.id).toBe(3);
  });
});

describe('planningService — distributions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getDistributions with filters', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [{ id: 1 }] }));
    const result = await planningService.getDistributions({
      tache: 5,
      status: 'NON_REALISEE',
      date_debut: '2026-04-01',
    });
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain('tache=5');
    expect(url).toContain('status=NON_REALISEE');
    expect(url).toContain('date__gte=2026-04-01');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('getDistributions builds all filter params', async () => {
    mockApiFetch.mockResolvedValue(okJson([]));
    await planningService.getDistributions({
      equipe: 2,
      site: 3,
      status_in: ['EN_COURS', 'REALISEE'],
      urgent: true,
      est_report: false,
      ordering: '-date',
    });
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain('equipe=2');
    expect(url).toContain('site=3');
    expect(url).toContain('status__in=EN_COURS%2CREALISEE');
    expect(url).toContain('urgent=true');
    expect(url).toContain('est_report=false');
    expect(url).toContain('ordering=-date');
  });

  it('updateDistributions sends POST', async () => {
    mockApiFetch.mockResolvedValue(
      okJson({ message: 'ok', distributions: [], total_heures: 8, nombre_jours: 1 }),
    );
    await planningService.updateDistributions(1, [
      { date: '2026-04-01', heure_debut: '08:00', heure_fin: '16:00' },
    ]);
    expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
  });

  it('updateSingleDistribution sends PATCH', async () => {
    mockApiFetch.mockResolvedValue(okJson({ message: 'ok', distribution: { id: 1 } }));
    await planningService.updateSingleDistribution(5, 1, {
      date: '2026-04-02',
      heure_debut: '09:00',
      heure_fin: '17:00',
    });
    expect(mockApiFetch.mock.calls[0]![1].method).toBe('PATCH');
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/distributions/1/');
  });

  it('createDistribution', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
    await planningService.createDistribution({
      tache: 1,
      date: '2026-04-01',
      heure_debut: '08:00',
      heure_fin: '16:00',
    });
    expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
  });

  it('deleteDistribution', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve(null) });
    await planningService.deleteDistribution(1);
  });

  it('demarrerDistribution', async () => {
    mockApiFetch.mockResolvedValue(okJson({ message: 'ok', distribution: { id: 1 } }));
    await planningService.demarrerDistribution(1, { heure_debut_reelle: '08:30' });
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/demarrer/');
  });

  it('terminerDistribution', async () => {
    mockApiFetch.mockResolvedValue(okJson({ message: 'ok', distribution: { id: 1 } }));
    await planningService.terminerDistribution(1, { heure_fin_reelle: '16:30' });
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/terminer/');
  });

  it('reporterDistribution sends motif and date', async () => {
    mockApiFetch.mockResolvedValue(okJson({ message: 'ok' }));
    await planningService.reporterDistribution(1, '2026-04-10', 'METEO' as any, 'Pluie');
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.nouvelle_date).toBe('2026-04-10');
    expect(body.motif).toBe('METEO');
  });

  it('annulerDistribution', async () => {
    mockApiFetch.mockResolvedValue(okJson({ message: 'ok' }));
    await planningService.annulerDistribution(1, 'AUTRE' as any, 'Raison');
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/annuler/');
  });

  it('restaurerDistribution', async () => {
    mockApiFetch.mockResolvedValue(okJson({ message: 'ok' }));
    await planningService.restaurerDistribution(1);
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/restaurer/');
  });

  it('getHistoriqueDistribution', async () => {
    mockApiFetch.mockResolvedValue(okJson({ chaine: [] }));
    await planningService.getHistoriqueDistribution(1);
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/historique/');
  });

  it('getDistributionsParJour', async () => {
    mockApiFetch.mockResolvedValue(
      okJson({ date: '2026-04-01', distributions: [], statistiques: {} }),
    );
    await planningService.getDistributionsParJour('2026-04-01');
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('date=2026-04-01');
  });

  it('marquerDistributionRealisee', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
    await planningService.marquerDistributionRealisee(1, 7.5);
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.heures_reelles).toBe(7.5);
  });

  it('marquerDistributionNonRealisee', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
    await planningService.marquerDistributionNonRealisee(1);
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/marquer-non-realisee/');
  });
});

describe('planningService — duplication', () => {
  beforeEach(() => vi.clearAllMocks());

  it('dupliquerTache', async () => {
    mockApiFetch.mockResolvedValue(okJson({ taches_creees: [{ id: 2 }] }));
    await planningService.dupliquerTache(1, { decalage_jours: 7 });
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.decalage_jours).toBe(7);
  });

  it('dupliquerTacheRecurrence', async () => {
    mockApiFetch.mockResolvedValue(okJson({ taches_creees: [] }));
    await planningService.dupliquerTacheRecurrence(1, {
      frequence: 'WEEKLY',
      nombre_occurrences: 4,
    });
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.frequence).toBe('WEEKLY');
  });

  it('dupliquerTacheDates', async () => {
    mockApiFetch.mockResolvedValue(okJson({ taches_creees: [] }));
    await planningService.dupliquerTacheDates(1, { dates_cibles: ['2026-05-01', '2026-06-01'] });
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.dates_cibles).toHaveLength(2);
  });

  it('dupliquerTache throws on error', async () => {
    mockApiFetch.mockResolvedValue(errJson(400, { error: 'Limite dépassée' }));
    await expect(planningService.dupliquerTache(1, { decalage_jours: 7 })).rejects.toThrow(
      'Limite dépassée',
    );
  });
});

describe('planningService — export', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exportPDF builds query params', async () => {
    mockApiFetch.mockResolvedValue(okJson({ task_id: 'abc', status: 'PENDING' }));
    await planningService.exportPDF({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      equipeId: 3,
      sync: true,
    });
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain('start_date=2026-04-01');
    expect(url).toContain('equipe_id=3');
    expect(url).toContain('sync=true');
  });

  it('exportPDF includes statuts and tacheIds', async () => {
    mockApiFetch.mockResolvedValue(okJson({ task_id: 'x', status: 'PENDING' }));
    await planningService.exportPDF({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      statuts: ['PLANIFIEE', 'EN_COURS'],
      tacheIds: [1, 2],
    });
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain('statuts=PLANIFIEE%2CEN_COURS');
    expect(url).toContain('tache_ids=1%2C2');
  });

  it('getExportStatus', async () => {
    mockApiFetch.mockResolvedValue(okJson({ task_id: 'abc', status: 'SUCCESS', ready: true }));
    const result = await planningService.getExportStatus('abc');
    expect(result.ready).toBe(true);
  });

  it('refreshTaskStatuses', async () => {
    mockApiFetch.mockResolvedValue(okJson({ message: 'ok', total_updated: 0 }));
    const result = await planningService.refreshTaskStatuses();
    expect(result.message).toBe('ok');
  });
});

describe('planningService — misc', () => {
  beforeEach(() => vi.clearAllMocks());

  it('addParticipation', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
    await planningService.addParticipation(5, { operateur: 3, heures: 4 } as any);
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/add_participation/');
  });

  it('resetCharge', async () => {
    mockApiFetch.mockResolvedValue(okJson({ charge_estimee_heures: 16, charge_manuelle: false }));
    const result = await planningService.resetCharge(1);
    expect(result.charge_estimee_heures).toBe(16);
  });
});

describe('planningService — parseValidationError', () => {
  beforeEach(() => vi.clearAllMocks());

  it('structured error with message field', async () => {
    mockApiFetch.mockResolvedValue(
      errJson(400, {
        message: 'Cannot delete',
        error: 'protected_foreign_key',
        detail: 'linked tasks',
      }),
    );
    try {
      await planningService.createTypeTache({ nom: 'X' } as any);
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.message).toBe('Cannot delete');
      expect(e.errorCode).toBe('protected_foreign_key');
      expect(e.detail).toBe('linked tasks');
    }
  });

  it('DRF field errors', async () => {
    mockApiFetch.mockResolvedValue(
      errJson(400, {
        titre: ['Obligatoire'],
        type_tache: ['Ce champ ne peut pas être vide'],
      }),
    );
    try {
      await planningService.createTache({
        date_debut_planifiee: '2026-04-01',
        date_fin_planifiee: '2026-04-05',
      } as any);
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.validationErrors).toContain('Obligatoire');
      expect(e.fieldErrors.titre).toBeDefined();
    }
  });

  it('standard error with detail', async () => {
    mockApiFetch.mockResolvedValue(errJson(403, { detail: 'Accès refusé' }));
    await expect(planningService.changeStatut(1, 'EN_COURS')).rejects.toThrow('Accès refusé');
  });
});
