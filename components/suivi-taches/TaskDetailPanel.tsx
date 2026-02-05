import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronRight, Play, CheckCircle, XCircle, ThumbsUp, ThumbsDown,
    ShieldCheck, RefreshCw, Pencil, Trash2, Camera, Package,
    Loader2, Calendar, MapPin, Building2, Users, AlertCircle, Plus, X,
    MoreVertical, Clock
} from 'lucide-react';
import { Tache, STATUT_TACHE_COLORS, STATUT_TACHE_LABELS, ETAT_VALIDATION_COLORS, ETAT_VALIDATION_LABELS, StatusDistribution } from '../../types/planning';
import { PhotoList, ConsommationProduit, ProduitList } from '../../types/suiviTaches';
import { EquipeList } from '../../types/users';
import DistributionsList from './DistributionsList';
import TaskPhotosTab from './TaskPhotosTab';
import TaskProduitsTab from './TaskProduitsTab';

// Helper pour construire l'URL complète des images
const getFullImageUrl = (url: string | null): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    const backendUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';
    return `${backendUrl}${url}`;
};

interface TaskDetailPanelProps {
    tache: Tache;
    photos: PhotoList[];
    consommations: ConsommationProduit[];
    produitsOptions: ProduitList[];
    equipesDisponibles: EquipeList[];
    isAdmin: boolean;
    isClientView: boolean;
    loadingPhotos: boolean;
    loadingConsommations: boolean;
    loadingTypesTaches: boolean;
    uploadingPhoto: boolean;
    changingStatut: boolean;
    assigningEquipe: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onStartTask: () => void;
    onCompleteTask: () => void;
    onCancelTask: () => void;
    onValidate: (type: 'VALIDEE' | 'REJETEE') => void;
    onToggleDistribution: (distributionId: number, currentStatus: StatusDistribution) => void;
    onEditDistribution: (distributionId: number) => void;
    onDeleteDistribution: (distributionId: number) => void;
    onAddDistributions: () => void;
    // Nouvelles actions de distribution (système 6 statuts)
    onDemarrerDistribution?: (distributionId: number) => void;
    onTerminerDistribution?: (distributionId: number) => void;
    onReporterDistribution?: (distributionId: number) => void;
    onAnnulerDistribution?: (distributionId: number) => void;
    onRestaurerDistribution?: (distributionId: number) => void;
    onHistoriqueDistribution?: (distributionId: number) => void;
    onPhotoUpload: (files: FileList, photoType: 'AVANT' | 'APRES') => void;
    onPhotoDelete: (photoId: number) => void;
    onConsommationAdd: (data: { produit: number; quantite: number; unite: string; commentaire: string }) => void;
    onConsommationDelete: (consoId: number) => void;
    onAssignEquipe: (equipeId: number) => void;
    onRemoveEquipe: (equipeId: number) => void;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
    tache,
    photos,
    consommations,
    produitsOptions,
    equipesDisponibles,
    isAdmin,
    isClientView,
    loadingPhotos,
    loadingConsommations,
    loadingTypesTaches,
    uploadingPhoto,
    changingStatut,
    assigningEquipe,
    onClose,
    onEdit,
    onDelete,
    onStartTask,
    onCompleteTask,
    onCancelTask,
    onValidate,
    onToggleDistribution,
    onEditDistribution,
    onDeleteDistribution,
    onAddDistributions,
    onDemarrerDistribution,
    onTerminerDistribution,
    onReporterDistribution,
    onAnnulerDistribution,
    onRestaurerDistribution,
    onHistoriqueDistribution,
    onPhotoUpload,
    onPhotoDelete,
    onConsommationAdd,
    onConsommationDelete,
    onAssignEquipe,
    onRemoveEquipe,
}) => {
    const [activeTab, setActiveTab] = useState<'info' | 'photos' | 'produits'>('info');

    // Équipes déjà assignées (IDs)
    const assignedEquipeIds = new Set(
        tache.equipes_detail?.map((e: any) => e.id) ||
        (tache.equipe_detail ? [(tache.equipe_detail as any).id] : [])
    );

    // Équipes disponibles (non encore assignées)
    const availableEquipes = equipesDisponibles.filter(e => !assignedEquipeIds.has(e.id));

    // ✅ SIMPLIFIÉ: Plus de EN_RETARD ni EXPIREE
    const hasEquipe = (tache.equipes_detail?.length ?? 0) > 0 || !!tache.equipe_detail;

    // Calcul de la progression des distributions
    const distributions = tache.distributions_charge || [];
    const totalDistributions = distributions.length;
    const distributionsRealisees = distributions.filter(d => d.status === 'REALISEE').length;
    const distributionsEnCours = distributions.filter(d => d.status === 'EN_COURS').length;
    const progressPercent = totalDistributions > 0
        ? Math.round((distributionsRealisees / totalDistributions) * 100)
        : 0;

    // Déterminer l'état contextuel pour les styles
    const taskState = {
        isCompleted: tache.statut === 'TERMINEE',
        isValidated: tache.etat_validation === 'VALIDEE',
        isRejected: tache.etat_validation === 'REJETEE',
        isCancelled: tache.statut === 'ANNULEE',
        isInProgress: tache.statut === 'EN_COURS',
        isPlanned: tache.statut === 'PLANIFIEE',
        needsAttention: !hasEquipe && tache.statut === 'PLANIFIEE',
    };

    // Couleur de bordure contextuelle pour le header
    const headerBorderColor = taskState.isValidated
        ? 'border-l-emerald-500'
        : taskState.isRejected
            ? 'border-l-red-500'
            : taskState.isCancelled
                ? 'border-l-slate-400'
                : taskState.isInProgress
                    ? 'border-l-blue-500'
                    : taskState.needsAttention
                        ? 'border-l-amber-500'
                        : 'border-l-transparent';

    // Rendu des tabs (partagé entre header desktop et sticky mobile)
    const renderTabs = () => (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'info'
                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
                Infos
            </button>
            <button
                onClick={() => setActiveTab('photos')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'photos'
                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
                <Camera className="w-4 h-4" />
                Photos
                {photos.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === 'photos' ? 'bg-slate-100' : 'bg-slate-200'
                    }`}>{photos.length}</span>
                )}
            </button>
            <button
                onClick={() => setActiveTab('produits')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'produits'
                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
                <Package className="w-4 h-4" />
                Produits
                {consommations.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === 'produits' ? 'bg-slate-100' : 'bg-slate-200'
                    }`}>{consommations.length}</span>
                )}
            </button>
        </div>
    );

    return (
        <div className="w-full lg:w-[500px] xl:w-[600px] h-full bg-white border-l border-slate-200 flex flex-col">
            {/* ═══ Header fixe — DESKTOP UNIQUEMENT ═══ */}
            <div className={`hidden lg:block shrink-0 bg-white border-b border-slate-100 border-l-4 ${headerBorderColor}`}>
                <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-slate-800 leading-tight truncate" title={tache.type_tache_detail?.nom_tache}>
                                {tache.type_tache_detail?.nom_tache || 'Tâche sans nom'}
                            </h2>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                    {tache.reference || `#${tache.id}`}
                                </span>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUT_TACHE_COLORS[tache.statut]?.bg || 'bg-slate-100'} ${STATUT_TACHE_COLORS[tache.statut]?.text || 'text-slate-700'}`}>
                                    {STATUT_TACHE_LABELS[tache.statut] || tache.statut}
                                </span>
                                {tache.statut === 'TERMINEE' && (
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${ETAT_VALIDATION_COLORS[tache.etat_validation]?.bg} ${ETAT_VALIDATION_COLORS[tache.etat_validation]?.text}`}>
                                        <ShieldCheck className="w-3 h-3" />
                                        {ETAT_VALIDATION_LABELS[tache.etat_validation]}
                                    </span>
                                )}
                                {taskState.needsAttention && (
                                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1 animate-pulse">
                                        <AlertCircle className="w-3 h-3" />
                                        Sans équipe
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Fermer le panneau"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Progression desktop */}
                {totalDistributions > 0 && (
                    <div className="px-4 pb-3">
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Progression
                            </span>
                            <span className="font-medium">
                                {distributionsRealisees}/{totalDistributions} distribution{totalDistributions > 1 ? 's' : ''}
                                {distributionsEnCours > 0 && (
                                    <span className="text-blue-600 ml-1">({distributionsEnCours} en cours)</span>
                                )}
                            </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? 'bg-emerald-500' : progressPercent > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Actions desktop */}
                {!isClientView && (
                    <div className="px-4 pb-3">
                        <ActionButtons
                            tache={tache} isAdmin={isAdmin} hasEquipe={hasEquipe}
                            changingStatut={changingStatut} loadingTypesTaches={loadingTypesTaches}
                            onEdit={onEdit} onDelete={onDelete} onStartTask={onStartTask}
                            onCompleteTask={onCompleteTask} onCancelTask={onCancelTask} onValidate={onValidate}
                        />
                    </div>
                )}

                {/* Tabs desktop */}
                <div className="px-4 pb-3">
                    {renderTabs()}
                </div>
            </div>

            {/* ═══ Zone scrollable ═══ */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {/* ── MOBILE: tout dans le scroll ── */}
                <div className="lg:hidden">
                    {/* Retour + titre mobile */}
                    <div className={`px-4 pt-3 pb-2 border-l-4 ${headerBorderColor}`}>
                        <button
                            onClick={onClose}
                            className="text-slate-500 mb-1.5 flex items-center gap-1 text-sm hover:text-slate-700 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" /> Retour à la liste
                        </button>
                        <h2 className="text-lg font-bold text-slate-800 leading-tight">
                            {tache.type_tache_detail?.nom_tache || 'Tâche sans nom'}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                {tache.reference || `#${tache.id}`}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUT_TACHE_COLORS[tache.statut]?.bg || 'bg-slate-100'} ${STATUT_TACHE_COLORS[tache.statut]?.text || 'text-slate-700'}`}>
                                {STATUT_TACHE_LABELS[tache.statut] || tache.statut}
                            </span>
                            {tache.statut === 'TERMINEE' && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${ETAT_VALIDATION_COLORS[tache.etat_validation]?.bg} ${ETAT_VALIDATION_COLORS[tache.etat_validation]?.text}`}>
                                    <ShieldCheck className="w-3 h-3" />
                                    {ETAT_VALIDATION_LABELS[tache.etat_validation]}
                                </span>
                            )}
                            {taskState.needsAttention && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Sans équipe
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Progression mobile */}
                    {totalDistributions > 0 && (
                        <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100">
                            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {distributionsRealisees}/{totalDistributions}
                                </span>
                                {distributionsEnCours > 0 && (
                                    <span className="text-blue-600 text-xs font-medium">
                                        {distributionsEnCours} en cours
                                    </span>
                                )}
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? 'bg-emerald-500' : progressPercent > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions mobile */}
                    {!isClientView && (
                        <div className="px-4 py-2 border-b border-slate-100">
                            <ActionButtons
                                tache={tache} isAdmin={isAdmin} hasEquipe={hasEquipe}
                                changingStatut={changingStatut} loadingTypesTaches={loadingTypesTaches}
                                onEdit={onEdit} onDelete={onDelete} onStartTask={onStartTask}
                                onCompleteTask={onCompleteTask} onCancelTask={onCancelTask} onValidate={onValidate}
                            />
                        </div>
                    )}

                    {/* Tabs mobile — sticky dans le scroll */}
                    <div className="sticky top-0 z-10 bg-white px-3 py-2 border-b border-slate-100 shadow-sm">
                        {renderTabs()}
                    </div>
                </div>

                {/* Contenu de l'onglet */}
                <div className="p-4">
                    {activeTab === 'info' && (
                        <div className="animate-tab-fade-in">
                            <TaskInfoTab
                                tache={tache}
                                photos={photos}
                                isClientView={isClientView}
                                availableEquipes={availableEquipes}
                                assigningEquipe={assigningEquipe}
                                onToggleDistribution={onToggleDistribution}
                                onEditDistribution={onEditDistribution}
                                onDeleteDistribution={onDeleteDistribution}
                                onAddDistributions={onAddDistributions}
                                onDemarrerDistribution={onDemarrerDistribution}
                                onTerminerDistribution={onTerminerDistribution}
                                onReporterDistribution={onReporterDistribution}
                                onAnnulerDistribution={onAnnulerDistribution}
                                onRestaurerDistribution={onRestaurerDistribution}
                                onHistoriqueDistribution={onHistoriqueDistribution}
                                onShowPhotos={() => setActiveTab('photos')}
                                onAssignEquipe={onAssignEquipe}
                                onRemoveEquipe={onRemoveEquipe}
                            />
                        </div>
                    )}

                    {activeTab === 'photos' && (
                        <div className="animate-tab-fade-in">
                            <TaskPhotosTab
                                tache={tache}
                                photos={photos}
                                loading={loadingPhotos}
                                uploading={uploadingPhoto}
                                isClientView={isClientView}
                                onUpload={onPhotoUpload}
                                onDelete={onPhotoDelete}
                            />
                        </div>
                    )}

                    {activeTab === 'produits' && (
                        <div className="animate-tab-fade-in">
                            <TaskProduitsTab
                                tache={tache}
                                consommations={consommations}
                                produitsOptions={produitsOptions}
                                loading={loadingConsommations}
                                isClientView={isClientView}
                                onAdd={onConsommationAdd}
                                onDelete={onConsommationDelete}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Action Buttons Sub-component
// ✅ SIMPLIFIÉ: Plus de isLate ni isExpired
interface ActionButtonsProps {
    tache: Tache;
    isAdmin: boolean;
    hasEquipe: boolean;
    changingStatut: boolean;
    loadingTypesTaches: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onStartTask: () => void;
    onCompleteTask: () => void;
    onCancelTask: () => void;
    onValidate: (type: 'VALIDEE' | 'REJETEE') => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
    tache,
    isAdmin,
    hasEquipe,
    changingStatut,
    loadingTypesTaches,
    onEdit,
    onDelete,
    onStartTask,
    onCompleteTask,
    onCancelTask,
    onValidate,
}) => {
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Fermer le menu quand on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMoreMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const nbEquipes = tache.equipes_detail?.length || (tache.equipe_detail ? 1 : 0);
    const nbObjets = tache.objets_detail?.length || 0;
    const distributions = tache.distributions_charge || [];
    const nbDistributions = distributions.length;
    const distributionsRealisees = distributions.filter(d => d.status === 'REALISEE').length;
    const distributionsNonRealisees = distributions.filter(d => d.status === 'NON_REALISEE').length;
    const distributionsEnCours = distributions.filter(d => d.status === 'EN_COURS').length;

    // Vérifier si la tâche EN_COURS a du travail effectif (distributions réalisées)
    const hasWorkDone = distributionsRealisees > 0;

    // Vérifier si la date de début est dans le futur
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateDebut = new Date(tache.date_debut_planifiee);
    dateDebut.setHours(0, 0, 0, 0);
    const isStartDateInFuture = dateDebut > today;
    const daysUntilStart = Math.ceil((dateDebut.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // ══════════════════════════════════════════════════════════════════════════
    // MATRICE DES ACTIONS PAR STATUT
    // ══════════════════════════════════════════════════════════════════════════
    const canEdit = tache.statut === 'PLANIFIEE' || (tache.statut === 'EN_COURS' && !hasWorkDone);
    const canDelete = ['PLANIFIEE', 'ANNULEE'].includes(tache.statut);
    const canStart = tache.statut === 'PLANIFIEE' ||
                     (tache.statut === 'EN_COURS' && distributionsNonRealisees > 0 && distributionsEnCours === 0);
    const canComplete = tache.statut === 'EN_COURS' && distributionsEnCours > 0;
    const canCancel = ['PLANIFIEE', 'EN_COURS'].includes(tache.statut);
    const canReschedule = ['ANNULEE', 'REJETEE'].includes(tache.statut) || (tache.statut === 'EN_COURS' && !hasWorkDone);
    const canValidate = isAdmin && tache.statut === 'TERMINEE' && tache.etat_validation === 'EN_ATTENTE';

    const isStartingNext = tache.statut === 'EN_COURS';
    const startBlockedReason = !hasEquipe ? 'no_team' : isStartDateInFuture ? 'future_date' : null;

    // Déterminer quelles actions vont dans le menu "Plus"
    const hasSecondaryActions = canEdit || canDelete || canCancel || (canReschedule && !canEdit);
    const hasPrimaryActions = canStart || canComplete || canValidate || (canReschedule && !canEdit && !canCancel);

    return (
        <div className="flex items-center gap-2">
            {/* ══════════════════════════════════════════════════════════════════
                ACTIONS PRIMAIRES (toujours visibles)
            ══════════════════════════════════════════════════════════════════ */}

            {/* REPLANIFIER - Action principale pour ANNULEE/REJETEE */}
            {canReschedule && !canEdit && (
                <button
                    onClick={onEdit}
                    disabled={loadingTypesTaches}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                    title={
                        tache.statut === 'ANNULEE' ? "Réactiver et replanifier la tâche" :
                        tache.statut === 'REJETEE' ? "Corriger et replanifier après rejet" :
                        "Replanifier la tâche"
                    }
                >
                    {loadingTypesTaches ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    )}
                    Replanifier
                </button>
            )}

            {/* DÉMARRER */}
            {canStart && (
                <button
                    onClick={onStartTask}
                    disabled={changingStatut || !!startBlockedReason}
                    title={
                        startBlockedReason === 'no_team'
                            ? 'Veuillez assigner une équipe avant de démarrer'
                            : startBlockedReason === 'future_date'
                                ? `Démarrage possible à partir du ${new Date(tache.date_debut_planifiee).toLocaleDateString('fr-FR')} (dans ${daysUntilStart} jour${daysUntilStart > 1 ? 's' : ''})`
                                : isStartingNext
                                    ? `Démarrer la prochaine distribution (${distributionsNonRealisees} restante${distributionsNonRealisees > 1 ? 's' : ''})`
                                    : `Démarrer la tâche - ${nbEquipes} équipe(s)${nbObjets > 0 ? ` - ${nbObjets} objet(s)` : ''}`
                    }
                    className={`group flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed ${
                        startBlockedReason === 'no_team'
                            ? 'bg-slate-400 opacity-60'
                            : startBlockedReason === 'future_date'
                                ? 'bg-slate-400 hover:bg-slate-500'
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transform hover:scale-[1.02]'
                    }`}
                >
                    {changingStatut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Play className={`w-4 h-4 ${!startBlockedReason ? 'group-hover:translate-x-0.5 transition-transform' : ''}`} />
                    )}
                    {startBlockedReason === 'future_date'
                        ? `Le ${new Date(tache.date_debut_planifiee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                        : isStartingNext
                            ? `Continuer (${distributionsNonRealisees})`
                            : 'Démarrer'}
                </button>
            )}

            {/* TERMINER */}
            {canComplete && (
                <button
                    onClick={onCompleteTask}
                    disabled={changingStatut || !hasEquipe}
                    title={
                        !hasEquipe
                            ? 'Impossible de terminer sans équipe assignée'
                            : `Terminer la distribution en cours (${distributionsRealisees}/${nbDistributions} réalisée${distributionsRealisees > 1 ? 's' : ''})`
                    }
                    className={`group flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed ${
                        !hasEquipe
                            ? 'bg-slate-400 opacity-60'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-200 transform hover:scale-[1.02]'
                    }`}
                >
                    {changingStatut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCircle className={`w-4 h-4 ${hasEquipe ? 'group-hover:scale-110 transition-transform' : ''}`} />
                    )}
                    Terminer
                </button>
            )}

            {/* VALIDER / REJETER - Admin avec animation pulse */}
            {canValidate && (
                <div className="flex items-center gap-2 animate-pulse-slow">
                    <button
                        onClick={() => onValidate('VALIDEE')}
                        title="Valider la tâche"
                        className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 text-sm font-semibold shadow-md hover:shadow-lg hover:shadow-emerald-200 transition-all duration-200 transform hover:scale-[1.02]"
                    >
                        <ThumbsUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Valider
                    </button>
                    <button
                        onClick={() => onValidate('REJETEE')}
                        title="Rejeter la tâche"
                        className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 text-sm font-semibold shadow-md hover:shadow-lg hover:shadow-red-200 transition-all duration-200 transform hover:scale-[1.02]"
                    >
                        <ThumbsDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Rejeter
                    </button>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MENU SECONDAIRE (⋮)
            ══════════════════════════════════════════════════════════════════ */}
            {hasSecondaryActions && (
                <div className="relative" ref={moreMenuRef}>
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                        title="Plus d'actions"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {showMoreMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-[100] py-1 overflow-hidden">
                            {/* MODIFIER */}
                            {canEdit && (
                                <button
                                    onClick={() => {
                                        onEdit();
                                        setShowMoreMenu(false);
                                    }}
                                    disabled={loadingTypesTaches}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                >
                                    {loadingTypesTaches ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                    ) : (
                                        <Pencil className="w-4 h-4 text-slate-400" />
                                    )}
                                    Modifier
                                </button>
                            )}

                            {/* ANNULER */}
                            {canCancel && (
                                <button
                                    onClick={() => {
                                        onCancelTask();
                                        setShowMoreMenu(false);
                                    }}
                                    disabled={changingStatut}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                                >
                                    {changingStatut ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <XCircle className="w-4 h-4" />
                                    )}
                                    {tache.statut === 'EN_COURS' ? 'Abandonner' : 'Annuler'}
                                </button>
                            )}

                            {/* Séparateur avant suppression */}
                            {canDelete && (canEdit || canCancel) && (
                                <div className="my-1 border-t border-slate-100" />
                            )}

                            {/* SUPPRIMER */}
                            {canDelete && (
                                <button
                                    onClick={() => {
                                        onDelete();
                                        setShowMoreMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Supprimer
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Info Tab Sub-component
interface TaskInfoTabProps {
    tache: Tache;
    photos: PhotoList[];
    isClientView: boolean;
    availableEquipes: EquipeList[];
    assigningEquipe: boolean;
    onToggleDistribution: (distributionId: number, currentStatus: StatusDistribution) => void;
    onEditDistribution: (distributionId: number) => void;
    onDeleteDistribution: (distributionId: number) => void;
    onAddDistributions: () => void;
    // Nouvelles actions de distribution
    onDemarrerDistribution?: (distributionId: number) => void;
    onTerminerDistribution?: (distributionId: number) => void;
    onReporterDistribution?: (distributionId: number) => void;
    onAnnulerDistribution?: (distributionId: number) => void;
    onRestaurerDistribution?: (distributionId: number) => void;
    onHistoriqueDistribution?: (distributionId: number) => void;
    onShowPhotos: () => void;
    onAssignEquipe: (equipeId: number) => void;
    onRemoveEquipe: (equipeId: number) => void;
}

const TaskInfoTab: React.FC<TaskInfoTabProps> = ({
    tache,
    photos,
    isClientView,
    availableEquipes,
    assigningEquipe,
    onToggleDistribution,
    onEditDistribution,
    onDeleteDistribution,
    onAddDistributions,
    onDemarrerDistribution,
    onTerminerDistribution,
    onReporterDistribution,
    onAnnulerDistribution,
    onRestaurerDistribution,
    onHistoriqueDistribution,
    onShowPhotos,
    onAssignEquipe,
    onRemoveEquipe,
}) => {
    const [showEquipeDropdown, setShowEquipeDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fermer le dropdown quand on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowEquipeDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (
        <div className="space-y-4">
            {/* Localisation */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors hover:border-slate-200 transition-colors">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Localisation
                </h3>

                {/* Organisation */}
                {tache.structure_client_detail && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-800">
                            {tache.structure_client_detail.nom}
                        </span>
                    </div>
                )}

                {/* Sites */}
                {tache.objets_detail && tache.objets_detail.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                        <span className="font-medium text-slate-800">
                            {tache.objets_detail[0]?.site_nom || `Site #${tache.objets_detail[0]?.site}`}
                        </span>
                        <span className="text-slate-500 text-xs">
                            ({tache.objets_detail.length} objet{tache.objets_detail.length > 1 ? 's' : ''})
                        </span>
                    </div>
                ) : tache.site_nom ? (
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                        <span className="font-medium text-slate-800">{tache.site_nom}</span>
                        <span className="text-slate-500 text-xs">(via réclamation)</span>
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 italic">Aucun objet d'inventaire associé</p>
                )}
            </div>

            {/* Objets concernés */}
            {tache.objets_detail && tache.objets_detail.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-emerald-600" />
                            Objets concernés
                        </span>
                        <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                            {tache.objets_detail.length}
                        </span>
                    </h3>
                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                        {tache.objets_detail.map((obj, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-slate-200"
                            >
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                    <Package className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                        {obj.nom_type || obj.display || `Objet #${obj.id}`}
                                    </p>
                                    <p className="text-xs text-slate-500">ID: {obj.id}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Dates */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Planning
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span className="text-slate-500">Début prévu</span>
                        <p className="font-medium text-slate-800">
                            {new Date(tache.date_debut_planifiee).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                    <div>
                        <span className="text-slate-500">Fin prévue</span>
                        <p className="font-medium text-slate-800">
                            {new Date(tache.date_fin_planifiee).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                    {tache.date_debut_reelle && (
                        <div>
                            <span className="text-emerald-600">Début réel</span>
                            <p className="font-medium text-slate-800">
                                {new Date(tache.date_debut_reelle).toLocaleDateString('fr-FR')}
                            </p>
                        </div>
                    )}
                    {tache.date_fin_reelle && (
                        <div>
                            <span className="text-blue-600">Fin réelle</span>
                            <p className="font-medium text-slate-800">
                                {new Date(tache.date_fin_reelle).toLocaleDateString('fr-FR')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Distribution de charge */}
            <DistributionsList
                tache={tache}
                isClientView={isClientView}
                onToggleDistribution={onToggleDistribution}
                onEditDistribution={onEditDistribution}
                onDeleteDistribution={onDeleteDistribution}
                onAddDistributions={onAddDistributions}
                onDemarrer={onDemarrerDistribution}
                onTerminer={onTerminerDistribution}
                onReporter={onReporterDistribution}
                onAnnuler={onAnnulerDistribution}
                onRestaurer={onRestaurerDistribution}
                onHistorique={onHistoriqueDistribution}
            />

            {/* Équipes assignées */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        Équipes assignées
                    </h3>
                    {/* Bouton + pour ajouter une équipe */}
                    {!isClientView && availableEquipes.length > 0 && (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowEquipeDropdown(!showEquipeDropdown)}
                                disabled={assigningEquipe}
                                className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                                title="Assigner une équipe"
                            >
                                {assigningEquipe ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4" />
                                )}
                            </button>

                            {/* Dropdown de sélection */}
                            {showEquipeDropdown && (
                                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1 max-h-48 overflow-y-auto">
                                    {availableEquipes.map(equipe => (
                                        <button
                                            key={equipe.id}
                                            onClick={() => {
                                                onAssignEquipe(equipe.id);
                                                setShowEquipeDropdown(false);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                <Users className="w-3 h-3 text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate">
                                                    {equipe.nomEquipe}
                                                </p>
                                                {equipe.sitePrincipalNom && (
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {equipe.sitePrincipalNom}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {(tache.equipes_detail && tache.equipes_detail.length > 0) ? (
                    <div className="space-y-2">
                        {tache.equipes_detail.map((equipe: any) => (
                            <div key={equipe.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 group">
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
                                {/* Bouton supprimer (visible au hover, seulement pour admin/superviseur) */}
                                {!isClientView && (
                                    <button
                                        onClick={() => onRemoveEquipe(equipe.id)}
                                        disabled={assigningEquipe}
                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                        title="Retirer cette équipe"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : tache.equipe_detail ? (
                    <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 group">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-800 flex-1">
                            {(tache.equipe_detail as any).nom_equipe || tache.equipe_detail.nomEquipe}
                        </p>
                        {!isClientView && (
                            <button
                                onClick={() => onRemoveEquipe((tache.equipe_detail as any).id)}
                                disabled={assigningEquipe}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                title="Retirer cette équipe"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 italic">Aucune équipe assignée</p>
                )}
            </div>

            {/* Description */}
            {tache.description_travaux && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
                    <p className="text-sm text-slate-600">{tache.description_travaux}</p>
                </div>
            )}

            {/* Réclamation liée */}
            {tache.reclamation_numero && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-semibold text-orange-800 text-sm">Lié à une réclamation</h4>
                        <p className="text-sm text-orange-700">#{tache.reclamation_numero}</p>
                    </div>
                </div>
            )}

            {/* Photos preview */}
            {photos.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
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
                            onClick={onShowPhotos}
                            className="mt-2 text-sm text-emerald-600 hover:underline"
                        >
                            Voir toutes les photos
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskDetailPanel;
