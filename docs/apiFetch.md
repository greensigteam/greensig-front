
# Documentation : apiFetch.ts (Front-end)

> **Note historique** :
> Avant l’implémentation du module `api_users` côté backend et de `apiFetch.ts` côté frontend, les endpoints REST n’étaient pas sécurisés et toutes les requêtes étaient non authentifiées. L’ajout de ces modules a permis de garantir la sécurité et la traçabilité de toutes les opérations utilisateurs.

## Rôle du module

Le module `apiFetch.ts` centralise toutes les requêtes HTTP du front-end vers l’API backend. Il gère automatiquement l’authentification JWT pour tous les appels, garantissant que chaque requête est sécurisée et conforme aux exigences du backend.

## Fonctionnalités principales

- **Injection automatique du token JWT** :
  - Le token d’accès (`access_token`) est récupéré depuis le localStorage et ajouté à l’en-tête `Authorization` de chaque requête (`Bearer ...`).
  - Si le token est expiré, le module tente de le rafraîchir automatiquement avec le `refresh_token`.
- **Gestion centralisée des erreurs d’authentification** :
  - Si le token est invalide ou expiré et ne peut être rafraîchi, l’utilisateur est déconnecté et redirigé vers la page de login.
- **Uniformisation des appels API** :
  - Toutes les fonctions du front-end utilisent `apiFetch` pour garantir la cohérence et la sécurité des échanges avec le backend.
- **Support des méthodes GET, POST, PUT, PATCH, DELETE**
- **Gestion des headers JSON, multipart, etc.**

## Exemple d’utilisation

```typescript
import { apiFetch } from '../services/apiFetch';

// Exemple : récupérer le profil utilisateur connecté
const response = await apiFetch('/api/users/me/');
const user = await response.json();
```

## Sécurité

- Toutes les requêtes sont authentifiées par JWT (voir la doc backend pour le fonctionnement du token).
- Les tokens sont stockés côté client (localStorage) et renouvelés automatiquement si besoin.
- Les endpoints non protégés (ex : /api/token/) sont gérés sans header Authorization.

## Bonnes pratiques

- Toujours utiliser `apiFetch` pour toute communication avec l’API backend.
- Ne jamais manipuler directement les tokens dans les autres modules du front-end.
- En cas de modification du système d’authentification, adapter ce module en priorité.

---

**greenSIGteam**  
Contact : greensig7@gmail.com  
© 2025 GreenSIG. Tous droits réservés.
