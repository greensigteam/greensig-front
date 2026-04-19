import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  apiFetch: vi.fn(),
}));

import {
  fetchTypesReclamations,
  fetchUrgences,
  fetchReclamations,
  fetchReclamationById,
  createReclamation,
  updateReclamation,
  deleteReclamation,
  assignReclamation,
  cloturerReclamation,
  validerCloture,
  refuserCloture,
  rejeterReclamation,
  refuserIntervention,
  reprendreIntervention,
  createSatisfaction,
  fetchSatisfactionByReclamation,
  fetchReclamationsForMap,
  fetchReclamationStats,
  exportReclamationsExcel,
  detectSiteFromGeometry,
  uploadPhoto,
} from '../reclamationsApi';
import { apiFetch } from '../api';

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

const okJson = (data: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data),
});

const errorJson = (status: number, body: unknown) => ({
  ok: false,
  status,
  json: () => Promise.resolve(body),
});

describe('reclamationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Referentiels ----

  it('fetchTypesReclamations unwraps results', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [{ id: 1, nom: 'Type A' }] }));
    const result = await fetchTypesReclamations();
    expect(result).toEqual([{ id: 1, nom: 'Type A' }]);
  });

  it('fetchTypesReclamations handles flat array', async () => {
    mockApiFetch.mockResolvedValue(okJson([{ id: 1 }]));
    const result = await fetchTypesReclamations();
    expect(result).toEqual([{ id: 1 }]);
  });

  it('fetchUrgences unwraps results', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [{ id: 1, niveau: 'HAUTE' }] }));
    const result = await fetchUrgences();
    expect(result).toEqual([{ id: 1, niveau: 'HAUTE' }]);
  });

  // ---- CRUD ----

  it('fetchReclamations builds query params', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [] }));
    await fetchReclamations({ statut: 'OUVERTE', site: 3, auto_cloturee: true });

    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain('statut=OUVERTE');
    expect(url).toContain('site=3');
    expect(url).toContain('auto_cloturee=true');
  });

  it('fetchReclamations with no params calls base URL', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [] }));
    await fetchReclamations();
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toBe('/api/reclamations/reclamations/');
  });

  it('fetchReclamationById calls correct endpoint', async () => {
    const rec = { id: 42, statut: 'OUVERTE' };
    mockApiFetch.mockResolvedValue(okJson(rec));
    const result = await fetchReclamationById(42);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/reclamations/reclamations/42/');
    expect(result).toEqual(rec);
  });

  it('createReclamation sends POST with body', async () => {
    const payload = { description: 'test', type_reclamation: 1 } as any;
    mockApiFetch.mockResolvedValue(okJson({ id: 1, ...payload }));
    await createReclamation(payload);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/reclamations/reclamations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updateReclamation sends PATCH', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1, statut: 'EN_COURS' }));
    await updateReclamation(1, { description: 'updated' } as any);
    const [url, opts] = mockApiFetch.mock.calls[0]!;
    expect(url).toBe('/api/reclamations/reclamations/1/');
    expect(opts.method).toBe('PATCH');
  });

  it('deleteReclamation sends DELETE', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, status: 204 });
    await deleteReclamation(5);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/reclamations/reclamations/5/', {
      method: 'DELETE',
    });
  });

  it('deleteReclamation throws on error', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 403 });
    await expect(deleteReclamation(5)).rejects.toThrow('Erreur lors de la suppression');
  });

  it('assignReclamation sends PUT with equipe_id', async () => {
    mockApiFetch.mockResolvedValue(okJson({ id: 1, equipe: 7 }));
    await assignReclamation(1, 7);
    const [url, opts] = mockApiFetch.mock.calls[0]!;
    expect(url).toBe('/api/reclamations/reclamations/1/assignation/');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ equipe_id: 7 });
  });

  // ---- Workflow actions ----

  it('cloturerReclamation unwraps reclamation key', async () => {
    mockApiFetch.mockResolvedValue(okJson({ reclamation: { id: 1, statut: 'CLOTUREE' } }));
    const result = await cloturerReclamation(1);
    expect(result).toEqual({ id: 1, statut: 'CLOTUREE' });
  });

  it('validerCloture calls correct endpoint', async () => {
    mockApiFetch.mockResolvedValue(okJson({ reclamation: { id: 2 } }));
    await validerCloture(2);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/reclamations/reclamations/2/valider_cloture/', {
      method: 'POST',
    });
  });

  it('refuserCloture sends commentaire_refus', async () => {
    mockApiFetch.mockResolvedValue(okJson({ reclamation: { id: 3 } }));
    await refuserCloture(3, 'Pas OK');
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.commentaire_refus).toBe('Pas OK');
  });

  it('rejeterReclamation sends justification', async () => {
    mockApiFetch.mockResolvedValue(okJson({ reclamation: { id: 4 } }));
    await rejeterReclamation(4, 'Hors périmètre');
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.justification).toBe('Hors périmètre');
  });

  it('refuserIntervention sends motif_refus', async () => {
    mockApiFetch.mockResolvedValue(okJson({ reclamation: { id: 5 } }));
    await refuserIntervention(5, 'Travail incomplet');
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.motif_refus).toBe('Travail incomplet');
  });

  it('reprendreIntervention calls POST with no body', async () => {
    mockApiFetch.mockResolvedValue(okJson({ reclamation: { id: 6 } }));
    await reprendreIntervention(6);
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/reclamations/reclamations/6/reprendre_intervention/',
      { method: 'POST' },
    );
  });

  // ---- Satisfaction ----

  it('createSatisfaction sends POST', async () => {
    const payload = { reclamation: 1, note: 4, commentaire: 'Bien' } as any;
    mockApiFetch.mockResolvedValue(okJson({ id: 10, ...payload }));
    await createSatisfaction(payload);
    expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
  });

  it('fetchSatisfactionByReclamation returns first result', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [{ id: 10, note: 5 }] }));
    const result = await fetchSatisfactionByReclamation(1);
    expect(result).toEqual({ id: 10, note: 5 });
  });

  it('fetchSatisfactionByReclamation returns null when empty', async () => {
    mockApiFetch.mockResolvedValue(okJson({ results: [] }));
    const result = await fetchSatisfactionByReclamation(99);
    expect(result).toBeNull();
  });

  // ---- Map ----

  it('fetchReclamationsForMap builds bbox param', async () => {
    mockApiFetch.mockResolvedValue(okJson({ type: 'FeatureCollection', features: [], count: 0 }));
    await fetchReclamationsForMap({ bbox: '1,2,3,4' });
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain('bbox=1%2C2%2C3%2C4');
  });

  // ---- Stats ----

  it('fetchReclamationStats passes filters', async () => {
    mockApiFetch.mockResolvedValue(okJson({ total: 10 }));
    await fetchReclamationStats({ site: 2, date_debut: '2026-01-01' });
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain('site=2');
    expect(url).toContain('date_debut=2026-01-01');
  });

  // ---- Export ----

  it('exportReclamationsExcel returns blob', async () => {
    const blob = new Blob(['data']);
    mockApiFetch.mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(blob) });
    const result = await exportReclamationsExcel({ statut: 'CLOTUREE' });
    expect(result).toBe(blob);
  });

  it('exportReclamationsExcel throws specific message on 404', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(exportReclamationsExcel()).rejects.toThrow('Aucune réclamation à exporter');
  });

  it('exportReclamationsExcel throws generic on other errors', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(exportReclamationsExcel()).rejects.toThrow('Erreur export: 500');
  });

  // ---- Detect site ----

  it('detectSiteFromGeometry sends geometry as POST', async () => {
    const geo = { type: 'Point', coordinates: [10, 20] };
    mockApiFetch.mockResolvedValue(
      okJson({ site_id: 1, site_nom: 'A', zone_id: null, zone_nom: null }),
    );
    const result = await detectSiteFromGeometry(geo);
    expect(result.site_id).toBe(1);
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.geometry).toEqual(geo);
  });

  // ---- Upload photo ----

  it('uploadPhoto sends FormData', async () => {
    const fd = new FormData();
    fd.append('photo', 'file');
    mockApiFetch.mockResolvedValue(okJson({ id: 1, url: '/media/photo.jpg' }));
    const result = await uploadPhoto(fd);
    expect(result).toEqual({ id: 1, url: '/media/photo.jpg' });
    expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
  });

  it('uploadPhoto throws with detail error', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ detail: 'Fichier trop volumineux' }),
    });
    await expect(uploadPhoto(new FormData())).rejects.toThrow('Fichier trop volumineux');
  });

  // ---- handleResponse error formatting ----

  it('formats field errors from response', async () => {
    mockApiFetch.mockResolvedValue(
      errorJson(400, {
        description: ['Ce champ est requis'],
        site: ['Site invalide'],
      }),
    );
    await expect(fetchReclamationById(1)).rejects.toThrow(
      'description: Ce champ est requis | site: Site invalide',
    );
  });

  it('uses detail when present', async () => {
    mockApiFetch.mockResolvedValue(errorJson(403, { detail: 'Accès refusé' }));
    await expect(fetchReclamationById(1)).rejects.toThrow('Accès refusé');
  });

  it('falls back to status code when json parse fails', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    });
    await expect(fetchReclamationById(1)).rejects.toThrow('Erreur réseau');
  });
});
