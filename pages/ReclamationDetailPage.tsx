import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    AlertCircle,
    Tag,
    MapPin,
    Calendar,
    Clock,
    ClipboardList,
    Star,
    Eye,
    EyeOff,
    X,
    Info,
    Edit2,
    Trash2
} from 'lucide-react';
import { Reclamation, TypeReclamation, Urgence } from '../types/reclamations';
import {
    fetchReclamationById,
    cloturerReclamation,
    validerCloture,
    refuserCloture,
    rejeterReclamation,
    refuserIntervention,
    reprendreIntervention,
    createSatisfaction,
    deleteReclamation,
    fetchTypesReclamations,
    fetchUrgences
} from '../services/reclamationsApi';
import { ReclamationEditModal } from '../components/reclamations/ReclamationEditModal';
import { planningService } from '../services/planningService';
import { fetchEquipes, fetchCurrentUser } from '../services/usersApi';
import { TypeTache, TacheCreate } from '../types/planning';
import { EquipeList, Utilisateur } from '../types/users';
import { SatisfactionForm } from '../components/SatisfactionForm';
import TaskFormModal from '../components/planning/TaskFormModal';
import { formatLocalDate } from '../utils/dateHelpers';
import { format } from 'date-fns';
import LoadingScreen from '../components/LoadingScreen';
import ConfirmModal from '../components/ConfirmModal';
import { ReclamationTimeline } from '../components/ReclamationTimeline';
import OLMap from '../components/OLMap';
import { RECLAMATION_STATUS_COLORS, MAP_LAYERS } from '../constants';
import { PremiumTextarea } from '../components/modals/PremiumFormComponents';
import { useToast } from '../contexts/ToastContext';

/**
 * Calculate the center coordinates from any GeoJSON geometry.
 * Handles Point, Polygon, MultiPolygon, LineString, MultiLineString.
 */
function getGeometryCenter(geometry: any): { lat: number; lng: number } | null {
    if (!geometry || !geometry.type || !geometry.coordinates) {
        return null;
    }

    const coords = geometry.coordinates;

    switch (geometry.type) {
        case 'Point':
            if (Array.isArray(coords) && coords.length >= 2 &&
                typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                return { lng: coords[0], lat: coords[1] };
            }
            return null;

        case 'LineString':
        case 'MultiPoint':
            if (Array.isArray(coords) && coords.length > 0) {
                let sumLng = 0, sumLat = 0, count = 0;
                for (const pt of coords) {
                    if (Array.isArray(pt) && pt.length >= 2) {
                        sumLng += pt[0];
                        sumLat += pt[1];
                        count++;
                    }
                }
                if (count > 0) {
                    return { lng: sumLng / count, lat: sumLat / count };
                }
            }
            return null;

        case 'Polygon':
            // Use first ring (exterior) to calculate centroid
            if (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) {
                const ring = coords[0];
                let sumLng = 0, sumLat = 0, count = 0;
                for (const pt of ring) {
                    if (Array.isArray(pt) && pt.length >= 2) {
                        sumLng += pt[0];
                        sumLat += pt[1];
                        count++;
                    }
                }
                if (count > 0) {
                    return { lng: sumLng / count, lat: sumLat / count };
                }
            }
            return null;

        case 'MultiPolygon':
            // Use first polygon's exterior ring
            if (Array.isArray(coords) && coords.length > 0 &&
                Array.isArray(coords[0]) && coords[0].length > 0 &&
                Array.isArray(coords[0][0])) {
                const ring = coords[0][0];
                let sumLng = 0, sumLat = 0, count = 0;
                for (const pt of ring) {
                    if (Array.isArray(pt) && pt.length >= 2) {
                        sumLng += pt[0];
                        sumLat += pt[1];
                        count++;
                    }
                }
                if (count > 0) {
                    return { lng: sumLng / count, lat: sumLat / count };
                }
            }
            return null;

        case 'MultiLineString':
            // Average all points from all lines
            if (Array.isArray(coords)) {
                let sumLng = 0, sumLat = 0, count = 0;
                for (const line of coords) {
                    if (Array.isArray(line)) {
                        for (const pt of line) {
                            if (Array.isArray(pt) && pt.length >= 2) {
                                sumLng += pt[0];
                                sumLat += pt[1];
                                count++;
                            }
                        }
                    }
                }
                if (count > 0) {
                    return { lng: sumLng / count, lat: sumLat / count };
                }
            }
            return null;

        default:
            return null;
    }
}

const ReclamationDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Data state
    const [reclamation, setReclamation] = useState<Reclamation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);

    // Referentiels
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [typesReclamation, setTypesReclamation] = useState<TypeReclamation[]>([]);
    const [urgences, setUrgences] = useState<Urgence[]>([]);

    // Edit modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Task modal
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);
    const [taskInitialValues, setTaskInitialValues] = useState<Partial<TacheCreate>>({});
    const [taskSiteFilter, setTaskSiteFilter] = useState<{ id: number; name: string } | undefined>(undefined);

    // Satisfaction
    const [showSatisfactionForm, setShowSatisfactionForm] = useState(false);

    // Photo preview
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Refus de clôture
    const [showRefuserClotureModal, setShowRefuserClotureModal] = useState(false);
    const [commentaireRefus, setCommentaireRefus] = useState('');
    const [isSubmittingRefus, setIsSubmittingRefus] = useState(false);

    // Rejet de réclamation
    const [showRejeterModal, setShowRejeterModal] = useState(false);
    const [justificationRejet, setJustificationRejet] = useState('');
    const [isSubmittingRejet, setIsSubmittingRejet] = useState(false);

    // Refus d'intervention par le client
    const [showRefuserInterventionModal, setShowRefuserInterventionModal] = useState(false);
    const [motifRefusIntervention, setMotifRefusIntervention] = useState('');
    const [isSubmittingRefusIntervention, setIsSubmittingRefusIntervention] = useState(false);

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

    // Helpers rôles
    const isAdmin = !!currentUser?.roles?.includes('ADMIN');
    const isSupervisor = !!currentUser?.roles?.includes('SUPERVISEUR');
    const isClient = !!currentUser?.roles?.includes('CLIENT');

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        if (!id) {
            setError('ID de réclamation non fourni');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [recData, typesTachesData, equipesData, currentUserData, typesRecData, urgencesData] = await Promise.all([
                fetchReclamationById(Number(id)),
                planningService.getTypesTaches(),
                fetchEquipes(),
                fetchCurrentUser(),
                fetchTypesReclamations(),
                fetchUrgences()
            ]);

            setReclamation(recData);
            setTypesTaches(typesTachesData);
            setCurrentUser(currentUserData);
            setTypesReclamation(typesRecData);
            setUrgences(urgencesData);

            const eqList = Array.isArray(equipesData) ? equipesData : (equipesData as any).results || [];
            setEquipes(eqList);
        } catch (err) {
            console.error('Erreur chargement réclamation:', err);
            setError('Impossible de charger les détails de la réclamation');
        } finally {
            setLoading(false);
        }
    };

    // ===================================
    // HANDLERS
    // ===================================

    const handleOpenTaskModal = () => {
        if (!reclamation) return;

        setTaskInitialValues({
            id_client: reclamation.client || null,
            priorite: 3,
            commentaires: `Tâche liée à la réclamation ${reclamation.numero_reclamation}`,
            date_debut_planifiee: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            date_fin_planifiee: format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
            reclamation: reclamation.id,
        });

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
        if (!reclamation) return;

        console.log('🟢 [ReclamationDetail] handleTaskSubmit APPELÉE');
        console.log('🔵 [ReclamationDetail] Données reçues:', data);
        console.log('🔵 [ReclamationDetail] recurrence_config:', data.recurrence_config);

        setIsSubmittingTask(true);
        try {
            const payload: TacheCreate = {
                ...data,
                reclamation: reclamation.id,
                date_debut_planifiee: data.date_debut_planifiee,
                date_fin_planifiee: data.date_fin_planifiee,
            };

            // Créer la tâche de base
            const createdTask = await planningService.createTache(payload);
            console.log('✅ [ReclamationDetail] Tâche de base créée:', createdTask);

            // ✅ Gérer la récurrence si activée
            const recurrenceConfig = data.recurrence_config;
            console.log('🔵 [ReclamationDetail] Configuration de récurrence:', recurrenceConfig);

            if (recurrenceConfig && recurrenceConfig.enabled && createdTask.id) {
                console.log('🔄 [ReclamationDetail] Récurrence activée, mode:', recurrenceConfig.mode);

                try {
                    let recurrenceResult;

                    if (recurrenceConfig.mode === 'frequency') {
                        console.log('📅 [ReclamationDetail] Appel API dupliquer-recurrence avec fréquence:', recurrenceConfig.frequency);
                        recurrenceResult = await planningService.dupliquerTacheRecurrence(createdTask.id, {
                            frequence: recurrenceConfig.frequency!,
                            nombre_occurrences: recurrenceConfig.nombre_occurrences,
                            date_fin_recurrence: recurrenceConfig.date_fin_recurrence,
                            conserver_equipes: recurrenceConfig.conserver_equipes,
                            conserver_objets: recurrenceConfig.conserver_objets
                        });
                    } else if (recurrenceConfig.mode === 'custom') {
                        console.log('⚙️ [ReclamationDetail] Appel API dupliquer avec décalage:', recurrenceConfig.decalage_jours);
                        recurrenceResult = await planningService.dupliquerTache(createdTask.id, {
                            decalage_jours: recurrenceConfig.decalage_jours!,
                            nombre_occurrences: recurrenceConfig.nombre_occurrences,
                            date_fin_recurrence: recurrenceConfig.date_fin_recurrence,
                            conserver_equipes: recurrenceConfig.conserver_equipes,
                            conserver_objets: recurrenceConfig.conserver_objets
                        });
                    } else if (recurrenceConfig.mode === 'dates') {
                        console.log('📆 [ReclamationDetail] Appel API dupliquer-dates avec:', recurrenceConfig.dates_cibles);
                        recurrenceResult = await planningService.dupliquerTacheDates(createdTask.id, {
                            dates_cibles: recurrenceConfig.dates_cibles!,
                            conserver_equipes: recurrenceConfig.conserver_equipes,
                            conserver_objets: recurrenceConfig.conserver_objets
                        });
                    }

                    console.log('✅ [ReclamationDetail] Résultat de la récurrence:', recurrenceResult);

                    // Notification avec nombre de tâches créées
                    if (recurrenceResult) {
                        const totalCreated = 1 + recurrenceResult.nombre_taches_creees;
                        showToast(`${totalCreated} tâche${totalCreated > 1 ? 's' : ''} créée${totalCreated > 1 ? 's' : ''} avec succès pour la réclamation ${reclamation.numero_reclamation} (1 tâche de base + ${recurrenceResult.nombre_taches_creees} occurrence${recurrenceResult.nombre_taches_creees > 1 ? 's' : ''}).`, 'success');
                    } else {
                        showToast(`Une tâche a été créée pour la réclamation ${reclamation.numero_reclamation}.`, 'success');
                    }
                } catch (recurrenceError: any) {
                    console.error('❌ [ReclamationDetail] Erreur lors de la création des occurrences:', recurrenceError);
                    showToast(`Tâche de base créée, mais erreur lors de la génération des occurrences: ${recurrenceError.message || recurrenceError}`, 'error');
                }
            } else {
                console.log('ℹ️ [ReclamationDetail] Pas de récurrence activée');
                showToast(`Une tâche a été créée pour la réclamation ${reclamation.numero_reclamation}.`, 'success');
            }

            setIsTaskModalOpen(false);
            setTaskInitialValues({});
            setTaskSiteFilter(undefined);

            // Recharger les données
            loadData();
        } catch (error: any) {
            console.error("❌ [ReclamationDetail] Erreur création tâche", error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: "Échec de la création de la tâche.",
                variant: 'danger'
            });
        } finally {
            setIsSubmittingTask(false);
        }
    };

    const handleCloseTaskModal = () => {
        setIsTaskModalOpen(false);
        setTaskInitialValues({});
        setTaskSiteFilter(undefined);
    };

    // Clôture (Admin/Superviseur propose la clôture)
    const handleCloturer = async () => {
        if (!reclamation) return;

        const hasUnfinishedTasks = reclamation.taches_liees_details?.some((t: any) => t.statut !== 'TERMINEE');
        if (hasUnfinishedTasks) {
            setModalConfig({
                isOpen: true,
                title: 'Impossible de proposer la clôture',
                message: 'Toutes les tâches associées doivent être terminées avant de proposer la clôture.',
                variant: 'danger'
            });
            return;
        }

        try {
            const updatedRec = await cloturerReclamation(reclamation.id);
            setReclamation(updatedRec);

            // Notification toast
            showToast('Clôture proposée avec succès. En attente de validation par le créateur.', 'success');
        } catch (error: any) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || 'Erreur lors de la proposition de clôture.',
                variant: 'danger'
            });
        }
    };

    // Validation de clôture par le créateur
    const handleValiderCloture = async () => {
        if (!reclamation) return;

        try {
            const updatedRec = await validerCloture(reclamation.id);
            setReclamation(updatedRec);

            window.dispatchEvent(new Event('refresh-reclamations'));

            // Notification toast
            showToast('Clôture validée avec succès. La réclamation est définitivement clôturée.', 'success');
        } catch (error: any) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || 'Erreur lors de la validation de la clôture.',
                variant: 'danger'
            });
        }
    };

    // Refus de clôture par le créateur
    const handleRefuserCloture = async () => {
        if (!reclamation) return;

        // Validation du commentaire
        if (!commentaireRefus.trim()) {
            setModalConfig({
                isOpen: true,
                title: 'Commentaire requis',
                message: 'Vous devez obligatoirement expliquer pourquoi vous refusez la clôture.',
                variant: 'warning'
            });
            return;
        }

        setIsSubmittingRefus(true);
        try {
            const updatedRec = await refuserCloture(reclamation.id, commentaireRefus.trim());
            setReclamation(updatedRec);

            // Fermer le modal et réinitialiser
            setShowRefuserClotureModal(false);
            setCommentaireRefus('');

            window.dispatchEvent(new Event('refresh-reclamations'));

            // Notification toast
            showToast('Votre refus a bien été enregistré. La réclamation retourne au statut "Résolue".', 'info');
        } catch (error: any) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || 'Erreur lors du refus de la clôture.',
                variant: 'danger'
            });
        } finally {
            setIsSubmittingRefus(false);
        }
    };

    // Rejet de réclamation par l'admin
    const handleRejeter = async () => {
        if (!reclamation) return;

        // Validation de la justification
        if (!justificationRejet.trim()) {
            setModalConfig({
                isOpen: true,
                title: 'Justification requise',
                message: 'Vous devez obligatoirement justifier le rejet de cette réclamation.',
                variant: 'warning'
            });
            return;
        }

        setIsSubmittingRejet(true);
        try {
            const updatedRec = await rejeterReclamation(reclamation.id, justificationRejet.trim());
            setReclamation(updatedRec);

            // Fermer le modal et réinitialiser
            setShowRejeterModal(false);
            setJustificationRejet('');

            window.dispatchEvent(new Event('refresh-reclamations'));

            // Notification toast au lieu de modal
            showToast('La réclamation a été rejetée avec succès.', 'success');
        } catch (error: any) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || 'Erreur lors du rejet de la réclamation.',
                variant: 'danger'
            });
        } finally {
            setIsSubmittingRejet(false);
        }
    };

    // Refus d'intervention par le client
    const handleRefuserIntervention = async () => {
        if (!reclamation) return;

        // Validation du motif
        if (!motifRefusIntervention.trim()) {
            setModalConfig({
                isOpen: true,
                title: 'Motif requis',
                message: 'Vous devez obligatoirement expliquer pourquoi vous refusez l\'intervention.',
                variant: 'warning'
            });
            return;
        }

        setIsSubmittingRefusIntervention(true);
        try {
            const updatedRec = await refuserIntervention(reclamation.id, motifRefusIntervention.trim());
            setReclamation(updatedRec);

            // Fermer le modal et réinitialiser
            setShowRefuserInterventionModal(false);
            setMotifRefusIntervention('');

            window.dispatchEvent(new Event('refresh-reclamations'));

            // Notification toast
            showToast('Votre refus a bien été enregistré. Une nouvelle intervention sera planifiée.', 'info');
        } catch (error: any) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || 'Erreur lors du refus de l\'intervention.',
                variant: 'danger'
            });
        } finally {
            setIsSubmittingRefusIntervention(false);
        }
    };

    // Reprendre l'intervention après refus (Admin/Superviseur)
    const handleReprendreIntervention = async () => {
        if (!reclamation) return;

        try {
            const updatedRec = await reprendreIntervention(reclamation.id);
            setReclamation(updatedRec);

            window.dispatchEvent(new Event('refresh-reclamations'));

            showToast('Réclamation reprise. Une nouvelle intervention peut être planifiée.', 'success');
        } catch (error: any) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || 'Erreur lors de la reprise de l\'intervention.',
                variant: 'danger'
            });
        }
    };

    // Satisfaction
    const handleSatisfactionSubmit = async (data: { reclamation: number; note: number; commentaire?: string }) => {
        try {
            await createSatisfaction(data);
            setShowSatisfactionForm(false);

            if (reclamation) {
                const updatedRec = await fetchReclamationById(reclamation.id);
                setReclamation(updatedRec);
            }

            // Notification toast
            showToast('Votre évaluation a été enregistrée avec succès.', 'success');
        } catch (error: any) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || 'Erreur lors de l\'enregistrement.',
                variant: 'danger'
            });
        }
    };

    // Éditer la réclamation
    const handleEdit = () => {
        if (!reclamation) return;
        setIsEditModalOpen(true);
    };

    // Callback après édition réussie
    const handleEditSuccess = async () => {
        setIsEditModalOpen(false);
        // Recharger les données pour afficher les modifications
        await loadData();
        showToast('Réclamation mise à jour avec succès', 'success');
    };

    // Supprimer la réclamation
    const handleDelete = async () => {
        if (!reclamation) return;

        try {
            await deleteReclamation(reclamation.id);

            setModalConfig({
                isOpen: true,
                title: 'Suppression réussie',
                message: 'La réclamation a été supprimée avec succès.',
                variant: 'success',
                onConfirm: () => {
                    navigate('/reclamations');
                }
            });
        } catch (error: any) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || 'Erreur lors de la suppression.',
                variant: 'danger'
            });
        }
    };

    // ===================================
    // RENDER
    // ===================================

    if (loading) {
        return (
            <div className="fixed inset-0 z-50">
                <LoadingScreen isLoading={true} loop={true} minDuration={0} />
            </div>
        );
    }

    if (error || !reclamation) {
        return (
            <div className="flex items-center justify-center h-full min-h-screen bg-slate-50">
                <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
                    <p className="text-red-600">{error || 'Réclamation non trouvée'}</p>
                    <Link to="/reclamations" className="mt-4 inline-block text-emerald-600 hover:text-emerald-700 font-medium">
                        Retour à la liste
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-50">
            {/* Bannière Réclamation Rejetée */}
            {reclamation.statut === 'REJETEE' && (
                <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-center gap-3">
                    <X className="w-5 h-5" />
                    <span className="font-medium">
                        Cette réclamation a été rejetée et est en lecture seule. Aucune action n'est possible.
                    </span>
                </div>
            )}

            {/* Bannière Réclamation Clôturée */}
            {reclamation.statut === 'CLOTUREE' && (
                <div className="bg-emerald-600 text-white px-6 py-3 flex items-center justify-center gap-3">
                    <Star className="w-5 h-5" />
                    <span className="font-medium">
                        Cette réclamation a été clôturée avec succès.
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="px-6">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/reclamations')}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <AlertCircle className="w-6 h-6 text-emerald-600" />
                                    {reclamation.numero_reclamation}
                                    {/* Indicateur de réclamation interne (visible_client=false) */}
                                    {reclamation.visible_client === false && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                            <EyeOff className="w-3 h-3" />
                                            Interne
                                        </span>
                                    )}
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Créée le {formatLocalDate(reclamation.date_creation, { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {/* Bouton Modifier - visible pour Admin ou créateur si pas clôturée/rejetée */}
                            {(isAdmin || (currentUser && reclamation.createur === currentUser.id)) && reclamation.statut !== 'CLOTUREE' && reclamation.statut !== 'REJETEE' && (
                                <button
                                    onClick={handleEdit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 text-sm transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Modifier
                                </button>
                            )}

                            {/* Bouton Supprimer - visible pour Admin seulement (même si rejetée, pour nettoyage) */}
                            {isAdmin && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 text-sm transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Supprimer
                                </button>
                            )}

                            {/* Bouton Créer une tâche - pas si clôturée ou rejetée */}
                            {isAdmin && reclamation.statut !== 'CLOTUREE' && reclamation.statut !== 'REJETEE' && (
                                <button
                                    onClick={handleOpenTaskModal}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 text-sm"
                                >
                                    <ClipboardList className="w-4 h-4" />
                                    Créer une tâche
                                </button>
                            )}
                            {reclamation.statut !== 'CLOTUREE' && reclamation.statut !== 'REJETEE' && reclamation.statut !== 'EN_ATTENTE_VALIDATION_CLOTURE' && !isClient && (
                                <button
                                    onClick={handleCloturer}
                                    disabled={reclamation.taches_liees_details?.some((t: any) => t.statut !== 'TERMINEE')}
                                    className={`px-4 py-2 text-white rounded-lg font-medium flex items-center gap-2 text-sm transition-all ${reclamation.taches_liees_details?.some((t: any) => t.statut !== 'TERMINEE')
                                        ? 'bg-slate-400 cursor-not-allowed opacity-60'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    title={reclamation.taches_liees_details?.some((t: any) => t.statut !== 'TERMINEE')
                                        ? "Certaines tâches ne sont pas terminées"
                                        : "Proposer la clôture de la réclamation"}
                                >
                                    <Clock className="w-4 h-4" />
                                    Proposer clôture
                                </button>
                            )}
                            {/* Bouton Rejeter - visible pour Admin uniquement si pas clôturée ou déjà rejetée */}
                            {isAdmin && reclamation.statut !== 'CLOTUREE' && reclamation.statut !== 'REJETEE' && (
                                <button
                                    onClick={() => setShowRejeterModal(true)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 text-sm transition-colors"
                                    title="Rejeter cette réclamation (justification obligatoire)"
                                >
                                    <X className="w-4 h-4" />
                                    Rejeter la réclamation
                                </button>
                            )}
                            {reclamation.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' && currentUser && reclamation.createur === currentUser.id && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleValiderCloture}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 text-sm animate-pulse"
                                        title="Accepter la clôture de la réclamation"
                                    >
                                        <Star className="w-4 h-4" />
                                        Valider clôture
                                    </button>
                                    <button
                                        onClick={() => setShowRefuserClotureModal(true)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 text-sm"
                                        title="Refuser la clôture (commentaire obligatoire)"
                                    >
                                        <X className="w-4 h-4" />
                                        Refuser clôture
                                    </button>
                                </div>
                            )}
                            {currentUser && reclamation.createur === currentUser.id && reclamation.statut === 'CLOTUREE' && !reclamation.satisfaction && (
                                <button
                                    onClick={() => setShowSatisfactionForm(true)}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center gap-2 text-sm"
                                >
                                    <Star className="w-4 h-4" />
                                    Évaluer
                                </button>
                            )}

                            {/* Bouton Refuser l'intervention - Client quand intervention terminée (pas si rejetée) */}
                            {(isClient || (currentUser && reclamation.createur === currentUser.id)) &&
                             reclamation.statut !== 'REJETEE' &&
                             (reclamation.statut === 'RESOLUE' || reclamation.statut === 'EN_ATTENTE_VALIDATION_CLOTURE') &&
                             reclamation.taches_liees_details?.some((t: any) => t.statut === 'TERMINEE') && (
                                <button
                                    onClick={() => setShowRefuserInterventionModal(true)}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center gap-2 text-sm"
                                    title="Refuser l'intervention effectuée (commentaire obligatoire)"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    Refuser l'intervention
                                </button>
                            )}

                            {/* Bouton Reprendre l'intervention - Admin quand intervention refusée */}
                            {isAdmin && reclamation.statut === 'INTERVENTION_REFUSEE' && (
                                <button
                                    onClick={handleReprendreIntervention}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 text-sm"
                                    title="Reprendre l'intervention suite au refus client"
                                >
                                    <ClipboardList className="w-4 h-4" />
                                    Reprendre l'intervention
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Informations principales */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Info className="w-5 h-5 text-emerald-600" />
                                Informations
                            </h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <dt className="text-xs font-medium text-slate-500 mb-1">Type</dt>
                                    <dd className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-emerald-600" />
                                        {reclamation.type_reclamation_nom}
                                    </dd>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <dt className="text-xs font-medium text-slate-500 mb-1">Urgence</dt>
                                    <dd>
                                        <span
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                            style={{
                                                backgroundColor: (reclamation.urgence_couleur || '#ccc') + '20',
                                                color: reclamation.urgence_couleur || '#666'
                                            }}
                                        >
                                            {reclamation.urgence_niveau}
                                        </span>
                                    </dd>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <dt className="text-xs font-medium text-slate-500 mb-1">Localisation</dt>
                                    <dd className="font-semibold text-slate-800 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        {reclamation.site_nom || '-'} / {reclamation.zone_nom || '-'}
                                    </dd>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <dt className="text-xs font-medium text-slate-500 mb-1">Statut</dt>
                                    <span
                                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                                        style={{
                                            backgroundColor: (RECLAMATION_STATUS_COLORS[reclamation.statut] || '#6b7280') + '20',
                                            color: RECLAMATION_STATUS_COLORS[reclamation.statut] || '#6b7280'
                                        }}
                                    >
                                        {reclamation.statut_display || reclamation.statut}
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <dt className="text-xs font-medium text-slate-500 mb-1">Date de constatation</dt>
                                    <dd className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-orange-500" />
                                        {formatLocalDate(reclamation.date_constatation, {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </dd>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <dt className="text-xs font-medium text-slate-500 mb-1">Créé par</dt>
                                    <dd className="font-semibold text-slate-800">
                                        {reclamation.createur_nom || 'Anonyme'}
                                    </dd>
                                </div>
                            </div>

                            {/* Section Rejet par l'administrateur */}
                            {reclamation.justification_rejet && (
                                <div className="mt-6 bg-red-50 p-4 rounded-lg border border-red-200">
                                    <h4 className="text-xs font-semibold uppercase text-red-600 mb-3 flex items-center gap-1">
                                        <X className="w-3 h-3" />
                                        Réclamation rejetée par l'administrateur
                                    </h4>
                                    <div className="space-y-2">
                                        {reclamation.rejetee_par_nom && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-red-600 font-medium w-24">Rejetée par :</span>
                                                <span className="text-sm font-semibold text-red-800">
                                                    {reclamation.rejetee_par_nom}
                                                </span>
                                            </div>
                                        )}
                                        {reclamation.date_rejet && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-red-600 font-medium w-24">Date :</span>
                                                <span className="text-sm text-red-800">
                                                    {formatLocalDate(reclamation.date_rejet, {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        )}
                                        <div className="mt-3 pt-3 border-t border-red-200">
                                            <span className="text-xs text-red-600 font-medium block mb-1">Motif du rejet :</span>
                                            <p className="text-sm text-red-800 italic bg-white/50 rounded-lg p-3">
                                                "{reclamation.justification_rejet}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section Refus de clôture par le client (créateur) */}
                            {reclamation.commentaire_refus_cloture && (
                                <div className="mt-6 bg-purple-50 p-4 rounded-lg border border-purple-200">
                                    <h4 className="text-xs font-semibold uppercase text-purple-600 mb-3 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Clôture refusée par le client
                                    </h4>
                                    <div className="space-y-2">
                                        {reclamation.cloture_refusee_par_nom && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-purple-600 font-medium w-24">Refusée par :</span>
                                                <span className="text-sm font-semibold text-purple-800">
                                                    {reclamation.cloture_refusee_par_nom}
                                                </span>
                                            </div>
                                        )}
                                        {reclamation.date_refus_cloture && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-purple-600 font-medium w-24">Date :</span>
                                                <span className="text-sm text-purple-800">
                                                    {formatLocalDate(reclamation.date_refus_cloture, {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        )}
                                        <div className="mt-3 pt-3 border-t border-purple-200">
                                            <span className="text-xs text-purple-600 font-medium block mb-1">Motif du refus :</span>
                                            <p className="text-sm text-purple-800 italic bg-white/50 rounded-lg p-3">
                                                "{reclamation.commentaire_refus_cloture}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section Refus d'intervention par le client */}
                            {(reclamation.statut === 'INTERVENTION_REFUSEE' || reclamation.motif_refus_intervention) && (
                                <div className="mt-6 bg-orange-50 p-4 rounded-lg border border-orange-200">
                                    <h4 className="text-xs font-semibold uppercase text-orange-600 mb-3 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Intervention refusée par le client
                                    </h4>
                                    <div className="space-y-2">
                                        {reclamation.intervention_refusee_par_nom && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-orange-600 font-medium w-24">Refusée par :</span>
                                                <span className="text-sm font-semibold text-orange-800">
                                                    {reclamation.intervention_refusee_par_nom}
                                                </span>
                                            </div>
                                        )}
                                        {reclamation.date_refus_intervention && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-orange-600 font-medium w-24">Date :</span>
                                                <span className="text-sm text-orange-800">
                                                    {formatLocalDate(reclamation.date_refus_intervention, {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        )}
                                        {reclamation.nombre_refus && reclamation.nombre_refus > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-orange-600 font-medium w-24">Nb de refus :</span>
                                                <span className="text-sm font-semibold text-orange-800">
                                                    {reclamation.nombre_refus} fois
                                                </span>
                                            </div>
                                        )}
                                        {reclamation.motif_refus_intervention && (
                                            <div className="mt-3 pt-3 border-t border-orange-200">
                                                <span className="text-xs text-orange-600 font-medium block mb-1">Motif du refus :</span>
                                                <p className="text-sm text-orange-800 italic bg-white/50 rounded-lg p-3">
                                                    "{reclamation.motif_refus_intervention}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Description</h2>
                            <p className="text-slate-700 whitespace-pre-line">{reclamation.description}</p>
                        </div>

                        {/* Dates clés + Interventions + Satisfaction en grille */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Dates clés */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                                <h2 className="text-lg font-bold text-slate-800 mb-4">Dates clés</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-sm text-slate-500">Prise en compte</span>
                                        <span className="text-sm font-medium text-slate-800">
                                            {formatLocalDate(reclamation.date_prise_en_compte, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-sm text-slate-500">Début traitement</span>
                                        <span className="text-sm font-medium text-slate-800">
                                            {formatLocalDate(reclamation.date_debut_traitement, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-sm text-slate-500">Résolution</span>
                                        <span className="text-sm font-medium text-emerald-600">
                                            {formatLocalDate(reclamation.date_resolution, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-slate-500">Clôture réelle</span>
                                        <span className="text-sm font-medium text-slate-800">
                                            {formatLocalDate(reclamation.date_cloture_reelle, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Interventions liées */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                                <h2 className="text-lg font-bold text-slate-800 mb-4">Interventions liées</h2>
                                {reclamation.taches_liees_details && reclamation.taches_liees_details.length > 0 ? (
                                    <div className="space-y-3">
                                        {reclamation.taches_liees_details.map((t: any) => (
                                            <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-purple-100 rounded-lg">
                                                        <ClipboardList className="w-4 h-4 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">{t.type_tache}</p>
                                                        <p className="text-xs text-slate-500">{t.equipe || 'Équipe non assignée'}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {t.statut}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Aucune intervention liée</p>
                                )}
                            </div>

                            {/* Satisfaction */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                                <h2 className="text-lg font-bold text-slate-800 mb-4">Évaluation client</h2>
                                {reclamation.satisfaction ? (
                                    <div className="text-center">
                                        <div className="flex justify-center gap-1 mb-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-6 h-6 ${star <= (reclamation.satisfaction?.note ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-2xl font-bold text-slate-800">{reclamation.satisfaction?.note ?? 0}/5</p>
                                        {reclamation.satisfaction?.commentaire && (
                                            <p className="mt-3 text-sm text-slate-600 italic">"{reclamation.satisfaction.commentaire}"</p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic text-center">Non évaluée</p>
                                )}
                            </div>
                        </div>

                        {/* Photos */}
                        {((reclamation.photos && reclamation.photos.length > 0) || (reclamation.photos_taches && reclamation.photos_taches.length > 0)) && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                                <h2 className="text-lg font-bold text-slate-800 mb-4">Photos</h2>

                                {reclamation.photos && reclamation.photos.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-xs font-medium text-slate-500 mb-3">Photos initiales</h4>
                                        <div className="flex gap-3 overflow-x-auto pb-2">
                                            {reclamation.photos.map((p, i) => (
                                                <div key={i} className="relative group cursor-pointer shrink-0" onClick={() => setSelectedPhoto(p.url_fichier)}>
                                                    <img src={p.url_fichier} alt={`Photo ${i}`} className="h-32 w-44 object-cover rounded-lg border border-slate-200 hover:border-emerald-500 transition-colors" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg flex items-center justify-center transition-all">
                                                        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {reclamation.photos_taches && reclamation.photos_taches.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-slate-500 mb-3">Photos des travaux</h4>
                                        <div className="flex gap-3 overflow-x-auto pb-2">
                                            {reclamation.photos_taches.map((p, i) => (
                                                <div key={i} className="relative group cursor-pointer shrink-0" onClick={() => setSelectedPhoto(p.url_fichier)}>
                                                    <img src={p.url_fichier} alt={`Photo travaux ${i}`} className="h-32 w-44 object-cover rounded-lg border border-slate-200 hover:border-blue-500 transition-colors" />
                                                    <div className="absolute inset-x-0 bottom-0 bg-black/50 text-xs text-white p-1.5 text-center rounded-b-lg">
                                                        {new Date(p.date_prise).toLocaleDateString('fr-FR')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-emerald-600" />
                                Suivi de traitement
                            </h2>
                            <ReclamationTimeline
                                historique={reclamation.historique || []}
                                photos={reclamation.photos || []}
                                photosTaches={reclamation.photos_taches || []}
                                satisfaction={reclamation.satisfaction}
                                canEvaluate={
                                    (reclamation.statut === 'CLOTUREE' || reclamation.statut === 'RESOLUE') &&
                                    !reclamation.satisfaction
                                }
                                onEvaluate={() => setShowSatisfactionForm(true)}
                            />
                        </div>
                    </div>

                    {/* Sidebar - Carte */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-emerald-600" />
                                    Localisation sur carte
                                </h2>
                            </div>
                            <div className="h-[500px]">
                                {(() => {
                                    const center = getGeometryCenter(reclamation.localisation);
                                    if (center) {
                                        return (
                                            <OLMap
                                                isMiniMap={true}
                                                activeLayer={MAP_LAYERS.SATELLITE}
                                                targetLocation={{
                                                    coordinates: center,
                                                    zoom: 17
                                                }}
                                                highlightedGeometry={{
                                                    type: 'Feature',
                                                    geometry: reclamation.localisation,
                                                    properties: {
                                                        couleur_statut: RECLAMATION_STATUS_COLORS[reclamation.statut] || '#f97316'
                                                    }
                                                }}
                                            />
                                        );
                                    }
                                    return (
                                        <div className="h-full flex items-center justify-center bg-slate-50">
                                            <p className="text-slate-400 text-sm">Aucune localisation disponible</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Task Modal */}
            {isTaskModalOpen && (
                <TaskFormModal
                    initialValues={taskInitialValues}
                    equipes={equipes}
                    typesTaches={typesTaches}
                    siteFilter={taskSiteFilter}
                    isSubmitting={isSubmittingTask}
                    onClose={handleCloseTaskModal}
                    onSubmit={handleTaskSubmit}
                />
            )}

            {/* Satisfaction Form */}
            {showSatisfactionForm && reclamation && (
                <SatisfactionForm
                    reclamationId={reclamation.id}
                    reclamationNumero={reclamation.numero_reclamation}
                    onSubmit={handleSatisfactionSubmit}
                    onClose={() => setShowSatisfactionForm(false)}
                />
            )}

            {/* Confirm Modal */}
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
            {showDeleteConfirm && (
                <ConfirmModal
                    isOpen={showDeleteConfirm}
                    title="Supprimer la réclamation ?"
                    message={`Êtes-vous sûr de vouloir supprimer la réclamation ${reclamation?.numero_reclamation} ? Cette action est irréversible.`}
                    variant="danger"
                    confirmLabel="Supprimer"
                    onConfirm={() => {
                        setShowDeleteConfirm(false);
                        handleDelete();
                    }}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}

            {/* Photo Preview Modal */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <button
                        className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhoto(null);
                        }}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={selectedPhoto}
                        alt="Aperçu"
                        className="max-w-full max-h-full object-contain rounded shadow-2xl animate-in zoom-in-95 duration-300"
                    />
                </div>
            )}

            {/* Modal de refus de clôture */}
            {showRefuserClotureModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    Refuser la clôture
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Expliquez pourquoi vous refusez cette clôture
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowRefuserClotureModal(false);
                                    setCommentaireRefus('');
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                disabled={isSubmittingRefus}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <Info className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800">
                                    <p className="font-semibold mb-1">Commentaire obligatoire</p>
                                    <p>
                                        Vous devez expliquer les raisons de votre refus pour permettre à l'équipe d'effectuer les corrections nécessaires.
                                    </p>
                                </div>
                            </div>

                            <PremiumTextarea
                                value={commentaireRefus}
                                onChange={(value) => setCommentaireRefus(value)}
                                label="Motif du refus"
                                placeholder="Décrivez les raisons du refus et les actions attendues..."
                                icon={<Edit2 className="w-4 h-4" />}
                                required
                                variant="outlined"
                                size="md"
                                rows={5}
                            />

                            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                                <p className="font-semibold mb-1">Après validation de votre refus :</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>La réclamation retournera au statut "Résolue"</li>
                                    <li>L'équipe sera notifiée de votre refus avec votre commentaire</li>
                                    <li>De nouvelles interventions pourront être planifiées</li>
                                </ul>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowRefuserClotureModal(false);
                                    setCommentaireRefus('');
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                                disabled={isSubmittingRefus}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleRefuserCloture}
                                disabled={isSubmittingRefus || !commentaireRefus.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                            >
                                {isSubmittingRefus ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Envoi...
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4" />
                                        Confirmer le refus
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de rejet de réclamation */}
            {showRejeterModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    Rejeter la réclamation
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Expliquez pourquoi vous rejetez cette réclamation
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowRejeterModal(false);
                                    setJustificationRejet('');
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                disabled={isSubmittingRejet}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <Info className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800">
                                    <p className="font-semibold mb-1">Justification obligatoire</p>
                                    <p>
                                        Une réclamation rejetée sera définitivement archivée. Vous devez justifier cette décision.
                                    </p>
                                </div>
                            </div>

                            <PremiumTextarea
                                value={justificationRejet}
                                onChange={(value) => setJustificationRejet(value)}
                                label="Motif du rejet"
                                placeholder="Décrivez les raisons du rejet de cette réclamation..."
                                icon={<Edit2 className="w-4 h-4" />}
                                required
                                variant="outlined"
                                size="md"
                                rows={5}
                            />

                            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                                <p className="font-semibold mb-1 text-red-700">⚠️ Attention :</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>La réclamation passera au statut "Rejetée" (définitif)</li>
                                    <li>Le créateur sera notifié de ce rejet avec votre justification</li>
                                    <li>Aucune intervention ne pourra être planifiée sur cette réclamation</li>
                                </ul>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowRejeterModal(false);
                                    setJustificationRejet('');
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                                disabled={isSubmittingRejet}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleRejeter}
                                disabled={isSubmittingRejet || !justificationRejet.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                            >
                                {isSubmittingRejet ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Envoi...
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4" />
                                        Confirmer le rejet
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de refus d'intervention par le client */}
            {showRefuserInterventionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-orange-600" />
                                    Refuser l'intervention
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    L'intervention effectuée ne vous convient pas ?
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowRefuserInterventionModal(false);
                                    setMotifRefusIntervention('');
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                disabled={isSubmittingRefusIntervention}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                                <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-orange-800">
                                    <p className="font-semibold mb-1">Commentaire obligatoire</p>
                                    <p>
                                        Veuillez expliquer précisément ce qui ne convient pas dans l'intervention effectuée.
                                        Cela permettra à l'équipe de comprendre le problème et d'effectuer les corrections nécessaires.
                                    </p>
                                </div>
                            </div>

                            {reclamation && reclamation.nombre_refus && reclamation.nombre_refus > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                                    <span className="text-sm text-yellow-800">
                                        Cette réclamation a déjà été refusée {reclamation.nombre_refus} fois.
                                    </span>
                                </div>
                            )}

                            <PremiumTextarea
                                value={motifRefusIntervention}
                                onChange={(value) => setMotifRefusIntervention(value)}
                                label="Motif du refus"
                                placeholder="Décrivez précisément ce qui ne va pas : qualité insuffisante, travaux incomplets, erreur de réalisation..."
                                icon={<Edit2 className="w-4 h-4" />}
                                required
                                variant="outlined"
                                size="md"
                                rows={5}
                            />

                            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                                <p className="font-semibold mb-1">Après validation de votre refus :</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>La réclamation passera au statut "Intervention refusée"</li>
                                    <li>L'équipe sera notifiée de votre refus avec votre commentaire</li>
                                    <li>Une nouvelle intervention sera planifiée pour résoudre le problème</li>
                                </ul>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowRefuserInterventionModal(false);
                                    setMotifRefusIntervention('');
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                                disabled={isSubmittingRefusIntervention}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleRefuserIntervention}
                                disabled={isSubmittingRefusIntervention || !motifRefusIntervention.trim()}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                            >
                                {isSubmittingRefusIntervention ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Envoi...
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4" />
                                        Confirmer le refus
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'édition de réclamation */}
            {reclamation && (
                <ReclamationEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={handleEditSuccess}
                    types={typesReclamation}
                    urgences={urgences}
                    editingId={reclamation.id}
                    canSetVisibility={isAdmin || isSupervisor}
                />
            )}
        </div>
    );
};

export default ReclamationDetailPage;
