import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar, MapPin, Building2, Users, ChevronDown,
    ChevronRight, Camera, Package, AlertCircle, Plus, Trash2,
    Loader2, FileImage, Play, CheckCircle, XCircle, ThumbsUp, ThumbsDown, ShieldCheck,
    RefreshCw, Eye, Filter, X, Clock, Pencil
} from 'lucide-react';
import { planningService } from '../services/planningService';
import { fetchCurrentUser, fetchAllSites, SiteFrontend } from '../services/api';
import { fetchEquipes, fetchStructures } from '../services/usersApi';
import {
    fetchPhotosParTache, createPhoto, deletePhoto,
    fetchConsommationsParTache, createConsommation, deleteConsommation,
    fetchProduitsActifs
} from '../services/suiviTachesApi';
import { Tache, TacheCreate, TypeTache, STATUT_TACHE_COLORS, STATUT_TACHE_LABELS, PRIORITE_LABELS, ETAT_VALIDATION_COLORS, ETAT_VALIDATION_LABELS, PlanningFilters, EMPTY_PLANNING_FILTERS, StatusDistribution, STATUS_DISTRIBUTION_LABELS, STATUS_DISTRIBUTION_COLORS } from '../types/planning';
import { PhotoList, ConsommationProduit, ProduitList } from '../types/suiviTaches';
import { StructureClient, EquipeList } from '../types/users';
import { useSearch } from '../contexts/SearchContext';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import TaskFormModal from '../components/planning/TaskFormModal';

// Helper pour construire l'URL complète des images
const getFullImageUrl = (url: string | null): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    const backendUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';
    return `${backendUrl}${url}`;
};

