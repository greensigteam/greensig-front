import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  apiFetch: vi.fn(),
}));

import { fetchKPIs, fetchKPIHistorique } from '../kpiApi';
import { apiFetch } from '../api';

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

describe('kpiApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchKPIs', () => {
    it('calls /api/kpis/ with no params when none provided', async () => {
      const data = { respect_planning: 85 };
      mockApiFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });

      const result = await fetchKPIs();

      const url = mockApiFetch.mock.calls[0]![0] as string;
      expect(url).toContain('/kpis/');
      expect(url).not.toContain('?');
      expect(result).toEqual(data);
    });

    it('includes mois and site_id query params', async () => {
      mockApiFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      await fetchKPIs('2026-04', 5);

      const url = mockApiFetch.mock.calls[0]![0] as string;
      expect(url).toContain('mois=2026-04');
      expect(url).toContain('site_id=5');
    });

    it('throws on non-ok response', async () => {
      mockApiFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(fetchKPIs()).rejects.toThrow('Erreur 500');
    });
  });

  describe('fetchKPIHistorique', () => {
    it('calls /api/kpis/historique/ with no params when none provided', async () => {
      const data = { months: [] };
      mockApiFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });

      const result = await fetchKPIHistorique();

      const url = mockApiFetch.mock.calls[0]![0] as string;
      expect(url).toContain('/kpis/historique/');
      expect(url).not.toContain('?');
      expect(result).toEqual(data);
    });

    it('includes site_id and nb_mois params', async () => {
      mockApiFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      await fetchKPIHistorique(3, 12);

      const url = mockApiFetch.mock.calls[0]![0] as string;
      expect(url).toContain('site_id=3');
      expect(url).toContain('nb_mois=12');
    });

    it('throws on non-ok response', async () => {
      mockApiFetch.mockResolvedValue({ ok: false, status: 404 });

      await expect(fetchKPIHistorique()).rejects.toThrow('Erreur 404');
    });
  });
});
