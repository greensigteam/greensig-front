import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useDemarrerDistribution,
  useTerminerDistribution,
  useReporterDistribution,
  useAnnulerDistribution,
  useRestaurerDistribution,
} from '../mutations/useDistributionMutations';

vi.mock('../../services/planningService', () => ({
  planningService: {
    demarrerDistribution: vi.fn(async () => ({
      distribution: { id: 1, status: 'EN_COURS' },
      tache_synchronisee: true,
      tache_nouveau_statut: 'EN_COURS',
    })),
    terminerDistribution: vi.fn(async () => ({
      distribution: { id: 1, status: 'REALISEE' },
    })),
    reporterDistribution: vi.fn(async () => ({
      distribution_originale: { id: 1, status: 'REPORTEE' },
      nouvelle_distribution: { id: 2, status: 'NON_REALISEE' },
    })),
    annulerDistribution: vi.fn(async () => ({
      distribution: { id: 1, status: 'ANNULEE' },
    })),
    restaurerDistribution: vi.fn(async () => ({
      distribution: { id: 1, status: 'NON_REALISEE' },
    })),
  },
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useDistributionMutations — cascade invalidation', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = makeClient();
  });

  it.each([
    ['démarrer', () => useDemarrerDistribution(), { distributionId: 1, date: '2026-04-14' }],
    ['terminer', () => useTerminerDistribution(), { distributionId: 1, date: '2026-04-14' }],
    [
      'annuler',
      () => useAnnulerDistribution(),
      { distributionId: 1, date: '2026-04-14', motif: 'METEO' as const },
    ],
    ['restaurer', () => useRestaurerDistribution(), { distributionId: 1, date: '2026-04-14' }],
  ] as Array<
    [string, () => { mutateAsync: (v: unknown) => Promise<unknown>; isSuccess: boolean }, unknown]
  >)('%s invalidates parent taches queries', async (_label, hook, vars) => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(hook, { wrapper: makeWrapper(client) });

    await result.current.mutateAsync(vars as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k?.includes('"distributions"'))).toBe(true);
    expect(keys.some((k) => k?.includes('"taches"'))).toBe(true);
  });

  it('reporter invalidates both dates and parent taches', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useReporterDistribution(), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync({
      distributionId: 1,
      oldDate: '2026-04-14',
      newDate: '2026-04-15',
      motif: 'METEO',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k?.includes('2026-04-14'))).toBe(true);
    expect(keys.some((k) => k?.includes('2026-04-15'))).toBe(true);
    expect(keys.some((k) => k?.includes('"taches"'))).toBe(true);
  });
});
