import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePlanningData } from '../usePlanningData';

// ---- Mocks ----

vi.mock('../../services/planningService', () => ({
  planningService: {
    getTaches: vi.fn(async () => ({ results: [] })),
  },
}));

vi.mock('../../services/api', () => ({
  fetchInventory: vi.fn(async () => ({ results: [] })),
}));

vi.mock('../queries', () => ({
  useTaches: () => ({ data: [], isLoading: false, error: null }),
  useTypesTaches: () => ({ data: [], isLoading: false }),
  useEquipes: () => ({ data: [] }),
  useSites: () => ({ data: [] }),
  useStructures: () => ({ data: [] }),
  useCurrentUser: () => ({
    data: { id: 42, nom: 'Admin Test', email: 'admin@test', roles: ['ADMIN'] },
  }),
}));

vi.mock('../usePermissions', () => ({
  usePermissions: () => ({}),
}));

vi.mock('../../contexts/SearchContext', () => ({
  useSearch: () => ({
    searchQuery: '',
    setPlaceholder: vi.fn(),
    setSearchSuggestions: vi.fn(),
  }),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('usePlanningData — Sprint 3', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('scopes planning filters in localStorage by user id', async () => {
    const { result } = renderHook(() => usePlanningData(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.currentUser?.id).toBe('42'));

    act(() => {
      result.current.setFilters((prev) => ({ ...prev, clientId: 7 }));
    });

    await waitFor(() => {
      const scoped = localStorage.getItem('planning_filters_42');
      expect(scoped).not.toBeNull();
      expect(JSON.parse(scoped!).clientId).toBe(7);
    });

    // La clé globale legacy est nettoyée dès que l'user est connu
    expect(localStorage.getItem('planning_filters')).toBeNull();
  });

  it('migrates legacy anonymous filters on first login', async () => {
    localStorage.setItem('planning_filters', JSON.stringify({ clientId: 99 }));

    const { result } = renderHook(() => usePlanningData(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.currentUser?.id).toBe('42'));

    await waitFor(() => {
      // L'effet de persistance réécrit sous la clé scopée
      const scoped = localStorage.getItem('planning_filters_42');
      expect(scoped).not.toBeNull();
      // La legacy est purgée
      expect(localStorage.getItem('planning_filters')).toBeNull();
    });
  });

  it('distribution modals are mutually exclusive (state machine)', async () => {
    const { result } = renderHook(() => usePlanningData(), { wrapper: makeWrapper() });

    const fakeDist = { id: 1, status: 'NON_REALISEE' } as never;

    act(() => result.current.setDemarrerModalDistribution(fakeDist));
    expect(result.current.demarrerModalDistribution).toBeTruthy();

    act(() => result.current.setTerminerModalDistribution(fakeDist));
    expect(result.current.terminerModalDistribution).toBeTruthy();
    expect(result.current.demarrerModalDistribution).toBeNull();

    act(() => result.current.setAnnulerModalDistribution(fakeDist));
    expect(result.current.annulerModalDistribution).toBeTruthy();
    expect(result.current.terminerModalDistribution).toBeNull();

    act(() => result.current.setReporterModalDistribution(fakeDist));
    expect(result.current.reporterModalDistribution).toBeTruthy();
    expect(result.current.annulerModalDistribution).toBeNull();

    // Fermer n'affecte que soi-même
    act(() => result.current.setReporterModalDistribution(null));
    expect(result.current.reporterModalDistribution).toBeNull();
  });
});
