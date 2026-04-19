import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  apiFetch: vi.fn(),
}));

import { fetchMonthlyReport } from '../reportsApi';
import { apiFetch } from '../api';

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

describe('reportsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchMonthlyReport', () => {
    const options = { siteId: 1, dateDebut: '2026-04-01', dateFin: '2026-04-30' };

    it('calls the correct URL with params', async () => {
      const data = { site: { nom: 'Site A' } };
      mockApiFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });

      const result = await fetchMonthlyReport(options);

      const url = mockApiFetch.mock.calls[0]![0] as string;
      expect(url).toContain('/api/monthly-report/');
      expect(url).toContain('site_id=1');
      expect(url).toContain('date_debut=2026-04-01');
      expect(url).toContain('date_fin=2026-04-30');
      expect(result).toEqual(data);
    });

    it('throws with error message from response body', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Site introuvable' }),
      });

      await expect(fetchMonthlyReport(options)).rejects.toThrow('Site introuvable');
    });

    it('throws generic message when response body parse fails', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(fetchMonthlyReport(options)).rejects.toThrow(
        'Erreur lors de la récupération du rapport',
      );
    });
  });
});
