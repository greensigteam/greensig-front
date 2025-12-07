# 🏗️ Architecture Backend Django - GreenSIG

Ce document détaille l'architecture recommandée pour le backend Django de GreenSIG.

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure du projet](#structure-du-projet)
3. [Modèles de données](#modèles-de-données)
4. [Configuration Django](#configuration-django)
5. [Sécurité](#sécurité)
6. [Déploiement](#déploiement)

---

## 🎯 Vue d'ensemble

### Stack Technique

- **Framework** : Django 5.0+
- **API** : Django REST Framework (DRF)
- **Base de données** : PostgreSQL 15+ (avec PostGIS pour données géographiques)
- **Authentification** : JWT (Simple JWT)
- **Cache** : Redis
- **Tâches asynchrones** : Celery + Redis
- **Stockage fichiers** : Système de fichiers local / Serveur de médias
- **Documentation API** : drf-spectacular (OpenAPI 3.0)

### Principes Architecturaux

1. **Séparation des responsabilités** : Chaque module est une app Django indépendante
2. **RESTful API** : Respect des conventions REST
3. **Sécurité first** : Authentification, permissions, validation stricte
4. **Scalabilité** : Architecture prête pour la mise à l'échelle horizontale
5. **Testabilité** : Tests unitaires et d'intégration pour chaque module

---

## 📂 Structure du Projet

```
greensig-backend/
│
├── greensig/                      # Projet Django principal
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py               # Configuration commune
│   │   ├── development.py        # Config dev
│   │   ├── production.py         # Config prod
│   │   └── testing.py            # Config tests
│   ├── urls.py                   # URLs principales
│   ├── wsgi.py
│   └── asgi.py
│
├── apps/                          # Applications Django
│   │
│   ├── authentication/            # 🔐 Authentification
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── tests.py
│   │   └── utils.py
│   │
│   ├── dashboard/                 # 📊 Tableau de bord
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py           # Logique métier
│   │   └── tests.py
│   │
│   ├── inventory/                 # 📦 Inventaire
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── filters.py            # Filtres DRF
│   │   ├── services.py
│   │   └── tests.py
│   │
│   ├── planning/                  # 📅 Planification
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   ├── tasks.py              # Tâches Celery
│   │   └── tests.py
│   │
│   ├── interventions/             # 🛠️ Interventions
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   ├── tasks.py
│   │   └── tests.py
│   │
│   ├── teams/                     # 👥 Équipes
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tests.py
│   │
│   ├── claims/                    # 📢 Réclamations
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   ├── tasks.py
│   │   └── tests.py
│   │
│   ├── map/                       # 🗺️ Cartographie
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tests.py
│   │
│   ├── client_portal/             # 📱 Portail Client
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tests.py
│   │
│   ├── reporting/                 # 📈 Reporting
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   ├── generators/           # Générateurs de rapports
│   │   │   ├── pdf.py
│   │   │   ├── excel.py
│   │   │   └── charts.py
│   │   └── tests.py
│   │
│   ├── notifications/             # 🔔 Notifications
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   ├── tasks.py
│   │   └── tests.py
│   │
│   └── core/                      # 🔧 Utilitaires communs
│       ├── models.py             # Modèles abstraits
│       ├── serializers.py        # Serializers de base
│       ├── permissions.py        # Permissions globales
│       ├── pagination.py         # Pagination personnalisée
│       ├── exceptions.py         # Exceptions personnalisées
│       ├── validators.py         # Validateurs
│       └── utils.py              # Fonctions utilitaires
│
├── media/                         # Fichiers uploadés (dev)
├── static/                        # Fichiers statiques
├── logs/                          # Logs applicatifs
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   ├── production.txt
│   └── testing.txt
│

├── scripts/
│   ├── init_db.py
│   ├── seed_data.py
│   └── backup.sh
│
├── .env.example
├── .gitignore
├── manage.py
├── pytest.ini
└── README.md
```

---

## 🗄️ Modèles de Données

### 1. Authentication App

```python
# apps/authentication/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    """Utilisateur personnalisé"""
    
    ROLE_CHOICES = [
        ('ADMIN', 'Administrateur'),
        ('OPERATOR', 'Opérateur'),
        ('CLIENT', 'Client'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='OPERATOR')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"
```

---

### 2. Inventory App

```python
# apps/inventory/models.py

from django.db import models
from apps.core.models import TimeStampedModel
import uuid

class InventoryCategory(models.Model):
    """Catégories d'inventaire"""
    
    CATEGORY_CHOICES = [
        ('MATERIEL', 'Matériel'),
        ('VEGETATION', 'Végétation'),
        ('HYDROLOGIE', 'Hydrologie'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'inventory_categories'
        verbose_name_plural = 'Inventory Categories'
    
    def __str__(self):
        return self.name


class InventoryItem(TimeStampedModel):
    """Item d'inventaire"""
    
    STATUS_CHOICES = [
        ('DISPONIBLE', 'Disponible'),
        ('EN_MAINTENANCE', 'En maintenance'),
        ('HORS_SERVICE', 'Hors service'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(InventoryCategory, on_delete=models.PROTECT, related_name='items')
    subcategory = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DISPONIBLE')
    location = models.CharField(max_length=200)
    serial_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    description = models.TextField(blank=True)
    
    # Dates
    purchase_date = models.DateField(null=True, blank=True)
    last_service = models.DateField(null=True, blank=True)
    next_service = models.DateField(null=True, blank=True)
    
    # Financier
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    supplier = models.CharField(max_length=200, blank=True)
    
    class Meta:
        db_table = 'inventory_items'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['category']),
            models.Index(fields=['serial_number']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.serial_number})"


class MaintenanceRecord(TimeStampedModel):
    """Historique de maintenance"""
    
    TYPE_CHOICES = [
        ('REVISION', 'Révision'),
        ('REPARATION', 'Réparation'),
        ('CONTROLE', 'Contrôle'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='maintenance_history')
    date = models.DateField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField()
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    technician = models.CharField(max_length=200)
    next_service_date = models.DateField(null=True, blank=True)
    
    class Meta:
        db_table = 'maintenance_records'
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.item.name} - {self.type} ({self.date})"


class VegetationItem(TimeStampedModel):
    """Élément de végétation"""
    
    DISPLAY_FORMAT_CHOICES = [
        ('POINT', 'Point'),
        ('POLYGON', 'Polygone'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    species_name = models.CharField(max_length=200)
    common_name = models.CharField(max_length=200, blank=True)
    family = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    display_format = models.CharField(max_length=20, choices=DISPLAY_FORMAT_CHOICES)
    size = models.CharField(max_length=50, blank=True)
    symbol = models.CharField(max_length=10, blank=True)
    observations = models.TextField(blank=True)
    
    # Géolocalisation (sera étendu avec PostGIS)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    class Meta:
        db_table = 'vegetation_items'
        ordering = ['species_name']
    
    def __str__(self):
        return f"{self.species_name} ({self.family})"


class HydrologyEquipment(TimeStampedModel):
    """Équipement d'hydrologie"""
    
    EQUIPMENT_TYPE_CHOICES = [
        ('PUIT', 'Puit'),
        ('POMPE', 'Pompe'),
        ('VANNE', 'Vanne'),
        ('CLAPET', 'Clapet'),
        ('CANALISATION', 'Canalisation'),
        ('GOUTTE_A_GOUTTE', 'Goutte à goutte'),
        ('ASPERSION', 'Aspersion'),
        ('BALLON', 'Ballon'),
    ]
    
    DISPLAY_FORMAT_CHOICES = [
        ('POINT', 'Point'),
        ('LINE', 'Ligne'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment_name = models.CharField(max_length=200)
    equipment_type = models.CharField(max_length=30, choices=EQUIPMENT_TYPE_CHOICES)
    family = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    display_format = models.CharField(max_length=20, choices=DISPLAY_FORMAT_CHOICES)
    
    # Caractéristiques techniques
    depth = models.CharField(max_length=50, blank=True)
    diameter = models.CharField(max_length=50, blank=True)
    flow_rate = models.CharField(max_length=50, blank=True)
    
    symbol = models.CharField(max_length=10, blank=True)
    observations = models.TextField(blank=True)
    
    # Géolocalisation
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    class Meta:
        db_table = 'hydrology_equipment'
        ordering = ['equipment_name']
    
    def __str__(self):
        return f"{self.equipment_name} ({self.equipment_type})"
```

---

### 3. Planning App

```python
# apps/planning/models.py

from django.db import models
from django.contrib.auth import get_user_model
from apps.core.models import TimeStampedModel
import uuid

User = get_user_model()

class Task(TimeStampedModel):
    """Tâche planifiée"""
    
    TYPE_CHOICES = [
        ('TAILLE', 'Taille'),
        ('TONTE', 'Tonte'),
        ('NETTOYAGE', 'Nettoyage'),
        ('PLANTATION', 'Plantation'),
        ('ARROSAGE', 'Arrosage'),
        ('TRAITEMENT', 'Traitement'),
    ]
    
    STATUS_CHOICES = [
        ('A_FAIRE', 'À faire'),
        ('EN_COURS', 'En cours'),
        ('TERMINE', 'Terminé'),
    ]
    
    PRIORITY_CHOICES = [
        ('BASSE', 'Basse'),
        ('NORMALE', 'Normale'),
        ('HAUTE', 'Haute'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='A_FAIRE')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='NORMALE')
    
    date = models.DateField()
    duration = models.CharField(max_length=50, blank=True)
    zone = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    
    # Assignation
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    
    # Récurrence
    recurrence = models.CharField(max_length=100, blank=True)
    
    # Géolocalisation
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    class Meta:
        db_table = 'tasks'
        ordering = ['date', '-priority']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['date']),
            models.Index(fields=['assignee']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.date})"
```

---

### 4. Interventions App

```python
# apps/interventions/models.py

from django.db import models
from django.contrib.auth import get_user_model
from apps.core.models import TimeStampedModel
from apps.map.models import Site
import uuid

User = get_user_model()

class Intervention(TimeStampedModel):
    """Intervention sur site"""
    
    TYPE_CHOICES = [
        ('TAILLE', 'Taille'),
        ('TONTE', 'Tonte'),
        ('NETTOYAGE', 'Nettoyage'),
        ('PLANTATION', 'Plantation'),
        ('ARROSAGE', 'Arrosage'),
        ('TRAITEMENT', 'Traitement'),
    ]
    
    STATUS_CHOICES = [
        ('A_FAIRE', 'À faire'),
        ('EN_COURS', 'En cours'),
        ('TERMINE', 'Terminé'),
        ('ANNULE', 'Annulé'),
    ]
    
    PRIORITY_CHOICES = [
        ('BASSE', 'Basse'),
        ('NORMALE', 'Normale'),
        ('HAUTE', 'Haute'),
        ('URGENTE', 'Urgente'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='A_FAIRE')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='NORMALE')
    
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='interventions')
    
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    # Équipe assignée
    assigned_team = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='team_interventions')
    
    description = models.TextField(blank=True)
    progress = models.IntegerField(default=0)  # 0-100
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'interventions'
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['site']),
            models.Index(fields=['start_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.site.name}"


class InterventionPhoto(TimeStampedModel):
    """Photos d'intervention"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intervention = models.ForeignKey(Intervention, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='interventions/%Y/%m/%d/')
    caption = models.CharField(max_length=200, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'intervention_photos'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Photo {self.intervention.title}"
```

---

### 5. Teams App

```python
# apps/teams/models.py

from django.db import models
from django.contrib.auth import get_user_model
from apps.core.models import TimeStampedModel
import uuid

User = get_user_model()

class TeamMember(TimeStampedModel):
    """Membre d'équipe"""
    
    STATUS_CHOICES = [
        ('DISPONIBLE', 'Disponible'),
        ('OCCUPE', 'Occupé'),
        ('MALADIE', 'Maladie'),
        ('CONGE', 'Congé'),
        ('ACCIDENT', 'Accident'),
        ('ABSENT', 'Absent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='team_profile')
    
    role = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DISPONIBLE')
    
    # Compétences
    skills = models.JSONField(default=list, blank=True)
    certifications = models.JSONField(default=list, blank=True)
    
    # Productivité
    productivity = models.CharField(max_length=100, blank=True)
    monthly_interventions = models.IntegerField(default=0)
    
    # Dates
    hire_date = models.DateField(null=True, blank=True)
    
    class Meta:
        db_table = 'team_members'
        ordering = ['user__first_name']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.role}"


class AbsenceRecord(TimeStampedModel):
    """Enregistrement d'absence"""
    
    TYPE_CHOICES = [
        ('MALADIE', 'Maladie'),
        ('CONGE', 'Congé'),
        ('ACCIDENT', 'Accident'),
        ('AUTRE', 'Autre'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(TeamMember, on_delete=models.CASCADE, related_name='absences')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    reason = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_absences')
    
    class Meta:
        db_table = 'absence_records'
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.member.user.get_full_name()} - {self.type} ({self.start_date})"
```

---

### 6. Claims App

```python
# apps/claims/models.py

from django.db import models
from django.contrib.auth import get_user_model
from apps.core.models import TimeStampedModel
import uuid

User = get_user_model()

class Claim(TimeStampedModel):
    """Réclamation"""
    
    STATUS_CHOICES = [
        ('NOUVEAU', 'Nouveau'),
        ('EN_COURS', 'En cours'),
        ('RESOLU', 'Résolu'),
        ('EN_RETARD', 'En retard'),
    ]
    
    PRIORITY_CHOICES = [
        ('BASSE', 'Basse'),
        ('MOYENNE', 'Moyenne'),
        ('HAUTE', 'Haute'),
    ]
    
    SOURCE_CHOICES = [
        ('CLIENT', 'Client'),
        ('INTERNE', 'Interne'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOUVEAU')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MOYENNE')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    
    # Auteur
    author = models.CharField(max_length=200)
    author_email = models.EmailField(blank=True)
    author_phone = models.CharField(max_length=20, blank=True)
    
    # Dates
    date = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField(null=True, blank=True)
    
    # Localisation
    location = models.CharField(max_length=200, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    description = models.TextField()
    
    # Assignation
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_claims')
    
    # Résolution
    resolution = models.TextField(blank=True)
    auto_rating = models.IntegerField(null=True, blank=True)  # 1-5
    
    class Meta:
        db_table = 'claims'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.status})"


class ClaimPhoto(TimeStampedModel):
    """Photos de réclamation"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='claims/%Y/%m/%d/')
    caption = models.CharField(max_length=200, blank=True)
    
    class Meta:
        db_table = 'claim_photos'
        ordering = ['-created_at']


class ClaimComment(TimeStampedModel):
    """Commentaires sur réclamation"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.TextField()
    is_internal = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'claim_comments'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.get_full_name()}"
```

---

### 7. Map App

```python
# apps/map/models.py

from django.db import models
from apps.core.models import TimeStampedModel
import uuid

class Site(TimeStampedModel):
    """Site géolocalisé"""
    
    CATEGORY_CHOICES = [
        ('RECHERCHE', 'Recherche'),
        ('INFRASTRUCTURE', 'Infrastructure'),
        ('RESIDENCE', 'Résidences'),
        ('SANTE', 'Santé'),
        ('HOTELLERIE', 'Hôtellerie'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIF', 'Actif'),
        ('INACTIF', 'Inactif'),
        ('EN_TRAVAUX', 'En travaux'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True)
    
    # Géolocalisation
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    
    # Détails
    address = models.CharField(max_length=500, blank=True)
    surface = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIF')
    
    # Affichage
    color = models.CharField(max_length=7, default='#3b82f6')  # Hex color
    
    class Meta:
        db_table = 'sites'
        ordering = ['name']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.category})"
```

---

### 8. Core App (Modèles abstraits)

```python
# apps/core/models.py

from django.db import models

class TimeStampedModel(models.Model):
    """Modèle abstrait avec timestamps"""
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
```

---

## ⚙️ Configuration Django

### Settings de base

```python
# greensig/settings/base.py

import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    
    # Local apps
    'apps.core',
    'apps.authentication',
    'apps.dashboard',
    'apps.inventory',
    'apps.planning',
    'apps.interventions',
    'apps.teams',
    'apps.claims',
    'apps.map',
    'apps.client_portal',
    'apps.reporting',
    'apps.notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'greensig.urls'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'greensig'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'apps.core.pagination.CustomPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]

# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Casablanca'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Spectacular (OpenAPI)
SPECTACULAR_SETTINGS = {
    'TITLE': 'GreenSIG API',
    'DESCRIPTION': 'API pour la gestion des espaces verts',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
```

---

## 🔒 Sécurité

### Permissions personnalisées

```python
# apps/core/permissions.py

from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """Accès réservé aux administrateurs"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'ADMIN'


class IsOperator(permissions.BasePermission):
    """Accès pour opérateurs et admins"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['ADMIN', 'OPERATOR']


class IsClient(permissions.BasePermission):
    """Accès pour clients"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'CLIENT'


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Lecture pour tous, écriture pour le propriétaire uniquement"""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return obj.user == request.user or request.user.role == 'ADMIN'
```

---

## 🚀 Déploiement

### Variables d'environnement (.env.example)

```bash
# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=api.greensig.com,localhost

# Database
DB_NAME=greensig
DB_USER=greensig_user
DB_PASSWORD=strong_password_here
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# AWS S3 (optionnel)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET_NAME=greensig-media
AWS_S3_REGION_NAME=eu-west-1

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@greensig.com
EMAIL_HOST_PASSWORD=your_email_password

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://greensig.com,https://www.greensig.com
```

---

## 📝 Commandes utiles

```bash
# Créer les migrations
python manage.py makemigrations

# Appliquer les migrations
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser

# Collecter les fichiers statiques
python manage.py collectstatic

# Lancer le serveur de développement
python manage.py runserver

# Lancer Celery
celery -A greensig worker -l info

# Lancer les tests
pytest

# Générer le schéma OpenAPI
python manage.py spectacular --file schema.yml
```

---

**Date de création** : 2025-12-05  
**Version** : 1.0  
**Auteur** : GreenSIG Development Team
