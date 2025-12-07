# 📁 Structure de Dossiers Backend Django - GreenSIG

Ce document présente la structure complète des dossiers pour le backend Django.

---

## 🌳 Arborescence Complète

```
greensig-backend/
│
├── 📁 greensig/                          # Configuration principale Django
│   ├── __init__.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── urls.py                          # URLs racine
│   │
│   └── 📁 settings/                     # Configuration par environnement
│       ├── __init__.py
│       ├── base.py                      # Configuration commune
│       ├── development.py               # Configuration développement
│       ├── production.py                # Configuration production
│       └── testing.py                   # Configuration tests
│
├── 📁 apps/                              # Applications Django
│   │
│   ├── 📁 core/                         # Utilitaires communs
│   │   ├── __init__.py
│   │   ├── models.py                    # Modèles abstraits (TimeStampedModel, etc.)
│   │   ├── serializers.py               # Serializers de base
│   │   ├── permissions.py               # Permissions globales (IsAdmin, IsOperator, etc.)
│   │   ├── pagination.py                # Pagination personnalisée
│   │   ├── exceptions.py                # Exceptions personnalisées
│   │   ├── validators.py                # Validateurs réutilisables
│   │   ├── utils.py                     # Fonctions utilitaires
│   │   └── middleware.py                # Middlewares personnalisés
│   │
│   ├── 📁 authentication/               # 🔐 Authentification & Utilisateurs
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                    # User (custom user model)
│   │   ├── serializers.py               # UserSerializer, LoginSerializer, etc.
│   │   ├── views.py                     # LoginView, LogoutView, RefreshTokenView, etc.
│   │   ├── urls.py                      # /api/auth/*
│   │   ├── permissions.py               # Permissions spécifiques
│   │   ├── utils.py                     # Utilitaires JWT, etc.
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_views.py
│   │   │   └── test_serializers.py
│   │   └── migrations/
│   │
│   ├── 📁 dashboard/                    # 📊 Tableau de bord
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                    # KPI, DashboardWidget, etc.
│   │   ├── serializers.py               # KPISerializer, etc.
│   │   ├── views.py                     # DashboardKPIView, RecentActivityView
│   │   ├── urls.py                      # /api/dashboard/*
│   │   ├── services.py                  # Logique métier (calcul KPIs, etc.)
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_services.py
│   │   │   └── test_views.py
│   │   └── migrations/
│   │
│   ├── 📁 inventory/                    # 📦 Inventaire
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                    # InventoryItem, VegetationItem, HydrologyEquipment, MaintenanceRecord
│   │   ├── serializers.py               # InventoryItemSerializer, VegetationSerializer, etc.
│   │   ├── views.py                     # InventoryViewSet, VegetationViewSet, etc.
│   │   ├── urls.py                      # /api/inventory/*
│   │   ├── filters.py                   # Filtres DRF (InventoryFilter, etc.)
│   │   ├── services.py                  # Logique métier
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_views.py
│   │   │   └── test_filters.py
│   │   └── migrations/
│   │
│   ├── 📁 planning/                     # 📅 Planification
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                    # Task, RecurringTask, etc.
│   │   ├── serializers.py               # TaskSerializer, CalendarSerializer, etc.
│   │   ├── views.py                     # TaskViewSet, CalendarView, etc.
│   │   ├── urls.py                      # /api/planning/*
│   │   ├── filters.py                   # TaskFilter, etc.
│   │   ├── services.py                  # Logique de planification
│   │   ├── tasks.py                     # Tâches Celery (notifications, récurrence, etc.)
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_views.py
│   │   │   └── test_tasks.py
│   │   └── migrations/
│   │
│   ├── 📁 interventions/                # 🛠️ Interventions
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                    # Intervention, InterventionPhoto, etc.
│   │   ├── serializers.py               # InterventionSerializer, PhotoSerializer, etc.
│   │   ├── views.py                     # InterventionViewSet, PhotoUploadView, etc.
│   │   ├── urls.py                      # /api/interventions/*
│   │   ├── filters.py                   # InterventionFilter, etc.
│   │   ├── services.py                  # Logique métier
│   │   ├── tasks.py                     # Tâches Celery (notifications, etc.)
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_views.py
│   │   │   └── test_services.py
│   │   └── migrations/
│   │
│   ├── 📁 teams/                        # 👥 Équipes
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                    # TeamMember, AbsenceRecord, etc.
│   │   ├── serializers.py               # TeamMemberSerializer, AbsenceSerializer, etc.
│   │   ├── views.py                     # TeamMemberViewSet, AvailabilityView, etc.
│   │   ├── urls.py                      # /api/teams/*
│   │   ├── filters.py                   # TeamMemberFilter, etc.
│   │   ├── services.py                  # Logique métier (calcul disponibilité, etc.)
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_views.py
│   │   │   └── test_services.py
│   │   └── migrations/
│   │
│   ├── 📁 claims/                       # 📢 Réclamations
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                    # Claim, ClaimPhoto, ClaimComment, etc.
│   │   ├── serializers.py               # ClaimSerializer, CommentSerializer, etc.
│   │   ├── views.py                     # ClaimViewSet, CommentViewSet, etc.
│   │   ├── urls.py                      # /api/claims/*
│   │   ├── filters.py                   # ClaimFilter, etc.
│   │   ├── services.py                  # Logique métier (auto-rating, etc.)
│   │   ├── tasks.py                     # Tâches Celery (notifications, rappels, etc.)
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_views.py
│   │   │   └── test_tasks.py
│   │   └── migrations/
│   │
│   ├── 📁 map/                          # 🗺️ Cartographie
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                    # Site, MapLayer, etc.
│   │   ├── serializers.py               # SiteSerializer, GeoJSONSerializer, etc.
│   │   ├── views.py                     # SiteViewSet, LayerView, SearchView, etc.
│   │   ├── urls.py                      # /api/map/*
│   │   ├── filters.py                   # SiteFilter, etc.
│   │   ├── services.py                  # Logique géospatiale
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_views.py
│   │   │   └── test_services.py
│   │   └── migrations/
│   │
│   ├── 📁 client_portal/                # 📱 Portail Client
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                    # ClientProfile, ClientContract, etc.
│   │   ├── serializers.py               # ClientDashboardSerializer, etc.
│   │   ├── views.py                     # ClientDashboardView, ClientInterventionsView, etc.
│   │   ├── urls.py                      # /api/client-portal/*
│   │   ├── permissions.py               # IsClientOwner, etc.
│   │   ├── services.py                  # Logique métier
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   └── test_views.py
│   │   └── migrations/
│   │
│   ├── 📁 reporting/                    # 📈 Reporting
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                    # Report, ReportTemplate, etc.
│   │   ├── serializers.py               # ReportSerializer, etc.
│   │   ├── views.py                     # ReportViewSet, GenerateReportView, etc.
│   │   ├── urls.py                      # /api/reports/*
│   │   ├── services.py                  # Logique métier
│   │   ├── generators/                  # Générateurs de rapports
│   │   │   ├── __init__.py
│   │   │   ├── pdf.py                   # Génération PDF (ReportLab, WeasyPrint)
│   │   │   ├── excel.py                 # Génération Excel (openpyxl)
│   │   │   └── charts.py                # Génération graphiques (matplotlib, plotly)
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_views.py
│   │   │   └── test_generators.py
│   │   └── migrations/
│   │
│   └── 📁 notifications/                # 🔔 Notifications
│       ├── __init__.py
│       ├── admin.py
│       ├── apps.py
│       ├── models.py                    # Notification, NotificationPreference, etc.
│       ├── serializers.py               # NotificationSerializer, etc.
│       ├── views.py                     # NotificationViewSet, MarkAsReadView, etc.
│       ├── urls.py                      # /api/notifications/*
│       ├── services.py                  # Logique d'envoi notifications
│       ├── tasks.py                     # Tâches Celery (envoi email, SMS, etc.)
│       ├── tests/
│       │   ├── __init__.py
│       │   ├── test_models.py
│       │   ├── test_views.py
│       │   └── test_tasks.py
│       └── migrations/
│
├── 📁 media/                             # Fichiers uploadés (développement)
│   ├── avatars/
│   ├── interventions/
│   ├── claims/
│   └── reports/
│
├── 📁 static/                            # Fichiers statiques
│   ├── admin/                           # Admin Django
│   ├── rest_framework/                  # DRF
│   └── custom/                          # Fichiers personnalisés
│
├── 📁 staticfiles/                       # Fichiers statiques collectés (production)
│
├── 📁 logs/                              # Logs applicatifs
│   ├── django.log
│   ├── celery.log
│   └── error.log
│
├── 📁 requirements/                      # Dépendances Python
│   ├── base.txt                         # Dépendances communes
│   ├── development.txt                  # Dépendances dev (debug toolbar, etc.)
│   ├── production.txt                   # Dépendances prod (gunicorn, etc.)
│   └── testing.txt                      # Dépendances tests (pytest, etc.)
│
├── 📁 docker/                            # Configuration Docker
│   ├── Dockerfile                       # Image Docker
│   ├── docker-compose.yml               # Orchestration services
│   ├── docker-compose.prod.yml          # Production
│   ├── nginx.conf                       # Configuration Nginx
│   └── entrypoint.sh                    # Script de démarrage
│
├── 📁 scripts/                           # Scripts utilitaires
│   ├── init_db.py                       # Initialisation base de données
│   ├── seed_data.py                     # Données de test
│   ├── backup.sh                        # Script de backup
│   ├── restore.sh                       # Script de restauration
│   └── deploy.sh                        # Script de déploiement
│
├── 📁 tests/                             # Tests d'intégration globaux
│   ├── __init__.py
│   ├── conftest.py                      # Configuration pytest
│   ├── factories.py                     # Factories pour tests
│   └── integration/
│       ├── __init__.py
│       ├── test_api_flow.py
│       └── test_permissions.py
│
├── 📁 docs/                              # Documentation
│   ├── API_ENDPOINTS.md                 # Documentation endpoints
│   ├── BACKEND_ARCHITECTURE.md          # Architecture backend
│   ├── DEPLOYMENT.md                    # Guide déploiement
│   └── CONTRIBUTING.md                  # Guide contribution
│
├── .env                                  # Variables d'environnement (git ignored)
├── .env.example                          # Template variables d'environnement
├── .gitignore                            # Fichiers ignorés par git
├── .dockerignore                         # Fichiers ignorés par Docker
├── manage.py                             # Script de gestion Django
├── pytest.ini                            # Configuration pytest
├── setup.cfg                             # Configuration outils (flake8, etc.)
├── pyproject.toml                        # Configuration projet Python
├── README.md                             # Documentation principale
└── LICENSE                               # Licence du projet
```

