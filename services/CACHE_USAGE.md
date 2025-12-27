# Guide d'Utilisation du Cache Dexie

## 📋 Vue d'ensemble

Le système de cache utilise Dexie.js (wrapper moderne pour IndexedDB) pour stocker localement les données et améliorer les performances en réduisant les appels API répétitifs.

## 🎯 Avantages

- **Performance** : Réponse instantanée pour les données déjà en cache
- **Expérience utilisateur** : Navigation fluide, moins de temps de chargement
- **Réduction de charge serveur** : Moins d'appels API inutiles
- **Gestion automatique** : Expiration et nettoyage automatiques

## 📦 Structure

```
services/
├── db.ts               # Configuration Dexie + helpers
├── api.ts              # Service API principal (avec cache)
├── usersApi.ts         # Service utilisateurs (avec cache)
└── CACHE_USAGE.md      # Ce fichier
```

## 🔧 Configuration TTL (Time To Live)

Le fichier `db.ts` définit des durées de vie recommandées :

```typescript
export const cacheTTL = {
  static: 60,      // 1h  - Données rarement modifiées (types, compétences)
  standard: 15,    // 15m - Données fréquentes (sites, équipes)
  dynamic: 5,      // 5m  - Données dynamiques (absences, tâches)
  realtime: 1,     // 1m  - Données temps réel (disponibilité)
};
```

## 📖 Utilisation de base

### 1. Importer le cache

```typescript
import { db, cacheKeys, cacheTTL } from './db';
```

### 2. Pattern "Cache-First" (recommandé)

```typescript
export async function fetchSites(): Promise<Site[]> {
  // 1. Essayer de lire du cache
  const cached = await db.get<Site[]>(cacheKeys.sites());
  if (cached) {
    console.log('[Cache HIT] Sites');
    return cached;
  }

  // 2. Si pas en cache, appeler l'API
  console.log('[Cache MISS] Sites - Appel API');
  const sites = await fetchApi<PaginatedResponse<Site>>('/sites/');

  // 3. Stocker en cache pour la prochaine fois
  await db.set(cacheKeys.sites(), sites.results, cacheTTL.standard);

  return sites.results;
}
```

### 3. Pattern "Network-First" (données critiques)

Pour les données qui doivent être à jour :

```typescript
export async function fetchUser(id: number): Promise<User> {
  try {
    // 1. Appeler l'API d'abord
    const user = await fetchApi<User>(`/users/${id}/`);

    // 2. Mettre à jour le cache
    await db.set(cacheKeys.user(id), user, cacheTTL.standard);

    return user;
  } catch (error) {
    // 3. Fallback sur le cache si l'API échoue
    const cached = await db.get<User>(cacheKeys.user(id));
    if (cached) {
      console.warn('[Fallback Cache] User', id);
      return cached;
    }
    throw error;
  }
}
```

## 🔄 Invalidation du cache

### Invalidation individuelle

```typescript
// Après une modification
async function updateSite(id: number, data: SiteUpdate) {
  const updated = await fetchApi(`/sites/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });

  // Invalider l'entrée spécifique
  await db.remove(cacheKeys.site(id));
  // Et la liste complète
  await db.remove(cacheKeys.sites());

  return updated;
}
```

### Invalidation groupée

```typescript
// Invalider tous les sites (site-1, site-2, ...)
await db.invalidatePrefix(cacheKeys.prefixes.sites);

// Invalider tous les utilisateurs
await db.invalidatePrefix(cacheKeys.prefixes.users);
```

### Vider tout le cache

```typescript
await db.clearAll();
```

## 🎨 Exemple complet : Service Sites

```typescript
import { db, cacheKeys, cacheTTL } from './db';

// Liste des sites (cache 15 minutes)
export async function fetchSites(): Promise<Site[]> {
  const cached = await db.get<Site[]>(cacheKeys.sites());
  if (cached) return cached;

  const response = await fetchApi<PaginatedResponse<Site>>('/sites/');
  await db.set(cacheKeys.sites(), response.results, cacheTTL.standard);
  return response.results;
}

// Site individuel (cache 15 minutes)
export async function fetchSiteById(id: number): Promise<Site> {
  const cached = await db.get<Site>(cacheKeys.site(id));
  if (cached) return cached;

  const site = await fetchApi<Site>(`/sites/${id}/`);
  await db.set(cacheKeys.site(id), site, cacheTTL.standard);
  return site;
}

