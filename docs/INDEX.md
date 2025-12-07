# 📚 Documentation GreenSIG - Index Complet

Bienvenue dans la documentation complète du projet **GreenSIG**.

---

## 👥 Informations de l'Équipe

📧 **Contact** : greensig7@gmail.com  
📖 **Voir** : [TEAM_INFO.md](./TEAM_INFO.md)

---

## 📂 Documentation Disponible

### 🎨 Frontend

| Fichier | Description | Taille |
|---------|-------------|--------|
| **[DOCUMENTATION_CARTOGRAPHIE.md](./DOCUMENTATION_CARTOGRAPHIE.md)** | Documentation technique de la cartographie Leaflet | 4.8 KB |
| **[SITES_INTEGRATION.md](./SITES_INTEGRATION.md)** | Guide d'intégration des sites géolocalisés | 6.2 KB |
| **[RÉSUMÉ_CORRECTIONS.md](./RÉSUMÉ_CORRECTIONS.md)** | Historique des corrections et améliorations | 5.1 KB |

### 🔧 Backend

| Fichier | Description | Taille |
|---------|-------------|--------|
| **[BACKEND_README.md](./BACKEND_README.md)** | 📖 Index et guide de démarrage backend | 7.3 KB |
| **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** | 📡 Documentation complète des endpoints API (60+) | 27 KB |
| **[BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)** | 🏗️ Architecture technique Django complète | 32 KB |
| **[BACKEND_FOLDER_STRUCTURE.md](./BACKEND_FOLDER_STRUCTURE.md)** | 📁 Structure détaillée des dossiers backend | 19 KB |
| **[BACKEND_DOCUMENTATION_SUMMARY.md](./BACKEND_DOCUMENTATION_SUMMARY.md)** | ✅ Résumé de la documentation backend | 6.5 KB |
| **[.env.backend.example](./.env.backend.example)** | ⚙️ Template des variables d'environnement | 3.6 KB |

### 👥 Équipe

| Fichier | Description | Taille |
|---------|-------------|--------|
| **[TEAM_INFO.md](./TEAM_INFO.md)** | Informations de l'équipe et roadmap | 4.9 KB |

---

## 🚀 Démarrage Rapide

### Pour le Frontend

```bash
cd GreenSIGV1
npm install
npm run dev
```

📖 **Documentation** : Voir [README.md](../README.md) à la racine du projet

### Pour le Backend

```bash
# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install -r requirements/development.txt

# Configuration
cp docs/.env.backend.example .env
# Éditer .env avec vos valeurs

# Migrations
python manage.py migrate

# Lancer le serveur
python manage.py runserver
```

📖 **Documentation** : Voir [BACKEND_README.md](./BACKEND_README.md)

---

## 📊 Modules de l'Application

### Frontend (Implémenté)
- ✅ **Dashboard** - Tableau de bord avec KPIs
- ✅ **Map** - Cartographie interactive (Leaflet)
- ✅ **Inventory** - Gestion matériel, végétation, hydrologie
- ✅ **Planning** - Planification des tâches
- ✅ **Interventions** - Suivi des interventions
- ✅ **Teams** - Gestion des équipes
- ✅ **Claims** - Système de réclamations
- ✅ **Client Portal** - Interface client
- ✅ **Reporting** - Génération de rapports

### Backend (Documentation prête)
- 📋 **Authentication** - `/api/auth/*`
- 📋 **Dashboard** - `/api/dashboard/*`
- 📋 **Inventory** - `/api/inventory/*`
- 📋 **Planning** - `/api/planning/*`
- 📋 **Interventions** - `/api/interventions/*`
- 📋 **Teams** - `/api/teams/*`
- 📋 **Claims** - `/api/claims/*`
- 📋 **Map** - `/api/map/*`
- 📋 **Client Portal** - `/api/client-portal/*`
- 📋 **Reporting** - `/api/reports/*`
- 📋 **Notifications** - `/api/notifications/*`

