# 📚 Documentation Backend - Index

Bienvenue dans la documentation complète du backend Django pour **GreenSIG**.

---

## 📖 Documents Disponibles

### 1. **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** 
📡 **Documentation complète des endpoints API**

Ce document détaille tous les endpoints REST nécessaires pour chaque module de l'application :
- ✅ Authentification (login, logout, refresh token)
- ✅ Dashboard (KPIs, activité récente)
- ✅ Inventaire (matériel, végétation, hydrologie)
- ✅ Planification (tâches, calendrier)
- ✅ Interventions (gestion, photos, statuts)
- ✅ Équipes (membres, disponibilité, absences)
- ✅ Réclamations (création, suivi, résolution)
- ✅ Cartographie (sites, couches, recherche)
- ✅ Portail Client (dashboard, rapports)
- ✅ Reporting (statistiques, exports)
- ✅ Notifications (liste, lecture)

**Format** : Spécifications complètes avec exemples de requêtes/réponses JSON

---

### 2. **[BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)**
🏗️ **Architecture technique du backend Django**

Guide complet de l'architecture backend incluant :
- 🎯 Stack technique (Django, DRF, PostgreSQL, Redis, Celery)
- 📂 Structure du projet
- 🗄️ Modèles de données détaillés pour chaque module
- ⚙️ Configuration Django (settings, middleware, REST Framework)
- 🔒 Système de permissions et sécurité
- 📝 Commandes utiles

**Idéal pour** : Comprendre l'architecture globale et les choix techniques

---

### 3. **[BACKEND_FOLDER_STRUCTURE.md](./BACKEND_FOLDER_STRUCTURE.md)**
📁 **Structure détaillée des dossiers**

Arborescence complète du projet backend avec :
- 🌳 Vue d'ensemble de tous les dossiers et fichiers
- 📝 Description de chaque app Django
- 🔧 Organisation des tests, scripts et configurations
- 📦 Gestion des dépendances (requirements)
- 🚀 Commandes de démarrage (dev, prod, tests)

**Idéal pour** : Naviguer dans le projet et comprendre l'organisation

---

### 4. **[.env.backend.example](./.env.backend.example)**
⚙️ **Template des variables d'environnement**

Fichier de configuration contenant :
- 🔑 Clés secrètes et configuration Django
- 🗄️ Paramètres de base de données PostgreSQL
- 📧 Configuration email (SMTP)
- 🔄 Configuration Redis et Celery
- 🔒 Paramètres de sécurité
- 📊 Configuration API et pagination
- 🌍 Timezone et localisation

**Usage** : Copier ce fichier en `.env` et adapter les valeurs

---

## 🚀 Démarrage Rapide

### Prérequis

- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# 1. Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# 2. Installer les dépendances
pip install -r requirements/development.txt

# 3. Configurer les variables d'environnement
cp docs/.env.backend.example .env
# Éditer .env avec vos valeurs

# 4. Créer la base de données
python manage.py migrate

# 5. Créer un superutilisateur
python manage.py createsuperuser

# 6. Charger les données de test (optionnel)
python scripts/seed_data.py

# 7. Lancer le serveur
python manage.py runserver

# 8. Lancer Celery (dans un autre terminal)
celery -A greensig worker -l info
```

---

## 📊 Modules de l'Application

| Module | Description | Endpoints |
|--------|-------------|-----------|
| **Authentication** | Gestion des utilisateurs et authentification JWT | `/api/auth/*` |
| **Dashboard** | KPIs et vue d'ensemble | `/api/dashboard/*` |
| **Inventory** | Gestion matériel, végétation, hydrologie | `/api/inventory/*` |
| **Planning** | Planification des tâches | `/api/planning/*` |
| **Interventions** | Suivi des interventions sur site | `/api/interventions/*` |
| **Teams** | Gestion des équipes et disponibilités | `/api/teams/*` |
| **Claims** | Système de réclamations | `/api/claims/*` |
| **Map** | Cartographie et géolocalisation | `/api/map/*` |
| **Client Portal** | Interface client | `/api/client-portal/*` |
| **Reporting** | Génération de rapports | `/api/reports/*` |
| **Notifications** | Système de notifications | `/api/notifications/*` |

---

## 🛠️ Technologies Utilisées

### Backend
- **Django 5.0+** : Framework web Python
- **Django REST Framework** : API REST
- **PostgreSQL 15+** : Base de données relationnelle
- **PostGIS** : Extension géospatiale pour PostgreSQL
- **Redis** : Cache et broker de messages
- **Celery** : Tâches asynchrones

### Authentification & Sécurité
- **Simple JWT** : Authentification par tokens JWT
- **Django CORS Headers** : Gestion CORS
- **Permissions personnalisées** : Contrôle d'accès par rôle

### Documentation
- **drf-spectacular** : Documentation OpenAPI 3.0 automatique

### Outils de développement
- **pytest** : Framework de tests
- **black** : Formatage de code
- **flake8** : Linting
- **django-debug-toolbar** : Débogage

---

## 📝 Conventions de Code

### Nommage
- **Models** : PascalCase (ex: `InventoryItem`)
- **Variables/fonctions** : snake_case (ex: `get_user_profile`)
- **Constantes** : UPPER_SNAKE_CASE (ex: `MAX_UPLOAD_SIZE`)
- **URLs** : kebab-case (ex: `/api/inventory-items/`)

### Structure des fichiers
Chaque app Django suit cette structure :
```
app_name/
├── models.py          # Modèles de données
├── serializers.py     # Serializers DRF
├── views.py           # Vues/ViewSets
├── urls.py            # Configuration des URLs
├── filters.py         # Filtres personnalisés
├── services.py        # Logique métier
├── tasks.py           # Tâches Celery
├── permissions.py     # Permissions spécifiques
└── tests/             # Tests unitaires
```

---

## 🧪 Tests

```bash
# Lancer tous les tests
pytest

# Tests avec couverture
pytest --cov=apps --cov-report=html

# Tests d'une app spécifique
pytest apps/inventory/tests/

# Tests d'un fichier spécifique
pytest apps/inventory/tests/test_models.py
```

---

## 📚 Ressources Complémentaires

### Documentation Django
- [Django Official Docs](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Simple JWT](https://django-rest-framework-simplejwt.readthedocs.io/)

### Base de données
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)

### Outils
- [Celery Documentation](https://docs.celeryproject.org/)
- [Redis Documentation](https://redis.io/documentation)

---

## 🤝 Contribution

### Workflow Git
1. Créer une branche depuis `develop`
2. Développer la fonctionnalité
3. Écrire les tests
4. Créer une Pull Request vers `develop`

### Standards de qualité
- ✅ Tous les tests doivent passer
- ✅ Couverture de code > 80%
- ✅ Code formaté avec `black`
- ✅ Pas d'erreurs `flake8`
- ✅ Documentation des fonctions complexes

---

## 📞 Support

Pour toute question concernant le backend :
- 📧 Email : greensig7@gmail.com
- 📖 Documentation : Consulter les fichiers listés ci-dessus
- 🐛 Issues : Créer une issue sur le repository

---

## 📄 Licence

Tous droits réservés - GreenSIG © 2025

---

**Dernière mise à jour** : 2025-12-05  
**Version** : 1.0  
**Auteur** : GreenSIG Development Team
