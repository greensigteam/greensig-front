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
    X,
    Users
} from 'lucide-react';
import { Reclamation, TypeReclamation, Urgence } from '../types/reclamations';
import {
    fetchReclamationById,
    fetchTypesReclamations,
    fetchUrgences,
    cloturerReclamation,
    validerCloture,
    createSatisfaction
} from '../services/reclamationsApi';
import { planningService } from '../services/planningService';
import { fetchEquipes, fetchCurrentUser } from '../services/usersApi';
import { TypeTache, TacheCreate, Tache } from '../types/planning';
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

const ReclamationDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Data state
    const [reclamation, setReclamation] = useState<Reclamation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);

    // Referentiels
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);

    // Task modal
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskInitialValues, setTaskInitialValues] = useState<Partial<TacheCreate>>({});
    const [taskSiteFilter, setTaskSiteFilter] = useState<{ id: number; name: string } | undefined>(undefined);

    // Satisfaction
    const [showSatisfactionForm, setShowSatisfactionForm] = useState(false);

    // Photo preview
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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
            const [recData, typesTachesData, equipesData, currentUserData] = await Promise.all([
                fetchReclamationById(Number(id)),
                planningService.getTypesTaches(),
                fetchEquipes(),
                fetchCurrentUser()
            ]);

            setReclamation(recData);
            setTypesTaches(typesTachesData);
            setCurrentUser(currentUserData);

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

        try {
            const payload: TacheCreate = {
                ...data,
                reclamation: reclamation.id,
                date_debut_planifiee: new Date(data.date_debut_planifiee).toISOString(),
                date_fin_planifiee: new Date(data.date_fin_planifiee).toISOString(),
            };

            await planningService.createTache(payload);

            setIsTaskModalOpen(false);
            setTaskInitialValues({});
            setTaskSiteFilter(undefined);

            setModalConfig({
                isOpen: true,
                title: 'Succès',
                message: `Une tâche a été créée pour la réclamation ${reclamation.numero_reclamation}.`,
                variant: 'success',
                onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false }))
            });

            // Recharger les données
            loadData();
        } catch (error) {
            console.error("Erreur création tâche", error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: "Échec de la création de la tâche.",
                variant: 'danger'
            });
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

            setModalConfig({
                isOpen: true,
                title: 'Succès',
                message: 'Clôture proposée avec succès. En attente de validation par le créateur.',
                variant: 'success'
            });
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

            setModalConfig({
                isOpen: true,
                title: 'Succès',
                message: 'Clôture validée avec succès. La réclamation est définitivement clôturée.',
                variant: 'success'
            });
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

    // Satisfaction
    const handleSatisfactionSubmit = async (data: { reclamation: number; note: number; commentaire?: string }) => {
        try {
            await createSatisfaction(data);
            setShowSatisfactionForm(false);

            if (reclamation) {
                const updatedRec = await fetchReclamationById(reclamation.id);
                setReclamation(updatedRec);
            }

            setModalConfig({
                isOpen: true,
                title: 'Merci !',
                message: 'Votre évaluation a été enregistrée avec succès.',
                variant: 'success'
            });
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
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Créée le {new Date(reclamation.date_creation).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {isAdmin && reclamation.statut !== 'CLOTUREE' && (
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
                                        ? 'bg-gray-400 cursor-not-allowed opacity-60'
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
                            {reclamation.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' && currentUser && reclamation.createur === currentUser.id && (
                                <button
                                    onClick={handleValiderCloture}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 text-sm animate-pulse"
                                >
                                    <Star className="w-4 h-4" />
                                    Valider clôture
                                </button>
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
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Informations</h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Type</h4>
                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-emerald-600" />
                                        {reclamation.type_reclamation_nom}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Urgence</h4>
                                    <span
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                            backgroundColor: (reclamation.urgence_couleur || '#ccc') + '20',
                                            color: reclamation.urgence_couleur || '#666'
                                        }}
                                    >
                                        {reclamation.urgence_niveau}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Localisation</h4>
                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        {reclamation.site_nom || '-'} / {reclamation.zone_nom || '-'}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Statut</h4>
                                    <span
                                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                                        style={{
                                            backgroundColor: (RECLAMATION_STATUS_COLORS[reclamation.statut] || '#6b7280') + '20',
                                            color: RECLAMATION_STATUS_COLORS[reclamation.statut] || '#6b7280'
                                        }}
                                    >
                                        {reclamation.statut === 'EN_ATTENTE_VALIDATION_CLOTURE' ? 'En attente validation' : reclamation.statut.toLowerCase().replace('_', ' ')}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Date de constatation</h4>
                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-orange-500" />
                                        {formatLocalDate(reclamation.date_constatation, {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Créé par</h4>
                                    <p className="font-medium text-gray-900">
                                        {reclamation.createur_nom || 'Anonyme'}
                                    </p>
                                </div>
                            </div>

                            {reclamation.justification_rejet && (
                                <div className="mt-6 bg-red-50 p-4 rounded-lg border border-red-100">
                                    <h4 className="text-xs font-semibold uppercase text-red-600 mb-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Réponse Administrateur
                                    </h4>
                                    <p className="text-sm text-red-800 italic">{reclamation.justification_rejet}</p>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Description</h2>
                            <p className="text-gray-700 whitespace-pre-line">{reclamation.description}</p>
                        </div>

                        {/* Dates clés + Interventions + Satisfaction en grille */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Dates clés */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">Dates clés</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-sm text-gray-500">Prise en compte</span>
                                        <span className="text-sm font-medium text-gray-800">
                                            {reclamation.date_prise_en_compte
                                                ? new Date(reclamation.date_prise_en_compte).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-sm text-gray-500">Début traitement</span>
                                        <span className="text-sm font-medium text-gray-800">
                                            {reclamation.date_debut_traitement
                                                ? new Date(reclamation.date_debut_traitement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-sm text-gray-500">Résolution</span>
                                        <span className="text-sm font-medium text-emerald-700">
                                            {reclamation.date_resolution
                                                ? new Date(reclamation.date_resolution).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-gray-500">Clôture réelle</span>
                                        <span className="text-sm font-medium text-gray-800">
                                            {reclamation.date_cloture_reelle
                                                ? new Date(reclamation.date_cloture_reelle).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Interventions liées */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">Interventions liées</h2>
                                {reclamation.taches_liees_details && reclamation.taches_liees_details.length > 0 ? (
                                    <div className="space-y-3">
                                        {reclamation.taches_liees_details.map((t: any) => (
                                            <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-purple-100 rounded-lg">
                                                        <ClipboardList className="w-4 h-4 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{t.type_tache}</p>
                                                        <p className="text-xs text-gray-500">{t.equipe || 'Équipe non assignée'}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {t.statut}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Aucune intervention liée</p>
                                )}
                            </div>

                            {/* Satisfaction */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">Évaluation client</h2>
                                {reclamation.satisfaction ? (
                                    <div className="text-center">
                                        <div className="flex justify-center gap-1 mb-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-6 h-6 ${star <= reclamation.satisfaction.note ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-2xl font-bold text-gray-800">{reclamation.satisfaction.note}/5</p>
                                        {reclamation.satisfaction.commentaire && (
                                            <p className="mt-3 text-sm text-gray-600 italic">"{reclamation.satisfaction.commentaire}"</p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic text-center">Non évaluée</p>
                                )}
                            </div>
                        </div>

                        {/* Photos */}
                        {((reclamation.photos && reclamation.photos.length > 0) || (reclamation.photos_taches && reclamation.photos_taches.length > 0)) && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">Photos</h2>

                                {reclamation.photos && reclamation.photos.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-3">Photos initiales</h4>
                                        <div className="flex gap-3 overflow-x-auto pb-2">
                                            {reclamation.photos.map((p, i) => (
                                                <div key={i} className="relative group cursor-pointer shrink-0" onClick={() => setSelectedPhoto(p.url_fichier)}>
                                                    <img src={p.url_fichier} alt={`Photo ${i}`} className="h-32 w-44 object-cover rounded-lg border border-gray-200 hover:border-emerald-500 transition-colors" />
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
                                        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-3">Photos des travaux</h4>
                                        <div className="flex gap-3 overflow-x-auto pb-2">
                                            {reclamation.photos_taches.map((p, i) => (
                                                <div key={i} className="relative group cursor-pointer shrink-0" onClick={() => setSelectedPhoto(p.url_fichier)}>
                                                    <img src={p.url_fichier} alt={`Photo travaux ${i}`} className="h-32 w-44 object-cover rounded-lg border border-gray-200 hover:border-blue-500 transition-colors" />
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
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
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
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-200">
                                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-emerald-600" />
                                    Localisation sur carte
                                </h2>
                            </div>
                            <div className="h-[500px]">
                                {reclamation.localisation ? (
                                    <OLMap
                                        isMiniMap={true}
                                        activeLayer={MAP_LAYERS.SATELLITE}
                                        targetLocation={{
                                            coordinates: {
                                                lat: reclamation.localisation.coordinates[1],
                                                lng: reclamation.localisation.coordinates[0]
                                            },
                                            zoom: 17
                                        }}
                                        searchResult={{
                                            name: reclamation.numero_reclamation,
                                            coordinates: {
                                                lat: reclamation.localisation.coordinates[1],
                                                lng: reclamation.localisation.coordinates[0]
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center bg-slate-50">
                                        <p className="text-gray-400 text-sm">Aucune localisation disponible</p>
                                    </div>
                                )}
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
        </div>
    );
};

export default ReclamationDetailPage;
