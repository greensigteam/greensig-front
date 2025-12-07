# GreenSIG V1 - Système de Gestion des Espaces Verts

GreenSIG est une solution complète de gestion des espaces verts assistée par un Système d'Information Géographique (SIG). Cette application permet aux professionnels de gérer efficacement leurs interventions, leurs équipes, et leur inventaire matériel et végétal, le tout centré autour d'une cartographie interactive.

## 🚀 Fonctionnalités Principales

L'application est divisée en plusieurs modules clés :

*   **📊 Tableau de Bord (Dashboard)** : Vue d'ensemble des indicateurs clés de performance (KPIs), alertes et statistiques en temps réel.
*   **🗺️ Carte Interactive (Map)** : Visualisation géolocalisée des parcelles, réseaux d'irrigation, et zones d'intervention. Outils de mesure et de navigation intégrés.
*   **📦 Inventaire** : Gestion complète des ressources :
    *   **Matériel** : Suivi des équipements et de leur maintenance.
    *   **Végétation** : Catalogue des espèces plantées.
    *   **Hydrologie** : Gestion des points d'eau et systèmes d'irrigation.
*   **📅 Planification** : Calendrier des tâches et organisation des plannings des équipes.
*   **🛠️ Interventions** : Suivi opérationnel des travaux (tonte, taille, traitement, etc.).
*   **👥 Équipes** : Gestion des ressources humaines, plannings et compétences.
*   **📢 Réclamations** : Système de ticketing pour les signalements clients et internes.
*   **📱 Portail Client** : Interface dédiée pour la communication et le suivi avec les clients.

## 🛠️ Stack Technique

Ce projet est construit avec des technologies web modernes pour assurer performance et maintenabilité :

*   **Frontend Framework** : [React](https://reactjs.org/) (v18)
*   **Langage** : [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool** : [Vite](https://vitejs.dev/)
*   **Styling** : [Tailwind CSS](https://tailwindcss.com/)
*   **Icônes** : [Lucide React](https://lucide.dev/)
*   **Cartographie** : Leaflet / React-Leaflet

## 📂 Structure du Projet

```
GreenSIGV1/
├── components/       # Composants UI réutilisables (DataTable, Header, MapView...)
├── convention/       # Conventions de codage et documentation technique
├── data/             # Données statiques ou mockées
├── docs/             # Documentation du projet
├── pages/            # Vues principales de l'application (Dashboard, Inventory, Map...)
├── public/           # Assets statiques (images, logos)
├── services/         # Services d'API et logique métier
├── styles/           # Fichiers CSS globaux et spécifiques
├── types.ts          # Définitions des types TypeScript
└── store.ts          # Gestion d'état et données mockées (Store)
```

## 💻 Installation et Démarrage

Prérequis : Node.js (v16+ recommandé).

1.  **Cloner le projet** (si applicable) ou naviguer dans le dossier :
    ```bash
    cd GreenSIGV1
    ```

2.  **Installer les dépendances** :
    ```bash
    npm install
    ```

3.  **Lancer le serveur de développement** :
    ```bash
    npm run dev
    ```
    L'application sera accessible à l'adresse `http://localhost:5173` (ou port similaire).

4.  **Construire pour la production** :
    ```bash
    npm run build
    ```

## 📝 Conventions

Veuillez vous référer au dossier `convention/` pour les règles de nommage et les bonnes pratiques de développement adoptées sur ce projet.

## 📄 Licence

Tous droits réservés - GreenSIG.
