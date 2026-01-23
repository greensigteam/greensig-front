import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Edit2, Trash2, X, MapPin, ClipboardList, Calendar, TrendingUp, RefreshCw, Loader2, Settings, MoreVertical, Clock, Star, BarChart3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertOctagon, Filter, Check, ChevronDown, Download, Eye, EyeOff } from 'lucide-react';
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
    fetchReclamationStats,
    exportReclamationsExcel
} from '../services/reclamationsApi';
import { planningService } from '../services/planningService';
import { fetchEquipes, fetchCurrentUser } from '../services/usersApi';
import { fetchAllSites, SiteFrontend } from '../services/api';
import { TypeTache, TacheCreate, PRIORITE_LABELS, Tache, STATUT_TACHE_COLORS } from '../types/planning';
import { EquipeList, Utilisateur } from '../types/users';
import TaskFormModal from '../components/planning/TaskFormModal';
import { ReclamationEditModal } from '../components/reclamations/ReclamationEditModal';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import LoadingScreen from '../components/LoadingScreen';
import { RECLAMATION_STATUS_LABELS } from '../constants';

import ConfirmModal from '../components/ConfirmModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';

// Composant CustomSelect pour des dropdowns modernes
interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    icon?: React.ReactNode;
    placeholder?: string;
    className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, icon, placeholder, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder || 'Sélectionner';

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-400 ${isOpen ? 'ring-2 ring-emerald-500/20 border-emerald-500' : ''}`}
            >
                <div className="flex items-center gap-2 truncate">
                    {icon && <span className="text-slate-500 flex-shrink-0">{icon}</span>}
                    <span className={`truncate ${value === '' ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                        {selectedLabel}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${value === option.value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-700'}`}
                            >
                                <span className="truncate">{option.label}</span>
                                {value === option.value && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Reclamations: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();
    const [reclamations, setReclamations] = useState<Reclamation[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);

    // Helpers rôles
    const isAdmin = !!currentUser?.roles?.includes('ADMIN');
    const isClient = !!currentUser?.roles?.includes('CLIENT');
    const isSupervisor = !!currentUser?.roles?.includes('SUPERVISEUR');

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

    // Export
    const [exporting, setExporting] = useState(false);

    // Referentiels Réclamation
    const [types, setTypes] = useState<TypeReclamation[]>([]);
    const [urgences, setUrgences] = useState<Urgence[]>([]);

    // Referentiels Tâche (pour création intervention)
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    // Pagination Reclamations
    const [currentPageRec, setCurrentPageRec] = useState(1);
    const [itemsPerPageRec, setItemsPerPageRec] = useState(10);

    // Pagination Taches
    const [currentPageTache, setCurrentPageTache] = useState(1);
    const [itemsPerPageTache, setItemsPerPageTache] = useState(10);

    // Filtres
    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [filterStatut, setFilterStatut] = useState<string>('');
    const [filterSite, setFilterSite] = useState<string>('');
    const [filterDateDebut, setFilterDateDebut] = useState<string>('');
    const [filterDateFin, setFilterDateFin] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterPeriod, setFilterPeriod] = useState<string>('all');

    const handlePeriodChange = (value: string) => {
        setFilterPeriod(value);
        const today = new Date();

        switch (value) {
            case 'last_7':
                setFilterDateDebut(format(subDays(today, 7), 'yyyy-MM-dd'));
                setFilterDateFin(format(today, 'yyyy-MM-dd'));
                break;
            case 'last_30':
                setFilterDateDebut(format(subDays(today, 30), 'yyyy-MM-dd'));
                setFilterDateFin(format(today, 'yyyy-MM-dd'));
                break;
            case 'this_month':
                setFilterDateDebut(format(startOfMonth(today), 'yyyy-MM-dd'));
                setFilterDateFin(format(endOfMonth(today), 'yyyy-MM-dd'));
                break;
            case 'all':
                setFilterDateDebut('');
                setFilterDateFin('');
                break;
            default:
                // custom: do nothing to dates
                break;
        }
    };

    // Set search placeholder and cleanup on unmount
    useEffect(() => {
        setPlaceholder('Rechercher une réclamation par numéro, description...');
        return () => {
            setPlaceholder('Rechercher...');
            setSearchQuery('');
        };
    }, [setPlaceholder, setSearchQuery]);

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

    // Reset pages on search or filter change
    useEffect(() => {
        setCurrentPageRec(1);
        setCurrentPageTache(1);
    }, [searchQuery, activeTab]);

    // Reload reclamations when filters change
    useEffect(() => {
        if (sites.length > 0) { // S'assurer que les données de base sont chargées
            loadReclamations();
        }
    }, [filterStatut, filterSite, filterDateDebut, filterDateFin]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle navigation from MapPage with site pre-selected
    useEffect(() => {
        const state = location.state as {
            createFromSite?: boolean;
            siteId?: number | string;
            siteName?: string;
            openReclamationId?: number | string;
            editReclamationId?: number;
            editReclamationData?: any;
        } | null;

        if (state?.createFromSite && state?.siteId) {
            // Pre-fill the form with the site
            setFormData({ site: Number(state.siteId) });
            setPreSelectedSiteName(state.siteName || null);
            setIsCreateModalOpen(true);
            // Clear the navigation state
            navigate(location.pathname, { replace: true, state: {} });
        }

        // Éditer une réclamation depuis la page de détails
        if (state?.editReclamationId) {
            // Ouvrir le modal - il chargera les données lui-même
            handleEdit(Number(state.editReclamationId));
            // Clear the navigation state
            navigate(location.pathname, { replace: true, state: {} });
        }

        // Ouvrir une réclamation spécifique depuis la carte - naviguer vers la page de détails
        if (state?.openReclamationId) {
            navigate(`/reclamations/${state.openReclamationId}`, { replace: true });
        }
    }, [location.state, navigate]);

    const loadReclamations = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterStatut) params.statut = filterStatut;
            if (filterSite) params.site = Number(filterSite);
            if (filterDateDebut) params.date_debut = filterDateDebut;
            if (filterDateFin) params.date_fin = filterDateFin;

            const recsData = await fetchReclamations(params);
            setReclamations(recsData);
        } catch (error) {
            console.error("Erreur chargement réclamations", error);
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [typesData, urgencesData, typesTachesData, equipesData, tachesLieesData, currentUserData, sitesData] = await Promise.all([
                fetchTypesReclamations(),
                fetchUrgences(),
                planningService.getTypesTaches(),
                fetchEquipes(),
                planningService.getTaches({ has_reclamation: true }),
                fetchCurrentUser(),
                fetchAllSites()
            ]);
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

            // Sites - fetchAllSites retourne directement SiteFrontend[]
            setSites(sitesData);

            // Charger les réclamations avec les filtres
            await loadReclamations();

        } catch (error) {
            console.error("Erreur chargement données", error);
        } finally {
            setLoading(false);
        }
    };

    // ===================================
    // HANDLERS RECLAMATION
    // ===================================

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

    const handleEdit = (id: number) => {
        // Ouvrir la modale - le composant ReclamationEditModal chargera les données
        setEditingId(id);
        setFormData({}); // Reset pour que le modal charge les données fraîches
        setExistingPhotos([]);
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        setEditingId(null);
        setFormData({});
        setPhotos([]);
        setExistingPhotos([]);
        setPreSelectedSiteName(null);
    };

    // Export Excel
    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const blob = await exportReclamationsExcel({
                statut: filterStatut || undefined,
                site: filterSite ? parseInt(filterSite) : undefined,
                date_debut: filterDateDebut || undefined,
                date_fin: filterDateFin || undefined
            });

            // Télécharger le fichier
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
            a.download = `reclamations_${dateStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setModalConfig({
                isOpen: true,
                title: 'Export réussi',
                message: 'Le fichier Excel a été téléchargé avec succès.',
                variant: 'success',
                onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false }))
            });
        } catch (error: any) {
            console.error('Export error:', error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || "Erreur lors de l'export.",
                variant: 'danger',
                onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false }))
            });
        } finally {
            setExporting(false);
            setActionsMenuOpen(false);
        }
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
        console.log('🟢 [Reclamations] handleTaskSubmit APPELÉE');
        console.log('🔵 [Reclamations] Données reçues:', data);
        console.log('🔵 [Reclamations] recurrence_config:', data.recurrence_config);

        setIsSubmitting(true);
        try {
            // Ajouter la réclamation aux données
            const payload: TacheCreate = {
                ...data,
                reclamation: reclamationTargetForTask?.id,
                date_debut_planifiee: data.date_debut_planifiee,
                date_fin_planifiee: data.date_fin_planifiee,
            };

            // Créer la tâche de base
            const createdTask = await planningService.createTache(payload);
            console.log('✅ [Reclamations] Tâche de base créée:', createdTask);

            // ✅ Gérer la récurrence si activée
            const recurrenceConfig = data.recurrence_config;
            console.log('🔵 [Reclamations] Configuration de récurrence:', recurrenceConfig);

            if (recurrenceConfig && recurrenceConfig.enabled && createdTask.id) {
                console.log('🔄 [Reclamations] Récurrence activée, mode:', recurrenceConfig.mode);

                try {
                    let recurrenceResult;

                    if (recurrenceConfig.mode === 'frequency') {
                        console.log('📅 [Reclamations] Appel API dupliquer-recurrence avec fréquence:', recurrenceConfig.frequency);
                        recurrenceResult = await planningService.dupliquerTacheRecurrence(createdTask.id, {
                            frequence: recurrenceConfig.frequency!,
                            nombre_occurrences: recurrenceConfig.nombre_occurrences,
                            date_fin_recurrence: recurrenceConfig.date_fin_recurrence,
                            conserver_equipes: recurrenceConfig.conserver_equipes,
                            conserver_objets: recurrenceConfig.conserver_objets
                        });
                    } else if (recurrenceConfig.mode === 'custom') {
                        console.log('⚙️ [Reclamations] Appel API dupliquer avec décalage:', recurrenceConfig.decalage_jours);
                        recurrenceResult = await planningService.dupliquerTache(createdTask.id, {
                            decalage_jours: recurrenceConfig.decalage_jours!,
                            nombre_occurrences: recurrenceConfig.nombre_occurrences,
                            date_fin_recurrence: recurrenceConfig.date_fin_recurrence,
                            conserver_equipes: recurrenceConfig.conserver_equipes,
                            conserver_objets: recurrenceConfig.conserver_objets
                        });
                    } else if (recurrenceConfig.mode === 'dates') {
                        console.log('📆 [Reclamations] Appel API dupliquer-dates avec:', recurrenceConfig.dates_cibles);
                        recurrenceResult = await planningService.dupliquerTacheDates(createdTask.id, {
                            dates_cibles: recurrenceConfig.dates_cibles!,
                            conserver_equipes: recurrenceConfig.conserver_equipes,
                            conserver_objets: recurrenceConfig.conserver_objets
                        });
                    }

                    console.log('✅ [Reclamations] Résultat de la récurrence:', recurrenceResult);

                    // Message de succès avec nombre de tâches créées
                    if (recurrenceResult) {
                        const totalCreated = 1 + recurrenceResult.nombre_taches_creees;
                        setModalConfig({
                            isOpen: true,
                            title: 'Succès',
                            message: `${totalCreated} tâche${totalCreated > 1 ? 's' : ''} créée${totalCreated > 1 ? 's' : ''} avec succès pour la réclamation ${reclamationTargetForTask?.numero_reclamation} (1 tâche de base + ${recurrenceResult.nombre_taches_creees} occurrence${recurrenceResult.nombre_taches_creees > 1 ? 's' : ''}).`,
                            variant: 'success',
                            onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false }))
                        });
                    } else {
                        setModalConfig({
                            isOpen: true,
                            title: 'Succès',
                            message: `Une tâche a été créée pour la réclamation ${reclamationTargetForTask?.numero_reclamation}.`,
                            variant: 'success',
                            onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false }))
                        });
                    }
                } catch (recurrenceError: any) {
                    console.error('❌ [Reclamations] Erreur lors de la création des occurrences:', recurrenceError);
                    setModalConfig({
                        isOpen: true,
                        title: 'Avertissement',
                        message: `Tâche de base créée, mais erreur lors de la génération des occurrences: ${recurrenceError.message || recurrenceError}`,
                        variant: 'warning',
                        onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false }))
                    });
                }
            } else {
                console.log('ℹ️ [Reclamations] Pas de récurrence activée');
                setModalConfig({
                    isOpen: true,
                    title: 'Succès',
                    message: `Une tâche a été créée pour la réclamation ${reclamationTargetForTask?.numero_reclamation}.`,
                    variant: 'success',
                    onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false }))
                });
            }

            setIsTaskModalOpen(false);
            setTaskInitialValues({});
            setTaskSiteFilter(undefined);
            setReclamationTargetForTask(null);

            // Recharger les tâches liées
            loadData();

        } catch (error: any) {
            console.error("❌ [Reclamations] Erreur création tâche", error);
            setModalConfig({ isOpen: true, title: 'Erreur', message: "Échec de la création de la tâche.", variant: 'danger' });
        } finally {
            setIsSubmitting(false);
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
        // ✅ FILTRAGE STRICT: On ne veut ici QUE les tâches qui possèdent un numéro de réclamation
        // Cela corrige le cas où l'API renvoie des tâches sans réclamation malgré le filtre has_reclamation=true
        const tachesAvecReclamation = tachesLiees.filter(t => t.reclamation_numero);

        if (!searchQuery) return tachesAvecReclamation;
        const query = searchQuery.toLowerCase();
        return tachesAvecReclamation.filter(t =>
            t.type_tache_detail.nom_tache.toLowerCase().includes(query) ||
            ((t.client_detail as any)?.nom_structure || '').toLowerCase().includes(query) ||
            t.description_travaux?.toLowerCase().includes(query) ||
            (t.reclamation_numero && t.reclamation_numero.toLowerCase().includes(query))
        );
    }, [tachesLiees, searchQuery]);

    // Active filters check
    const hasActiveFilters = !!(filterStatut || filterSite || filterDateDebut || filterDateFin);
    const activeFiltersCount = [filterStatut, filterSite, filterDateDebut, filterDateFin].filter(Boolean).length;

    // Pagination calculations
    const totalPagesRec = Math.ceil(filteredReclamations.length / itemsPerPageRec);
    const startIndexRec = (currentPageRec - 1) * itemsPerPageRec;
    const paginatedReclamations = filteredReclamations.slice(startIndexRec, startIndexRec + itemsPerPageRec);

    const totalPagesTache = Math.ceil(filteredTaches.length / itemsPerPageTache);
    const startIndexTache = (currentPageTache - 1) * itemsPerPageTache;
    const paginatedTaches = filteredTaches.slice(startIndexTache, startIndexTache + itemsPerPageTache);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

                    {/* Filters Button (only for reclamations tab) */}
                    {activeTab === 'reclamations' && (
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters || hasActiveFilters
                                ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filtres</span>
                            {hasActiveFilters && (
                                <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Export Button */}
                    <button
                        onClick={handleExportExcel}
                        disabled={exporting || loading}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        title="Exporter en Excel"
                    >
                        {exporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        <span>Export</span>
                    </button>

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

            {/* Filters Panel */}
            {showFilters && activeTab === 'reclamations' && (
                <div className="mb-6 pb-4 border-b border-slate-200 bg-slate-50 p-4 rounded-lg">
                    <div className={`grid grid-cols-1 ${filterPeriod === 'custom' ? 'md:grid-cols-5' : 'md:grid-cols-3'} gap-4`}>
                        {/* Filtre Statut */}
                        <CustomSelect
                            value={filterStatut}
                            onChange={(val) => setFilterStatut(val)}
                            options={[
                                { value: '', label: 'Statut: Tous' },
                                { value: 'NOUVELLE', label: 'En attente de lecture' },
                                { value: 'PRISE_EN_COMPTE', label: 'Prise en compte' },
                                { value: 'EN_COURS', label: 'En attente de réalisation' },
                                { value: 'RESOLUE', label: 'Tâche terminée côté admin.' },
                                { value: 'EN_ATTENTE_VALIDATION_CLOTURE', label: 'En attente validation clôture' },
                                { value: 'CLOTUREE', label: 'Clôturée' },
                                { value: 'REJETEE', label: 'Rejetée' }
                            ]}
                            icon={<AlertOctagon className="w-4 h-4" />}
                        />

                        {/* Filtre Site */}
                        <CustomSelect
                            value={filterSite}
                            onChange={(val) => setFilterSite(val)}
                            options={[
                                { value: '', label: 'Site: Tous' },
                                ...sites.map(s => ({ value: s.id, label: s.name }))
                            ]}
                            icon={<MapPin className="w-4 h-4" />}
                        />

                        {/* Filtre Période */}
                        <CustomSelect
                            value={filterPeriod}
                            onChange={(val) => handlePeriodChange(val)}
                            options={[
                                { value: 'all', label: 'Tout l\'historique' },
                                { value: 'last_7', label: '7 derniers jours' },
                                { value: 'last_30', label: '30 derniers jours' },
                                { value: 'this_month', label: 'Ce mois-ci' },
                                { value: 'custom', label: 'Période personnalisée' }
                            ]}
                            icon={<Clock className="w-4 h-4" />}
                        />

                        {filterPeriod === 'custom' && (
                            <>
                                {/* Filtre Date Début */}
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <input
                                        type="date"
                                        value={filterDateDebut}
                                        onChange={(e) => {
                                            setFilterDateDebut(e.target.value);
                                            setFilterPeriod('custom');
                                        }}
                                        placeholder="Date création (début)"
                                        className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-400"
                                    />
                                </div>

                                {/* Filtre Date Fin */}
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <input
                                        type="date"
                                        value={filterDateFin}
                                        onChange={(e) => {
                                            setFilterDateFin(e.target.value);
                                            setFilterPeriod('custom');
                                        }}
                                        placeholder="Date création (fin)"
                                        className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-400"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Reset Button */}
                    {hasActiveFilters && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => {
                                    setFilterStatut('');
                                    setFilterSite('');
                                    setFilterDateDebut('');
                                    setFilterDateFin('');
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Réinitialiser les filtres
                            </button>
                        </div>
                    )}
                </div>
            )}

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
                        <>
                            <div className="overflow-x-auto min-h-[400px]">
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
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-tr-xl w-24">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedReclamations.map(rec => (
                                            <tr
                                                key={rec.id}
                                                onClick={() => handleDetails(rec.id)}
                                                className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-slate-800">{rec.numero_reclamation}</span>
                                                        {rec.visible_client === false && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700" title="Réclamation interne (masquée au client)">
                                                                <EyeOff className="w-3 h-3" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{rec.type_reclamation_nom}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
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
                                                    <div className="flex flex-col min-w-[150px]">
                                                        <span className="text-sm font-medium text-slate-800">{rec.site_nom}</span>
                                                        {rec.zone_nom && <span className="text-xs text-slate-400">{rec.zone_nom}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                                    {rec.createur_nom || <span className="text-slate-400 italic">Anonyme</span>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                                    {new Date(rec.date_creation).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`
                                                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                                    ${rec.statut === 'NOUVELLE' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                            rec.statut === 'RESOLUE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                rec.statut === 'EN_COURS' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                                                    rec.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                        rec.statut === 'CLOTUREE' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                                            'bg-slate-100 text-slate-600 border border-slate-200'}
                                                `}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${rec.statut === 'NOUVELLE' ? 'bg-red-500' :
                                                            rec.statut === 'RESOLUE' ? 'bg-emerald-500' :
                                                                rec.statut === 'EN_COURS' ? 'bg-orange-500' :
                                                                    rec.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' ? 'bg-emerald-500' :
                                                                        rec.statut === 'CLOTUREE' ? 'bg-green-500' :
                                                                            'bg-slate-400'
                                                            }`} />
                                                        {rec.statut_display || rec.statut}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end items-center gap-2" data-row-menu>
                                                        {isSupervisor && rec.statut === 'NOUVELLE' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenTaskModal(rec);
                                                                }}
                                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 group/btn"
                                                                title="Planifier une tâche"
                                                            >
                                                                <ClipboardList className="w-5 h-5 transition-transform group-hover/btn:scale-110" />
                                                            </button>
                                                        )}

                                                        {/* Menu Actions - Visible si ADMIN/SUPERVISEUR ou si CLIENT créateur de la réclamation */}
                                                        {(!isClient || rec.createur === currentUser?.id) && (
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setRowMenuOpen(rowMenuOpen === rec.id ? null : rec.id);
                                                                    }}
                                                                    className={`p-2 rounded-lg transition-all duration-200 ${rowMenuOpen === rec.id
                                                                        ? 'bg-slate-100 text-slate-800'
                                                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                                                >
                                                                    <MoreVertical className="w-5 h-5" />
                                                                </button>

                                                                {rowMenuOpen === rec.id && (
                                                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-[60] animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-black/5">
                                                                        {/* Message lecture seule si rejetée */}
                                                                        {rec.statut === 'REJETEE' && (
                                                                            <div className="px-4 py-2.5 text-xs text-red-600 bg-red-50 border-b border-red-100">
                                                                                <X className="w-3 h-3 inline mr-1" />
                                                                                Réclamation rejetée (lecture seule)
                                                                            </div>
                                                                        )}

                                                                        {/* Créer une tâche - Seulement ADMIN/SUPERVISEUR, pas si clôturée/rejetée */}
                                                                        {!isClient && rec.statut !== 'CLOTUREE' && rec.statut !== 'REJETEE' && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleOpenTaskModal(rec);
                                                                                    setRowMenuOpen(null);
                                                                                }}
                                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                                            >
                                                                                <ClipboardList className="w-4 h-4 text-purple-500" />
                                                                                Créer une tâche
                                                                            </button>
                                                                        )}

                                                                        {/* Modifier - ADMIN ou créateur, pas si clôturée/rejetée */}
                                                                        {(isAdmin || rec.createur === currentUser?.id) && rec.statut !== 'CLOTUREE' && rec.statut !== 'REJETEE' && (
                                                                            <>
                                                                                {!isClient && (
                                                                                    <div className="my-1 border-t border-slate-100" />
                                                                                )}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleEdit(rec.id);
                                                                                        setRowMenuOpen(null);
                                                                                    }}
                                                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                >
                                                                                    <Edit2 className="w-4 h-4 text-emerald-500" />
                                                                                    Modifier
                                                                                </button>
                                                                            </>
                                                                        )}

                                                                        {/* Supprimer - ADMIN seulement (même si rejetée, pour nettoyage) */}
                                                                        {isAdmin && (
                                                                            <>
                                                                                <div className="my-1 border-t border-slate-100" />
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDelete(rec.id);
                                                                                        setRowMenuOpen(null);
                                                                                    }}
                                                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                    Supprimer
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Reclamations */}
                            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-600">
                                        Affichage {startIndexRec + 1} à {Math.min(startIndexRec + itemsPerPageRec, filteredReclamations.length)} sur {filteredReclamations.length}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPageRec(1)}
                                            disabled={currentPageRec === 1}
                                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronsLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPageRec(p => Math.max(1, p - 1))}
                                            disabled={currentPageRec === 1}
                                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="px-3 py-1 text-sm text-slate-600">Page {currentPageRec} sur {totalPagesRec > 0 ? totalPagesRec : 1}</span>
                                        <button
                                            onClick={() => setCurrentPageRec(p => Math.min(totalPagesRec, p + 1))}
                                            disabled={currentPageRec === totalPagesRec || totalPagesRec === 0}
                                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPageRec(totalPagesRec)}
                                            disabled={currentPageRec === totalPagesRec || totalPagesRec === 0}
                                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronsRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
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
                        <>
                            <div className="overflow-x-auto min-h-[400px]">
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
                                        {paginatedTaches.map(t => {
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
                                                            ? t.equipes_detail.map(eq => (eq as any).nomEquipe || (eq as any).nom_equipe).join(', ')
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
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${t.priorite >= 4 ? 'bg-red-50 text-red-700 border border-red-100' :
                                                            t.priorite === 3 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                                'bg-slate-100 text-slate-600 border border-slate-200'
                                                            }`}>
                                                            {PRIORITE_LABELS[t.priorite]}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statutColors.bg} ${statutColors.text}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${t.statut === 'PLANIFIEE' ? 'bg-blue-500' :
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
                                                                onClick={() => navigate(`/suivi-taches?task_id=${t.id}`)}
                                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                title="Voir le détail de la tâche"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Taches */}
                            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-600">
                                        Affichage {startIndexTache + 1} à {Math.min(startIndexTache + itemsPerPageTache, filteredTaches.length)} sur {filteredTaches.length}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPageTache(1)}
                                            disabled={currentPageTache === 1}
                                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronsLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPageTache(p => Math.max(1, p - 1))}
                                            disabled={currentPageTache === 1}
                                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="px-3 py-1 text-sm text-slate-600">Page {currentPageTache} sur {totalPagesTache > 0 ? totalPagesTache : 1}</span>
                                        <button
                                            onClick={() => setCurrentPageTache(p => Math.min(totalPagesTache, p + 1))}
                                            disabled={currentPageTache === totalPagesTache || totalPagesTache === 0}
                                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPageTache(totalPagesTache)}
                                            disabled={currentPageTache === totalPagesTache || totalPagesTache === 0}
                                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronsRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
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
                                            {`${Math.round(stats.delai_moyen_heures ?? 0)}h`}
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
                                            {`${(stats.satisfaction_moyenne ?? 0).toFixed(1)}/5`}
                                        </div>
                                        {(stats.nombre_evaluations ?? 0) > 0 && (
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
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden">
                                    <div className="p-6 border-b border-slate-100">
                                        <h3 className="font-bold text-lg text-slate-800">Répartition par Statut</h3>
                                    </div>
                                    <div className="p-6">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={Object.entries(stats.par_statut).map(([statut, count]) => ({
                                                        name: RECLAMATION_STATUS_LABELS[statut] || statut,
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
            </div>

            {/* Modal Création Tâche (Intervention) - Utilise le même formulaire que Planning */}
            {
                isTaskModalOpen && (
                    <TaskFormModal
                        initialValues={taskInitialValues}
                        equipes={equipes}
                        typesTaches={typesTaches}
                        siteFilter={taskSiteFilter}
                        isSubmitting={isSubmitting}
                        onClose={handleCloseTaskModal}
                        onSubmit={handleTaskSubmit}
                    />
                )
            }

            {/* Modal Création / Edition Réclamation */}
            <ReclamationEditModal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                onSuccess={() => {
                    setModalConfig({
                        isOpen: true,
                        title: 'Succès',
                        message: editingId ? 'Réclamation mise à jour avec succès.' : 'Réclamation créée avec succès.',
                        variant: 'success',
                        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                    });
                    loadData();
                }}
                types={types}
                urgences={urgences}
                editingId={editingId}
                initialData={formData}
                existingPhotos={existingPhotos}
                preSelectedSiteName={preSelectedSiteName}
                canSetVisibility={isAdmin || isSupervisor}
            />




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
            {
                deletingReclamationId && (
                    <ConfirmDeleteModal
                        title="Supprimer la réclamation ?"
                        message="Cette action est irréversible."
                        onConfirm={confirmDeleteReclamation}
                        onCancel={() => setDeletingReclamationId(null)}
                    />
                )
            }

        </div >
    );
};

export default Reclamations;
