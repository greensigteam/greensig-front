import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, AlertCircle, Eye, Edit2, Trash2, X, MapPin, ClipboardList, Calendar, TrendingUp } from 'lucide-react';
import { Reclamation, TypeReclamation, Urgence, ReclamationCreate } from '../types/reclamations';
import {
    fetchReclamations,
    fetchTypesReclamations,
    fetchUrgences,
    fetchReclamationById,
    createReclamation,
    deleteReclamation,
    updateReclamation,
    uploadPhoto
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
    const [reclamations, setReclamations] = useState<Reclamation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);

    // Helpers rôles
    const isAdmin = !!currentUser?.roles?.includes('ADMIN');
    const isClient = !!currentUser?.roles?.includes('CLIENT');
    const isChefEquipe = !!currentUser?.roles?.includes('SUPERVISEUR');

    // UI State
    const [activeTab, setActiveTab] = useState<'reclamations' | 'taches'>('reclamations');
    const [tachesLiees, setTachesLiees] = useState<Tache[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

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

    // Debounce search term (300ms delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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


    const filteredReclamations = useMemo(() => reclamations.filter(r =>
        r.numero_reclamation?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ), [reclamations, debouncedSearchTerm]);

    const filteredTaches = useMemo(() => tachesLiees.filter(t =>
        t.type_tache_detail.nom_tache.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        ((t.client_detail as any)?.nom_structure || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        t.description_travaux?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ), [tachesLiees, debouncedSearchTerm]);

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-emerald-600" />
                        Réclamations
                    </h1>
                    <div className="flex gap-6 mt-4 border-b border-gray-200">
                        <button onClick={() => setActiveTab('reclamations')} className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'reclamations' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            Réclamations ({filteredReclamations.length})
                        </button>
                        {!isClient && (
                            <button onClick={() => setActiveTab('taches')} className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'taches' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                Tâches liées ({filteredTaches.length})
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto mt-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                    </div>


                    {!isClient && (
                        <button
                            onClick={() => navigate('/reclamations/stats')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <TrendingUp className="w-5 h-5" />
                            <span className="hidden sm:inline">Statistiques</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table Reclamations */}
            {activeTab === 'reclamations' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Numéro</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Type</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Urgence</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Site / Zone</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Créé par</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Date création</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Statut</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="fixed inset-0 z-50">
                                                <LoadingScreen isLoading={true} loop={true} minDuration={0} />
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredReclamations.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500 bg-gray-50/30">
                                            Aucune réclamation trouvée
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReclamations.map(rec => (
                                        <tr key={rec.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="p-4 text-sm font-medium text-slate-700">{rec.numero_reclamation}</td>
                                            <td className="p-4 text-sm text-slate-600">{rec.type_reclamation_nom}</td>
                                            <td className="p-4">
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: (rec.urgence_couleur || '#ccc') + '20',
                                                        color: rec.urgence_couleur || '#666'
                                                    }}
                                                >
                                                    {rec.urgence_niveau}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{rec.site_nom}</span>
                                                    <span className="text-xs text-gray-400">{rec.zone_nom}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                {rec.createur_nom || 'Anonyme'}
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                {new Date(rec.date_creation).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="p-4">
                                                <span className={`
                                                inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium capitalize
                                                ${rec.statut === 'NOUVELLE' ? 'bg-blue-100 text-blue-800' :
                                                        rec.statut === 'RESOLUE' ? 'bg-green-100 text-green-800' :
                                                            rec.statut === 'EN_COURS' ? 'bg-yellow-100 text-yellow-800' :
                                                                rec.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' ? 'bg-orange-100 text-orange-800' :
                                                                    rec.statut === 'CLOTUREE' ? 'bg-purple-100 text-purple-800' :
                                                                        'bg-gray-100 text-gray-800'}
                                            `}>
                                                    {rec.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' ? 'En attente validation' : rec.statut.toLowerCase().replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    {!isClient && !isChefEquipe && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenTaskModal(rec);
                                                            }}
                                                            disabled={rec.statut === 'CLOTUREE'}
                                                            className={`p-1 rounded ${rec.statut === 'CLOTUREE'
                                                                ? 'text-gray-400 cursor-not-allowed'
                                                                : 'text-purple-600 hover:bg-purple-50'}`}
                                                            title={rec.statut === 'CLOTUREE' ? "Réclamation clôturée" : "Créer une tâche"}
                                                        >
                                                            <ClipboardList className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDetails(rec.id);
                                                        }}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Voir détails"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {!isClient && (isAdmin || (rec.createur === currentUser?.id)) && (
                                                        <>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEdit(rec.id);
                                                                }}
                                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                                title="Modifier"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(rec.id);
                                                                }}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                title="Supprimer"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Table TACHES LIEES */}
            {activeTab === 'taches' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-purple-50/50 border-b border-purple-100">
                                <tr>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Type Tâche</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Réclamation liée</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Equipe</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Dates</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Priorité</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Statut</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-50">
                                {filteredTaches.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            Aucune tâche liée trouvée.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTaches.map(t => {
                                        const statutColors = STATUT_TACHE_COLORS[t.statut] || { bg: 'bg-gray-100', text: 'text-gray-800' };
                                        return (
                                            <tr key={t.id} className="hover:bg-purple-50/20 transition-colors">
                                                <td className="p-4 font-medium text-slate-700">{t.type_tache_detail.nom_tache}</td>
                                                <td className="p-4 text-sm text-slate-600">
                                                    {t.reclamation_numero ? (
                                                        <span className="flex items-center gap-1 font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                            <AlertCircle className="w-3 h-3" />
                                                            {t.reclamation_numero}
                                                        </span>
                                                    ) : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">
                                                    {t.equipes_detail && t.equipes_detail.length > 0
                                                        ? t.equipes_detail.map(eq => eq.nomEquipe).join(', ')
                                                        : (t.equipe_detail as any)?.nomEquipe || (t.equipe_detail as any)?.nom_equipe || '-'}
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">
                                                    Du {new Date(t.date_debut_planifiee).toLocaleDateString()} au {new Date(t.date_fin_planifiee).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">{PRIORITE_LABELS[t.priorite]}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${statutColors.bg} ${statutColors.text}`}>
                                                        {t.statut}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => navigate(`/planning?date=${t.date_debut_planifiee?.split('T')[0] || ''}`)}
                                                        className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                        title="Voir dans l'agenda"
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
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
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingId ? 'Modifier la Réclamation' : 'Nouvelle Réclamation'}
                            </h2>
                            <button onClick={closeCreateModal} className="text-gray-400 hover:text-red-500">
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de réclamation <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={formData.type_reclamation || ''}
                                        className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        onChange={e => setFormData({ ...formData, type_reclamation: Number(e.target.value) })}
                                    >
                                        <option value="">Sélectionner un type...</option>
                                        {types.map(t => <option key={t.id} value={t.id}>{t.nom_reclamation}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Urgence <span className="text-red-500">*</span></label>
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
                                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'}
                                                `}
                                            >
                                                {u.niveau_urgence}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.description || ''}
                                        className="w-full rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Décrivez le problème..."
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date de constatation <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="datetime-local"
                                            required
                                            value={utcToLocalInput(formData.date_constatation)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border-gray-300 border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
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
                                    <p className="text-xs text-gray-500 mt-1">Date et heure où le problème a été constaté</p>
                                </div>

                                {/* Section Photos Existantes (Edition) */}
                                {existingPhotos.length > 0 && (
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                                            Photos existantes
                                        </label>
                                        <div className="flex gap-2 overflow-x-auto">
                                            {existingPhotos.map((p, i) => (
                                                <div key={p.id || i} className="relative group shrink-0">
                                                    <img
                                                        src={p.url_fichier}
                                                        alt={p.legende || 'Photo'}
                                                        className="h-20 w-20 object-cover rounded-md border border-gray-200"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {editingId ? 'Ajouter des photos' : 'Photos (optionnel)'}
                                    </label>
                                    <PhotoUpload
                                        photos={photos}
                                        onChange={setPhotos}
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-100 shrink-0 bg-gray-50 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
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
