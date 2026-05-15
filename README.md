# GreenSIG Frontend

[![TypeScript](https://img.shields.io/badge/TypeScript-98.6%25-blue)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646cff?logo=vite)](https://vitejs.dev/)
[![OpenLayers](https://img.shields.io/badge/OpenLayers-GIS-4a90e2?logo=openlayers)](https://openlayers.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**GreenSIG** est un système complet de gestion des espaces verts (Système de Gestion des Espaces Verts) avec capacités SIG. Cette application frontend offre une interface moderne et interactive pour gérer, planifier et surveiller les espaces verts avec une cartographie en temps réel.

## 🌿 Caractéristiques Principales

- 🗺️ **Cartographie Interactive** - OpenLayers avec support des couches Plan, Satellite et Terrain
- 📊 **Tableau de Bord** - KPI et rapports mensuels en temps réel
- 📋 **Gestion des Réclamations** - Suivi complet du cycle de vie des réclamations
- 📅 **Planification des Tâches** - Distribution des tâches et ratios de travail
- 👥 **Gestion d'Équipes** - Gestion des utilisateurs, rôles et structures organisationnelles
- 🔍 **Recherche Avancée** - Recherche avec suggestions et mise en surbrillance sur la carte
- 🛠️ **Outils de Dessin** - Dessinez et éditez des géométries directement sur la carte
- 📐 **Outils de Mesure** - Mesurez distances et surfaces
- 📤 **Import/Export** - Importez des données et exportez les résultats
- 🌐 **Géolocalisation GPS** - Suivi de localisation en temps réel
- 🔐 **Authentification JWT** - Sécurité avec gestion des tokens et renouvellement automatique
- 📱 **Responsive Design** - Interface adaptée à tous les appareils

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18.0.0+ et npm/yarn
- Compte Google Gemini API (optionnel, pour les fonctionnalités IA)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/greensigteam/greensig-front.git
cd greensig-front

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Configuration

Créez un fichier `.env` à la racine du projet :

```env
# URL de l'API backend (optionnel - Vite proxy /api vers localhost:8000 par défaut)
VITE_API_BASE_URL=http://localhost:8000

# Mode tunnel Cloudflare (WSS sur port 443)
VITE_USE_TUNNEL=false

# Clé API Google Gemini (pour les fonctionnalités IA)
GEMINI_API_KEY=your_gemini_api_key_here
```

## 📖 Scripts Disponibles

### Développement

```bash
npm run dev              # Démarrer le serveur de développement
npm run build            # Créer une build de production
npm run preview          # Prévisualiser la build de production
```

### Tests

```bash
npm run test             # Exécuter tous les tests (vitest)
npm run test:watch       # Mode surveillance
npm run test:ui          # Interface Vitest
npm run test:coverage    # Rapport de couverture (v8)
npm run e2e              # Tests E2E Playwright
npm run e2e:ui           # Mode UI Playwright
```

### Qualité du Code

```bash
npm run typecheck        # Vérifier les types TypeScript (strict mode)
npm run lint             # Exécuter ESLint
npm run lint:fix         # Corriger automatiquement les problèmes ESLint
npm run format           # Formater le code avec Prettier
```

## 🏗️ Architecture

### Structure du Projet

```
greensig-front/
├── App.tsx                    # Composant principal avec routage
├── index.tsx                  # Point d'entrée de l'application
├── types.ts                   # Interfaces TypeScript
├── constants.ts               # Configurations de couches carte
├── store.ts                   # Données mock pour développement
│
├── pages/                     # Composants de route
│   ├── Dashboard.tsx
│   ├── MapPage.tsx
│   ├── Inventory.tsx
│   ├── Planning.tsx
│   ├── Teams.tsx
│   ├── Claims.tsx
│   ├── Reclamations.tsx
│   ├── Users.tsx
│   ├── Sites.tsx
│   ├── Reporting.tsx
│   ├── ClientPortal.tsx
│   └── Login.tsx
│
├── components/                # Composants réutilisables
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── DataTable.tsx
│   ├── map/                   # Composants carte
│   │   ├── OLMap.tsx
│   │   ├── MapFloatingTools.tsx
│   │   ├── MapSearchBar.tsx
│   │   ├── MapZoomControls.tsx
│   │   ├── SelectionPanel.tsx
│   │   └── SiteCarousel.tsx
│   ├── import/                # Wizard d'import
│   │   ├── ImportWizard.tsx
│   │   ├── AttributeMapper.tsx
│   │   ├── ImportPreview.tsx
│   │   └── ValidationResults.tsx
│   └── export/                # Fonctionnalités d'export
│       └── ExportPanel.tsx
│
├── contexts/                  # Contextes React
│   ├── MapContext.tsx
│   ├── SelectionContext.tsx
│   ├── DrawingContext.tsx
│   ├── ToastContext.tsx
│   ├── SearchContext.tsx
│   ├── NotificationContext.tsx
│   ├── AppStateContext.tsx
│   └── ExportContext.tsx
│
├── hooks/                     # Hooks personnalisés
│   ├── useDrawingTools.ts
│   ├── useMeasurementTools.ts
│   ├── useBoxSelection.ts
│   ├── useGeometryOperations.ts
│   ├── useSplitTool.ts
│   ├── useMapClickHandler.ts
│   ├── useMapHoverTooltip.ts
│   ├── useSearch.ts
│   ├── useSearchHighlight.ts
│   └── useGeolocation.ts
│
├── services/                  # Clients API
│   ├── api.ts                 # Client HTTP unifié
│   ├── usersApi.ts
│   ├── planningService.ts
│   ├── reclamationsApi.ts
│   ├── suiviTachesApi.ts
│   ├── kpiApi.ts
│   └── reportsApi.ts
│
└── config files
    ├── vite.config.ts
    ├── tsconfig.json
    ├── vitest.config.ts
    └── playwright.config.ts
```

### Stack Technologique

| Technologie | Version | Utilisation |
|-------------|---------|------------|
| React | 19 | Framework UI |
| TypeScript | 5+ | Langage |
| Vite | 5+ | Build tool |
| OpenLayers | Latest | Cartographie GIS |
| React Router | 6+ | Routage |
| Vitest | Latest | Tests unitaires |
| Playwright | Latest | Tests E2E |
| ESLint | Latest | Linting |
| Prettier | Latest | Formatage |

### Concepts Clés

#### Systèmes de Coordonnées

- **Interne** : EPSG:4326 (WGS84)
- **Format GeoJSON** : `[lng, lat]`
- **Format Frontend** : `{lat, lng}`

#### Gestion d'État

- **Contexte Global** (`AppStateContext`) : Utilisateur, état carte, recherche, couches
- **Contextes Métier** : Sélection, Dessin, Notifications, Export

#### Authentification

- JWT avec renouvellement automatique des tokens
- Gestion des erreurs 403 avec déconnexion
- Stockage sécurisé des credentials

## 🎯 Modules Principaux

### 📊 Dashboard
Vue d'ensemble avec KPI, tendances et rapports mensuels en temps réel.

### 🗺️ Carte Interactive
- Couches multiples (Plan/Satellite/Terrain)
- Clustering de features
- Outils de dessin et édition
- Mesure de distances et surfaces
- Sélection par boîte englobante
- Recherche avec mise en surbrillance

### 📋 Gestion des Réclamations
- Cycle de vie complet des réclamations
- Assignment et suivi
- Satisfaction des clients
- Intégration avec les tâches de maintenance

### 📅 Planification
- Distribution des tâches
- Types de tâches et ratios
- Duplication de planifications
- Produits et produits chimiques

### 👥 Équipes & Utilisateurs
- Gestion des rôles et permissions
- Structures organisationnelles
- Suivi des absences
- Attribution des équipes

### 📤 Import/Export
- Import de données avec validation
- Mappage d'attributs
- Preview avant import
- Export des résultats

## 🔧 Configuration Avancée

### TypeScript Strict Mode

L'application utilise TypeScript en mode strict avec `noUncheckedIndexedAccess` - l'accès aux arrays/objects retourne `T | undefined`.

### Mode Développement vs Production

```bash
# Développement (hot reload)
npm run dev

# Production (optimisé)
npm run build
npm run preview
```

### Proxy API

Vite proxy automatiquement `/api` vers `localhost:8000` en développement, ou utilise `VITE_API_BASE_URL` si défini.

### Mode Tunnel Cloudflare

Activez `VITE_USE_TUNNEL=true` pour utiliser WebSocket sécurisé (WSS) sur port 443 avec tunnel Cloudflare.

## 📡 Intégration Backend

L'application communique avec le backend GreenSIG via une API REST :

- **Base URL** : `http://localhost:8000` (par défaut)
- **Authentification** : JWT Bearer token
- **Endpoints principaux** :
  - `/api/users/` - Gestion utilisateurs
  - `/api/planning/` - Planification tâches
  - `/api/reclamations/` - Réclamations
  - `/api/search/` - Recherche
  - `/api/kpi/` - KPI et tendances
  - `/api/reports/` - Rapports

Voir [greensig-backend](https://github.com/greensigteam/greensig-backend) pour la documentation API complète.

## 🧪 Tests

### Tests Unitaires

```bash
npm run test              # Exécuter une fois
npm run test:watch       # Mode surveillance
npm run test:ui          # Interface Vitest
npm run test:coverage    # Couverture de code
```

### Tests E2E

```bash
npm run e2e              # Exécuter les tests
npm run e2e:ui          # Mode UI interactif
```

## 🐛 Débogage

### Logs Développement

```typescript
// Logs de développement
import { useDebugLog } from './hooks/useDebugLog';
const { debug } = useDebugLog('ModuleName');
debug('Message', data);
```

### Devtools

- React DevTools - Chrome Extension
- Redux DevTools (pour le contexte)
- Vue OpenLayers dans la console

## 🤝 Contribution

Les contributions sont bienvenues ! Veuillez :

1. Fork le dépôt
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📋 Conventions de Code

- **TypeScript** : Mode strict activé
- **Style** : ESLint + Prettier
- **Nommage** : camelCase pour les variables/fonctions, PascalCase pour les composants
- **Composants** : Fonctionnels avec hooks
- **État** : Contextes pour l'état global, hooks locaux pour l'état local

## 🔐 Sécurité

- Tokens JWT stockés de manière sécurisée
- HTTPS/WSS en production
- Protection contre les erreurs 403
- Validation des entrées utilisateur
- Échappement du contenu rendu

## 📄 License

Ce projet est licencié sous la License MIT - voir le fichier [LICENSE](LICENSE) pour les détails.

## 📞 Support

Pour les questions ou problèmes :

- 📧 Email : support@greensig.fr
- 🐛 Issues : [GitHub Issues](https://github.com/greensigteam/greensig-front/issues)
- 💬 Discussions : [GitHub Discussions](https://github.com/greensigteam/greensig-front/discussions)

## 🙏 Remerciements

- [OpenLayers](https://openlayers.org/) pour la cartographie GIS
- [React](https://react.dev/) pour le framework UI
- [Vite](https://vitejs.dev/) pour le build tool performant
- La communauté open source

## 📝 Changelog

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique des versions.

## 🔗 Ressources Connexes

- [Backend GreenSIG](https://github.com/greensigteam/greensig-backend)
- [Documentation API](https://github.com/greensigteam/greensig-backend#-api-documentation)
- [Guide Développeur](./CLAUDE.md)

---

**GreenSIG** - Système de Gestion des Espaces Verts avec GIS intégré © 2024