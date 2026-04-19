import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useUpdateUtilisateur, useDeleteUtilisateur } from '../mutations/useUsersMutations';
import { queryKeys } from '../../lib/queryKeys';

vi.mock('../../services/usersApi', () => ({
  updateUtilisateur: vi.fn(async (id: number, data: Record<string, unknown>) => ({
    id,
    nom: 'Test',
    prenom: 'User',
    email: 'test@test.fr',
    actif: true,
    roles: [],
    dateCreation: '2026-01-01',
    ...data,
  })),
  deleteUtilisateur: vi.fn(async () => undefined),
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

describe('useUsersMutations — cache invalidation', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = makeClient();
  });

  it('useUpdateUtilisateur invalidates utilisateurs list and detail(id), plus clients list', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateUtilisateur(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({ id: 42, data: { actif: false } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k === JSON.stringify(queryKeys.utilisateurs.all))).toBe(true);
    expect(keys.some((k) => k === JSON.stringify(queryKeys.clients.all))).toBe(true);
    expect(keys.some((k) => k === JSON.stringify(queryKeys.utilisateurs.detail(42)))).toBe(true);
  });

  it('useDeleteUtilisateur invalidates utilisateurs AND clients', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteUtilisateur(), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync(7);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys.some((k) => k === JSON.stringify(queryKeys.utilisateurs.all))).toBe(true);
    expect(keys.some((k) => k === JSON.stringify(queryKeys.clients.all))).toBe(true);
  });
});
