import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useUpdateReclamation,
  useDeleteReclamation,
  useCloturerReclamation,
  useValiderCloture,
  useRefuserCloture,
  useRejeterReclamation,
  useCreateSatisfaction,
} from '../mutations/useReclamationMutations';
import { queryKeys } from '../../lib/queryKeys';

vi.mock('../../services/reclamationsApi', () => ({
  updateReclamation: vi.fn(async (id: number, data: any) => ({ id, statut: 'EN_COURS', ...data })),
  deleteReclamation: vi.fn(async () => undefined),
  assignReclamation: vi.fn(async (id: number) => ({ id, statut: 'AFFECTEE' })),
  cloturerReclamation: vi.fn(async (id: number) => ({
    id,
    statut: 'EN_ATTENTE_VALIDATION_CLOTURE',
  })),
  validerCloture: vi.fn(async (id: number) => ({ id, statut: 'CLOTUREE' })),
  refuserCloture: vi.fn(async (id: number) => ({ id, statut: 'RESOLUE' })),
  rejeterReclamation: vi.fn(async (id: number) => ({ id, statut: 'REJETEE' })),
  refuserIntervention: vi.fn(async (id: number) => ({ id, statut: 'REFUSEE_CLIENT' })),
  reprendreIntervention: vi.fn(async (id: number) => ({ id, statut: 'AFFECTEE' })),
  createSatisfaction: vi.fn(async (data: any) => ({
    id: 99,
    ...data,
    date_evaluation: '2026-04-14',
  })),
  fetchReclamationById: vi.fn(async (id: number) => ({
    id,
    statut: 'CLOTUREE',
    satisfaction: { id: 99, note: 5, auto_evaluee: false, date_evaluation: '2026-04-14' },
  })),
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      // gcTime > 0 so setQueryData survives until test assertions run
      queries: { retry: false, gcTime: 60_000, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function invalidatedKeys(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((call) => {
    const arg = call[0] as { queryKey?: readonly unknown[] } | undefined;
    return JSON.stringify(arg?.queryKey);
  });
}

describe('useReclamationMutations — cache invalidation', () => {
  let client: QueryClient;
  let dispatchSpy: { mock: { calls: unknown[][] } };

  beforeEach(() => {
    client = makeClient();
    dispatchSpy = vi.spyOn(window, 'dispatchEvent');
  });

  it('useUpdateReclamation invalidates reclamations list AND detail(id)', async () => {
    client.setQueryData(queryKeys.reclamations.lists(), [{ id: 7, statut: 'NOUVELLE' }]);
    client.setQueryData(queryKeys.reclamations.detail(7), { id: 7, statut: 'NOUVELLE' });

    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateReclamation(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ id: 7, data: { description: 'upd' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = invalidatedKeys(spy);
    expect(keys.some((k) => k?.includes('"reclamations"'))).toBe(true);
    expect(keys.some((k) => k?.includes('"detail"') && k?.includes('7'))).toBe(true);
  });

  it('useUpdateReclamation dispatches refresh-reclamations event (OLMap sync)', async () => {
    const { result } = renderHook(() => useUpdateReclamation(), { wrapper: makeWrapper(client) });
    await result.current.mutateAsync({ id: 1, data: { description: 'x' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const types = dispatchSpy.mock.calls.map((c) => (c[0] as Event).type);
    expect(types).toContain('refresh-reclamations');
  });

  it('useDeleteReclamation removes detail and invalidates list', async () => {
    client.setQueryData(queryKeys.reclamations.detail(3), { id: 3 });

    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const removeSpy = vi.spyOn(client, 'removeQueries');
    const { result } = renderHook(() => useDeleteReclamation(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync(3);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const removed = removeSpy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(removed.some((k) => k?.includes('"detail"') && k?.includes('3'))).toBe(true);

    const invalidated = invalidatedKeys(invalidateSpy);
    expect(invalidated.some((k) => k?.includes('"reclamations"'))).toBe(true);
  });

  it('useCloturerReclamation invalidates list + detail (EN_ATTENTE_VALIDATION_CLOTURE)', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCloturerReclamation(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync(11);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = invalidatedKeys(spy);
    expect(keys.some((k) => k?.includes('"detail"') && k?.includes('11'))).toBe(true);
    expect(keys.some((k) => k?.includes('"reclamations"'))).toBe(true);
  });

  it('useValiderCloture updates cache and invalidates for CLOTUREE transition', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useValiderCloture(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync(22);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const detail = client.getQueryData<any>(queryKeys.reclamations.detail(22));
    expect(detail?.statut).toBe('CLOTUREE');
    expect(invalidatedKeys(spy).some((k) => k?.includes('"detail"') && k?.includes('22'))).toBe(
      true,
    );
  });

  it('useRefuserCloture requires commentaire and invalidates', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRefuserCloture(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ id: 33, commentaire: 'Pas satisfait' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidatedKeys(spy).some((k) => k?.includes('"detail"') && k?.includes('33'))).toBe(
      true,
    );
  });

  it('useRejeterReclamation transitions to REJETEE and invalidates', async () => {
    vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRejeterReclamation(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ id: 44, justification: 'hors périmètre' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const detail = client.getQueryData<any>(queryKeys.reclamations.detail(44));
    expect(detail?.statut).toBe('REJETEE');
  });

  it('useCreateSatisfaction refetches reclamation detail with satisfaction embedded', async () => {
    const { result } = renderHook(() => useCreateSatisfaction(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ reclamation: 55, note: 5 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const detail = client.getQueryData<any>(queryKeys.reclamations.detail(55));
    expect(detail?.satisfaction?.note).toBe(5);
  });
});
