/**
 * IndexedDB Database Configuration avec Dexie
 *
 * Cache local pour améliorer les performances et réduire les appels API.
 * Utilise Dexie.js comme wrapper moderne pour IndexedDB.
 */

import Dexie, { Table } from 'dexie';

// ============================================================================
// VERSION DU CACHE
// ============================================================================
// Incrémenter cette version pour forcer l'invalidation du cache
// lors d'un déploiement ou d'un changement de structure de données
const CACHE_VERSION = '2.0.0';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Structure générique pour tous les objets cachés
 */
export interface CacheEntry<T = any> {
  id: string;              // Clé unique (ex: 'sites', 'users', 'site-123')
  data: T;                 // Données cachées
  timestamp: number;       // Date de mise en cache (ms)
  expiresAt: number;       // Date d'expiration (ms)
}

// ============================================================================
// DATABASE CLASS
// ============================================================================

export class GreenSIGDatabase extends Dexie {
  // Tables
  cache!: Table<CacheEntry, string>;

  constructor() {
    super('GreenSIGDB');

    // Définition du schéma (version 1)
    this.version(1).stores({
      cache: 'id, expiresAt' // Index sur id (primary key) et expiresAt (pour le nettoyage)
    });
  }

  /**
   * Récupère une entrée du cache si elle existe et n'est pas expirée
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = await this.cache.get(key);

      if (!entry) {
        return null;
      }

      // Vérifier l'expiration
      if (Date.now() > entry.expiresAt) {
        // Supprimer l'entrée expirée
        await this.cache.delete(key);
        return null;
      }

      return entry.data as T;
    } catch (error) {
      console.error(`[DB] Erreur lecture cache "${key}":`, error);
      return null;
    }
  }

  /**
   * Stocke une entrée dans le cache avec TTL (Time To Live)
   *
   * @param key - Clé unique
   * @param data - Données à cacher
   * @param ttlMinutes - Durée de vie en minutes (défaut: 5 min)
   */
  async set<T>(key: string, data: T, ttlMinutes: number = 5): Promise<void> {
    try {
      const now = Date.now();
      const entry: CacheEntry<T> = {
        id: key,
        data,
        timestamp: now,
        expiresAt: now + (ttlMinutes * 60 * 1000)
      };

      await this.cache.put(entry);
    } catch (error) {
      console.error(`[DB] Erreur écriture cache "${key}":`, error);
    }
  }

  /**
   * Supprime une entrée spécifique du cache
   */
  async remove(key: string): Promise<void> {
    try {
      await this.cache.delete(key);
    } catch (error) {
      console.error(`[DB] Erreur suppression cache "${key}":`, error);
    }
  }

  /**
   * Supprime toutes les entrées expirées du cache
   */
  async cleanExpired(): Promise<number> {
    try {
      const now = Date.now();
      const expiredCount = await this.cache
        .where('expiresAt')
        .below(now)
        .delete();

      if (expiredCount > 0) {
        console.log(`[DB] ${expiredCount} entrée(s) expirée(s) supprimée(s)`);
      }

      return expiredCount;
    } catch (error) {
      console.error('[DB] Erreur nettoyage cache expiré:', error);
      return 0;
    }
  }

  /**
   * Vide complètement le cache
   */
  async clearAll(): Promise<void> {
    try {
      await this.cache.clear();
      console.log('[DB] Cache vidé complètement');
    } catch (error) {
      console.error('[DB] Erreur vidage cache:', error);
    }
  }

  /**
   * Invalide toutes les entrées correspondant à un préfixe
   * Utile pour invalider toutes les entrées d'un même type
   *
   * @example
   * invalidatePrefix('sites-') // Invalide 'sites-1', 'sites-2', etc.
   */
  async invalidatePrefix(prefix: string): Promise<number> {
    try {
      const keys = await this.cache
        .where('id')
        .startsWith(prefix)
        .primaryKeys();

      await this.cache.bulkDelete(keys);

      if (keys.length > 0) {
        console.log(`[DB] ${keys.length} entrée(s) invalidée(s) pour le préfixe "${prefix}"`);
      }

      return keys.length;
    } catch (error) {
      console.error(`[DB] Erreur invalidation préfixe "${prefix}":`, error);
      return 0;
    }
  }
}

