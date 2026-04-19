import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useDeleteEquipe,
  useDeleteOperateur,
  useValiderAbsence,
  useRefuserAbsence,
  useAnnulerAbsence,
} from '../mutations/useTeamsMutations';
import { queryKeys } from '../../lib/queryKeys';

vi.mock('../../services/usersApi', () => ({
  deleteEquipe: vi.fn(async () => undefined),
  deleteOperateur: vi.fn(async () => undefined),
  validerAbsence: vi.fn(async (id: number, motif: string) => ({ id, statut: 'VALIDEE', motif })),
  refuserAbsence: vi.fn(async (id: number, motif: string) => ({ id, statut: 'REFUSEE', motif })),
  annulerAbsence: vi.fn(async (id: number) => ({ id, statut: 'ANNULEE' })),
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

describe('useTeamsMutations — cache invalidation', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = makeClient();
  });

  it('useDeleteEquipe invalidates equipesRH, operateurs, stats, and referenceData.equipes', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteEquipe(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync(5);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k === JSON.stringify(queryKeys.equipesRH.all))).toBe(true);
    expect(keys.some((k) => k === JSON.stringify(queryKeys.operateurs.all))).toBe(true);
    expect(keys.some((k) => k === JSON.stringify(queryKeys.statsUtilisateurs.current))).toBe(true);
    expect(keys.some((k) => k === JSON.stringify(queryKeys.referenceData.equipes()))).toBe(true);
  });

  it('useDeleteOperateur invalidates team resources', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteOperateur(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync(11);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k === JSON.stringify(queryKeys.operateurs.all))).toBe(true);
    expect(keys.some((k) => k === JSON.stringify(queryKeys.equipesRH.all))).toBe(true);
  });

  it('useValiderAbsence invalidates absences and stats', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useValiderAbsence(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ id: 3, motif: 'OK' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k === JSON.stringify(queryKeys.absences.all))).toBe(true);
    expect(keys.some((k) => k === JSON.stringify(queryKeys.statsUtilisateurs.current))).toBe(true);
  });

  it('useValiderAbsence uses default motif when not provided', async () => {
    const { validerAbsence } = await import('../../services/usersApi');
    const { result } = renderHook(() => useValiderAbsence(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ id: 3 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(validerAbsence).toHaveBeenCalledWith(3, 'Approuve');
  });

  it('useRefuserAbsence invalidates absences and stats', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRefuserAbsence(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ id: 4, motif: 'non' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k === JSON.stringify(queryKeys.absences.all))).toBe(true);
  });

  it('useAnnulerAbsence invalidates absences and stats', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAnnulerAbsence(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync(8);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k === JSON.stringify(queryKeys.absences.all))).toBe(true);
  });
});
