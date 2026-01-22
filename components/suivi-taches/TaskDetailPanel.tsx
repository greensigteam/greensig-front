import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronRight, Play, CheckCircle, XCircle, ThumbsUp, ThumbsDown,
    ShieldCheck, RefreshCw, Pencil, Trash2, Camera, Package,
    Loader2, Calendar, MapPin, Building2, Users, AlertCircle, Plus, X
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

    const isLate = tache.statut === 'EN_RETARD';
    const isExpired = tache.statut === 'EXPIREE';
    const hasEquipe = (tache.equipes_detail?.length ?? 0) > 0 || !!tache.equipe_detail;

    return (
        <div className="w-full lg:w-[500px] xl:w-[600px] bg-white border-l border-slate-200 flex flex-col overflow-hidden min-h-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 shrink-0">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <button
                            onClick={onClose}
                            className="lg:hidden text-slate-500 mb-2 flex items-center gap-1 text-sm"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" /> Retour
                        </button>
                        <h2 className="text-lg font-bold text-slate-800 truncate">
                            {tache.type_tache_detail?.nom_tache}
                        </h2>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                                className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600"
                                title="Identifiant unique de la tâche"
                            >
                                {tache.reference || `#${tache.id}`}
                            </span>
                            <span
                                className={`text-xs px-2 py-0.5 rounded font-medium ${STATUT_TACHE_COLORS[tache.statut]?.bg} ${STATUT_TACHE_COLORS[tache.statut]?.text}`}
                                title={`Statut: ${STATUT_TACHE_LABELS[tache.statut]}`}
                            >
                                {tache.statut}
                            </span>
                            {tache.statut === 'TERMINEE' && (
                                <span
                                    className={`text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 ${ETAT_VALIDATION_COLORS[tache.etat_validation]?.bg} ${ETAT_VALIDATION_COLORS[tache.etat_validation]?.text}`}
                                    title={`Validation: ${ETAT_VALIDATION_LABELS[tache.etat_validation]}`}
                                >
                                    <ShieldCheck className="w-3 h-3" />
                                    {ETAT_VALIDATION_LABELS[tache.etat_validation]}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {!isClientView && (
                        <ActionButtons
                            tache={tache}
                            isAdmin={isAdmin}
                            hasEquipe={hasEquipe}
                            isLate={isLate}
                            isExpired={isExpired}
                            changingStatut={changingStatut}
                            loadingTypesTaches={loadingTypesTaches}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onStartTask={onStartTask}
                            onCompleteTask={onCompleteTask}
                            onCancelTask={onCancelTask}
                            onValidate={onValidate}
                        />
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'info'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Informations
                    </button>
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'photos'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Camera className="w-4 h-4" /> Photos ({photos.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('produits')}
                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'produits'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Package className="w-4 h-4" /> Produits ({consommations.length})
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {activeTab === 'info' && (
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
                        onShowPhotos={() => setActiveTab('photos')}
                        onAssignEquipe={onAssignEquipe}
                        onRemoveEquipe={onRemoveEquipe}
                    />
                )}

                {activeTab === 'photos' && (
                    <TaskPhotosTab
                        tache={tache}
                        photos={photos}
                        loading={loadingPhotos}
                        uploading={uploadingPhoto}
                        isClientView={isClientView}
                        onUpload={onPhotoUpload}
                        onDelete={onPhotoDelete}
                    />
                )}

                {activeTab === 'produits' && (
                    <TaskProduitsTab
                        tache={tache}
                        consommations={consommations}
                        produitsOptions={produitsOptions}
                        loading={loadingConsommations}
                        isClientView={isClientView}
                        onAdd={onConsommationAdd}
                        onDelete={onConsommationDelete}
                    />
                )}
            </div>
        </div>
    );
};

// Action Buttons Sub-component
interface ActionButtonsProps {
    tache: Tache;
    isAdmin: boolean;
    hasEquipe: boolean;
    isLate: boolean;
    isExpired: boolean;
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
    isLate,
    isExpired,
    changingStatut,
    loadingTypesTaches,
    onEdit,
    onDelete,
    onStartTask,
    onCompleteTask,
    onCancelTask,
    onValidate,
}) => {
    const nbEquipes = tache.equipes_detail?.length || (tache.equipe_detail ? 1 : 0);
    const nbObjets = tache.objets_detail?.length || 0;
    const nbDistributions = tache.distributions_charge?.length || 0;
    const distributionsRealisees = tache.distributions_charge?.filter(d => d.status === 'REALISEE').length || 0;

    // ✅ Vérifier si la tâche EN_COURS a du travail effectif (distributions réalisées)
    const hasWorkDone = distributionsRealisees > 0;

    // ✅ Vérifier si la date de début est dans le futur (ne peut pas démarrer avant)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateDebut = new Date(tache.date_debut_planifiee);
    dateDebut.setHours(0, 0, 0, 0);
    const isStartDateInFuture = dateDebut > today;

    // Calculer le nombre de jours restants avant le démarrage autorisé
    const daysUntilStart = Math.ceil((dateDebut.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // ══════════════════════════════════════════════════════════════════════════
    // MATRICE DES ACTIONS PAR STATUT (conventions standard)
    // ══════════════════════════════════════════════════════════════════════════
    // PLANIFIEE    : Modifier, Supprimer, Démarrer*, Annuler  (*si date atteinte)
    // EN_RETARD    : Modifier, Supprimer, Démarrer, Annuler
    // EXPIREE      : Replanifier, Annuler
    // ANNULEE      : Replanifier, Supprimer
    // EN_COURS     : Terminer, Annuler + (Modifier/Replanifier si aucun travail)
    // TERMINEE     : Valider/Rejeter (Admin)
    // VALIDEE      : Aucune action
    // REJETEE      : Replanifier
    // ══════════════════════════════════════════════════════════════════════════

    const canEdit = ['PLANIFIEE', 'EN_RETARD'].includes(tache.statut) ||
                    (tache.statut === 'EN_COURS' && !hasWorkDone);
    const canDelete = ['PLANIFIEE', 'EN_RETARD', 'ANNULEE'].includes(tache.statut);
    const canStart = ['PLANIFIEE', 'EN_RETARD'].includes(tache.statut);
    const canComplete = tache.statut === 'EN_COURS';
    const canCancel = ['PLANIFIEE', 'EN_RETARD', 'EXPIREE', 'EN_COURS'].includes(tache.statut);
    const canReschedule = ['EXPIREE', 'ANNULEE', 'REJETEE'].includes(tache.statut) ||
                          (tache.statut === 'EN_COURS' && !hasWorkDone);
    const canValidate = isAdmin && tache.statut === 'TERMINEE' && tache.etat_validation === 'EN_ATTENTE';

    // ✅ Raison du blocage du démarrage (priorité: équipe > date future)
    const startBlockedReason = !hasEquipe
        ? 'no_team'
        : isStartDateInFuture
            ? 'future_date'
            : null;

    return (
        <div className="flex gap-2 shrink-0 flex-wrap">
            {/* ══════════════════════════════════════════════════════════════════
                MODIFIER - PLANIFIEE, EN_RETARD, EN_COURS (sans travail)
            ══════════════════════════════════════════════════════════════════ */}
            {canEdit && (
                <button
                    onClick={onEdit}
                    disabled={loadingTypesTaches}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    title={tache.statut === 'EN_COURS' ? "Modifier (aucun travail effectué)" : "Modifier la tâche"}
                >
                    {loadingTypesTaches ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                    Modifier
                </button>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                REPLANIFIER - EXPIREE, ANNULEE, REJETEE, EN_COURS (sans travail)
            ══════════════════════════════════════════════════════════════════ */}
            {canReschedule && !canEdit && (
                <button
                    onClick={onEdit}
                    disabled={loadingTypesTaches}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 bg-amber-100 text-amber-700 hover:bg-amber-200"
                    title={
                        tache.statut === 'ANNULEE' ? "Réactiver et replanifier la tâche" :
                        tache.statut === 'REJETEE' ? "Corriger et replanifier après rejet" :
                        "Replanifier la tâche"
                    }
                >
                    {loadingTypesTaches ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Replanifier
                </button>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                DÉMARRER - PLANIFIEE, EN_RETARD
                Bloqué si: pas d'équipe OU date de début dans le futur
            ══════════════════════════════════════════════════════════════════ */}
            {canStart && (
                <button
                    onClick={onStartTask}
                    disabled={changingStatut || !!startBlockedReason}
                    title={
                        startBlockedReason === 'no_team'
                            ? '❌ Veuillez assigner une équipe avant de démarrer'
                            : startBlockedReason === 'future_date'
                                ? `⏳ Démarrage possible à partir du ${new Date(tache.date_debut_planifiee).toLocaleDateString('fr-FR')}\n(dans ${daysUntilStart} jour${daysUntilStart > 1 ? 's' : ''})`
                                : isLate
                                    ? `⚠️ Démarrer en retard (sera tracé)\n${nbEquipes} équipe(s)`
                                    : `▶ Démarrer la tâche\n${nbEquipes} équipe(s)${nbObjets > 0 ? ` • ${nbObjets} objet(s)` : ''}`
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        startBlockedReason === 'future_date'
                            ? 'bg-slate-400'
                            : isLate
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                    {changingStatut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {startBlockedReason === 'future_date'
                        ? `Démarrage le ${new Date(tache.date_debut_planifiee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                        : isLate
                            ? 'Démarrer (en retard)'
                            : 'Démarrer'}
                </button>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TERMINER - EN_COURS
                Bloqué si: pas d'équipe assignée
            ══════════════════════════════════════════════════════════════════ */}
            {canComplete && (
                <button
                    onClick={onCompleteTask}
                    disabled={changingStatut || !hasEquipe}
                    title={
                        !hasEquipe
                            ? '❌ Impossible de terminer sans équipe assignée'
                            : nbDistributions > 0
                                ? `✅ Terminer (${distributionsRealisees}/${nbDistributions} distribution(s) réalisée(s))`
                                : '✅ Terminer la tâche'
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        !hasEquipe ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {changingStatut ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Terminer
                </button>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                ANNULER - PLANIFIEE, EN_RETARD, EXPIREE, EN_COURS
            ══════════════════════════════════════════════════════════════════ */}
            {canCancel && (
                <button
                    onClick={onCancelTask}
                    disabled={changingStatut}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 text-sm disabled:opacity-50"
                    title={
                        tache.statut === 'EN_COURS'
                            ? "Abandonner la tâche en cours"
                            : "Annuler la tâche"
                    }
                >
                    {changingStatut ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Annuler
                </button>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SUPPRIMER - PLANIFIEE, EN_RETARD, ANNULEE
            ══════════════════════════════════════════════════════════════════ */}
            {canDelete && (
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm"
                    title={
                        tache.statut === 'ANNULEE'
                            ? "Supprimer définitivement la tâche annulée"
                            : "Supprimer la tâche"
                    }
                >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                </button>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                VALIDER / REJETER - TERMINEE + EN_ATTENTE (Admin only)
            ══════════════════════════════════════════════════════════════════ */}
            {canValidate && (
                <>
                    <button
                        onClick={() => onValidate('VALIDEE')}
                        title="Valider la tâche"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                    >
                        <ThumbsUp className="w-4 h-4" />
                        Valider
                    </button>
                    <button
                        onClick={() => onValidate('REJETEE')}
                        title="Rejeter la tâche"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                        <ThumbsDown className="w-4 h-4" />
                        Rejeter
                    </button>
                </>
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
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
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
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
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
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
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
            />

            {/* Équipes assignées */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
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
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
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