---

## 📝 Détails des Fichiers Clés

### `manage.py`
Script de gestion Django pour exécuter les commandes.

### `requirements/base.txt`
```txt
Django>=5.0,<5.1
djangorestframework>=3.14
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
django-filter>=23.5
drf-spectacular>=0.27
psycopg2-binary>=2.9
Pillow>=10.2
celery>=5.3
redis>=5.0
python-dotenv>=1.0
```

### `requirements/development.txt`
```txt
-r base.txt
django-debug-toolbar>=4.3
django-extensions>=3.2
ipython>=8.20
black>=24.1
flake8>=7.0
isort>=5.13
```

### `requirements/production.txt`
```txt
-r base.txt
gunicorn>=21.2
django-storages>=1.14
boto3>=1.34
sentry-sdk>=1.40
```

### `requirements/testing.txt`
```txt
-r base.txt
pytest>=8.0
pytest-django>=4.7
pytest-cov>=4.1
factory-boy>=3.3
faker>=22.0
```

---

## 🔧 Configuration par Environnement

### `greensig/settings/__init__.py`
```python
import os

env = os.environ.get('DJANGO_ENV', 'development')

if env == 'production':
    from .production import *
elif env == 'testing':
    from .testing import *
else:
    from .development import *
```

---

## 🚀 Commandes de Démarrage

