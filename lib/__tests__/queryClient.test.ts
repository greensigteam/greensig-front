import { describe, expect, it, vi } from 'vitest';
import {
  invalidateAllReclamationQueries,
  invalidateAllTaskQueries,
  invalidateDistributionsForDate,
  invalidateTaskData,
  queryClient,
} from '../queryClient';
import { queryKeys } from '../queryKeys';

describe('queryClient — singleton config', () => {
  it('is a QueryClient with the documented defaults', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(2 * 60 * 1000);
    expect(defaults.queries?.gcTime).toBe(5 * 60 * 1000);
    expect(defaults.queries?.retry).toBe(2);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
    expect(defaults.queries?.refetchOnReconnect).toBe(true);
    expect(defaults.queries?.refetchOnMount).toBe(true);
    expect(defaults.mutations?.retry).toBe(1);
  });
});

describe('invalidation helpers', () => {
  it('invalidateAllTaskQueries invalidates taches.lists and distributions.all', () => {
    const spy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation(() => Promise.resolve());
    invalidateAllTaskQueries();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.taches.lists(),
      exact: false,
    });
    expect(spy).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.distributions.all,
      exact: false,
    });
    spy.mockRestore();
  });

  it('invalidateTaskData invalidates detail(id) and lists', () => {
    const spy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation(() => Promise.resolve());
    invalidateTaskData(7);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.taches.detail(7),
    });
    expect(spy).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.taches.lists(),
      exact: false,
    });
    spy.mockRestore();
  });

  it('invalidateDistributionsForDate targets the per-date key', () => {
    const spy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation(() => Promise.resolve());
    invalidateDistributionsForDate('2025-05-01');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      queryKey: queryKeys.distributions.parJour('2025-05-01'),
    });
    spy.mockRestore();
  });

  it('invalidateAllReclamationQueries invalidates reclamations.lists', () => {
    const spy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation(() => Promise.resolve());
    invalidateAllReclamationQueries();
    expect(spy).toHaveBeenCalledWith({
      queryKey: queryKeys.reclamations.lists(),
      exact: false,
    });
    spy.mockRestore();
  });
});
