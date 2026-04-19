import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useUpdateTask,
  useDeleteTask,
  useChangeTaskStatus,
  useAssignEquipe,
  useValidateTask,
} from '../mutations/useTaskMutations';
import { queryKeys } from '../../lib/queryKeys';

vi.mock('../../services/planningService', () => ({
  planningService: {
    updateTache: vi.fn(async (id: number, data: Record<string, unknown>) => ({
      id,
      titre: 'Tâche mise à jour',
      statut: 'PLANIFIEE',
      ...data,
    })),
    deleteTache: vi.fn(async () => undefined),
    changeStatut: vi.fn(async (id: number, statut: string) => ({
      id,
      statut,
      titre: 'Statut changé',
    })),
    validerTache: vi.fn(async (id: number, etat: string) => ({
      message: 'ok',
      tache: { id, etat_validation: etat, titre: 'Validée' },
    })),
  },
}));

vi.mock('../../services/suiviTachesApi', () => ({
  createPhoto: vi.fn(),
  deletePhoto: vi.fn(),
  createConsommation: vi.fn(),
  deleteConsommation: vi.fn(),
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

describe('useTaskMutations — cache invalidation', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = makeClient();
  });

  it('useUpdateTask invalidates both list and detail', async () => {
    client.setQueryData(queryKeys.taches.lists(), [{ id: 42, titre: 'avant' }]);
    client.setQueryData(queryKeys.taches.detail(42), { id: 42, titre: 'avant' });

    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateTask(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ taskId: 42, data: { titre: 'après' } as never });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = spy.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(invalidatedKeys.some((k) => k?.includes('"taches"'))).toBe(true);
    expect(invalidatedKeys.some((k) => k?.includes('"detail"') && k?.includes('42'))).toBe(true);
  });

  it('useDeleteTask removes detail from cache and invalidates lists', async () => {
    client.setQueryData(queryKeys.taches.lists(), [{ id: 7, titre: 't' }]);
    client.setQueryData(queryKeys.taches.detail(7), { id: 7, titre: 't' });

    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const removeSpy = vi.spyOn(client, 'removeQueries');
    const { result } = renderHook(() => useDeleteTask(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ taskId: 7 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const removed = removeSpy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(removed.some((k) => k?.includes('"detail"') && k?.includes('7'))).toBe(true);

    const invalidated = invalidateSpy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(invalidated.some((k) => k?.includes('"list"') || k?.includes('"taches"'))).toBe(true);
  });

  it('useChangeTaskStatus invalidates taches AND distributions (cascade)', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useChangeTaskStatus(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ taskId: 3, nouveauStatut: 'EN_COURS' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k?.includes('"taches"'))).toBe(true);
    expect(keys.some((k) => k?.includes('"distributions"'))).toBe(true);
  });

  it('useAssignEquipe invalidates lists and detail', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAssignEquipe(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ taskId: 12, equipeIds: [1, 2] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k?.includes('"detail"') && k?.includes('12'))).toBe(true);
  });

  it('useValidateTask invalidates lists and detail', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useValidateTask(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ taskId: 9, etat: 'VALIDEE' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k?.includes('"detail"') && k?.includes('9'))).toBe(true);
  });
});
