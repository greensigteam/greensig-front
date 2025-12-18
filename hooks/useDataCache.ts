/**
 * Hook de cache générique pour les données fréquemment utilisées
 * Évite les re-fetch constants lors de la navigation entre pages
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache global partagé entre toutes les instances du hook
const globalCache = new Map<string, CacheEntry<any>>();

// Durée de cache par défaut: 5 minutes
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000;

interface UseCachedFetchOptions {
  /** Durée de validité du cache en ms (défaut: 5 min) */
  cacheDuration?: number;
  /** Charger les données immédiatement au mount */
  immediate?: boolean;
  /** Dépendances qui déclenchent un refetch */
  deps?: any[];
}

interface UseCachedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Force un refetch (ignore le cache) */
  refetch: () => Promise<void>;
  /** Invalide le cache sans refetch */
  invalidate: () => void;
  /** Met à jour les données localement (optimistic update) */
  setData: (updater: T | ((prev: T | null) => T | null)) => void;
}

export function useCachedFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options: UseCachedFetchOptions = {}
): UseCachedFetchResult<T> {
  const {
    cacheDuration = DEFAULT_CACHE_DURATION,
    immediate = true,
    deps = []
  } = options;

  const [data, setDataState] = useState<T | null>(() => {
    // Initialize from cache if valid
    const cached = globalCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < cacheDuration) {
      return cached.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(!data && immediate);
  const [error, setError] = useState<Error | null>(null);

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetchData = useCallback(async (forceRefresh = false) => {
    const cached = globalCache.get(cacheKey);
    const now = Date.now();

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cached && (now - cached.timestamp) < cacheDuration) {
      setDataState(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFnRef.current();
      globalCache.set(cacheKey, { data: result, timestamp: now });
      setDataState(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      // Return stale cache on error if available
      if (cached) {
        setDataState(cached.data);
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, cacheDuration]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    globalCache.delete(cacheKey);
  }, [cacheKey]);

  const setData = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setDataState(prev => {
      const newData = typeof updater === 'function'
        ? (updater as (prev: T | null) => T | null)(prev)
        : updater;

      // Update cache with new data
      if (newData !== null) {
        globalCache.set(cacheKey, { data: newData, timestamp: Date.now() });
      }

      return newData;
    });
  }, [cacheKey]);

  // Fetch on mount if immediate and no valid cache
  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate, fetchData, ...deps]);

  return { data, loading, error, refetch, invalidate, setData };
}

/**
 * Invalide toutes les entrées du cache correspondant au préfixe
 * Utile après une mutation (ex: invalider 'equipes' après création d'équipe)
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of globalCache.keys()) {
    if (key.startsWith(prefix)) {
      globalCache.delete(key);
    }
  }
}

/**
 * Vide complètement le cache
 * Utile lors du logout
 */
export function clearAllCache(): void {
  globalCache.clear();
}

/**
 * Pré-charge des données dans le cache
 * Utile pour le prefetching
 */
export async function prefetchCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<void> {
  try {
    const data = await fetchFn();
    globalCache.set(cacheKey, { data, timestamp: Date.now() });
  } catch {
    // Silent fail for prefetch
  }
}

// Clés de cache standardisées
export const CACHE_KEYS = {
  EQUIPES: 'equipes',
  CLIENTS: 'clients',
  TYPES_TACHES: 'types-taches',
  OPERATEURS: 'operateurs',
  COMPETENCES: 'competences',
  SITES: 'sites',
} as const;