const SuiviTaches: React.FC = () => {
    const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();

    // State UI
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [taches, setTaches] = useState<Tache[]>([]);
    const [selectedTache, setSelectedTache] = useState<Tache | null>(null);

    // State Filtres
    const [filters, setFilters] = useState<PlanningFilters>(EMPTY_PLANNING_FILTERS);
    const [structures, setStructures] = useState<StructureClient[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // State Détail Tâche
    const [activeTab, setActiveTab] = useState<'info' | 'photos' | 'produits'>('info');
    const [photos, setPhotos] = useState<PhotoList[]>([]);
    const [consommations, setConsommations] = useState<ConsommationProduit[]>([]);
    const [produitsOptions, setProduitsOptions] = useState<ProduitList[]>([]);

    // Loading States Locals
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [loadingConsommations, setLoadingConsommations] = useState(false);
    const [changingStatut, setChangingStatut] = useState(false);

    // Type de photo sélectionné pour l'upload
    const [selectedPhotoType, setSelectedPhotoType] = useState<'AVANT' | 'APRES'>('AVANT');

    // Rôle utilisateur
    const [isAdmin, setIsAdmin] = useState(false);
    const [isClientView, setIsClientView] = useState(false);

    // Modal de validation
    const [validationModal, setValidationModal] = useState<{
        isOpen: boolean;
        type: 'VALIDEE' | 'REJETEE';
    } | null>(null);
    const [validationComment, setValidationComment] = useState('');
    const [validating, setValidating] = useState(false);

    // Form States
    const [newConsommation, setNewConsommation] = useState({
        produit: '',
        quantite: '',
        unite: 'L',
        commentaire: ''
    });

    // Modal de confirmation
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'start' | 'complete' | 'cancel';
        icon: 'play' | 'check' | 'x';
    } | null>(null);

    // Delete confirmation modals
    const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
    const [deletingConsommationId, setDeletingConsommationId] = useState<number | null>(null);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [loadingTypesTaches, setLoadingTypesTaches] = useState(false);
    const [updatingTask, setUpdatingTask] = useState(false);

    // Set search placeholder and cleanup on unmount
    useEffect(() => {
        setPlaceholder('Rechercher une tâche...');
        return () => {
            setPlaceholder('Rechercher...');
            setSearchQuery('');
        };
    }, [setPlaceholder, setSearchQuery]);


    // Chargement initial
    useEffect(() => {
        loadTaches();
        loadProduitsOptions();
        loadUserRole();
        loadFilterData();
    }, []);

    const loadFilterData = async () => {
        setLoadingFilters(true);
        try {
            const [structuresRes, equipesRes, sitesArray] = await Promise.all([
                fetchStructures(),
                fetchEquipes(),
                fetchAllSites()
            ]);
            setStructures(structuresRes.results || []);
            setEquipes(equipesRes.results || []);
            setSites(sitesArray.filter(s => s.actif));
        } catch (error) {
            console.error("Erreur chargement données filtres", error);
        } finally {
            setLoadingFilters(false);
        }
    };

    const loadUserRole = async () => {
        try {
            const userData = await fetchCurrentUser();
            const roles = userData.roles || [];
            setIsAdmin(roles.includes('ADMIN'));
            setIsClientView(roles.includes('CLIENT'));
        } catch (error) {
            console.error("Erreur chargement rôle utilisateur", error);
        }
    };

    useEffect(() => {
        if (selectedTache) {
            loadTaskDetails(selectedTache.id);
            setActiveTab('info');
        }
    }, [selectedTache?.id]); // ✅ Ne se déclenche que si l'ID change, pas si l'objet change

    const loadTaches = async () => {
        setLoadingTasks(true);
        try {
            const response = await planningService.getTaches({ page: 1 });
            setTaches(response.results);
        } catch (error) {
            console.error("Erreur chargement tâches", error);
        } finally {
            setLoadingTasks(false);
        }
    };

    // Toggle du statut d'une distribution de charge
    const handleToggleDistribution = async (distributionId: number, currentStatus: StatusDistribution) => {
        if (!selectedTache) return;

        const tacheId = selectedTache.id;
        const newStatus: StatusDistribution = currentStatus === 'REALISEE' ? 'NON_REALISEE' : 'REALISEE';

        // Optimistic Update
        const updatedDistributions = selectedTache.distributions_charge?.map(d =>
            d.id === distributionId ? { ...d, status: newStatus } : d
        );

        setSelectedTache({
            ...selectedTache,
            distributions_charge: updatedDistributions
        });

        setTaches(prev => prev.map(t =>
            t.id === tacheId
                ? { ...t, distributions_charge: updatedDistributions }
                : t
        ));

        try {
            if (newStatus === 'REALISEE') {
                await planningService.marquerDistributionRealisee(distributionId);
            } else {
                await planningService.marquerDistributionNonRealisee(distributionId);
            }
            // Recharger les tâches pour avoir les données à jour (incluant le statut de la tâche)
            await loadTaches();
            // Recharger la tâche sélectionnée pour mettre à jour l'affichage
            const updatedTache = await planningService.getTache(tacheId);
            setSelectedTache(updatedTache);
            // Recharger les détails (au cas où)
            await loadTaskDetails(tacheId);
        } catch (err) {
            // Rollback on error
            setSelectedTache({
                ...selectedTache,
                distributions_charge: selectedTache.distributions_charge
            });
            setTaches(prev => prev.map(t =>
                t.id === tacheId
                    ? { ...t, distributions_charge: selectedTache.distributions_charge }
                    : t
            ));
            alert("Erreur lors de la mise à jour de la distribution");
        }
    };

    const loadProduitsOptions = async () => {
        try {
            const data = await fetchProduitsActifs();
            setProduitsOptions(data);
        } catch (error) {
            console.error("Erreur chargement produits", error);
        }
    };

    const loadTypesTaches = async () => {
        if (typesTaches.length > 0) return; // Already loaded
        setLoadingTypesTaches(true);
        try {
            const response = await planningService.getTypesTaches();
            setTypesTaches((response as any).results || response);
        } catch (error) {
            console.error("Erreur chargement types de tâches", error);
        } finally {
            setLoadingTypesTaches(false);
        }
    };

    const openEditModal = async () => {
        await loadTypesTaches();
        setShowEditModal(true);
    };

    const handleTaskUpdate = async (data: TacheCreate) => {
        if (!selectedTache) return;
        setUpdatingTask(true);
        try {
            await planningService.updateTache(selectedTache.id, data);

            // Recharger toutes les tâches pour avoir les détails (_detail fields)
            // C'est plus rapide que getTache() car la liste utilise des serializers optimisés
            await loadTaches();

            // Trouver la tâche mise à jour dans la nouvelle liste
            setTaches(prev => {
                const updatedTache = prev.find(t => t.id === selectedTache.id);
                if (updatedTache) {
                    setSelectedTache(updatedTache);
                }
                return prev;
            });

            setShowEditModal(false);
        } catch (error) {
            console.error("Erreur mise à jour tâche", error);
            throw error;
        } finally {
            setUpdatingTask(false);
        }
    };

    const loadTaskDetails = async (tacheId: number) => {
        setLoadingPhotos(true);
        setLoadingConsommations(true);
        try {
            const [photosData, consosData] = await Promise.all([
                fetchPhotosParTache(tacheId),
                fetchConsommationsParTache(tacheId)
            ]);
            setPhotos(photosData);
            setConsommations(consosData);
        } catch (error) {
            console.error("Erreur chargement détails tâche", error);
        } finally {
            setLoadingPhotos(false);
            setLoadingConsommations(false);
        }
    };

    // --- ACTIONS PHOTOS ---
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files.length || !selectedTache) return;

        setUploadingPhoto(true);
        const files = Array.from(e.target.files);

        try {
            for (const file of files) {
                await createPhoto({
                    fichier: file,
                    type_photo: selectedPhotoType,
                    tache: selectedTache.id,
                    legende: file.name
                });
            }
            const updatedPhotos = await fetchPhotosParTache(selectedTache.id);
            setPhotos(updatedPhotos);
        } catch (error) {
            console.error("Erreur upload photo", error);
            alert("Erreur lors de l'upload des photos");
        } finally {
            setUploadingPhoto(false);
            e.target.value = '';
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        try {
            await deletePhoto(photoId);
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            setDeletingPhotoId(null);
        } catch (error) {
            console.error("Erreur suppression photo", error);
            throw error;
        }
    };

    // --- ACTIONS CONSOMMATION ---
    const handleAddConsommation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTache || !newConsommation.produit || !newConsommation.quantite) return;

        try {
            await createConsommation({
                tache: selectedTache.id,
                produit: parseInt(newConsommation.produit),
                quantite_utilisee: parseFloat(newConsommation.quantite),
                unite: newConsommation.unite,
                commentaire: newConsommation.commentaire
            });

            const updatedConsos = await fetchConsommationsParTache(selectedTache.id);
            setConsommations(updatedConsos);
            setNewConsommation({ produit: '', quantite: '', unite: 'L', commentaire: '' });
        } catch (error) {
            console.error("Erreur ajout consommation", error);
            alert("Erreur lors de l'ajout de la consommation");
        }
    };

    const handleDeleteConsommation = async (consoId: number) => {
        try {
            await deleteConsommation(consoId);
            setConsommations(prev => prev.filter(c => c.id !== consoId));
            setDeletingConsommationId(null);
        } catch (error) {
            console.error("Erreur suppression consommation", error);
            throw error;
        }
    };

    // --- ACTIONS STATUT ---
    const openConfirmModal = (type: 'start' | 'complete' | 'cancel') => {
        const configs = {
            start: {
                title: 'Démarrer la tâche',
                message: 'Êtes-vous sûr de vouloir démarrer cette tâche maintenant ?',
                icon: 'play' as const
            },
            complete: {
                title: 'Terminer la tâche',
                message: 'Êtes-vous sûr de vouloir marquer cette tâche comme terminée ?',
                icon: 'check' as const
            },
            cancel: {
                title: 'Annuler la tâche',
                message: 'Êtes-vous sûr de vouloir annuler cette tâche ?',
                icon: 'x' as const
            }
        };

        setConfirmModal({ isOpen: true, type, ...configs[type] });
    };

    const executeConfirmedAction = async () => {
        if (!selectedTache || !confirmModal) return;

        const tacheId = selectedTache.id;
        setConfirmModal(null);
        setChangingStatut(true);

        try {
            let nouveauStatut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

            switch (confirmModal.type) {
                case 'start': nouveauStatut = 'EN_COURS'; break;
                case 'complete': nouveauStatut = 'TERMINEE'; break;
                case 'cancel': nouveauStatut = 'ANNULEE'; break;
            }

            // Changer le statut
            await planningService.changeStatut(tacheId, nouveauStatut);

            // Recharger complètement la liste des tâches
            await loadTaches();

            // Recharger la tâche sélectionnée avec toutes ses données fraîches
            const refreshedTache = await planningService.getTache(tacheId);
            setSelectedTache(refreshedTache);

            // Recharger aussi les détails (photos, consommations)
            await loadTaskDetails(tacheId);
        } catch (error) {
            console.error("Erreur changement statut", error);
            alert("Erreur lors du changement de statut");
        } finally {
            setChangingStatut(false);
        }
    };

    // --- VALIDATION ADMIN ---
    const openValidationModal = (type: 'VALIDEE' | 'REJETEE') => {
        setValidationModal({ isOpen: true, type });
        setValidationComment('');
    };

    const handleValidation = async () => {
        if (!selectedTache || !validationModal) return;

        const tacheId = selectedTache.id;
        setValidating(true);
        try {
            await planningService.validerTache(
                tacheId,
                validationModal.type,
                validationComment
            );

            // Recharger complètement la liste des tâches
            await loadTaches();

            // Recharger la tâche sélectionnée avec toutes ses données fraîches
            const refreshedTache = await planningService.getTache(tacheId);
            setSelectedTache(refreshedTache);

            // Recharger les détails
            await loadTaskDetails(tacheId);

            setValidationModal(null);
            setValidationComment('');
        } catch (error) {
            console.error("Erreur validation", error);
            alert("Erreur lors de la validation");
        } finally {
            setValidating(false);
        }
    };

    // --- FILTRES ---
    // Note: clientId in filters represents structure_client_id (organization)
    const filteredSites = useMemo(() => {
        if (filters.clientId === null) return sites;
        return sites.filter(s => s.structure_client === filters.clientId);
    }, [sites, filters.clientId]);

    const filteredTaches = useMemo(() => {
        return taches.filter(t => {
            const teamNames = t.equipes_detail?.length > 0
                ? t.equipes_detail.map((e: any) => e.nom_equipe || e.nomEquipe).join(' ')
                : (t.equipe_detail as any)?.nom_equipe || t.equipe_detail?.nomEquipe || '';

            const matchesSearch = !searchQuery ||
                t.type_tache_detail?.nom_tache.toLowerCase().includes(searchQuery.toLowerCase()) ||
                teamNames.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (filters.clientId !== null) {
                // Filter by structure_client (organization)
                // Check direct structure_client on task
                const tacheStructureId = t.structure_client_detail?.id;
                if (tacheStructureId === filters.clientId) {
                    // Direct match - continue to other filters
                } else {
                    // Fallback: check if any object's site belongs to this structure
                    const siteIds = t.objets_detail?.map(obj => obj.site) || [];
                    const matchingSites = sites.filter(s =>
                        s.structure_client === filters.clientId &&
                        siteIds.includes(Number(s.id))
                    );
                    if (matchingSites.length === 0) return false;
                }
            }

            if (filters.siteId !== null) {
                const hasSite = t.objets_detail?.some(obj => Number(obj.site) === filters.siteId);
                if (!hasSite) return false;
            }

            if (filters.equipeId !== null) {
                const tacheEquipeIds = t.equipes_detail?.map((e: any) => e.id) || [];
                if (!tacheEquipeIds.includes(filters.equipeId)) return false;
            }

            if (filters.statuts.length > 0) {
                if (!filters.statuts.includes(t.statut)) return false;
            }

            return true;
        });
    }, [taches, searchQuery, filters]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.clientId !== null) count++;
        if (filters.siteId !== null) count++;
        if (filters.equipeId !== null) count++;
        if (filters.statuts.length > 0) count++;
        return count;
    }, [filters]);

    const clearFilters = () => {
        setFilters(EMPTY_PLANNING_FILTERS);
    };

    // --- RENDER ---
    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0 overflow-x-auto">
                {/* Filter Toggle Button */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`relative p-2.5 rounded-lg transition-all duration-200 shrink-0 ${showFilters || activeFiltersCount > 0
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 shadow-sm'
                        }`}
                    title="Filtres"
                >
                    <Filter className="w-4 h-4" />
                    {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>

                {/* Inline Filters */}
                {showFilters && (
                    <>
                        <div className="h-8 w-px bg-slate-200 shrink-0"></div>

                        {/* Structure Client Filter (Organization) */}
                        <div className="relative shrink-0">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={filters.clientId ?? ''}
                                onChange={e => setFilters({
                                    ...filters,
                                    clientId: e.target.value ? Number(e.target.value) : null,
                                    siteId: null // Reset site when org changes
                                })}
                                className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]"
                                disabled={loadingFilters}
                            >
                                <option value="">Organisation</option>
                                {structures.map(s => (
                                    <option key={s.id} value={s.id}>{s.nom}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Site Filter */}
                        <div className="relative shrink-0">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={filters.siteId ?? ''}
                                onChange={e => setFilters({ ...filters, siteId: e.target.value ? Number(e.target.value) : null })}
                                className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]"
                                disabled={loadingFilters}
                            >
                                <option value="">Site</option>
                                {filteredSites.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Equipe Filter */}
                        <div className="relative shrink-0">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={filters.equipeId ?? ''}
                                onChange={e => setFilters({ ...filters, equipeId: e.target.value ? Number(e.target.value) : null })}
                                className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]"
                                disabled={loadingFilters}
                            >
                                <option value="">Équipe</option>
                                {equipes.map(e => (
                                    <option key={e.id} value={e.id}>{e.nomEquipe}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Statut Filter */}
                        <div className="relative shrink-0">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={filters.statuts.length === 1 ? filters.statuts[0] : ''}
                                onChange={e => setFilters({ ...filters, statuts: e.target.value ? [e.target.value as any] : [] })}
                                className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[130px]"
                            >
                                <option value="">Statut</option>
                                <option value="PLANIFIEE">Planifiée</option>
                                <option value="EN_COURS">En cours</option>
                                <option value="TERMINEE">Terminée</option>
                                <option value="ANNULEE">Annulée</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Reset Filters */}
                        {activeFiltersCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm shrink-0"
                                title="Réinitialiser les filtres"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </>
                )}

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Count */}
                <span className="text-sm text-slate-500 shrink-0">
                    {filteredTaches.length} tâche{filteredTaches.length > 1 ? 's' : ''}
                </span>

                {/* Refresh Button */}
                <button
                    onClick={() => loadTaches()}
                    disabled={loadingTasks}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Actualiser"
                >
                    <RefreshCw className={`w-5 h-5 ${loadingTasks ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Task List */}
                <div className={`${selectedTache ? 'hidden lg:flex' : 'flex'} flex-1 flex-col`}>
                    <div className="flex-1 overflow-y-auto p-4">
                        {loadingTasks ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                            </div>
                        ) : filteredTaches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                <Calendar className="w-12 h-12 mb-4 text-slate-300" />
                                <p className="text-lg font-medium">Aucune tâche trouvée</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredTaches.map(tache => (
                                    <div
                                        key={tache.id}
                                        onClick={() => setSelectedTache(tache)}
                                        className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedTache?.id === tache.id
                                            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col gap-0.5">
                                                <h3 className="font-semibold text-slate-800">
                                                    {tache.type_tache_detail?.nom_tache || 'Tâche sans nom'}
                                                </h3>
                                                {tache.reference && (
                                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                                        {tache.reference}
                                                    </span>
                                                )}
                                            </div>
                                            {tache.statut && (
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUT_TACHE_COLORS[tache.statut]?.bg} ${STATUT_TACHE_COLORS[tache.statut]?.text}`}>
                                                    {STATUT_TACHE_LABELS[tache.statut]}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(tache.date_debut_planifiee).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1 truncate max-w-[200px]" title={
                                                tache.objets_detail?.length
                                                    ? `${tache.objets_detail[0]?.site_nom || 'Site'} - ${tache.objets_detail.length} objet${tache.objets_detail.length > 1 ? 's' : ''}`
                                                    : 'Aucune localisation'
                                            }>
                                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                {tache.objets_detail?.length
                                                    ? `${tache.objets_detail[0]?.site_nom || 'Site'} (${tache.objets_detail.length} obj.)`
                                                    : 'Non localisé'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Task Detail */}
                {selectedTache && (
                    <div className="w-full lg:w-[500px] xl:w-[600px] bg-white border-l border-slate-200 flex flex-col overflow-hidden">
                        {/* Detail Header */}
                        <div className="p-4 border-b border-slate-100 shrink-0">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <button
                                        onClick={() => setSelectedTache(null)}
                                        className="lg:hidden text-slate-500 mb-2 flex items-center gap-1 text-sm"
                                    >
                                        <ChevronRight className="w-4 h-4 rotate-180" /> Retour
                                    </button>
                                    <h2 className="text-lg font-bold text-slate-800 truncate">
                                        {selectedTache.type_tache_detail?.nom_tache}
                                    </h2>

                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span
                                            className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600"
                                            title={`Identifiant unique de la tâche`}
                                        >
                                            {selectedTache.reference || `#${selectedTache.id}`}
                                        </span>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded font-medium ${STATUT_TACHE_COLORS[selectedTache.statut]?.bg} ${STATUT_TACHE_COLORS[selectedTache.statut]?.text}`}
                                            title={`Statut: ${STATUT_TACHE_LABELS[selectedTache.statut]}`}
                                        >
                                            {selectedTache.statut}
                                        </span>
                                        {selectedTache.statut === 'TERMINEE' && (
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 ${ETAT_VALIDATION_COLORS[selectedTache.etat_validation]?.bg} ${ETAT_VALIDATION_COLORS[selectedTache.etat_validation]?.text}`}
                                                title={`Validation: ${ETAT_VALIDATION_LABELS[selectedTache.etat_validation]}${selectedTache.date_validation ? ` - ${new Date(selectedTache.date_validation).toLocaleDateString('fr-FR')}` : ''}`}
                                            >
                                                <ShieldCheck className="w-3 h-3" />
                                                {ETAT_VALIDATION_LABELS[selectedTache.etat_validation]}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {!isClientView && (
                                    <div className="flex gap-2 shrink-0">
                                        {/* Edit Button */}
                                        {(selectedTache.statut === 'PLANIFIEE' || selectedTache.statut === 'NON_DEBUTEE') && (
                                            <button
                                                onClick={openEditModal}
                                                disabled={loadingTypesTaches}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm disabled:opacity-50"
                                                title="Modifier la tâche"
                                            >
                                                {loadingTypesTaches ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                                                Modifier
                                            </button>
                                        )}
                                        {(selectedTache.statut === 'PLANIFIEE' || selectedTache.statut === 'NON_DEBUTEE') && (() => {
                                            const hasEquipe = (selectedTache.equipes_detail && selectedTache.equipes_detail.length > 0) || selectedTache.equipe_detail;
                                            const nbEquipes = selectedTache.equipes_detail?.length || (selectedTache.equipe_detail ? 1 : 0);
                                            const nbObjets = selectedTache.objets_detail?.length || 0;
                                            const nbDistributions = selectedTache.distributions_charge?.length || 0;

                                            const tooltipMessage = !hasEquipe
                                                ? '❌ Veuillez assigner une équipe avant de démarrer la tâche'
                                                : `▶ Démarrer la tâche\n${nbEquipes} équipe${nbEquipes > 1 ? 's' : ''} assignée${nbEquipes > 1 ? 's' : ''}${nbObjets > 0 ? ` • ${nbObjets} objet${nbObjets > 1 ? 's' : ''}` : ''}${nbDistributions > 0 ? ` • ${nbDistributions} distribution${nbDistributions > 1 ? 's' : ''}` : ''}`;

                                            return (
                                                <button
                                                    onClick={() => openConfirmModal('start')}
                                                    disabled={changingStatut || !hasEquipe}
                                                    title={tooltipMessage}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {changingStatut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                                    Démarrer
                                                </button>
                                            );
                                        })()}
                                        {selectedTache.statut === 'EN_COURS' && (() => {
                                            const distributionsRealisees = selectedTache.distributions_charge?.filter(d => d.status === 'REALISEE').length || 0;
                                            const totalDistributions = selectedTache.distributions_charge?.length || 0;
                                            const tooltipMessage = totalDistributions > 0
                                                ? `Terminer la tâche (${distributionsRealisees}/${totalDistributions} distribution${totalDistributions > 1 ? 's' : ''} réalisée${totalDistributions > 1 ? 's' : ''})`
                                                : 'Terminer la tâche';

                                            return (
                                                <button
                                                    onClick={() => openConfirmModal('complete')}
                                                    disabled={changingStatut}
                                                    title={tooltipMessage}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                                                >
                                                    {changingStatut ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                    Terminer
                                                </button>
                                            );
                                        })()}
                                        {isAdmin && selectedTache.statut === 'TERMINEE' && selectedTache.etat_validation === 'EN_ATTENTE' && (
                                            <>
                                                <button
                                                    onClick={() => openValidationModal('VALIDEE')}
                                                    title="Valider la tâche terminée (Administrateur)"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                    Valider
                                                </button>
                                                <button
                                                    onClick={() => openValidationModal('REJETEE')}
                                                    title="Rejeter la tâche terminée (Administrateur)"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                                                >
                                                    <ThumbsDown className="w-4 h-4" />
                                                    Rejeter
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveTab('info')}
                                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'info' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Informations
                                </button>
                                <button
                                    onClick={() => setActiveTab('photos')}
                                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeTab === 'photos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Camera className="w-4 h-4" /> Photos ({photos.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('produits')}
                                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeTab === 'produits' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Package className="w-4 h-4" /> Produits ({consommations.length})
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {activeTab === 'info' && (
                                <div className="space-y-4">
                                    {/* Organisation et Localisation */}
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-emerald-600" />
                                            Localisation
                                        </h3>

                                        {/* Organisation */}
                                        {selectedTache.structure_client_detail && (
                                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200">
                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm font-medium text-slate-800">
                                                    {selectedTache.structure_client_detail.nom}
                                                </span>
                                            </div>
                                        )}

                                        {/* Sites et Sous-sites */}
                                        {selectedTache.objets_detail && selectedTache.objets_detail.length > 0 ? (
                                            <div className="space-y-2">
                                                {/* Afficher le site une seule fois avec le nombre d'objets */}
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                                                    <span className="font-medium text-slate-800">
                                                        {selectedTache.objets_detail[0]?.site_nom || `Site #${selectedTache.objets_detail[0]?.site}`}
                                                    </span>
                                                    <span className="text-slate-500 text-xs">
                                                        ({selectedTache.objets_detail.length} objet{selectedTache.objets_detail.length > 1 ? 's' : ''})
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Aucun objet d'inventaire associé</p>
                                        )}
                                    </div>

                                    {/* Objets concernés */}
                                    {selectedTache.objets_detail && selectedTache.objets_detail.length > 0 && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-emerald-600" />
                                                    Objets concernés
                                                </span>
                                                <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                                    {selectedTache.objets_detail.length}
                                                </span>
                                            </h3>

                                            {/* Liste scrollable des objets */}
                                            <div
                                                className="max-h-48 overflow-y-auto pr-2 space-y-2"
                                                style={{
                                                    scrollbarWidth: 'thin',
                                                    scrollbarColor: '#cbd5e1 #f1f5f9'
                                                }}
                                            >
                                                {selectedTache.objets_detail.map((obj, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all group"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                                                            <Package className="w-4 h-4 text-emerald-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-800 truncate">
                                                                {obj.nom_type || obj.display || `Objet #${obj.id}`}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                ID: {obj.id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Dates */}
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-emerald-600" />
                                            Planning
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-slate-500">Début prévu</span>
                                                <p className="font-medium text-slate-800">
                                                    {new Date(selectedTache.date_debut_planifiee).toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Fin prévue</span>
                                                <p className="font-medium text-slate-800">
                                                    {new Date(selectedTache.date_fin_planifiee).toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            {selectedTache.date_debut_reelle && (
                                                <div>
                                                    <span className="text-emerald-600">Début réel</span>
                                                    <p className="font-medium text-slate-800">
                                                        {new Date(selectedTache.date_debut_reelle).toLocaleDateString('fr-FR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedTache.date_fin_reelle && (
                                                <div>
                                                    <span className="text-blue-600">Fin réelle</span>
                                                    <p className="font-medium text-slate-800">
                                                        {new Date(selectedTache.date_fin_reelle).toLocaleDateString('fr-FR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Distribution de charge */}
                                    {selectedTache.distributions_charge && selectedTache.distributions_charge.length > 0 && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-emerald-600" />
                                                Distribution de charge ({selectedTache.distributions_charge.length} jour{selectedTache.distributions_charge.length > 1 ? 's' : ''})
                                            </h3>
                                            <div className="space-y-2">
                                                {selectedTache.distributions_charge
                                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                                    .map((dist, index) => {
                                                        const date = new Date(dist.date);
                                                        const dayOfWeek = date.getDay();
                                                        const isSunday = dayOfWeek === 0;
                                                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                                        const isRealisee = dist.status === 'REALISEE';
                                                        const isTaskTerminee = selectedTache.statut === 'TERMINEE';
                                                        const hasEquipe = (selectedTache.equipes_detail && selectedTache.equipes_detail.length > 0) || selectedTache.equipe_detail;

                                                        return (
                                                            <div
                                                                key={dist.id || index}
                                                                className={`
                                                                    p-3 rounded-lg border text-sm transition-all
                                                                    ${isRealisee ? 'bg-green-50 border-green-500 border-2' :
                                                                        isSunday
                                                                            ? 'bg-red-50 border-red-200'
                                                                            : isWeekend
                                                                                ? 'bg-blue-50 border-blue-200'
                                                                                : 'bg-white border-slate-200'
                                                                    }
                                                                `}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    {/* Checkbox pour toggle le statut */}
                                                                    <button
                                                                        onClick={(isTaskTerminee || !hasEquipe) ? undefined : () => handleToggleDistribution(dist.id, dist.status)}
                                                                        disabled={isTaskTerminee || !hasEquipe}
                                                                        title={(() => {
                                                                            if (!hasEquipe) {
                                                                                return '❌ Veuillez assigner une équipe avant de modifier les distributions';
                                                                            }
                                                                            if (isTaskTerminee) {
                                                                                return '🔒 Les distributions ne peuvent pas être modifiées pour une tâche terminée';
                                                                            }
                                                                            if (isRealisee) {
                                                                                const heures = dist.heures_planifiees?.toFixed(2) || '0';
                                                                                return `✓ Distribution réalisée (${heures}h) - Cliquer pour marquer comme non réalisée`;
                                                                            }
                                                                            const heures = dist.heures_planifiees?.toFixed(2) || '0';
                                                                            return `○ Distribution non réalisée (${heures}h planifiées) - Cliquer pour marquer comme réalisée`;
                                                                        })()}
                                                                        className={`
                                                                            mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0
                                                                            ${isRealisee
                                                                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                                                                : 'bg-white border-gray-400 hover:border-emerald-500 hover:bg-emerald-50'
                                                                            }
                                                                            ${(isTaskTerminee || !hasEquipe) ? 'cursor-not-allowed opacity-50' : ''}
                                                                        `}
                                                                    >
                                                                        {isRealisee && <CheckCircle className="w-3 h-3" />}
                                                                    </button>

                                                                    <div className="flex-1">
                                                                        <div className="font-medium text-slate-800 mb-1">
                                                                            {date.toLocaleDateString('fr-FR', {
                                                                                weekday: 'long',
                                                                                day: '2-digit',
                                                                                month: 'long',
                                                                                year: 'numeric'
                                                                            })}
                                                                        </div>
                                                                        <div className="flex items-center gap-4 text-xs text-slate-600">
                                                                            <span className="flex items-center gap-1">
                                                                                <Clock className="w-3 h-3" />
                                                                                {dist.heure_debut ? dist.heure_debut.substring(0, 5) : '08:00'} - {dist.heure_fin ? dist.heure_fin.substring(0, 5) : '17:00'}
                                                                            </span>
                                                                            <span className="font-semibold text-emerald-600">
                                                                                {dist.heures_planifiees?.toFixed(2) || '0.00'}h
                                                                            </span>
                                                                        </div>
                                                                        {dist.commentaire && (
                                                                            <p className="mt-2 text-xs text-slate-500 italic">
                                                                                {dist.commentaire}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    {/* Badge de statut */}
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${STATUS_DISTRIBUTION_COLORS[dist.status].bg} ${STATUS_DISTRIBUTION_COLORS[dist.status].text}`}>
                                                                            {STATUS_DISTRIBUTION_LABELS[dist.status]}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-slate-200">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-600 font-medium">Total planifié</span>
                                                    <span className="text-emerald-600 font-bold">
                                                        {selectedTache.charge_totale_distributions?.toFixed(2) ||
                                                            selectedTache.distributions_charge.reduce((sum, d) => sum + (d.heures_planifiees || 0), 0).toFixed(2)}h
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Équipes assignées */}
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-emerald-600" />
                                            Équipes assignées
                                        </h3>
                                        {(selectedTache.equipes_detail && selectedTache.equipes_detail.length > 0) ? (
                                            <div className="space-y-2">
                                                {selectedTache.equipes_detail.map((equipe: any) => (
                                                    <div key={equipe.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                            <Users className="w-4 h-4 text-emerald-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-800">
                                                                {equipe.nom_equipe || equipe.nomEquipe}
                                                            </p>
                                                            {equipe.site_nom && (
                                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {equipe.site_nom}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {equipe.nombre_membres !== undefined && (
                                                            <span className="text-xs text-slate-400">
                                                                {equipe.nombre_membres} membre{equipe.nombre_membres > 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : selectedTache.equipe_detail ? (
                                            // Legacy single team support
                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <Users className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-800">
                                                        {(selectedTache.equipe_detail as any).nom_equipe || selectedTache.equipe_detail.nomEquipe}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Aucune équipe assignée</p>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {selectedTache.description_travaux && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
                                            <p className="text-sm text-slate-600">{selectedTache.description_travaux}</p>
                                        </div>
                                    )}

                                    {/* Réclamation liée */}
                                    {selectedTache.reclamation_numero && (
                                        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                                            <div>
                                                <h4 className="font-semibold text-orange-800 text-sm">Lié à une réclamation</h4>
                                                <p className="text-sm text-orange-700">#{selectedTache.reclamation_numero}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Photos preview */}
                                    {photos.length > 0 && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                <Camera className="w-4 h-4 text-emerald-600" />
                                                Photos ({photos.length})
                                            </h3>
                                            <div className="grid grid-cols-4 gap-2">
                                                {photos.slice(0, 4).map(photo => (
                                                    <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-slate-200">
                                                        <img
                                                            src={getFullImageUrl(photo.url_fichier)}
                                                            alt={photo.legende || 'Photo'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            {photos.length > 4 && (
                                                <button
                                                    onClick={() => setActiveTab('photos')}
                                                    className="mt-2 text-sm text-emerald-600 hover:underline"
                                                >
                                                    Voir toutes les photos
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'photos' && (
                                <div className="space-y-4">
                                    {/* Upload Zone */}
                                    {!isClientView && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <div className="flex gap-2 mb-3">
                                                <button
                                                    onClick={() => setSelectedPhotoType('AVANT')}
                                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedPhotoType === 'AVANT'
                                                        ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
                                                        : 'bg-white text-slate-600 border border-slate-200'
                                                        }`}
                                                >
                                                    Avant
                                                </button>
                                                <button
                                                    onClick={() => setSelectedPhotoType('APRES')}
                                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedPhotoType === 'APRES'
                                                        ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                                                        : 'bg-white text-slate-600 border border-slate-200'
                                                        }`}
                                                >
                                                    Après
                                                </button>
                                            </div>
                                            <input
                                                type="file"
                                                id="photo-upload"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                                disabled={uploadingPhoto}
                                            />
                                            <label
                                                htmlFor="photo-upload"
                                                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                                            >
                                                {uploadingPhoto ? (
                                                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Camera className="w-8 h-8 text-slate-400 mb-2" />
                                                        <span className="text-sm text-slate-600">Cliquez pour ajouter des photos</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    )}

                                    {/* Photos Grid */}
                                    {loadingPhotos ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                        </div>
                                    ) : photos.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <FileImage className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">Aucune photo</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            {photos.map(photo => (
                                                <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                    <img
                                                        src={getFullImageUrl(photo.url_fichier)}
                                                        alt={photo.legende || 'Photo'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <a
                                                            href={getFullImageUrl(photo.url_fichier)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white"
                                                        >
                                                            <Eye className="w-5 h-5" />
                                                        </a>
                                                        {!isClientView && (
                                                            <button
                                                                onClick={() => setDeletingPhotoId(photo.id)}
                                                                className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full ${photo.type_photo === 'AVANT' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                                        {photo.type_photo_display}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'produits' && (
                                <div className="space-y-4">
                                    {/* Add Form */}
                                    {!isClientView && (
                                        <form onSubmit={handleAddConsommation} className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                                            <select
                                                value={newConsommation.produit}
                                                onChange={e => setNewConsommation({ ...newConsommation, produit: e.target.value })}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                                required
                                            >
                                                <option value="">Sélectionner un produit...</option>
                                                {produitsOptions.map(p => (
                                                    <option key={p.id} value={p.id}>{p.nom_produit}</option>
                                                ))}
                                            </select>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    placeholder="Quantité"
                                                    className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                                    value={newConsommation.quantite}
                                                    onChange={e => setNewConsommation({ ...newConsommation, quantite: e.target.value })}
                                                    required
                                                />
                                                <select
                                                    className="w-24 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                                    value={newConsommation.unite}
                                                    onChange={e => setNewConsommation({ ...newConsommation, unite: e.target.value })}
                                                >
                                                    <option value="L">L</option>
                                                    <option value="ml">ml</option>
                                                    <option value="kg">kg</option>
                                                    <option value="g">g</option>
                                                </select>
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" /> Ajouter
                                            </button>
                                        </form>
                                    )}

                                    {/* Consommations List */}
                                    {loadingConsommations ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                        </div>
                                    ) : consommations.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">Aucun produit consommé</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {consommations.map(conso => (
                                                <div key={conso.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                                                    <div>
                                                        <p className="font-medium text-slate-800 text-sm">{conso.produit_nom}</p>
                                                        <p className="text-slate-500 text-xs">{conso.quantite_utilisee} {conso.unite}</p>
                                                    </div>
                                                    {!isClientView && (
                                                        <button
                                                            onClick={() => setDeletingConsommationId(conso.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State when no task selected */}
                {!selectedTache && !loadingTasks && filteredTaches.length > 0 && (
                    <div className="hidden lg:flex flex-1 items-center justify-center text-slate-400 p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Eye className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">Sélectionnez une tâche</h3>
                            <p className="text-sm">Cliquez sur une tâche pour voir les détails</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {
                confirmModal?.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className={`p-6 text-center ${confirmModal.type === 'start' ? 'bg-emerald-50' : confirmModal.type === 'complete' ? 'bg-blue-50' : 'bg-red-50'}`}>
                                <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'start' ? 'bg-emerald-100' : confirmModal.type === 'complete' ? 'bg-blue-100' : 'bg-red-100'}`}>
                                    {confirmModal.icon === 'play' && <Play className="w-7 h-7 text-emerald-600" />}
                                    {confirmModal.icon === 'check' && <CheckCircle className="w-7 h-7 text-blue-600" />}
                                    {confirmModal.icon === 'x' && <XCircle className="w-7 h-7 text-red-600" />}
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">{confirmModal.title}</h3>
                            </div>
                            <div className="p-6">
                                <p className="text-slate-600 text-center mb-6">{confirmModal.message}</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConfirmModal(null)}
                                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={executeConfirmedAction}
                                        className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-white ${confirmModal.type === 'start' ? 'bg-emerald-600 hover:bg-emerald-700' : confirmModal.type === 'complete' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                                    >
                                        Confirmer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                deletingPhotoId && (
                    <ConfirmDeleteModal
                        title="Supprimer cette photo ?"
                        message="Cette action est irréversible."
                        onConfirm={() => handleDeletePhoto(deletingPhotoId)}
                        onCancel={() => setDeletingPhotoId(null)}
                    />
                )
            }

            {
                deletingConsommationId && (
                    <ConfirmDeleteModal
                        title="Supprimer cette consommation ?"
                        message="Cette action est irréversible."
                        onConfirm={() => handleDeleteConsommation(deletingConsommationId)}
                        onCancel={() => setDeletingConsommationId(null)}
                    />
                )
            }

            {
                validationModal?.isOpen && selectedTache && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className={`p-6 text-center ${validationModal.type === 'VALIDEE' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 ${validationModal.type === 'VALIDEE' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                    {validationModal.type === 'VALIDEE' ? <ThumbsUp className="w-7 h-7 text-emerald-600" /> : <ThumbsDown className="w-7 h-7 text-red-600" />}
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    {validationModal.type === 'VALIDEE' ? 'Valider la tâche' : 'Rejeter la tâche'}
                                </h3>
                            </div>
                            <div className="p-6">
                                <textarea
                                    value={validationComment}
                                    onChange={(e) => setValidationComment(e.target.value)}
                                    placeholder={validationModal.type === 'VALIDEE' ? 'Commentaire optionnel...' : 'Raison du rejet...'}
                                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 resize-none mb-4"
                                    rows={3}
                                    required={validationModal.type === 'REJETEE'}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setValidationModal(null); setValidationComment(''); }}
                                        disabled={validating}
                                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 disabled:opacity-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleValidation}
                                        disabled={validating || (validationModal.type === 'REJETEE' && !validationComment.trim())}
                                        className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2 ${validationModal.type === 'VALIDEE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                                    >
                                        {validating && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {validationModal.type === 'VALIDEE' ? 'Valider' : 'Rejeter'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showEditModal && selectedTache && (
                    <TaskFormModal
                        onClose={() => setShowEditModal(false)}
                        onSubmit={handleTaskUpdate}
                        typesTaches={typesTaches}
                        equipes={equipes}
                        tache={selectedTache}
                        isSubmitting={updatingTask}
                    />
                )
            }
        </div >
    );
};

export default SuiviTaches;