// ============================================================================
// INSTANCE SINGLETON
// ============================================================================

export const db = new GreenSIGDatabase();

// ============================================================================
// GESTION DE VERSION DU CACHE
// ============================================================================

/**
 * Vérifie la version du cache et le vide si elle a changé.
 * Cela garantit que les anciennes données corrompues ou obsolètes
 * sont automatiquement supprimées lors des mises à jour.
 */
async function checkCacheVersion(): Promise<void> {
  const VERSION_KEY = '__cache_version__';

  try {
    const entry = await db.cache.get(VERSION_KEY);
    const storedVersion = entry?.data as string | undefined;

    if (storedVersion !== CACHE_VERSION) {
      console.log(`[DB] Version du cache changée (${storedVersion || 'aucune'} → ${CACHE_VERSION})`);
      console.log('[DB] Vidage automatique du cache...');

      // Vider tout le cache
      await db.cache.clear();

      // Stocker la nouvelle version
      await db.cache.put({
        id: VERSION_KEY,
        data: CACHE_VERSION,
        timestamp: Date.now(),
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 an
      });

      console.log('[DB] Cache vidé et nouvelle version enregistrée');
    } else {
      console.log(`[DB] Version du cache OK (${CACHE_VERSION})`);
    }
  } catch (error) {
    console.error('[DB] Erreur vérification version cache:', error);
    // En cas d'erreur, on vide le cache par sécurité
    try {
      await db.cache.clear();
    } catch {
      // Ignorer les erreurs de vidage
    }
  }
}

// Vérification de version au démarrage
checkCacheVersion();

// Nettoyage automatique au démarrage
db.cleanExpired();

// Nettoyage périodique toutes les 10 minutes
setInterval(() => {
  db.cleanExpired();
}, 10 * 60 * 1000);

// ============================================================================
// HELPERS DE CACHE
// ============================================================================

/**
 * Helper pour générer des clés de cache cohérentes
 */
export const cacheKeys = {
  // Listes complètes
  sites: () => 'sites',
  users: () => 'users',
  equipes: () => 'equipes',
  operateurs: () => 'operateurs',
  absences: () => 'absences',
  competences: () => 'competences',

  // Planning
  taches: () => 'taches',
  typesTaches: () => 'types-taches',
  ratios: () => 'ratios-productivite',

  // Reclamations
  reclamations: () => 'reclamations',

  // Suivi tâches
  suiviTaches: () => 'suivi-taches',

  // Items individuels
  site: (id: number) => `site-${id}`,
  user: (id: number) => `user-${id}`,
  equipe: (id: number) => `equipe-${id}`,
  operateur: (id: number) => `operateur-${id}`,
  tache: (id: number) => `tache-${id}`,
  ratio: (id: number) => `ratio-${id}`,
  reclamation: (id: number) => `reclamation-${id}`,

  // Préfixes pour invalidation groupée
  prefixes: {
    sites: 'site-',
    users: 'user-',
    equipes: 'equipe-',
    operateurs: 'operateur-',
    taches: 'tache-',
    ratios: 'ratio-',
    reclamations: 'reclamation-',
  }
};

/**
 * Configuration TTL (Time To Live) recommandée par type de données
 */
export const cacheTTL = {
  // Données rarement modifiées
  static: 60,        // 1 heure - ex: types de tâches, compétences

  // Données fréquemment consultées
  standard: 15,      // 15 minutes - ex: sites, équipes, opérateurs

  // Données très dynamiques
  dynamic: 5,        // 5 minutes - ex: absences, tâches en cours

  // Données temps réel
  realtime: 1,       // 1 minute - ex: disponibilité opérateurs
};