// Création (invalide le cache)
export async function createSite(data: SiteCreate): Promise<Site> {
  const created = await fetchApi<Site>('/sites/', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  // Invalider la liste pour forcer un refresh
  await db.remove(cacheKeys.sites());

  return created;
}

// Modification (invalide le cache)
export async function updateSite(id: number, data: SiteUpdate): Promise<Site> {
  const updated = await fetchApi<Site>(`/sites/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });

  // Invalider l'entrée modifiée ET la liste
  await db.remove(cacheKeys.site(id));
  await db.remove(cacheKeys.sites());

  return updated;
}

// Suppression (invalide le cache)
export async function deleteSite(id: number): Promise<void> {
  await fetchApi<void>(`/sites/${id}/`, { method: 'DELETE' });

  await db.remove(cacheKeys.site(id));
  await db.remove(cacheKeys.sites());
}
```

## 🧹 Nettoyage automatique

Le système effectue automatiquement :

1. **Au démarrage** : Suppression des entrées expirées
2. **Toutes les 10 minutes** : Nettoyage périodique des entrées expirées

```typescript
// Déjà configuré dans db.ts
db.cleanExpired();
setInterval(() => db.cleanExpired(), 10 * 60 * 1000);
```

## 🔍 Debugging

### Activer les logs de cache

Les logs sont déjà présents dans le code. Cherchez dans la console :

- `[Cache HIT]` : Donnée trouvée en cache
- `[Cache MISS]` : Appel API effectué
- `[DB]` : Opérations sur le cache

### Inspecter le cache dans DevTools

1. Ouvrir DevTools (F12)
2. Onglet "Application" / "Stockage"
3. IndexedDB → GreenSIGDB → cache

### Vider manuellement le cache

```typescript
// Dans la console du navigateur
await db.clearAll();
```

## ⚠️ Bonnes pratiques

### ✅ À FAIRE

- Utiliser le cache pour les **listes et données consultées fréquemment**
- **Invalider le cache** après toute modification (POST, PATCH, DELETE)
- Choisir le **bon TTL** selon la fréquence de modification des données
- Ajouter des **logs** pour débugger facilement

### ❌ À ÉVITER

- Ne PAS cacher des **données sensibles** (mots de passe, tokens)
- Ne PAS cacher des **données temps réel critique** (sauf avec TTL très court)
- Ne PAS oublier d'**invalider le cache** après modifications
- Ne PAS utiliser un TTL trop long pour des **données fréquemment modifiées**

## 📊 Stratégies de cache par type de données

| Type de données | Stratégie | TTL | Exemple |
|-----------------|-----------|-----|---------|
| Référentiels | Cache-First | 60min | Types de tâches, compétences |
| Listes statiques | Cache-First | 15min | Sites, clients |
| Listes dynamiques | Cache-First | 5min | Équipes, opérateurs |
| Données utilisateur | Cache-First | 15min | Profil utilisateur |
| Disponibilités | Network-First | 1min | Opérateurs disponibles |
| Temps réel | Network-First | 1min | Tâches en cours |
| Modifications | Jamais | - | POST/PATCH/DELETE |

## 🚀 Migration progressive

Pour migrer un service existant :

1. **Ajouter le cache uniquement aux GET**
2. **Tester** avec des logs pour vérifier les HIT/MISS
3. **Ajouter l'invalidation** sur POST/PATCH/DELETE
4. **Ajuster le TTL** selon les besoins réels

Exemple de migration par étapes :

```typescript
// Étape 1 : Ajouter le cache (GET uniquement)
export async function fetchEquipes() {
  const cached = await db.get<Equipe[]>(cacheKeys.equipes());
  if (cached) return cached;

  const data = await fetchApi('/equipes/');
  await db.set(cacheKeys.equipes(), data, cacheTTL.standard);
  return data;
}

// Étape 2 : Ajouter l'invalidation (POST/PATCH/DELETE)
export async function updateEquipe(id: number, data: EquipeUpdate) {
  const updated = await fetchApi(`/equipes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });

  await db.remove(cacheKeys.equipe(id));
  await db.remove(cacheKeys.equipes());

  return updated;
}

// Étape 3 : Ajuster TTL si nécessaire
// Si les équipes changent rarement : cacheTTL.static (60min)
// Si elles changent souvent : cacheTTL.dynamic (5min)
```