### Développement
```bash
# Installer les dépendances
pip install -r requirements/development.txt

# Créer la base de données
python manage.py migrate

# Charger les données de test
python scripts/seed_data.py

# Lancer le serveur
python manage.py runserver

# Lancer Celery (dans un autre terminal)
celery -A greensig worker -l info
```

### Production
```bash
# Installer les dépendances
pip install -r requirements/production.txt

# Collecter les fichiers statiques
python manage.py collectstatic --noinput

# Appliquer les migrations
python manage.py migrate

# Lancer avec Gunicorn
gunicorn greensig.wsgi:application --bind 0.0.0.0:8000
```

### Tests
```bash
# Installer les dépendances de test
pip install -r requirements/testing.txt

# Lancer tous les tests
pytest

# Avec couverture
pytest --cov=apps --cov-report=html
```

---

## 📦 Docker

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: greensig
      POSTGRES_USER: greensig_user
      POSTGRES_PASSWORD: greensig_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  web:
    build: .
    command: gunicorn greensig.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - .:/app
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    env_file:
      - .env

  celery:
    build: .
    command: celery -A greensig worker -l info
    volumes:
      - .:/app
    depends_on:
      - db
      - redis
    env_file:
      - .env

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    depends_on:
      - web

volumes:
  postgres_data:
  static_volume:
  media_volume:
```

---

**Date de création** : 2025-12-05  
**Version** : 1.0  
**Auteur** : GreenSIG Development Team