---

## 🛠️ Stack Technique

### Frontend
- React 19 + TypeScript
- Vite
- Leaflet / React-Leaflet
- Lucide React Icons

### Backend (À implémenter)
- Django 5.0+
- Django REST Framework
- PostgreSQL 15+ (PostGIS)
- Redis + Celery
- JWT Authentication

---

## 📖 Guide de Lecture

### Pour les Développeurs Frontend
1. Lire [README.md](../README.md) principal
2. Consulter [DOCUMENTATION_CARTOGRAPHIE.md](./DOCUMENTATION_CARTOGRAPHIE.md) pour la carte
3. Voir [SITES_INTEGRATION.md](./SITES_INTEGRATION.md) pour les sites
4. Consulter [API_ENDPOINTS.md](./API_ENDPOINTS.md) pour l'intégration API

### Pour les Développeurs Backend
1. Commencer par [BACKEND_README.md](./BACKEND_README.md)
2. Lire [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) pour l'architecture
3. Consulter [API_ENDPOINTS.md](./API_ENDPOINTS.md) pour les endpoints
4. Voir [BACKEND_FOLDER_STRUCTURE.md](./BACKEND_FOLDER_STRUCTURE.md) pour la structure
5. Utiliser [.env.backend.example](./.env.backend.example) pour la configuration

### Pour les Chefs de Projet
1. Lire [TEAM_INFO.md](./TEAM_INFO.md) pour la vue d'ensemble
2. Consulter [BACKEND_DOCUMENTATION_SUMMARY.md](./BACKEND_DOCUMENTATION_SUMMARY.md)
3. Voir la roadmap dans [TEAM_INFO.md](./TEAM_INFO.md)

---

## 📝 Conventions

### Nommage des Fichiers
- Documentation générale : `NOM_EN_MAJUSCULES.md`
- Documentation technique : `NOM_DESCRIPTIF.md`
- Configuration : `.nom.example`

### Structure des Documents
- Titre principal avec emoji
- Table des matières pour les longs documents
- Sections numérotées
- Exemples de code avec syntaxe highlighting
- Liens vers les autres documents

---

## 🔍 Recherche Rapide

### Cartographie
- Leaflet : [DOCUMENTATION_CARTOGRAPHIE.md](./DOCUMENTATION_CARTOGRAPHIE.md)
- Sites : [SITES_INTEGRATION.md](./SITES_INTEGRATION.md)

### API
- Tous les endpoints : [API_ENDPOINTS.md](./API_ENDPOINTS.md)
- Architecture : [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)

### Configuration
- Variables d'environnement : [.env.backend.example](./.env.backend.example)
- Structure projet : [BACKEND_FOLDER_STRUCTURE.md](./BACKEND_FOLDER_STRUCTURE.md)

---

## 📞 Support

**Email de l'équipe** : greensig7@gmail.com

Pour toute question :
- 📖 Consulter d'abord la documentation appropriée
- 📧 Contacter l'équipe si nécessaire
- 🐛 Créer une issue sur le repository

---

## 📊 Statistiques de la Documentation

- **Fichiers de documentation** : 10
- **Taille totale** : ~115 KB
- **Endpoints documentés** : 60+
- **Modèles de données** : 15+
- **Modules** : 11
- **Pages estimées** : ~150+

---

## 🎯 Prochaines Étapes

### Phase Actuelle : Backend
1. ✅ Documentation complète créée
2. ⏳ Initialisation du projet Django
3. ⏳ Création des modèles
4. ⏳ Implémentation des endpoints
5. ⏳ Tests unitaires

### Phase Suivante : Intégration
1. Connexion Frontend-Backend
2. Authentification JWT
3. Upload de fichiers
4. Notifications temps réel

---

**Dernière mise à jour** : 2025-12-05  
**Version** : 1.0  
**Équipe** : GreenSIG Development Team  
**Contact** : greensig7@gmail.com
