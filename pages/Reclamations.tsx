import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Eye, Edit2, Trash2, X, MapPin, ClipboardList, Calendar, TrendingUp, RefreshCw, Loader2, Plus, Settings, MoreVertical, Clock, Star, BarChart3 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSearch } from '../contexts/SearchContext';
import { Reclamation, TypeReclamation, Urgence, ReclamationCreate, ReclamationStats } from '../types/reclamations';
import {
    fetchReclamations,
    fetchTypesReclamations,
    fetchUrgences,
    fetchReclamationById,
    createReclamation,
    deleteReclamation,
    updateReclamation,
    uploadPhoto,
    fetchReclamationStats
} from '../services/reclamationsApi';
import { planningService } from '../services/planningService';
import { fetchEquipes, fetchCurrentUser } from '../services/usersApi';
import { TypeTache, TacheCreate, PRIORITE_LABELS, Tache, STATUT_TACHE_COLORS } from '../types/planning';
import { EquipeList, Utilisateur } from '../types/users';
import { PhotoUpload } from '../components/shared/PhotoUpload';
import TaskFormModal from '../components/planning/TaskFormModal';
import { utcToLocalInput, localInputToUTC } from '../utils/dateHelpers';
import { format } from 'date-fns';
import LoadingScreen from '../components/LoadingScreen';

import ConfirmModal from '../components/ConfirmModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';

const Reclamations: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { searchQuery, setPlaceholder } = useSearch();
    const [reclamations, setReclamations] = useState<Reclamation[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);

    // Helpers rôles
    const isAdmin = !!currentUser?.roles?.includes('ADMIN');
    const isClient = !!currentUser?.roles?.includes('CLIENT');
    const isChefEquipe = !!currentUser?.roles?.includes('SUPERVISEUR');

    // UI State
    const [activeTab, setActiveTab] = useState<'reclamations' | 'taches' | 'stats'>('reclamations');
    const [tachesLiees, setTachesLiees] = useState<Tache[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
    const actionsMenuRef = useRef<HTMLDivElement>(null);
    const [rowMenuOpen, setRowMenuOpen] = useState<number | null>(null);

    // Stats
    const [stats, setStats] = useState<ReclamationStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    // Referentiels Réclamation
    const [types, setTypes] = useState<TypeReclamation[]>([]);
    const [urgences, setUrgences] = useState<Urgence[]>([]);

    // Referentiels Tâche (pour création intervention)
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskInitialValues, setTaskInitialValues] = useState<Partial<TacheCreate>>({});
    const [taskSiteFilter, setTaskSiteFilter] = useState<{ id: number; name: string } | undefined>(undefined);
    const [reclamationTargetForTask, setReclamationTargetForTask] = useState<Reclamation | null>(null);

    // Form state Reclamation
    const [formData, setFormData] = useState<Partial<ReclamationCreate>>({});
    const [photos, setPhotos] = useState<File[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
    const [preSelectedSiteName, setPreSelectedSiteName] = useState<string | null>(null);


    // Modal de confirmation/notification
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'info' | 'success' | 'danger' | 'warning';
        confirmLabel?: string;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        variant: 'info'
    });

    // Delete confirmation state
    const [deletingReclamationId, setDeletingReclamationId] = useState<number | null>(null);

    // Set search placeholder
    useEffect(() => {
        setPlaceholder('Rechercher une réclamation par numéro, description...');
    }, [setPlaceholder]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setActionsMenuOpen(false);
            }
            // Close row menu if clicking outside any row menu
            const target = event.target as HTMLElement;
            if (!target.closest('[data-row-menu]')) {
                setRowMenuOpen(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initialiser date_constatation avec la date actuelle lors de l'ouverture du modal en mode création
    // On utilise toISOString() pour stocker en UTC, puis utcToLocalInput() convertit en heure locale pour l'affichage
    useEffect(() => {
        if (isCreateModalOpen && !editingId && !formData.date_constatation) {
            setFormData(prev => ({
                ...prev,
                date_constatation: new Date().toISOString()
            }));
        }
    }, [isCreateModalOpen, editingId]);

    useEffect(() => {
        loadData();
    }, []);

    // Load stats when stats tab is selected
    useEffect(() => {
        if (activeTab === 'stats' && !stats && !statsLoading) {
            loadStats();
        }
    }, [activeTab]);

    const loadStats = async () => {
        setStatsLoading(true);
        try {
            const data = await fetchReclamationStats({});
            setStats(data);
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    // Handle navigation from MapPage with site pre-selected
    useEffect(() => {
        const state = location.state as {
            createFromSite?: boolean;
            siteId?: number | string;
            siteName?: string;
            openReclamationId?: number | string;
        } | null;

        if (state?.createFromSite && state?.siteId) {
            // Pre-fill the form with the site
            setFormData({ site: Number(state.siteId) });
            setPreSelectedSiteName(state.siteName || null);
            setIsCreateModalOpen(true);
            // Clear the navigation state
            navigate(location.pathname, { replace: true, state: {} });
        }

        // Ouvrir une réclamation spécifique depuis la carte - naviguer vers la page de détails
        if (state?.openReclamationId) {
            navigate(`/reclamations/${state.openReclamationId}`, { replace: true });
        }
    }, [location.state, navigate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [recsData, typesData, urgencesData, typesTachesData, equipesData, tachesLieesData, currentUserData] = await Promise.all([
                fetchReclamations(),
                fetchTypesReclamations(),
                fetchUrgences(),
                planningService.getTypesTaches(),
                fetchEquipes(),
                planningService.getTaches({ has_reclamation: true }),
                fetchCurrentUser()
            ]);
            setReclamations(recsData);
            setTypes(typesData);
            setUrgences(urgencesData);
            setTypesTaches(typesTachesData);
            setCurrentUser(currentUserData);
            // fetchEquipes retourne { count, results } ou array selon format API
            const eqList = Array.isArray(equipesData) ? equipesData : (equipesData as any).results || [];
            setEquipes(eqList);

            // Taches liées retourne PaginatedResponse ou tableau
            const tData = (tachesLieesData as any).results || tachesLieesData;
            setTachesLiees(Array.isArray(tData) ? tData : []);

        } catch (error) {
            console.error("Erreur chargement données", error);
        } finally {
            setLoading(false);
        }
    };

    // ===================================
    // HANDLERS RECLAMATION
    // ===================================

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validation basique
        if (!formData.type_reclamation || !formData.urgence || !formData.description || !formData.date_constatation) {
            setModalConfig({
                isOpen: true,
                title: 'Champs manquants',
                message: 'Veuillez remplir tous les champs obligatoires (*)',
                variant: 'warning'
            });
            return;
        }

        try {
            // 1. Création / Mise à jour de la réclamation (JSON)
            const payload = {
                ...formData,
                date_constatation: formData.date_constatation || new Date().toISOString(),
            };

            let targetId = editingId;

            if (editingId) {
                await updateReclamation(editingId, payload);
            } else {
                const newRec = await createReclamation(payload as ReclamationCreate);
                targetId = newRec.id;
            }

            // 2. Upload des photos réelles
            if (photos.length > 0 && targetId) {
                const uploadPromises = photos.map(file => {
                    const fd = new FormData();
                    fd.append('fichier', file);
                    fd.append('type_photo', 'RECLAMATION');
                    fd.append('reclamation', String(targetId));
                    fd.append('legende', 'Photo jointe');
                    return uploadPhoto(fd);
                });
                await Promise.all(uploadPromises);
            }

            setModalConfig({
                isOpen: true,
                title: 'Succès',
                message: editingId ? 'Réclamation mise à jour avec succès.' : 'Réclamation créée avec succès.',
                variant: 'success',
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });

            closeCreateModal();
            loadData();
        } catch (error) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: "Une erreur est survenue lors de l'enregistrement.",
                variant: 'danger'
            });
        }
    };

    const handleDelete = (id: number) => {
        setDeletingReclamationId(id);
    };

    const confirmDeleteReclamation = async () => {
        if (!deletingReclamationId) return;
        try {
            await deleteReclamation(deletingReclamationId);
            setReclamations(prev => prev.filter(r => r.id !== deletingReclamationId));
            setDeletingReclamationId(null);
            // Feedback différé
            setTimeout(() => {
                setModalConfig({ isOpen: true, title: 'Succès', message: 'Réclamation supprimée.', variant: 'success', onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false })) });
            }, 300);
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const handleDetails = (id: number) => {
        navigate(`/reclamations/${id}`);
    };

    const handleEdit = async (id: number) => {
        try {
            const fullRec = await fetchReclamationById(id);
            setEditingId(fullRec.id);
            setFormData({
                type_reclamation: fullRec.type_reclamation,
                urgence: fullRec.urgence,
                description: fullRec.description,
                zone: fullRec.zone,
                date_constatation: fullRec.date_constatation,
            });
            setExistingPhotos(fullRec.photos || []);
            setIsCreateModalOpen(true);
        } catch (error) {
            console.error(error);
            setModalConfig({ isOpen: true, title: 'Erreur', message: "Impossible de charger pour édition.", variant: 'danger' });
        }
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        setEditingId(null);
        setFormData({});
        setPhotos([]);
        setExistingPhotos([]);
        setPreSelectedSiteName(null);
    };

    // ===================================
    // HANDLERS TACHE
    // ===================================

    const handleOpenTaskModal = (reclamation: Reclamation) => {
        setReclamationTargetForTask(reclamation);

        // Initialiser les valeurs du formulaire
        setTaskInitialValues({
            id_client: reclamation.client || null,
            priorite: 3,
            commentaires: `Tâche liée à la réclamation ${reclamation.numero_reclamation}`,
            date_debut_planifiee: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            date_fin_planifiee: format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
            reclamation: reclamation.id,
        });

        // Définir le filtre de site pour ne montrer que les objets de ce site
        if (reclamation.site) {
            setTaskSiteFilter({
                id: reclamation.site,
                name: reclamation.site_nom || `Site #${reclamation.site}`
            });
        } else {
            setTaskSiteFilter(undefined);
        }

        setIsTaskModalOpen(true);
    };

    const handleTaskSubmit = async (data: TacheCreate) => {
        try {
            // Ajouter la réclamation aux données
            const payload: TacheCreate = {
                ...data,
                reclamation: reclamationTargetForTask?.id,
                // Conversion Dates ISO
                date_debut_planifiee: new Date(data.date_debut_planifiee).toISOString(),
                date_fin_planifiee: new Date(data.date_fin_planifiee).toISOString(),
            };

            await planningService.createTache(payload);

            setIsTaskModalOpen(false);
            setTaskInitialValues({});
            setTaskSiteFilter(undefined);
            setReclamationTargetForTask(null);

            setModalConfig({
                isOpen: true,
                title: 'Succès',
                message: `Une tâche a été créée pour la réclamation ${reclamationTargetForTask?.numero_reclamation}.`,
                variant: 'success',
                onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false }))
            });

            // Recharger les tâches liées
            loadData();

        } catch (error) {
            console.error("Erreur création tâche", error);
            setModalConfig({ isOpen: true, title: 'Erreur', message: "Échec de la création de la tâche.", variant: 'danger' });
        }
    };

    const handleCloseTaskModal = () => {
        setIsTaskModalOpen(false);
        setTaskInitialValues({});
        setTaskSiteFilter(undefined);
        setReclamationTargetForTask(null);
    };


    const filteredReclamations = useMemo(() => {
        if (!searchQuery) return reclamations;
        const query = searchQuery.toLowerCase();
        return reclamations.filter(r =>
            r.numero_reclamation?.toLowerCase().includes(query) ||
            r.description?.toLowerCase().includes(query) ||
            r.site_nom?.toLowerCase().includes(query) ||
            r.type_reclamation_nom?.toLowerCase().includes(query)
        );
    }, [reclamations, searchQuery]);

    const filteredTaches = useMemo(() => {
        if (!searchQuery) return tachesLiees;
        const query = searchQuery.toLowerCase();
        return tachesLiees.filter(t =>
            t.type_tache_detail.nom_tache.toLowerCase().includes(query) ||
            ((t.client_detail as any)?.nom_structure || '').toLowerCase().includes(query) ||
            t.description_travaux?.toLowerCase().includes(query)
        );
    }, [tachesLiees, searchQuery]);

    return (
        <div className="p-6 space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                {/* Left: Tab Filters */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('reclamations')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'reclamations'
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Réclamations ({filteredReclamations.length})
                    </button>
                    {!isClient && (
                        <button
                            onClick={() => setActiveTab('taches')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'taches'
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Tâches liées ({filteredTaches.length})
                        </button>
                    )}
                    {!isClient && (
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'stats'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                <BarChart3 className="w-4 h-4" />
                                Statistiques
                            </span>
                        </button>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {activeTab !== 'stats' && (
                        <span className="text-sm text-slate-500 hidden sm:inline-block">
                            {activeTab === 'reclamations'
                                ? `${filteredReclamations.length} réclamation${filteredReclamations.length > 1 ? 's' : ''}`
                                : `${filteredTaches.length} tâche${filteredTaches.length > 1 ? 's' : ''}`
                            }
                        </span>
                    )}

                    {!isClient && activeTab !== 'stats' && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Nouvelle</span>
                        </button>
                    )}

                    {/* Actions Dropdown */}
                    <div className="relative" ref={actionsMenuRef}>
                        <button
                            onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Plus d'actions"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {actionsMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => {
                                        loadData();
                                        if (activeTab === 'stats') {
                                            setStats(null);
                                            loadStats();
                                        }
                                        setActionsMenuOpen(false);
                                    }}
                                    disabled={loading || statsLoading}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 text-slate-400 ${loading || statsLoading ? 'animate-spin' : ''}`} />
                                    Actualiser
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Reclamations */}
            {activeTab === 'reclamations' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-visible">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                        </div>
                    ) : filteredReclamations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
                            <p className="text-lg font-medium">Aucune réclamation trouvée</p>
                            <p className="text-sm">
                                {searchQuery ? 'Essayez avec d\'autres termes de recherche' : 'Aucune réclamation enregistrée'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider first:rounded-tl-xl">Numéro</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Urgence</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Site / Zone</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Créé par</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-tr-xl">
                                        <Settings className="w-4 h-4 ml-auto text-slate-400" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReclamations.map(rec => (
                                    <tr
                                        key={rec.id}
                                        onClick={() => handleDetails(rec.id)}
                                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-slate-800">{rec.numero_reclamation}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{rec.type_reclamation_nom}</td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                                                style={{
                                                    backgroundColor: (rec.urgence_couleur || '#ccc') + '20',
                                                    color: rec.urgence_couleur || '#666'
                                                }}
                                            >
                                                {rec.urgence_niveau}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-800">{rec.site_nom}</span>
                                                {rec.zone_nom && <span className="text-xs text-slate-400">{rec.zone_nom}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {rec.createur_nom || <span className="text-slate-400 italic">Anonyme</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(rec.date_creation).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`
                                                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                                ${rec.statut === 'NOUVELLE' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                    rec.statut === 'RESOLUE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                    rec.statut === 'EN_COURS' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                    rec.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                                    rec.statut === 'CLOTUREE' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                                    'bg-slate-100 text-slate-600 border border-slate-200'}
                                            `}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    rec.statut === 'NOUVELLE' ? 'bg-blue-500' :
                                                    rec.statut === 'RESOLUE' ? 'bg-emerald-500' :
                                                    rec.statut === 'EN_COURS' ? 'bg-amber-500' :
                                                    rec.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' ? 'bg-orange-500' :
                                                    'bg-slate-400'
                                                }`} />
                                                {rec.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' ? 'Validation' : rec.statut.toLowerCase().replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end" data-row-menu>
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRowMenuOpen(rowMenuOpen === rec.id ? null : rec.id);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {rowMenuOpen === rec.id && (
                                                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                                            {!isClient && !isChefEquipe && rec.statut !== 'CLOTUREE' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenTaskModal(rec);
                                                                        setRowMenuOpen(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <ClipboardList className="w-4 h-4 text-purple-500" />
                                                                    Créer une tâche
                                                                </button>
                                                            )}

                                                            {!isClient && (isAdmin || (rec.createur === currentUser?.id)) && (
                                                                <>
                                                                    <div className="my-1 border-t border-slate-100" />
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEdit(rec.id);
                                                                            setRowMenuOpen(null);
                                                                        }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                                    >
                                                                        <Edit2 className="w-4 h-4 text-emerald-500" />
                                                                        Modifier
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDelete(rec.id);
                                                                            setRowMenuOpen(null);
                                                                        }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                        Supprimer
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Table TACHES LIEES */}
            {activeTab === 'taches' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        </div>
                    ) : filteredTaches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <ClipboardList className="w-12 h-12 mb-4 text-slate-300" />
                            <p className="text-lg font-medium">Aucune tâche liée trouvée</p>
                            <p className="text-sm">
                                {searchQuery ? 'Essayez avec d\'autres termes de recherche' : 'Aucune tâche liée à une réclamation'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type Tâche</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Réclamation</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipe</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dates</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priorité</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <Settings className="w-4 h-4 ml-auto text-slate-400" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTaches.map(t => {
                                    const statutColors = STATUT_TACHE_COLORS[t.statut] || { bg: 'bg-slate-100', text: 'text-slate-800' };
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-slate-800">{t.type_tache_detail.nom_tache}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {t.reclamation_numero ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                        <AlertCircle className="w-3 h-3" />
                                                        {t.reclamation_numero}
                                                    </span>
                                                ) : <span className="text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {t.equipes_detail && t.equipes_detail.length > 0
                                                    ? t.equipes_detail.map(eq => eq.nomEquipe).join(', ')
                                                    : (t.equipe_detail as any)?.nomEquipe || (t.equipe_detail as any)?.nom_equipe || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-slate-600">
                                                        {new Date(t.date_debut_planifiee).toLocaleDateString('fr-FR')}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        → {new Date(t.date_fin_planifiee).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    t.priorite >= 4 ? 'bg-red-50 text-red-700 border border-red-100' :
                                                    t.priorite === 3 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {PRIORITE_LABELS[t.priorite]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statutColors.bg} ${statutColors.text}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                        t.statut === 'PLANIFIEE' ? 'bg-blue-500' :
                                                        t.statut === 'EN_COURS' ? 'bg-amber-500' :
                                                        t.statut === 'TERMINEE' ? 'bg-emerald-500' :
                                                        t.statut === 'ANNULEE' ? 'bg-red-500' :
                                                        'bg-slate-400'
                                                    }`} />
                                                    {t.statut.toLowerCase().replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => navigate(`/planning?date=${t.date_debut_planifiee?.split('T')[0] || ''}`)}
                                                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Voir dans l'agenda"
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Stats Tab Content */}
            {activeTab === 'stats' && (
                <div className="space-y-6">
                    {statsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : !stats ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
                            <p className="text-lg font-medium">Impossible de charger les statistiques</p>
                        </div>
                    ) : (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Total */}
                                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                    <div className="text-sm font-medium text-slate-500 mb-1">Total Réclamations</div>
                                    <div className="flex items-end justify-between relative z-10">
                                        <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
                                    </div>
                                    <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
                                        <AlertCircle className="w-5 h-5 text-blue-500" />
                                    </div>
                                </div>

                                {/* Délai moyen */}
                                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                    <div className="text-sm font-medium text-slate-500 mb-1">Délai Moyen</div>
                                    <div className="flex items-end justify-between relative z-10">
                                        <div className="text-3xl font-bold text-slate-800">
                                            {stats.delai_moyen_heures !== undefined ? `${Math.round(stats.delai_moyen_heures)}h` : 'N/A'}
                                        </div>
                                    </div>
                                    <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
                                        <Clock className="w-5 h-5 text-emerald-500" />
                                    </div>
                                </div>

                                {/* Satisfaction */}
                                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                    <div className="text-sm font-medium text-slate-500 mb-1">Satisfaction Moyenne</div>
                                    <div className="flex items-end justify-between relative z-10">
                                        <div className="text-3xl font-bold text-slate-800">
                                            {stats.satisfaction_moyenne !== undefined ? `${stats.satisfaction_moyenne.toFixed(1)}/5` : 'N/A'}
                                        </div>
                                        {stats.nombre_evaluations !== undefined && stats.nombre_evaluations > 0 && (
                                            <div className="text-xs text-slate-400">
                                                {stats.nombre_evaluations} avis
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
                                        <Star className="w-5 h-5 text-yellow-500" />
                                    </div>
                                </div>

                                {/* Taux résolution */}
                                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                    <div className="text-sm font-medium text-slate-500 mb-1">Taux de Résolution</div>
                                    <div className="flex items-end justify-between relative z-10">
                                        <div className="text-3xl font-bold text-slate-800">
                                            {stats.total > 0
                                                ? Math.round(((stats.par_statut['RESOLUE'] || 0) + (stats.par_statut['CLOTUREE'] || 0)) / stats.total * 100)
                                                : 0}%
                                        </div>
                                    </div>
                                    <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-purple-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Charts Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Répartition par Statut (Pie Chart) */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden">
                                    <div className="p-6 border-b border-slate-100">
                                        <h3 className="font-bold text-lg text-slate-800">Répartition par Statut</h3>
                                    </div>
                                    <div className="p-6">
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie
                                                data={Object.entries(stats.par_statut).map(([statut, count]) => ({
                                                    name: statut === 'PRISE_EN_COMPTE' ? 'Prise en compte' :
                                                          statut === 'EN_COURS' ? 'En cours' :
                                                          statut.charAt(0) + statut.slice(1).toLowerCase(),
                                                    value: count
                                                }))}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {Object.keys(stats.par_statut).map((_entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Répartition par Type (Bar Chart) */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden">
                                    <div className="p-6 border-b border-slate-100">
                                        <h3 className="font-bold text-lg text-slate-800">Répartition par Type</h3>
                                    </div>
                                    <div className="p-6">
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={stats.par_type.map((item) => ({
                                            name: item.type_reclamation__nom_reclamation,
                                            count: item.count
                                        }))}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Répartition par Urgence */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden">
                                    <div className="p-6 border-b border-slate-100">
                                        <h3 className="font-bold text-lg text-slate-800">Répartition par Urgence</h3>
                                    </div>
                                    <div className="p-6">
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={stats.par_urgence.map((item) => ({
                                            name: item.urgence__niveau_urgence,
                                            count: item.count
                                        }))} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis type="number" tick={{ fontSize: 12 }} />
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Répartition par Zone */}
                                {stats.par_zone && stats.par_zone.length > 0 && (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden">
                                        <div className="p-6 border-b border-slate-100">
                                            <h3 className="font-bold text-lg text-slate-800">Répartition par Zone</h3>
                                        </div>
                                        <div className="p-6">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={stats.par_zone}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="zone__nom" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <Tooltip />
                                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Modal Création Tâche (Intervention) - Utilise le même formulaire que Planning */}
            {isTaskModalOpen && (
                <TaskFormModal
                    initialValues={taskInitialValues}
                    equipes={equipes}
                    typesTaches={typesTaches}
                    siteFilter={taskSiteFilter}
                    onClose={handleCloseTaskModal}
                    onSubmit={handleTaskSubmit}
                />
            )}

            {/* Modal Création / Edition Réclamation */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingId ? 'Modifier la Réclamation' : 'Nouvelle Réclamation'}
                            </h2>
                            <button onClick={closeCreateModal} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                {/* Pre-selected site indicator */}
                                {preSelectedSiteName && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm text-blue-800">
                                            Site: <strong>{preSelectedSiteName}</strong>
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type de réclamation <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={formData.type_reclamation || ''}
                                        className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        onChange={e => setFormData({ ...formData, type_reclamation: Number(e.target.value) })}
                                    >
                                        <option value="">Sélectionner un type...</option>
                                        {types.map(t => <option key={t.id} value={t.id}>{t.nom_reclamation}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Urgence <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {urgences.map(u => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, urgence: u.id })}
                                                className={`
                                                    flex items-center justify-center p-2 rounded-lg border text-sm font-medium transition-all
                                                    ${formData.urgence === u.id
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                                                        : 'border-slate-200 hover:border-slate-300 text-slate-600'}
                                                `}
                                            >
                                                {u.niveau_urgence}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-red-500">*</span></label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.description || ''}
                                        className="w-full rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Décrivez le problème..."
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Date de constatation <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="datetime-local"
                                            required
                                            value={utcToLocalInput(formData.date_constatation)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-300 border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                            onChange={e => {
                                                const utcValue = localInputToUTC(e.target.value);
                                                setFormData({ ...formData, date_constatation: utcValue || undefined });
                                            }}
                                            onBlur={e => {
                                                // Forcer la mise à jour au cas où le changement n'a pas été capturé
                                                if (e.target.value && !formData.date_constatation) {
                                                    const utcValue = localInputToUTC(e.target.value);
                                                    setFormData({ ...formData, date_constatation: utcValue || undefined });
                                                }
                                            }}
                                            step="60"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Date et heure où le problème a été constaté</p>
                                </div>

                                {/* Section Photos Existantes (Edition) */}
                                {existingPhotos.length > 0 && (
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                                            Photos existantes
                                        </label>
                                        <div className="flex gap-2 overflow-x-auto">
                                            {existingPhotos.map((p, i) => (
                                                <div key={p.id || i} className="relative group shrink-0">
                                                    <img
                                                        src={p.url_fichier}
                                                        alt={p.legende || 'Photo'}
                                                        className="h-20 w-20 object-cover rounded-md border border-slate-200"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        {editingId ? 'Ajouter des photos' : 'Photos (optionnel)'}
                                    </label>
                                    <PhotoUpload
                                        photos={photos}
                                        onChange={setPhotos}
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm hover:shadow-md transition-all"
                                >
                                    {editingId ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}




            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                variant={modalConfig.variant === 'success' ? 'info' : modalConfig.variant}
                confirmLabel={modalConfig.confirmLabel || 'OK'}
                onConfirm={() => {
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Delete Confirmation Modal */}
            {deletingReclamationId && (
                <ConfirmDeleteModal
                    title="Supprimer la réclamation ?"
                    message="Cette action est irréversible."
                    onConfirm={confirmDeleteReclamation}
                    onCancel={() => setDeletingReclamationId(null)}
                />
            )}

        </div >
    );
};

export default Reclamations;
