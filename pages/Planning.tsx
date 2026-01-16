import { useState, useEffect, useMemo, useCallback, memo, useRef, type FC } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import {
    format, parse, startOfWeek, getDay, endOfWeek,
    addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import {
    Users, Clock, X, Trash2, Edit, Timer, AlertTriangle, Download, Calendar as CalendarIcon, List,
    ChevronLeft, ChevronRight, CheckCircle2, MoreVertical, CornerUpLeft, ChevronDown,
    Calendar, Filter
} from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import { planningService } from '../services/planningService';
import { fetchEquipes, fetchStructures } from '../services/usersApi';
import { fetchCurrentUser, fetchAllSites, SiteFrontend } from '../services/api';
import {
    Tache, TacheCreate, TacheUpdate, TypeTache,
    STATUT_TACHE_LABELS, STATUT_TACHE_COLORS,
    PRIORITE_LABELS,
    STATUS_DISTRIBUTION_LABELS, STATUS_DISTRIBUTION_COLORS,
    type StatusDistribution, type DistributionCharge,
    PlanningFilters, EMPTY_PLANNING_FILTERS
} from '../types/planning';
import { EquipeList, StructureClient } from '../types/users';
import { usePermissions } from '../hooks/usePermissions';
import type { User, Role, SearchSuggestion } from '../types';
import TaskFormModal, { InventoryObjectOption } from '../components/planning/TaskFormModal';
import QuickTaskCreator from '../components/planning/QuickTaskCreator';
import { StatusBadge } from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';
import { fetchInventory } from '../services/api';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import PlanningFiltersComponent from '../components/planning/PlanningFilters';
import { DistributionEditForm } from '../components/planning/DistributionEditForm';
import {
    FloatingPortal,
    type ReferenceType,
    type VirtualElement,
} from '@floating-ui/react';

// ============================================================================
// STYLES CUSTOM (Google Tasks Look & Feel)
// ============================================================================

const customCalendarStyles = `
    /* Animations */
    @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideInLeft { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes genieAppear {
        0% { transform: scale(0); opacity: 0; }
        60% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
    }
    @keyframes checkBurst { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }

    .animate-slide-right .rbc-month-view, .animate-slide-right .rbc-time-view { animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
    .animate-slide-left .rbc-month-view, .animate-slide-left .rbc-time-view { animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
    .animate-popover { animation: genieAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    .animate-check { animation: checkBurst 0.3s ease-out; }

    /* Global RBC Overrides */
    .rbc-calendar { font-family: 'Inter', system-ui, sans-serif; color: #3c4043; }
    .rbc-header { border-bottom: none !important; padding: 12px 0 !important; font-size: 11px; font-weight: 600; color: #70757a; text-transform: uppercase; }
    .rbc-month-view { border: none !important; }
    .rbc-day-bg { border-left: 1px solid #f1f3f4 !important; }
    .rbc-month-row { border-top: 1px solid #f1f3f4 !important; }
    .rbc-off-range-bg { background-color: #fcfcfc !important; }
    .rbc-date-cell { padding: 8px !important; font-size: 12px; font-weight: 500; color: #3c4043; text-align: center; }
    
    /* Aujourd'hui */
    .rbc-today { background-color: transparent !important; }
    .rbc-now .rbc-button-link { background-color: #10b981; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-top: -4px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3); }

    /* Vue Mois - Ajustements pour forcer l'affichage de 1-2 tâches max */
    .rbc-month-view .rbc-row-content {
        overflow: hidden;
    }
    
    .rbc-month-row {
        min-height: 100px !important; /* Donne assez d'espace pour voir la date + 1 tâche + le lien */
    }

    .rbc-event {
        margin-bottom: 2px !important;
    }

    /* Le bouton "Show More" par défaut de RBC */
    .rbc-show-more {
        background-color: #ecfdf5 !important;
        color: #059669 !important;
        font-weight: 600 !important;
        font-size: 11px !important;
        padding: 2px 8px !important;
        border-radius: 6px !important;
        margin-top: 2px !important;
        text-decoration: none !important;
        display: inline-block !important;
        width: auto !important;
    }
    
    .rbc-show-more:hover {
        background-color: #d1fae5 !important;
    }

    /* Popup d'affichage des tâches supplémentaires */
    .rbc-overlay {
        background: white !important;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
        border-radius: 12px !important;
        border: 1px solid #e5e7eb !important;
        padding: 12px !important;
        z-index: 1000 !important;
        min-width: 250px !important;
    }

    /* Événements Transparents (Le composant TaskEvent gère le visuel) */
    .rbc-event { background-color: transparent !important; padding: 0 !important; border-radius: 0 !important; outline: none !important; box-shadow: none !important; overflow: visible !important; }
    .rbc-event:focus { outline: none !important; }
    .rbc-event-label { display: none !important; } /* Cache l'heure par défaut de RBC */

    /* Time View */
    .rbc-time-header { border-bottom: 1px solid #dadce0 !important; }
    .rbc-time-content { border-top: none !important; }
    .rbc-timeslot-group { border-bottom: 1px solid #f1f3f4 !important; }
    .rbc-time-view { border: none !important; }
    .rbc-day-slot .rbc-time-slot { border-top: 1px solid #f8f9fa !important; }
    .rbc-current-time-indicator { background-color: #ea4335 !important; height: 2px !important; }
`;

// ============================================================================
// CONFIGURATION CALENDRIER
// ============================================================================

const locales = { 'fr': fr };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop<CalendarEvent>(BigCalendar);

interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource: Tache;
    distributionStatus?: StatusDistribution;  // ✅ Statut de la distribution pour ce jour
    distributionId?: number;  // ✅ ID de la distribution pour ce jour
}

// ============================================================================
// COMPOSANT TÂCHE (Google Tasks Style)
// ============================================================================

const TaskEvent = memo(function TaskEvent({ event }: { event: CalendarEvent, title?: string }) {
    const tache = event.resource;
    // Si on a une distribution, on utilise son statut, sinon on utilise le statut de la tâche
    const isCompleted = event.distributionStatus ? event.distributionStatus === 'REALISEE' : tache.statut === 'TERMINEE';
    const isDistributionRealisee = event.distributionStatus === 'REALISEE';
    const isUrgent = tache.priorite === 5;

    // ✅ NOUVEAU: Distinguer tâche simple vs distribution
    const hasDistributions = tache.distributions_charge && tache.distributions_charge.length > 0;
    const isDistribution = event.distributionId !== undefined;
    const distributionCount = tache.distributions_charge?.length || 0;

    return (
        <div
            className={`
                task-event-root group flex items-start gap-2 p-1.5 rounded-lg transition-all duration-200
                border-l-4 relative h-full
                ${isCompleted ? 'opacity-60' : 'hover:bg-gray-50'}
                ${isDistributionRealisee ? 'bg-green-50 border-green-500 shadow-sm' : ''}
                ${isDistribution && !isDistributionRealisee
                    ? 'border-gray-400 border-dashed bg-white'
                    : !isDistribution
                        ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-transparent'
                        : ''
                }
                ${tache.charge_estimee_heures ? 'min-h-[28px]' : ''}
            `}
            style={{ pointerEvents: 'all' }}
        >
            {/* Glyphe (Checkbox) */}
            <div
                className={`
                    mt-0.5 shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors
                    ${isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : `bg-white border-gray-400 group-hover:border-emerald-500 ${isUrgent ? 'border-red-400' : ''}`
                    }
                `}
            >
                {isCompleted && <CheckCircle2 className="w-3 h-3" />}
            </div>

            {/* Contenu Texte */}
            <div className="task-event-content flex flex-col leading-tight min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    {/* ✅ NOUVEAU: Icône distinctive */}
                    {isDistribution ? (
                        <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                    ) : (
                        <CalendarIcon className="w-3 h-3 text-gray-500 shrink-0" />
                    )}

                    <span
                        className={`
                                text-xs font-medium truncate
                                ${isCompleted ? 'line-through text-gray-500' : 'text-gray-700'}
                                ${isUrgent && !isCompleted ? 'text-red-700 font-semibold' : ''}
                            `}
                    >
                        {tache.type_tache_detail.nom_tache}
                    </span>

                    {/* ✅ NOUVEAU: Badge de comptage pour les tâches avec plusieurs distributions */}
                    {hasDistributions && !isDistribution && distributionCount > 1 && (
                        <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-semibold">
                            {distributionCount}j
                        </span>
                    )}
                </div>

                {/* Métadonnées (Heure si pas all-day, ou équipe) */}
                {!isCompleted && (
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-medium">
                            {format(event.start, 'HH:mm')}
                        </span>
                        {tache.equipes_detail?.length > 0 && (
                            <span className="text-[9px] px-1 py-0.5 bg-gray-100 rounded text-gray-500 truncate max-w-[80px]">
                                {tache.equipes_detail.length > 1 ? `${tache.equipes_detail.length} éq.` : ((tache.equipes_detail[0] as any)?.nom_equipe || tache.equipes_detail[0]?.nomEquipe)}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// ============================================================================
// COMPOSANT "MORE" POUR VUE MOIS (Affiche "+X tâche(s)")
// ============================================================================

interface MonthMoreLinkProps {
    count: number;
    onClick: () => void;
}

const MonthMoreLink: React.FC<MonthMoreLinkProps> = memo(({ count, onClick }) => {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className="w-full text-left px-2 py-1.5 mt-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-all flex items-center gap-1.5 border border-transparent hover:border-emerald-200"
        >
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                +{count}
            </span>
            <span>tâche{count > 1 ? 's' : ''}</span>
        </button>
    );
});

// ============================================================================
// POPOVER DETAIL (Google Tasks Card)
// ============================================================================

interface PopoverProps {
    tache: Tache;
    eventStart?: Date;
    eventEnd?: Date;
    distributionStatus?: StatusDistribution;  // ✅ Statut de la distribution pour ce jour
    distributionId?: number;  // ✅ ID de la distribution pour ce jour
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleDistribution?: () => void;  // ✅ Nouveau: toggle du statut de distribution
    onUpdate?: () => void;  // ✅ Nouveau: callback après modification de distribution
    isReadOnly?: boolean;
}

const TaskDetailPopover: FC<PopoverProps> = ({ tache, eventStart, eventEnd, distributionStatus, distributionId, onClose, onEdit, onDelete, onToggleDistribution, onUpdate, isReadOnly }) => {
    const [isEditingDist, setIsEditingDist] = useState(false);
    // Si on a une distribution, on utilise son statut, sinon on utilise le statut de la tâche
    const isCompleted = distributionStatus ? distributionStatus === 'REALISEE' : tache.statut === 'TERMINEE';
    // Vérifier si la tâche a au moins une équipe
    const hasEquipe = (tache.equipes_detail && tache.equipes_detail.length > 0) || tache.equipe_detail;
    // Désactiver le toggle si la tâche est terminée ou si pas d'équipe
    const isDistributionDisabled = isReadOnly || tache.statut === 'TERMINEE' || !hasEquipe;

    // Handle escape key to close popup
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <FloatingPortal>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-[999] animate-in fade-in duration-200"
                onClick={onClose}
            />
            {/* Centered Modal */}
            <div
                className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none"
            >
                <div
                    className="w-[550px] max-w-full min-h-[400px] bg-white rounded-xl shadow-2xl border border-gray-100 animate-popover flex flex-col overflow-hidden pointer-events-auto relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Actions */}
                    <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-50">
                        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1">
                            {!isReadOnly && (
                                <>
                                    <button
                                        onClick={() => {
                                            if (distributionId) {
                                                setIsEditingDist(!isEditingDist);
                                            } else {
                                                onEdit();
                                            }
                                        }}
                                        className={`p-2 rounded-full transition-colors ${isEditingDist ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                        title="Modifier"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={onDelete} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Supprimer">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Hero Content */}
                    <div className="p-8">
                        <div className="flex items-start gap-5">
                            {/* Big Checkbox */}
                            {onToggleDistribution && (
                                <button
                                    onClick={isDistributionDisabled ? undefined : onToggleDistribution}
                                    disabled={isDistributionDisabled}
                                    title={
                                        !hasEquipe
                                            ? 'Veuillez assigner une équipe avant de modifier les distributions'
                                            : tache.statut === 'TERMINEE'
                                                ? 'Les distributions ne peuvent pas être modifiées pour une tâche terminée'
                                                : distributionStatus === 'REALISEE'
                                                    ? 'Marquer cette journée comme non réalisée'
                                                    : 'Marquer cette journée comme réalisée'
                                    }
                                    className={`
                                mt-1.5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0
                                ${isCompleted
                                            ? 'bg-emerald-600 border-emerald-600 text-white animate-check'
                                            : 'bg-white border-gray-400 hover:border-emerald-500 hover:bg-emerald-50'
                                        }
                                ${isDistributionDisabled ? 'cursor-not-allowed opacity-60' : ''}
                            `}
                                >
                                    {isCompleted && <CheckCircle2 className="w-5 h-5" />}
                                </button>
                            )}

                            <div className="flex-1">
                                {/* Type Label & Reference */}
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${distributionId ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {distributionId ? 'Distribution de la tâche' : 'Tâche'}
                                    </span>
                                    {tache.reference && (
                                        <span className="text-sm font-mono text-slate-500">
                                            {tache.reference}
                                        </span>
                                    )}
                                </div>

                                <h3 className={`text-xl font-semibold leading-relaxed ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                    {tache.type_tache_detail.nom_tache}
                                </h3>
                                <div className="mt-4 flex flex-col gap-3 text-base text-gray-600">
                                    {/* Date Header: Distribution (Specific) vs Task (Period) */}
                                    {distributionId && eventStart && eventEnd ? (
                                        /* Distribution : Affichage et édition avec le composant dédié */
                                        <DistributionEditForm
                                            distributionId={distributionId}
                                            tacheId={tache.id}
                                            eventStart={eventStart}
                                            eventEnd={eventEnd}
                                            commentaire={tache.distributions_charge?.find(d => d.id === distributionId)?.commentaire}
                                            tacheDateDebut={tache.date_debut_planifiee}
                                            tacheDateFin={tache.date_fin_planifiee}
                                            isReadOnly={isReadOnly}
                                            isCompleted={isCompleted}
                                            isExternalEditing={isEditingDist}
                                            onIsEditingChange={setIsEditingDist}
                                            onSuccess={onUpdate}
                                            onClose={onClose}
                                        />
                                    ) : !distributionId ? (
                                        /* Tâche : Période planifiée globale */
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-gray-400" />
                                            <span className="text-sm font-medium text-slate-700">
                                                Période planifiée : {format(new Date(tache.date_debut_planifiee), 'd MMM', { locale: fr })}
                                                <span className="mx-2 text-slate-400">→</span>
                                                {format(new Date(tache.date_fin_planifiee), 'd MMM yyyy', { locale: fr })}
                                            </span>
                                        </div>
                                    ) : null}

                                    {/* Liste des jours d'intervention (Uniquement si distributions existantes) */}
                                    {(tache.distributions_charge && tache.distributions_charge.length > 0) && (
                                        <div className="flex items-start gap-3 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100/50">
                                            <Calendar className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <div className="flex flex-col gap-2 flex-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                                                    Jours d'intervention ({tache.distributions_charge.length})
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {tache.distributions_charge
                                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                                        .map(d => (
                                                            <span key={d.id} className="inline-flex items-center px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 shadow-sm">
                                                                {format(new Date(d.date), 'd MMM', { locale: fr })}
                                                            </span>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {(tache.equipes_detail?.length > 0 || tache.equipe_detail) ? (
                                        <div className="flex items-center gap-3">
                                            <Users className="w-5 h-5 text-gray-400" />
                                            <span>
                                                {tache.equipes_detail?.length > 0
                                                    ? tache.equipes_detail.map(e => (e as any).nom_equipe || e.nomEquipe).join(', ')
                                                    : (tache.equipe_detail as any)?.nom_equipe || tache.equipe_detail?.nomEquipe}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-orange-600 bg-orange-50 px-4 py-3 rounded-xl mt-2">
                                            <AlertTriangle className="w-5 h-5" />
                                            <span className="font-medium">Assigner une équipe à cette tâche</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body / Context */}
                    {(tache.commentaires || tache.priorite) && (
                        <div className="px-8 pb-8 pt-0 space-y-5">
                            {tache.commentaires && (
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg leading-relaxed">
                                    {tache.commentaires}
                                </div>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge status={tache.statut}>
                                    {STATUT_TACHE_LABELS[tache.statut]}
                                </StatusBadge>
                                {distributionStatus && (
                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${STATUS_DISTRIBUTION_COLORS[distributionStatus].bg} ${STATUS_DISTRIBUTION_COLORS[distributionStatus].text}`}>
                                        {STATUS_DISTRIBUTION_LABELS[distributionStatus]}
                                    </span>
                                )}
                                {tache.priorite > 1 && (
                                    <span className={`text-xs px-2 py-1 rounded-full border ${tache.priorite >= 4 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                        {PRIORITE_LABELS[tache.priorite]}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </FloatingPortal>
    );
};

// ============================================================================
// MAIN PLANNING COMPONENT
// ============================================================================

const Planning: FC = () => {
    const [taches, setTaches] = useState<Tache[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [structures, setStructures] = useState<StructureClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [_isClientView, setIsClientView] = useState(false);

    // Use permissions hook
    const permissions = usePermissions(currentUser);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    // Popover State
    const [popoverInfo, setPopoverInfo] = useState<{ tache: Tache; reference: ReferenceType; eventStart?: Date; eventEnd?: Date; distributionStatus?: StatusDistribution; distributionId?: number } | null>(null);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [tacheToDelete, setTacheToDelete] = useState<number | null>(null);
    const [distributionToDelete, setDistributionToDelete] = useState<number | null>(null); // ✅ État pour la suppression de distribution
    const [tacheToEdit, setTacheToEdit] = useState<Tache | null>(null);

    // Quick Task Creator State
    const [showQuickCreator, setShowQuickCreator] = useState(false);
    const [quickCreatorDate, setQuickCreatorDate] = useState<Date>(new Date());
    const [quickCreatorStartTime, setQuickCreatorStartTime] = useState<string>('');
    const [quickCreatorEndTime, setQuickCreatorEndTime] = useState<string>('');

    // Toast State
    const [toast, setToast] = useState<{ message: string, visible: boolean, undoAction?: () => void }>({ message: '', visible: false });

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [showViewSelector, setShowViewSelector] = useState(false);

    const [isExporting, setIsExporting] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
    const [initialTaskValues, setInitialTaskValues] = useState<Partial<TacheCreate> | undefined>(undefined);
    const [preSelectedObjects, setPreSelectedObjects] = useState<InventoryObjectOption[] | undefined>(undefined);

    // Search & Filters state
    const { searchQuery, setPlaceholder, setSearchSuggestions, setSelectedSuggestion } = useSearch();
    const [filters, setFilters] = useState<PlanningFilters>(() => {
        const saved = localStorage.getItem('planning_filters');
        return saved ? JSON.parse(saved) : EMPTY_PLANNING_FILTERS;
    });
    const [showFilters, setShowFilters] = useState(false);

    // Compte filtres actifs pour le badge
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.clientId !== null) count++;
        if (filters.siteId !== null) count++;
        if (filters.equipeId !== null) count++;
        if (filters.statuts.length > 0) count++;
        return count;
    }, [filters]);

    // Persistent filters
    useEffect(() => {
        localStorage.setItem('planning_filters', JSON.stringify(filters));
    }, [filters]);

    // Update global search placeholder
    useEffect(() => {
        setPlaceholder('Rechercher par nom, référence, équipe ou site...');
    }, [setPlaceholder]);

    // Filtered tasks logic
    const filteredTaches = useMemo(() => {
        const active = taches.filter((t: Tache) => {
            const task = t as any;
            // 1. Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesName = task.type_tache_detail.nom_tache.toLowerCase().includes(q);
                const matchesRef = task.reference?.toLowerCase().includes(q);
                const site_nom = task.site_nom || task.client_detail?.structure?.nom || task.client_detail?.nomStructure;
                const matchesSite = site_nom?.toLowerCase().includes(q);

                const matchesEquipes = task.equipes_detail?.some((e: any) =>
                    (e.nomEquipe || '').toLowerCase().includes(q)
                ) || task.equipe_detail?.nomEquipe?.toLowerCase().includes(q);

                if (!matchesName && !matchesRef && !matchesSite && !matchesEquipes) return false;
            }

            // 2. Faceted filters
            const id_client = task.structure_client_detail?.id || task.id_structure_client;
            if (filters.clientId && String(id_client) !== String(filters.clientId)) return false;

            if (filters.siteId) {
                // Like SuiviTaches, check if any object belongs to the selected site
                const hasSite = task.objets_detail?.some((obj: any) =>
                    (obj.site_id || Number(obj.site)) === Number(filters.siteId)
                );
                if (!hasSite) return false;
            }

            if (filters.equipeId) {
                const id_equipe = task.id_equipe;
                const inEquipes = task.equipes_detail?.some((e: any) => String(e.id) === String(filters.equipeId));
                if (!inEquipes && (!id_equipe || String(id_equipe) !== String(filters.equipeId))) return false;
            }

            if (filters.statuts.length > 0 && !filters.statuts.includes(task.statut)) return false;

            return true;
        });

        return active;
    }, [taches, searchQuery, filters]);

    // Auto-completion logic
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchSuggestions([]);
            return;
        }

        const q = searchQuery.toLowerCase();
        const suggestions: SearchSuggestion[] = [];

        // Find unique task types & names matching
        const matchingTaches = taches.filter(t =>
            t.type_tache_detail.nom_tache.toLowerCase().includes(q) ||
            t.reference?.toLowerCase().includes(q)
        ).slice(0, 5);

        matchingTaches.forEach(t => {
            suggestions.push({
                id: `task-${t.id}`,
                name: t.type_tache_detail.nom_tache,
                type: 'Tâche',
                subtitle: t.reference || undefined
            });
        });

        // Find matching sites
        const matchingSites = sites.filter(s => s.name.toLowerCase().includes(q)).slice(0, 3);
        matchingSites.forEach(s => {
            suggestions.push({
                id: `site-${s.id}`,
                name: s.name,
                type: 'Site'
            });
        });

        // Find matching teams
        const matchingEquipes = equipes.filter(e => e.nomEquipe.toLowerCase().includes(q)).slice(0, 3);
        matchingEquipes.forEach(e => {
            suggestions.push({
                id: `team-${e.id}`,
                name: e.nomEquipe,
                type: 'Équipe'
            });
        });

        setSearchSuggestions(suggestions);
    }, [searchQuery, taches, sites, equipes, setSearchSuggestions]);

    // Handle suggestion selection
    useEffect(() => {
        // Here we could handle jump to date or site if needed
        // For now, selecting a suggestion just sets the searchQuery (handled by SearchContext)
    }, [setSelectedSuggestion]);

    // ... (Data Loading & Navigation Effects - unchanged)
    useEffect(() => { loadStableData(); loadTaches(); }, []);
    // ... (Keep existing useEffects for location state)

    const loadStableData = async () => {
        try {
            setLoading(true);
            const [equipesData, typesData, userData, structuresRes] = await Promise.all([
                fetchEquipes().then(data => data.results || data),
                planningService.getTypesTaches(),
                fetchCurrentUser(),
                fetchStructures()
            ]);

            setEquipes(Array.isArray(equipesData) ? equipesData : []);
            setTypesTaches(typesData);

            const structuresArray = Array.isArray(structuresRes) ? structuresRes : (structuresRes.results || []);
            setStructures(structuresArray);

            // Convert userData to User type and store it
            const user: User = {
                id: String(userData.id),
                name: userData.nom || '',
                email: userData.email,
                role: (userData.roles?.[0] || 'CLIENT') as Role
            };
            setCurrentUser(user);

            const roles = userData.roles || [];
            // Selon matrice permissions : seul CLIENT est en lecture seule
            // SUPERVISEUR peut créer/modifier/supprimer des tâches sur ses équipes
            setIsReadOnly(roles.includes('CLIENT'));
            setIsClientView(roles.includes('CLIENT'));

            // Load all sites properly (exhaustive) - matching SuiviTaches behavior
            fetchAllSites()
                .then(sitesArray => {
                    setSites(sitesArray.filter(s => s.actif));
                })
                .catch(err => {
                    console.error("Erreur chargement sites:", err);
                    setSites([]);
                });
        } catch (err) {
            console.error('Erreur chargement données:', err);
            setError('Erreur chargement données');
        } finally {
            setLoading(false);
        }
    };

    const loadTaches = async () => {
        try {
            const tachesData = await planningService.getTaches();
            const tachesArray = tachesData.results || tachesData;
            console.log('📋 [TÂCHES] Tâches chargées:', tachesArray.length);

            // Stats sur les tâches
            const tachesAvecClient = tachesArray.filter(t => t.client_detail !== null);
            const tachesAvecObjets = tachesArray.filter(t => t.objets_detail && t.objets_detail.length > 0);

            console.log('  → Tâches avec client:', tachesAvecClient.length);
            console.log('  → Tâches avec objets:', tachesAvecObjets.length);
            console.log('  → Premiers clients des tâches:',
                tachesAvecClient.slice(0, 3).map(t => ({
                    tache_id: t.id,
                    client_id: t.client_detail?.utilisateur,
                    client_nom: t.client_detail?.structure?.nom || t.client_detail?.nomStructure
                }))
            );

            setTaches(tachesArray);
        } catch (err) {
            console.error('❌ [TÂCHES] Erreur chargement:', err);
        }
    };

    // PDF Export with programmatic rendering (Google Calendar style)
    const handleExportPDF = async () => {
        if (!calendarRef.current) return;
        setIsExporting(true);

        try {
            const jsPDFModule = await import('jspdf');
            const { jsPDF } = jsPDFModule;

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Couleurs selon les statuts du backend (types/planning.ts)
            const colors = {
                // Statuts de tâches
                blue: { r: 59, g: 130, b: 246 },           // #3b82f6 - PLANIFIEE
                blueLight: { r: 219, g: 234, b: 254 },     // #dbeafe
                blueDark: { r: 30, g: 64, b: 175 },        // #1e40af
                gray: { r: 107, g: 114, b: 128 },          // #6b7280 - NON_DEBUTEE
                grayLight: { r: 243, g: 244, b: 246 },     // #f3f4f6
                grayDark: { r: 55, g: 65, b: 81 },         // #374151
                orange: { r: 249, g: 115, b: 22 },         // #f97316 - EN_COURS
                orangeLight: { r: 255, g: 237, b: 213 },   // #ffedd5
                orangeDark: { r: 154, g: 52, b: 18 },      // #9a3412
                green: { r: 34, g: 197, b: 94 },           // #22c55e - TERMINEE
                greenLight: { r: 220, g: 252, b: 231 },    // #dcfce7
                greenDark: { r: 22, g: 101, b: 52 },       // #166534
                red: { r: 239, g: 68, b: 68 },             // #ef4444 - ANNULEE / Urgent
                redLight: { r: 254, g: 226, b: 226 },      // #fee2e2
                redDark: { r: 153, g: 27, b: 27 },         // #991b1b
                // UI
                emerald: { r: 16, g: 185, b: 129 },        // #10b981 - Accent GreenSIG
                emeraldLight: { r: 209, g: 250, b: 229 },  // #d1fae5
            };

            // Helper pour obtenir la couleur selon le statut (conforme au backend)
            const getTaskColor = (task: Tache) => {
                // Priorité urgente (4-5) override le statut visuellement
                if (task.priorite >= 4 && task.statut !== 'TERMINEE' && task.statut !== 'ANNULEE') {
                    return { bg: colors.redLight, text: colors.redDark, border: colors.red };
                }

                switch (task.statut) {
                    case 'PLANIFIEE':
                        return { bg: colors.blueLight, text: colors.blueDark, border: colors.blue };
                    case 'NON_DEBUTEE':
                        return { bg: colors.grayLight, text: colors.grayDark, border: colors.gray };
                    case 'EN_COURS':
                        return { bg: colors.orangeLight, text: colors.orangeDark, border: colors.orange };
                    case 'TERMINEE':
                        return { bg: colors.greenLight, text: colors.greenDark, border: colors.green };
                    case 'ANNULEE':
                        return { bg: colors.redLight, text: colors.redDark, border: colors.red };
                    default:
                        return { bg: colors.grayLight, text: colors.grayDark, border: colors.gray };
                }
            };

            // En-tête avec fond dégradé simulé
            pdf.setFillColor(colors.grayLight.r, colors.grayLight.g, colors.grayLight.b);
            pdf.rect(0, 0, pageWidth, 25, 'F');

            // Ligne verte décorative en haut
            pdf.setFillColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
            pdf.rect(0, 0, pageWidth, 1, 'F');

            // Logo
            try {
                const logoResponse = await fetch('/logofinal.png');
                if (logoResponse.ok) {
                    const logoBlob = await logoResponse.blob();
                    const logoBase64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(logoBlob);
                    });
                    pdf.addImage(logoBase64, 'PNG', 14, 5, 30, 15);
                }
            } catch (logoError) {
                console.error('Erreur chargement logo:', logoError);
            }

            pdf.setFontSize(16);
            pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);
            pdf.text('Planning des interventions', pageWidth - 14, 16, { align: 'right' });

            pdf.setFontSize(10);
            pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
            pdf.text(`Période: ${dateLabel}`, pageWidth / 2, 16, { align: 'center' });

            const dateStr = new Date().toLocaleDateString('fr-FR', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            pdf.text(`Exporté le ${dateStr}`, pageWidth - 14, 22, { align: 'right' });

            // Filter tasks to the visible date range to avoid empty PDFs
            let tasksToRender = filteredTaches;
            if (currentView === 'month') {
                // For month view, include tasks from the entire displayed calendar (including overflow days)
                const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));

                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 42); // 6 weeks

                tasksToRender = filteredTaches.filter(t => {
                    const taskDate = new Date(t.date_debut_planifiee);
                    return taskDate >= startDate && taskDate < endDate;
                });
            } else if (currentView === 'week') {
                // For week view, include tasks that have distributions in the displayed week
                const weekStart = new Date(currentDate);
                weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));

                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);

                const weekStartStr = format(weekStart, 'yyyy-MM-dd');
                const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

                tasksToRender = filteredTaches.filter(t => {
                    // Check if task has any distributions in the week range
                    if (t.distributions_charge && t.distributions_charge.length > 0) {
                        return t.distributions_charge.some(d => d.date >= weekStartStr && d.date < weekEndStr);
                    }
                    // Fallback: check task date for tasks without distributions
                    const taskDate = new Date(t.date_debut_planifiee);
                    return taskDate >= weekStart && taskDate < weekEnd;
                });
            } else if (currentView === 'day') {
                // For day view, include tasks that have distributions on the current day
                const dateKey = format(currentDate, 'yyyy-MM-dd');

                tasksToRender = filteredTaches.filter(t => {
                    // Include tasks that have a distribution for this specific day
                    if (t.distributions_charge && t.distributions_charge.length > 0) {
                        return t.distributions_charge.some(d => d.date === dateKey);
                    }
                    // Fallback: check if task falls on this day (for tasks without distributions)
                    const taskDate = new Date(t.date_debut_planifiee);
                    const dayStart = new Date(currentDate);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(currentDate);
                    dayEnd.setHours(23, 59, 59, 999);
                    return taskDate >= dayStart && taskDate <= dayEnd;
                });
            } else if (currentView === 'agenda') {
                // For agenda/list view, include tasks from the current month
                const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                monthStart.setHours(0, 0, 0, 0);

                const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                monthEnd.setHours(23, 59, 59, 999);

                tasksToRender = filteredTaches.filter(t => {
                    const taskDate = new Date(t.date_debut_planifiee);
                    return taskDate >= monthStart && taskDate <= monthEnd;
                });
            }

            // Debug logging
            console.log('[PDF Export] Current view:', currentView);
            console.log('[PDF Export] Current date:', currentDate);
            console.log('[PDF Export] Total tasks in system:', filteredTaches.length);
            console.log('[PDF Export] Tasks after filtering:', tasksToRender.length);
            if (tasksToRender.length > 0) {
                console.log('[PDF Export] Sample task dates:', tasksToRender.slice(0, 3).map(t => ({
                    nom: t.type_tache_detail.nom_tache,
                    date: new Date(t.date_debut_planifiee).toISOString()
                })));
            } else {
                console.warn('[PDF Export] No tasks found for current view and date range!');
                if (filteredTaches.length > 0) {
                    console.log('[PDF Export] Sample of all task dates:', filteredTaches.slice(0, 5).map(t => ({
                        nom: t.type_tache_detail.nom_tache,
                        date: new Date(t.date_debut_planifiee).toISOString()
                    })));
                }
            }

            // Date d'aujourd'hui pour mise en surbrillance
            const today = new Date();

            // Dessiner le calendrier selon la vue
            if (currentView === 'month') {
                // Pré-calculer les tâches par jour pour déterminer la hauteur des cellules
                const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));

                // Créer une map des tâches par jour
                const tasksByDay = new Map<string, Tache[]>();
                let maxTasksInDay = 0;

                for (let i = 0; i < 42; i++) {
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + i);
                    const dateKey = format(date, 'yyyy-MM-dd');

                    const dayTasks = tasksToRender.filter(t => {
                        if (t.distributions_charge && t.distributions_charge.length > 0) {
                            return t.distributions_charge.some(d => d.date === dateKey);
                        }
                        const taskDate = new Date(t.date_debut_planifiee);
                        return format(taskDate, 'yyyy-MM-dd') === dateKey;
                    }).sort((a, b) => new Date(a.date_debut_planifiee).getTime() - new Date(b.date_debut_planifiee).getTime());

                    tasksByDay.set(dateKey, dayTasks);
                    maxTasksInDay = Math.max(maxTasksInDay, dayTasks.length);
                }

                // Calculer la hauteur des cellules dynamiquement
                const taskHeight = 4.2;
                const taskSpacing = 0.6;
                const minCellHeight = 26;
                const dayNumberHeight = 8;

                // Hauteur nécessaire pour afficher toutes les tâches
                const requiredCellHeight = Math.max(
                    minCellHeight,
                    dayNumberHeight + (maxTasksInDay * (taskHeight + taskSpacing)) + 2
                );

                // Si la hauteur dépasse la page, on la limite et on créera plusieurs pages par semaine
                const maxCellHeightPerPage = 35; // Hauteur maximale pour garder une bonne lisibilité
                const cellHeight = Math.min(requiredCellHeight, maxCellHeightPerPage);

                const startY = 32;
                const cellWidth = (pageWidth - 20) / 7;
                const headerHeight = 8;

                // Fonction pour dessiner l'en-tête
                const drawHeader = (yPosition: number) => {
                    const dayNames = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
                    pdf.setFillColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                    pdf.rect(10, yPosition, pageWidth - 20, headerHeight, 'F');

                    pdf.setFontSize(9);
                    pdf.setTextColor(255, 255, 255);
                    pdf.setFont('helvetica', 'bold');
                    dayNames.forEach((day, i) => {
                        const x = 10 + (i * cellWidth) + (cellWidth / 2);
                        pdf.text(day, x, yPosition + 5.5, { align: 'center' });
                    });
                };

                // Dessiner l'en-tête initial
                drawHeader(startY);

                // Dessiner la grille par semaine (pour permettre la pagination)
                let currentPageY = startY + headerHeight;
                const maxYPerPage = pageHeight - 20; // Laisser de l'espace pour la légende

                for (let week = 0; week < 6; week++) {
                    const weekStartIndex = week * 7;

                    // Vérifier si on a besoin d'une nouvelle page
                    if (currentPageY + cellHeight > maxYPerPage) {
                        pdf.addPage();
                        currentPageY = 20;
                        drawHeader(currentPageY);
                        currentPageY += headerHeight;
                    }

                    // Dessiner les 7 jours de la semaine
                    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                        const i = weekStartIndex + dayOfWeek;
                        const date = new Date(startDate);
                        date.setDate(date.getDate() + i);
                        const dateKey = format(date, 'yyyy-MM-dd');

                        const currentCol = dayOfWeek;
                        const x = 10 + (currentCol * cellWidth);
                        const y = currentPageY;

                        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                        const isToday = date.toDateString() === today.toDateString();

                        // Fond de la cellule
                        if (isToday) {
                            pdf.setFillColor(colors.emeraldLight.r, colors.emeraldLight.g, colors.emeraldLight.b);
                            pdf.rect(x, y, cellWidth, cellHeight, 'F');
                        } else if (!isCurrentMonth) {
                            pdf.setFillColor(250, 250, 252);
                            pdf.rect(x, y, cellWidth, cellHeight, 'F');
                        } else {
                            pdf.setFillColor(255, 255, 255);
                            pdf.rect(x, y, cellWidth, cellHeight, 'F');
                        }

                        // Bordure
                        pdf.setDrawColor(220, 220, 220);
                        pdf.setLineWidth(0.2);
                        pdf.rect(x, y, cellWidth, cellHeight);

                        // Numéro du jour
                        if (isToday) {
                            // Cercle vert pour aujourd'hui
                            pdf.setFillColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                            pdf.circle(x + 5, y + 4, 3, 'F');
                            pdf.setFontSize(8);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setTextColor(255, 255, 255);
                            pdf.text(date.getDate().toString(), x + 5, y + 5, { align: 'center' });
                        } else {
                            pdf.setFontSize(10);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setTextColor(isCurrentMonth ? 50 : 180);
                            pdf.text(date.getDate().toString(), x + 2.5, y + 5);
                        }

                        // Tâches du jour (toutes, sans limite)
                        const dayTasks = tasksByDay.get(dateKey) || [];
                        let taskY = y + dayNumberHeight;
                        const maxTasksVisible = Math.floor((cellHeight - dayNumberHeight - 2) / (taskHeight + taskSpacing));

                        dayTasks.slice(0, maxTasksVisible).forEach((task) => {
                            const taskX = x + 0.8;
                            const taskWidth = cellWidth - 1.6;
                            const taskColor = getTaskColor(task);

                            // Fond de la tâche avec couleur selon statut
                            pdf.setFillColor(taskColor.bg.r, taskColor.bg.g, taskColor.bg.b);
                            pdf.roundedRect(taskX, taskY, taskWidth, taskHeight, 0.8, 0.8, 'F');

                            // Bordure gauche colorée (indicateur de statut)
                            pdf.setFillColor(taskColor.border.r, taskColor.border.g, taskColor.border.b);
                            pdf.rect(taskX, taskY + 0.3, 0.6, taskHeight - 0.6, 'F');

                            // Texte de la tâche
                            pdf.setFontSize(6.5);
                            pdf.setFont('helvetica', task.statut === 'TERMINEE' ? 'normal' : 'bold');
                            pdf.setTextColor(taskColor.text.r, taskColor.text.g, taskColor.text.b);

                            const distribution = task.distributions_charge?.find(d => d.date === dateKey);
                            const taskTime = distribution?.heure_debut
                                ? distribution.heure_debut.substring(0, 5)
                                : format(new Date(task.date_debut_planifiee), 'HH:mm');
                            const taskText = `${taskTime} ${task.reference ? '[' + task.reference + '] ' : ''}${task.type_tache_detail.nom_tache}`;

                            // Tronquer si nécessaire
                            const maxTextWidth = taskWidth - 2;
                            let displayText = taskText;
                            if (pdf.getTextWidth(taskText) > maxTextWidth) {
                                let truncated = taskText;
                                while (pdf.getTextWidth(truncated + '…') > maxTextWidth && truncated.length > 0) {
                                    truncated = truncated.slice(0, -1);
                                }
                                displayText = truncated + '…';
                            }

                            pdf.text(displayText, taskX + 1.2, taskY + 2.9);
                            taskY += taskHeight + taskSpacing;
                        });

                        // Indicateur "+X autres" si toutes les tâches ne rentrent pas
                        if (dayTasks.length > maxTasksVisible) {
                            pdf.setFontSize(6);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
                            const remaining = dayTasks.length - maxTasksVisible;
                            pdf.text(`+${remaining} autre${remaining > 1 ? 's' : ''}`, x + 2, y + cellHeight - 2);
                        }
                    }

                    currentPageY += cellHeight;
                }

                // Ajouter des pages détaillées pour les jours avec trop de tâches
                const daysWithOverflow: Array<{ date: Date; tasks: Tache[] }> = [];
                const maxTasksVisible = Math.floor((cellHeight - dayNumberHeight - 2) / (taskHeight + taskSpacing));

                // Identifier les jours qui ont plus de tâches que ce qui peut être affiché
                tasksByDay.forEach((tasks, dateKey) => {
                    if (tasks.length > maxTasksVisible) {
                        const [year, month, day] = dateKey.split('-').map(Number);
                        daysWithOverflow.push({
                            date: new Date(year, month - 1, day),
                            tasks: tasks
                        });
                    }
                });

                // Si des jours ont des tâches débordantes, créer des pages détaillées
                if (daysWithOverflow.length > 0) {
                    // Ajouter une nouvelle page pour les détails
                    pdf.addPage();

                    // Titre de la section
                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);
                    pdf.text('Détail complet des journées chargées', pageWidth / 2, 20, { align: 'center' });

                    let detailY = 30;
                    const rowHeight = 7;
                    const maxYDetail = pageHeight - 20;

                    daysWithOverflow.forEach((dayData) => {
                        // Vérifier si on a besoin d'une nouvelle page
                        const estimatedHeight = 15 + (dayData.tasks.length * rowHeight);
                        if (detailY + estimatedHeight > maxYDetail) {
                            pdf.addPage();
                            detailY = 20;
                        }

                        // En-tête du jour
                        pdf.setFillColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                        pdf.rect(10, detailY, pageWidth - 20, 8, 'F');

                        pdf.setFontSize(10);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setTextColor(255, 255, 255);
                        const dayLabel = format(dayData.date, 'EEEE d MMMM yyyy', { locale: fr });
                        pdf.text(dayLabel, 15, detailY + 5.5);
                        pdf.text(`${dayData.tasks.length} tâche${dayData.tasks.length > 1 ? 's' : ''}`, pageWidth - 15, detailY + 5.5, { align: 'right' });

                        detailY += 10;

                        // Liste des tâches (format étendu sur 2 lignes)
                        dayData.tasks.forEach((task, index) => {
                            const taskColor = getTaskColor(task);
                            const taskRowHeight = 12; // Hauteur augmentée pour 2 lignes

                            // Vérifier si on a besoin d'une nouvelle page
                            if (detailY + taskRowHeight > maxYDetail) {
                                pdf.addPage();
                                detailY = 20;
                            }

                            // Fond alterné
                            if (index % 2 === 0) {
                                pdf.setFillColor(250, 250, 252);
                                pdf.rect(10, detailY, pageWidth - 20, taskRowHeight, 'F');
                            }

                            // Bordure gauche colorée
                            pdf.setFillColor(taskColor.border.r, taskColor.border.g, taskColor.border.b);
                            pdf.rect(10, detailY, 2, taskRowHeight, 'F');

                            // === LIGNE 1 : Heure, Nom, Statut ===

                            // Heure
                            pdf.setFontSize(8);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);
                            const dateKey = format(dayData.date, 'yyyy-MM-dd');
                            const distribution = task.distributions_charge?.find(d => d.date === dateKey);
                            const taskStartTime = distribution?.heure_debut
                                ? distribution.heure_debut.substring(0, 5)
                                : format(new Date(task.date_debut_planifiee), 'HH:mm');
                            const taskEndTime = distribution?.heure_fin
                                ? distribution.heure_fin.substring(0, 5)
                                : format(new Date(task.date_fin_planifiee), 'HH:mm');
                            const timeRange = `${taskStartTime}-${taskEndTime}`;
                            pdf.text(timeRange, 15, detailY + 4);

                            // Nom de la tâche
                            pdf.setFont('helvetica', 'bold');
                            let taskName = (task.reference ? `[${task.reference}] ` : '') + task.type_tache_detail.nom_tache;
                            const maxTaskNameWidth = 140;
                            if (pdf.getTextWidth(taskName) > maxTaskNameWidth) {
                                while (pdf.getTextWidth(taskName + '…') > maxTaskNameWidth && taskName.length > 0) {
                                    taskName = taskName.slice(0, -1);
                                }
                                taskName += '…';
                            }
                            pdf.text(taskName, 38, detailY + 4);

                            // Badge statut
                            const statusLabels: Record<string, string> = {
                                'PLANIFIEE': 'Planifiée',
                                'NON_DEBUTEE': 'Non débutée',
                                'EN_COURS': 'En cours',
                                'TERMINEE': 'Terminée',
                                'ANNULEE': 'Annulée'
                            };
                            const statusText = statusLabels[task.statut] || task.statut;

                            pdf.setFillColor(taskColor.bg.r, taskColor.bg.g, taskColor.bg.b);
                            pdf.roundedRect(pageWidth - 40, detailY + 1, 30, 4, 0.8, 0.8, 'F');

                            pdf.setFontSize(6.5);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setTextColor(taskColor.text.r, taskColor.text.g, taskColor.text.b);
                            pdf.text(statusText, pageWidth - 25, detailY + 3.8, { align: 'center' });

                            // === LIGNE 2 : Client, Site, Équipe ===

                            pdf.setFontSize(7);
                            pdf.setFont('helvetica', 'normal');
                            pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);

                            // Client
                            let clientName = task.structure_client_detail?.nom
                                || task.client_detail?.structure?.nom
                                || task.client_detail?.nomStructure
                                || 'N/A';
                            const maxClientWidth = 55;
                            if (pdf.getTextWidth(clientName) > maxClientWidth) {
                                while (pdf.getTextWidth(clientName + '…') > maxClientWidth && clientName.length > 0) {
                                    clientName = clientName.slice(0, -1);
                                }
                                clientName += '…';
                            }
                            pdf.text(`📍 ${clientName}`, 15, detailY + 9);

                            // Site
                            let siteName = task.site_detail?.nom || task.site_detail?.nom_site || 'Non spécifié';
                            const maxSiteWidth = 60;
                            if (pdf.getTextWidth(siteName) > maxSiteWidth) {
                                while (pdf.getTextWidth(siteName + '…') > maxSiteWidth && siteName.length > 0) {
                                    siteName = siteName.slice(0, -1);
                                }
                                siteName += '…';
                            }
                            pdf.text(`🗺️  ${siteName}`, 80, detailY + 9);

                            // Équipe
                            let equipeName = '';
                            if (task.equipes_detail && task.equipes_detail.length > 0) {
                                equipeName = task.equipes_detail.map(e => e.nomEquipe).join(', ');
                            } else if (task.equipe_detail) {
                                equipeName = task.equipe_detail.nomEquipe || '';
                            }
                            if (!equipeName) equipeName = 'Non assignée';

                            const maxEquipeWidth = 70;
                            if (pdf.getTextWidth(equipeName) > maxEquipeWidth) {
                                while (pdf.getTextWidth(equipeName + '…') > maxEquipeWidth && equipeName.length > 0) {
                                    equipeName = equipeName.slice(0, -1);
                                }
                                equipeName += '…';
                            }
                            pdf.text(`👥 ${equipeName}`, 155, detailY + 9);

                            // Priorité (icône visuelle si haute)
                            if (task.priorite >= 4) {
                                pdf.setFillColor(colors.red.r, colors.red.g, colors.red.b);
                                pdf.circle(pageWidth - 5, detailY + 7, 1.5, 'F');
                            }

                            detailY += taskRowHeight + 1;
                        });

                        detailY += 5; // Espace entre les jours
                    });
                }
            } else if (currentView === 'week') {
                // 📅 Vue semaine - BLOCS LARGES (comme le mois mais plus grands)
                const startY = 32;
                const cellWidth = (pageWidth - 20) / 7;
                const headerHeight = 12;
                const blockHeight = 20; // 📏 Blocs plus grands pour afficher nom complet
                const blockSpacing = 2.5;
                const maxBlocksPerDay = 10; // Nombre max de blocs visibles par colonne

                // En-têtes des jours avec dates
                const weekStart = startOfWeek(currentDate, { locale: fr, weekStartsOn: 1 });
                const dayNames = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

                // Fond d'en-tête
                pdf.setFillColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                pdf.rect(10, startY, pageWidth - 20, headerHeight, 'F');

                pdf.setFontSize(9);
                pdf.setTextColor(255, 255, 255);
                pdf.setFont('helvetica', 'bold');

                // Dessiner les en-têtes des jours
                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(dayDate.getDate() + i);
                    const x = 10 + (i * cellWidth) + (cellWidth / 2);
                    const isToday = dayDate.toDateString() === today.toDateString();

                    if (isToday) {
                        pdf.setFillColor(255, 255, 255);
                        pdf.circle(x, startY + 6, 5, 'F');
                        pdf.setTextColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                    } else {
                        pdf.setTextColor(255, 255, 255);
                    }
                    pdf.text(`${dayNames[i]} ${dayDate.getDate()}`, x, startY + 7.5, { align: 'center' });
                }

                // Bordures verticales entre les jours
                pdf.setDrawColor(220, 220, 220);
                pdf.setLineWidth(0.2);
                for (let i = 1; i < 7; i++) {
                    const x = 10 + (i * cellWidth);
                    pdf.line(x, startY + headerHeight, x, pageHeight - 10);
                }

                const daysWithOverflow: Array<{ date: Date; distributions: any[] }> = [];

                // Dessiner les blocs de distribution pour chaque jour
                for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(dayDate.getDate() + dayIndex);
                    const dateKey = format(dayDate, 'yyyy-MM-dd');

                    // Récupérer toutes les distributions pour ce jour
                    const dayDistributions: Array<{
                        task: Tache;
                        distribution?: DistributionCharge;
                        startTime: string;
                        endTime: string;
                        color: any;
                    }> = [];

                    tasksToRender.forEach(task => {
                        // Chercher toutes les distributions pour ce jour
                        const matchingDistributions = task.distributions_charge?.filter(d => d.date === dateKey);

                        if (matchingDistributions && matchingDistributions.length > 0) {
                            matchingDistributions.forEach(distribution => {
                                const heureDebut = distribution.heure_debut || '08:00';
                                const heureFin = distribution.heure_fin || '17:00';

                                // Couleur selon le statut de distribution
                                const color = distribution.status === 'REALISEE'
                                    ? { bg: colors.greenLight, text: colors.greenDark, border: colors.green }
                                    : { bg: colors.blueLight, text: colors.blueDark, border: colors.blue };

                                dayDistributions.push({
                                    task,
                                    distribution,
                                    startTime: heureDebut.substring(0, 5),
                                    endTime: heureFin.substring(0, 5),
                                    color
                                });
                            });
                        } else {
                            // Tâche sans distribution - vérifier si elle correspond à ce jour
                            const taskDate = new Date(task.date_debut_planifiee);
                            if (taskDate.toDateString() === dayDate.toDateString()) {
                                const taskStart = new Date(task.date_debut_planifiee);
                                const taskEnd = new Date(task.date_fin_planifiee);

                                let startHour = taskStart.getHours();
                                let startMin = taskStart.getMinutes();
                                let endHour = taskEnd.getHours();
                                let endMin = taskEnd.getMinutes();

                                // Si heures à 0 (minuit), mettre défaut journée
                                if (startHour === 0 && startMin === 0) {
                                    startHour = 8;
                                    startMin = 0;
                                    endHour = 17;
                                    endMin = 0;
                                }

                                const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
                                const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

                                dayDistributions.push({
                                    task,
                                    startTime,
                                    endTime,
                                    color: getTaskColor(task)
                                });
                            }
                        }
                    });

                    // Trier par heure de début
                    dayDistributions.sort((a, b) => a.startTime.localeCompare(b.startTime));

                    // Si trop de distributions, stocker pour page de détail
                    if (dayDistributions.length > maxBlocksPerDay) {
                        daysWithOverflow.push({
                            date: dayDate,
                            distributions: dayDistributions
                        });
                    }

                    // Dessiner les blocs (limité à maxBlocksPerDay)
                    const blocksToDisplay = dayDistributions.slice(0, maxBlocksPerDay);
                    const x = 10 + (dayIndex * cellWidth) + 1;
                    let blockY = startY + headerHeight + 2;

                    blocksToDisplay.forEach(({ task, distribution, startTime, endTime, color }) => {
                        const blockWidth = cellWidth - 2;

                        // 📦 Fond du bloc avec coins arrondis
                        pdf.setFillColor(color.bg.r, color.bg.g, color.bg.b);
                        pdf.roundedRect(x, blockY, blockWidth, blockHeight, 1.5, 1.5, 'F');

                        // 🎨 Bordure gauche colorée (indicateur de statut)
                        pdf.setFillColor(color.border.r, color.border.g, color.border.b);
                        pdf.rect(x, blockY + 1, 2, blockHeight - 2, 'F');

                        // ⏰ LIGNE 1 : Horaire (en gras et plus grand)
                        pdf.setFontSize(9);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setTextColor(color.text.r, color.text.g, color.text.b);
                        pdf.text(`${startTime} - ${endTime}`, x + 4, blockY + 5.5);

                        // 📋 LIGNE 2 : Référence (si présente)
                        let currentY = blockY + 10.5;
                        if (task.reference) {
                            pdf.setFontSize(7.5);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);
                            let refText = `[${task.reference}]`;
                            const maxRefWidth = blockWidth - 8;
                            if (pdf.getTextWidth(refText) > maxRefWidth) {
                                while (pdf.getTextWidth(refText + '…') > maxRefWidth && refText.length > 0) {
                                    refText = refText.slice(0, -1);
                                }
                                refText += '…';
                            }
                            pdf.text(refText, x + 4, currentY);
                            currentY += 4;
                        }

                        // 📋 LIGNE 3 : Nom de la tâche
                        pdf.setFontSize(7.5);
                        pdf.setFont('helvetica', 'normal');
                        pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);

                        let taskName = task.type_tache_detail.nom_tache;
                        const maxTextWidth = blockWidth - 8;
                        if (pdf.getTextWidth(taskName) > maxTextWidth) {
                            while (pdf.getTextWidth(taskName + '…') > maxTextWidth && taskName.length > 0) {
                                taskName = taskName.slice(0, -1);
                            }
                            taskName += '…';
                        }
                        pdf.text(taskName, x + 4, currentY);

                        // 👥 LIGNE 4 : Équipe
                        pdf.setFontSize(5.5);
                        pdf.setFont('helvetica', 'normal');
                        pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);

                        let equipeName = '';
                        if (task.equipes_detail && task.equipes_detail.length > 0) {
                            equipeName = task.equipes_detail.map((e: any) => e.nom_equipe || e.nomEquipe).join(', ');
                        } else if (task.equipe_detail) {
                            equipeName = (task.equipe_detail as any).nom_equipe || task.equipe_detail.nomEquipe || '';
                        }

                        if (equipeName) {
                            const maxEquipeWidth = blockWidth - 12;
                            if (pdf.getTextWidth(equipeName) > maxEquipeWidth) {
                                while (pdf.getTextWidth(equipeName + '…') > maxEquipeWidth && equipeName.length > 0) {
                                    equipeName = equipeName.slice(0, -1);
                                }
                                equipeName += '…';
                            }
                            pdf.text(`${equipeName}`, x + 4, blockY + 18);
                        }

                        // ✅ Badge "réalisée" en haut à droite
                        if (distribution?.status === 'REALISEE') {
                            pdf.setFillColor(colors.green.r, colors.green.g, colors.green.b);
                            pdf.circle(x + blockWidth - 3.5, blockY + 3.5, 2, 'F');
                            pdf.setTextColor(255, 255, 255);
                            pdf.setFontSize(6);
                            pdf.setFont('helvetica', 'bold');
                            pdf.text('✓', x + blockWidth - 4.2, blockY + 4.8);
                        }

                        blockY += blockHeight + blockSpacing;
                    });

                    // 📌 Indicateur "+X autres" si dépassement
                    if (dayDistributions.length > maxBlocksPerDay) {
                        pdf.setFontSize(7);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setTextColor(colors.red.r, colors.red.g, colors.red.b);
                        const remaining = dayDistributions.length - maxBlocksPerDay;
                        pdf.text(`+${remaining} autre${remaining > 1 ? 's' : ''}`, x + 3, blockY + 3);
                    }
                }

                // 📄 Pages de détail pour les jours avec trop de distributions
                if (daysWithOverflow.length > 0) {
                    pdf.addPage();

                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);
                    pdf.text('Détail des journées à forte charge', pageWidth / 2, 20, { align: 'center' });

                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
                    pdf.text('Distributions complètes pour les jours dépassant la capacité d\'affichage', pageWidth / 2, 26, { align: 'center' });

                    let detailY = 35;
                    const rowHeight = 11;
                    const maxYDetail = pageHeight - 20;

                    daysWithOverflow.forEach((dayData) => {
                        const estimatedHeight = 12 + (dayData.distributions.length * rowHeight);
                        if (detailY + estimatedHeight > maxYDetail) {
                            pdf.addPage();
                            detailY = 20;
                        }

                        // En-tête du jour
                        pdf.setFillColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                        pdf.rect(10, detailY, pageWidth - 20, 8, 'F');

                        pdf.setFontSize(10);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setTextColor(255, 255, 255);
                        const dayLabel = format(dayData.date, 'EEEE d MMMM yyyy', { locale: fr });
                        pdf.text(dayLabel, 15, detailY + 5.5);
                        pdf.text(`${dayData.distributions.length} distribution${dayData.distributions.length > 1 ? 's' : ''}`, pageWidth - 15, detailY + 5.5, { align: 'right' });

                        detailY += 10;

                        // Liste des distributions
                        dayData.distributions.forEach((dist, index) => {
                            const { task, distribution, startTime, endTime, color } = dist;

                            if (detailY + rowHeight > maxYDetail) {
                                pdf.addPage();
                                detailY = 20;
                            }

                            // Fond alterné
                            if (index % 2 === 0) {
                                pdf.setFillColor(250, 250, 252);
                                pdf.rect(10, detailY, pageWidth - 20, rowHeight, 'F');
                            }

                            // Bordure gauche colorée
                            pdf.setFillColor(color.border.r, color.border.g, color.border.b);
                            pdf.rect(10, detailY, 2, rowHeight, 'F');

                            // Horaire
                            pdf.setFontSize(7.5);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);
                            pdf.text(`${startTime}-${endTime}`, 15, detailY + 4.5);

                            // Nom de la tâche
                            pdf.setFont('helvetica', 'bold');
                            let taskName = (task.reference ? `[${task.reference}] ` : '') + task.type_tache_detail.nom_tache;
                            const maxTaskWidth = 120;
                            if (pdf.getTextWidth(taskName) > maxTaskWidth) {
                                while (pdf.getTextWidth(taskName + '…') > maxTaskWidth && taskName.length > 0) {
                                    taskName = taskName.slice(0, -1);
                                }
                                taskName += '…';
                            }
                            pdf.text(taskName, 40, detailY + 4.5);

                            // Statut
                            const statusText = distribution?.status === 'REALISEE' ? 'Réalisée' : 'Non réalisée';
                            pdf.setFillColor(color.bg.r, color.bg.g, color.bg.b);
                            pdf.roundedRect(pageWidth - 38, detailY + 1.5, 28, 4.5, 0.8, 0.8, 'F');

                            pdf.setFontSize(6.5);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setTextColor(color.text.r, color.text.g, color.text.b);
                            pdf.text(statusText, pageWidth - 24, detailY + 4.5, { align: 'center' });

                            // Équipe
                            pdf.setFontSize(6.5);
                            pdf.setFont('helvetica', 'normal');
                            pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);

                            let equipeName = '';
                            if (task.equipes_detail && task.equipes_detail.length > 0) {
                                equipeName = task.equipes_detail.map((e: any) => e.nom_equipe || e.nomEquipe).join(', ');
                            } else if (task.equipe_detail) {
                                equipeName = (task.equipe_detail as any).nom_equipe || task.equipe_detail.nomEquipe || '';
                            }

                            if (equipeName) {
                                const maxEquipeWidth = 100;
                                if (pdf.getTextWidth(equipeName) > maxEquipeWidth) {
                                    while (pdf.getTextWidth(equipeName + '…') > maxEquipeWidth && equipeName.length > 0) {
                                        equipeName = equipeName.slice(0, -1);
                                    }
                                    equipeName += '…';
                                }
                                pdf.text(`👥 ${equipeName}`, 15, detailY + 9);
                            }

                            // Badge réalisée
                            if (distribution?.status === 'REALISEE') {
                                pdf.setFillColor(colors.green.r, colors.green.g, colors.green.b);
                                pdf.circle(pageWidth - 5, detailY + 7, 1.5, 'F');
                                pdf.setTextColor(255, 255, 255);
                                pdf.setFontSize(5);
                                pdf.text('✓', pageWidth - 5.5, detailY + 8);
                            }

                            detailY += rowHeight + 1;
                        });

                        detailY += 5;
                    });
                }
            } else {
                // Vue liste (agenda/day) - Affichage en tableau
                const startY = 35;
                const rowHeight = 8;
                const isDayView = currentView === 'day';

                // Colonnes identiques pour vue jour et vue agenda (avec plus de détails)
                const colWidths = {
                    time: 22,
                    task: 65,
                    client: 40,
                    site: 45,
                    equipe: 40,
                    status: 28
                };

                // Fonction pour dessiner l'en-tête du tableau
                const drawTableHeader = (yPos: number) => {
                    pdf.setFillColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                    pdf.rect(10, yPos, pageWidth - 20, rowHeight, 'F');

                    pdf.setFontSize(7.5);
                    pdf.setTextColor(255, 255, 255);
                    pdf.setFont('helvetica', 'bold');

                    let xPos = 12;
                    pdf.text('Horaire', xPos, yPos + 5.5);
                    xPos += colWidths.time;
                    pdf.text('Tâche', xPos, yPos + 5.5);
                    xPos += colWidths.task;
                    pdf.text('Client', xPos, yPos + 5.5);
                    xPos += colWidths.client;
                    pdf.text('Site', xPos, yPos + 5.5);
                    xPos += colWidths.site;
                    pdf.text('Équipe', xPos, yPos + 5.5);
                    xPos += colWidths.equipe;
                    pdf.text('Statut', xPos, yPos + 5.5);
                };

                // Dessiner l'en-tête initial
                drawTableHeader(startY);

                // Préparer les données à afficher
                let dataRows: Array<{
                    task: Tache;
                    date: Date;
                    timeRange: string;
                    distributionStatus?: StatusDistribution;
                    equipes?: string;
                }> = [];

                if (isDayView) {
                    // Vue jour : afficher les distributions de charge
                    const dateKey = format(currentDate, 'yyyy-MM-dd');

                    tasksToRender.forEach(task => {
                        const distribution = task.distributions_charge?.find(d => d.date === dateKey);

                        if (distribution) {
                            // Tâche avec distribution pour ce jour
                            const heureDebut = distribution.heure_debut || '08:00';
                            const heureFin = distribution.heure_fin || '17:00';
                            const timeRange = `${heureDebut.substring(0, 5)} - ${heureFin.substring(0, 5)}`;

                            // Récupérer les équipes
                            let equipes = '';
                            if (task.equipes_detail && task.equipes_detail.length > 0) {
                                equipes = task.equipes_detail.map(e => e.nomEquipe).join(', ');
                            } else if (task.equipe_detail) {
                                equipes = task.equipe_detail.nomEquipe || '';
                            }

                            dataRows.push({
                                task,
                                date: new Date(`${dateKey}T${heureDebut}`),
                                timeRange,
                                distributionStatus: distribution.status,
                                equipes
                            });
                        } else {
                            // Tâche sans distribution (fallback)
                            const taskDate = new Date(task.date_debut_planifiee);
                            const timeRange = format(taskDate, 'HH:mm') + ' - ' + format(new Date(task.date_fin_planifiee), 'HH:mm');

                            let equipes = '';
                            if (task.equipes_detail && task.equipes_detail.length > 0) {
                                equipes = task.equipes_detail.map(e => e.nomEquipe).join(', ');
                            } else if (task.equipe_detail) {
                                equipes = task.equipe_detail.nomEquipe || '';
                            }

                            dataRows.push({
                                task,
                                date: taskDate,
                                timeRange,
                                equipes
                            });
                        }
                    });
                } else {
                    // Vue agenda : afficher toutes les distributions organisées par jour
                    tasksToRender.forEach(task => {
                        // Si la tâche a des distributions, afficher chaque distribution
                        if (task.distributions_charge && task.distributions_charge.length > 0) {
                            task.distributions_charge.forEach(distribution => {
                                const heureDebut = distribution.heure_debut || '08:00';
                                const heureFin = distribution.heure_fin || '17:00';
                                const timeRange = `${heureDebut.substring(0, 5)} - ${heureFin.substring(0, 5)}`;

                                // Récupérer les équipes
                                let equipes = '';
                                if (task.equipes_detail && task.equipes_detail.length > 0) {
                                    equipes = task.equipes_detail.map(e => e.nomEquipe).join(', ');
                                } else if (task.equipe_detail) {
                                    equipes = task.equipe_detail.nomEquipe || '';
                                }

                                dataRows.push({
                                    task,
                                    date: new Date(`${distribution.date}T${heureDebut}`),
                                    timeRange,
                                    distributionStatus: distribution.status,
                                    equipes
                                });
                            });
                        } else {
                            // Tâche sans distribution (fallback)
                            const taskDate = new Date(task.date_debut_planifiee);
                            const timeRange = format(taskDate, 'HH:mm') + ' - ' + format(new Date(task.date_fin_planifiee), 'HH:mm');

                            let equipes = '';
                            if (task.equipes_detail && task.equipes_detail.length > 0) {
                                equipes = task.equipes_detail.map(e => e.nomEquipe).join(', ');
                            } else if (task.equipe_detail) {
                                equipes = task.equipe_detail.nomEquipe || '';
                            }

                            dataRows.push({
                                task,
                                date: taskDate,
                                timeRange,
                                equipes
                            });
                        }
                    });
                }

                // Trier par date/heure
                dataRows.sort((a, b) => a.date.getTime() - b.date.getTime());

                let currentY = startY + rowHeight;
                const maxY = pageHeight - 20; // Laisser de l'espace pour la légende
                let lastDateStr = '';
                let rowIndex = 0;

                dataRows.forEach((row) => {
                    const task = row.task;
                    const currentDateStr = format(row.date, 'yyyy-MM-dd');

                    // Ajouter un séparateur de jour pour la vue agenda
                    if (!isDayView && currentDateStr !== lastDateStr) {
                        // Vérifier si on a besoin d'une nouvelle page pour le séparateur + première ligne
                        if (currentY + 10 + rowHeight > maxY) {
                            pdf.addPage();
                            currentY = 20;
                            drawTableHeader(currentY);
                            currentY += rowHeight;
                        }

                        // Séparateur de jour
                        if (lastDateStr !== '') {
                            currentY += 2; // Petit espace avant le nouveau jour
                        }

                        pdf.setFillColor(colors.grayLight.r, colors.grayLight.g, colors.grayLight.b);
                        pdf.rect(10, currentY, pageWidth - 20, 7, 'F');

                        pdf.setFontSize(9);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);
                        const dayLabel = format(row.date, 'EEEE d MMMM yyyy', { locale: fr });
                        pdf.text(dayLabel, 15, currentY + 4.5);

                        // Compter les distributions pour ce jour
                        const dayCount = dataRows.filter(r => format(r.date, 'yyyy-MM-dd') === currentDateStr).length;
                        pdf.setFontSize(8);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(`${dayCount} distribution${dayCount > 1 ? 's' : ''}`, pageWidth - 15, currentY + 4.5, { align: 'right' });

                        currentY += 8;
                        lastDateStr = currentDateStr;
                        rowIndex = 0;
                    }

                    // Vérifier si on a besoin d'une nouvelle page pour cette ligne
                    if (currentY + rowHeight > maxY) {
                        pdf.addPage();
                        currentY = 20;
                        drawTableHeader(currentY);
                        currentY += rowHeight;
                        rowIndex = 0;
                    }

                    // Déterminer la couleur selon le statut (distribution ou tâche)
                    let taskColor;
                    let statusText: string;

                    if (row.distributionStatus) {
                        // Couleur basée sur le statut de distribution
                        taskColor = row.distributionStatus === 'REALISEE'
                            ? { bg: colors.greenLight, text: colors.greenDark, border: colors.green }
                            : { bg: colors.blueLight, text: colors.blueDark, border: colors.blue };
                        statusText = STATUS_DISTRIBUTION_LABELS[row.distributionStatus];
                    } else {
                        // Couleur basée sur le statut de la tâche
                        taskColor = getTaskColor(task);
                        const statusLabels: Record<string, string> = {
                            'PLANIFIEE': 'Planifiée',
                            'NON_DEBUTEE': 'Non débutée',
                            'EN_COURS': 'En cours',
                            'TERMINEE': 'Terminée',
                            'ANNULEE': 'Annulée'
                        };
                        statusText = statusLabels[task.statut] || task.statut;
                    }

                    // Fond alterné pour lisibilité
                    if (rowIndex % 2 === 0) {
                        pdf.setFillColor(250, 250, 252);
                        pdf.rect(10, currentY, pageWidth - 20, rowHeight, 'F');
                    }

                    // Bordure gauche colorée selon le statut
                    pdf.setFillColor(taskColor.border.r, taskColor.border.g, taskColor.border.b);
                    pdf.rect(10, currentY, 2, rowHeight, 'F');

                    pdf.setFontSize(6.5);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);

                    let xPos = 12;

                    // Horaire
                    pdf.text(row.timeRange, xPos, currentY + 5.5);
                    xPos += colWidths.time;

                    // Nom de la tâche (tronquer si nécessaire)
                    pdf.setFont('helvetica', 'bold');
                    let taskName = (task.reference ? `[${task.reference}] ` : '') + task.type_tache_detail.nom_tache;
                    const maxTaskWidth = colWidths.task - 2;
                    if (pdf.getTextWidth(taskName) > maxTaskWidth) {
                        while (pdf.getTextWidth(taskName + '…') > maxTaskWidth && taskName.length > 0) {
                            taskName = taskName.slice(0, -1);
                        }
                        taskName += '…';
                    }
                    pdf.text(taskName, xPos, currentY + 5.5);
                    xPos += colWidths.task;

                    // Client (tronquer si nécessaire)
                    pdf.setFont('helvetica', 'normal');
                    let clientName = task.structure_client_detail?.nom
                        || task.client_detail?.structure?.nom
                        || task.client_detail?.nomStructure
                        || 'N/A';
                    const maxClientWidth = colWidths.client - 2;
                    if (pdf.getTextWidth(clientName) > maxClientWidth) {
                        while (pdf.getTextWidth(clientName + '…') > maxClientWidth && clientName.length > 0) {
                            clientName = clientName.slice(0, -1);
                        }
                        clientName += '…';
                    }
                    pdf.text(clientName, xPos, currentY + 5.5);
                    xPos += colWidths.client;

                    // Site (tronquer si nécessaire)
                    pdf.setFont('helvetica', 'normal');
                    let siteName = task.site_detail?.nom || task.site_detail?.nom_site || 'Non spécifié';
                    const maxSiteWidth = colWidths.site - 2;
                    if (pdf.getTextWidth(siteName) > maxSiteWidth) {
                        while (pdf.getTextWidth(siteName + '…') > maxSiteWidth && siteName.length > 0) {
                            siteName = siteName.slice(0, -1);
                        }
                        siteName += '…';
                    }
                    pdf.text(siteName, xPos, currentY + 5.5);
                    xPos += colWidths.site;

                    // Équipe (tronquer si nécessaire)
                    pdf.setFont('helvetica', 'normal');
                    let equipeName = row.equipes || 'Non assignée';
                    const maxEquipeWidth = colWidths.equipe - 2;
                    if (pdf.getTextWidth(equipeName) > maxEquipeWidth) {
                        while (pdf.getTextWidth(equipeName + '…') > maxEquipeWidth && equipeName.length > 0) {
                            equipeName = equipeName.slice(0, -1);
                        }
                        equipeName += '…';
                    }
                    pdf.text(equipeName, xPos, currentY + 5.5);
                    xPos += colWidths.equipe;

                    // Statut (badge coloré)
                    pdf.setFillColor(taskColor.bg.r, taskColor.bg.g, taskColor.bg.b);
                    pdf.roundedRect(xPos, currentY + 1.5, colWidths.status - 2, 5, 1, 1, 'F');

                    pdf.setFontSize(6);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(taskColor.text.r, taskColor.text.g, taskColor.text.b);
                    pdf.text(statusText, xPos + (colWidths.status - 2) / 2, currentY + 5, { align: 'center' });

                    currentY += rowHeight;
                    rowIndex++;
                });

                // Message si aucune donnée
                if (dataRows.length === 0) {
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'italic');
                    pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
                    const emptyMessage = isDayView
                        ? 'Aucune distribution de travail pour ce jour'
                        : 'Aucune tâche pour cette période';
                    pdf.text(emptyMessage, pageWidth / 2, startY + 40, { align: 'center' });
                }
            }


            // Légende en bas (conforme aux statuts du backend)
            const legendY = pageHeight - 8;
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);
            pdf.text('Statuts:', 10, legendY);

            // Légende adaptée selon la vue
            const legendItems = (currentView === 'day' || currentView === 'week') ? [
                { label: 'Non Réalisée', color: colors.blue },
                { label: 'Réalisée', color: colors.green },
            ] : [
                { label: 'Planifiée', color: colors.blue },
                { label: 'Non débutée', color: colors.gray },
                { label: 'En cours', color: colors.orange },
                { label: 'Terminée', color: colors.green },
                { label: 'Annulée', color: colors.red },
            ];

            let legendX = 26;
            legendItems.forEach(item => {
                pdf.setFillColor(item.color.r, item.color.g, item.color.b);
                pdf.roundedRect(legendX, legendY - 2.5, 3, 3, 0.5, 0.5, 'F');
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);
                pdf.text(item.label, legendX + 4.5, legendY);
                legendX += pdf.getTextWidth(item.label) + 10;
            });

            // Légende priorité urgente (seulement pour vues non-jour et non-semaine)
            if (currentView !== 'day' && currentView !== 'week') {
                pdf.setFont('helvetica', 'bold');
                pdf.text('|  Priorité:', legendX + 2, legendY);
                legendX += pdf.getTextWidth('|  Priorité:') + 4;
                pdf.setFillColor(colors.red.r, colors.red.g, colors.red.b);
                pdf.roundedRect(legendX, legendY - 2.5, 3, 3, 0.5, 0.5, 'F');
                pdf.setFont('helvetica', 'normal');
                pdf.text('Haute/Urgent', legendX + 4.5, legendY);
            }

            // Pied de page (sur la même ligne que la légende, à droite)
            pdf.setFontSize(6);
            pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
            pdf.text('Document généré automatiquement par GreenSIG', pageWidth - 10, legendY, { align: 'right' });

            pdf.save(`planning_greensig_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Erreur export PDF:', error);
            alert('Une erreur est survenue lors de l\'exportation.');
        } finally {
            setIsExporting(false);
        }
    };

    // CRUD Handlers
    const handleUpdateTache = async (data: TacheCreate) => {
        const target = tacheToEdit || popoverInfo?.tache;
        if (!target) return;
        try {
            // ✅ Ne pas utiliser localInputToUTC car les dates sont maintenant au format YYYY-MM-DD (DateField)
            const updateData: TacheUpdate = {
                equipes_ids: data.equipes_ids,
                date_debut_planifiee: data.date_debut_planifiee,
                date_fin_planifiee: data.date_fin_planifiee,
                priorite: data.priorite,
                commentaires: data.commentaires,
                objets: data.objets,
                charge_estimee_heures: data.charge_estimee_heures,
                distributions_charge_data: data.distributions_charge_data
            };
            await planningService.updateTache(target.id, updateData);
            await loadTaches();
            setShowCreateForm(false);
            setTacheToEdit(null);
            setPopoverInfo(null);
        } catch (err) { alert('Erreur modification'); }
    };

    const handleCreateTache = async (data: TacheCreate) => {
        console.log('🟢 [Planning] handleCreateTache APPELÉE');
        console.log('🔵 [Planning] Données reçues:', data);
        console.log('🔵 [Planning] recurrence_config:', data.recurrence_config);

        try {
            console.log('🔵 [Planning] Création de la tâche avec data:', data);

            // ✅ Ne pas utiliser localInputToUTC car les dates sont maintenant au format YYYY-MM-DD (DateField)
            const createdTask = await planningService.createTache(data);
            console.log('✅ [Planning] Tâche de base créée:', createdTask);

            // ✅ Gérer la récurrence si activée
            const recurrenceConfig = data.recurrence_config;
            console.log('🔵 [Planning] Configuration de récurrence:', recurrenceConfig);

            if (recurrenceConfig && recurrenceConfig.enabled && createdTask.id) {
                console.log('🔄 [Planning] Récurrence activée, mode:', recurrenceConfig.mode);

                try {
                    let recurrenceResult;

                    if (recurrenceConfig.mode === 'frequency') {
                        console.log('📅 [Planning] Appel API dupliquer-recurrence avec fréquence:', recurrenceConfig.frequency);
                        // Mode fréquence prédéfinie
                        recurrenceResult = await planningService.dupliquerTacheRecurrence(createdTask.id, {
                            frequence: recurrenceConfig.frequency!,
                            nombre_occurrences: recurrenceConfig.nombre_occurrences,
                            date_fin_recurrence: recurrenceConfig.date_fin_recurrence,
                            conserver_equipes: recurrenceConfig.conserver_equipes,
                            conserver_objets: recurrenceConfig.conserver_objets
                        });
                    } else if (recurrenceConfig.mode === 'custom') {
                        console.log('⚙️ [Planning] Appel API dupliquer avec décalage:', recurrenceConfig.decalage_jours);
                        // Mode décalage personnalisé
                        recurrenceResult = await planningService.dupliquerTache(createdTask.id, {
                            decalage_jours: recurrenceConfig.decalage_jours!,
                            nombre_occurrences: recurrenceConfig.nombre_occurrences,
                            date_fin_recurrence: recurrenceConfig.date_fin_recurrence,
                            conserver_equipes: recurrenceConfig.conserver_equipes,
                            conserver_objets: recurrenceConfig.conserver_objets
                        });
                    } else if (recurrenceConfig.mode === 'dates') {
                        console.log('📆 [Planning] Appel API dupliquer-dates avec:', recurrenceConfig.dates_cibles);
                        // Mode dates spécifiques
                        recurrenceResult = await planningService.dupliquerTacheDates(createdTask.id, {
                            dates_cibles: recurrenceConfig.dates_cibles!,
                            conserver_equipes: recurrenceConfig.conserver_equipes,
                            conserver_objets: recurrenceConfig.conserver_objets
                        });
                    }

                    console.log('✅ [Planning] Résultat de la récurrence:', recurrenceResult);

                    // Afficher un message de succès avec le nombre de tâches créées
                    if (recurrenceResult) {
                        const totalCreated = 1 + recurrenceResult.nombre_taches_creees;
                        alert(`✅ ${totalCreated} tâche${totalCreated > 1 ? 's' : ''} créée${totalCreated > 1 ? 's' : ''} avec succès\n(1 tâche de base + ${recurrenceResult.nombre_taches_creees} occurrence${recurrenceResult.nombre_taches_creees > 1 ? 's' : ''})`);
                    }
                } catch (recurrenceError: any) {
                    console.error('❌ [Planning] Erreur lors de la création des occurrences:', recurrenceError);
                    console.error('❌ [Planning] Message d\'erreur:', recurrenceError.message);
                    console.error('❌ [Planning] Stack:', recurrenceError.stack);
                    alert(`⚠️ Tâche de base créée, mais erreur lors de la génération des occurrences:\n${recurrenceError.message || recurrenceError}`);
                }
            } else {
                console.log('ℹ️ [Planning] Pas de récurrence activée');
            }

            await loadTaches();
            setShowCreateForm(false);
        } catch (err: any) {
            console.error('❌ [Planning] Erreur lors de la création:', err);
            alert(`Erreur création: ${err.message || err}`);
        }
    };

    const handleDeleteTache = (id: number) => {
        setTacheToDelete(id);
        setPopoverInfo(null); // Fermer le popover avant suppression
    };

    const confirmDelete = async () => {
        if (!tacheToDelete) return;
        const deletedId = tacheToDelete;

        try {
            await planningService.deleteTache(deletedId);
            setTaches(prev => prev.filter(t => t.id !== deletedId));
            setTacheToDelete(null);
        } catch (err) {
            // En cas d'erreur, recharger pour restaurer l'état correct
            console.error('Erreur suppression tâche:', err);
            await loadTaches();
            throw err; // Re-throw pour que le modal affiche l'erreur
        }
    };

    const handleDeleteDistribution = (id: number) => {
        setDistributionToDelete(id);
        setPopoverInfo(null); // Fermer le popover
    };

    const confirmDeleteDistribution = async () => {
        if (!distributionToDelete) return;

        try {
            await planningService.deleteDistribution(distributionToDelete);

            // Mise à jour optimiste ou rechargement
            await loadTaches(); // Recharger pour avoir l'état à jour (plus simple et sûr)

            setDistributionToDelete(null);
            setToast({
                visible: true,
                message: "Distribution supprimée avec succès"
            });
            setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
        } catch (err) {
            console.error('Erreur suppression distribution:', err);
            alert("Erreur lors de la suppression de la distribution");
        }
    };
    const handleResetCharge = async (tacheId: number) => { try { await planningService.resetCharge(tacheId); await loadTaches(); } catch (err) { alert('Erreur charge'); } };

    // Quick Task Creator Handlers
    const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
        if (isReadOnly) return;

        setQuickCreatorDate(slotInfo.start);
        setQuickCreatorStartTime(format(slotInfo.start, 'HH:mm'));
        setQuickCreatorEndTime(format(slotInfo.end, 'HH:mm'));
        setShowQuickCreator(true);
    };

    const handleLoadObjects = async (siteId: number): Promise<InventoryObjectOption[]> => {
        try {
            const response = await fetchInventory({ page_size: 200, site: siteId });
            return response.results.map((item: any) => ({
                id: item.id ?? item.properties?.id,
                type: item.properties.object_type,
                nom: item.properties.nom || item.properties.famille || `${item.properties.object_type} #${item.id}`,
                site: item.properties.site_nom,
                soussite: item.properties.sous_site_nom,
                superficie: item.properties.superficie_calculee, // ✅ FIX: Ajouter superficie pour calcul de charge
                etat: item.properties.etat, // ✅ FIX: Ajouter état pour filtrage
                famille: item.properties.famille // ✅ FIX: Ajouter famille
            }));
        } catch (err) {
            console.error('Erreur chargement objets:', err);
            return [];
        }
    };

    const handleCheckTaskTypeCompatibility = async (objectTypes: string[]): Promise<TypeTache[]> => {
        try {
            const result = await planningService.getApplicableTypesTaches(objectTypes);
            return result.types_taches;
        } catch (err) {
            console.error('Erreur vérification compatibilité:', err);
            return typesTaches; // Fallback to all types
        }
    };

    // MICRO-INTERACTION: Toggle Complete (ancienne version - garde pour compatibilité)
    const handleToggleComplete = async (tache: Tache) => {
        const oldStatus = tache.statut;
        const newStatus = oldStatus === 'TERMINEE' ? 'PLANIFIEE' : 'TERMINEE';

        // Optimistic Update
        setTaches(prev => prev.map(t => t.id === tache.id ? { ...t, statut: newStatus } : t));
        if (popoverInfo && popoverInfo.tache.id === tache.id) {
            setPopoverInfo({ ...popoverInfo, tache: { ...popoverInfo.tache, statut: newStatus } });
        }

        // Show Toast
        setToast({
            visible: true,
            message: newStatus === 'TERMINEE' ? 'Tâche terminée' : 'Tâche réouverte',
            undoAction: () => handleToggleComplete({ ...tache, statut: newStatus }) // Undo = toggle back
        });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);

        try {
            await planningService.updateTache(tache.id, { statut: newStatus });
        } catch (err) {
            // Rollback on error
            setTaches(prev => prev.map(t => t.id === tache.id ? { ...t, statut: oldStatus } : t));
            alert("Erreur lors de la mise à jour");
        }
    };

    // ✅ NOUVEAU: Toggle du statut d'une distribution de charge
    const handleToggleDistribution = async (distributionId: number, currentStatus: StatusDistribution) => {
        const newStatus: StatusDistribution = currentStatus === 'REALISEE' ? 'NON_REALISEE' : 'REALISEE';

        // Optimistic Update
        setTaches(prev => prev.map(t => ({
            ...t,
            distributions_charge: t.distributions_charge?.map(d =>
                d.id === distributionId ? { ...d, status: newStatus } : d
            )
        })));

        // Update popover
        if (popoverInfo && popoverInfo.distributionId === distributionId) {
            setPopoverInfo({ ...popoverInfo, distributionStatus: newStatus });
        }

        // Show Toast
        setToast({
            visible: true,
            message: newStatus === 'REALISEE' ? 'Journée marquée comme réalisée' : 'Journée marquée comme non réalisée',
            undoAction: () => handleToggleDistribution(distributionId, newStatus)
        });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);

        try {
            let result;
            if (newStatus === 'REALISEE') {
                result = await planningService.marquerDistributionRealisee(distributionId);
            } else {
                result = await planningService.marquerDistributionNonRealisee(distributionId);
            }

            // Recharger les tâches pour avoir les données à jour
            await loadTaches();

            // Afficher un message supplémentaire si le statut de la tâche a changé
            if (result.tache_statut_modifie) {
                setTimeout(() => {
                    setToast({
                        visible: true,
                        message: newStatus === 'REALISEE'
                            ? 'La tâche est maintenant en cours'
                            : 'La tâche est repassée en planifiée',
                        undoAction: undefined
                    });
                    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
                }, 500);
            }
        } catch (err) {
            // Rollback on error
            setTaches(prev => prev.map(t => ({
                ...t,
                distributions_charge: t.distributions_charge?.map(d =>
                    d.id === distributionId ? { ...d, status: currentStatus } : d
                )
            })));
            alert("Erreur lors de la mise à jour de la distribution");
        }
    };

    // Calendar Interaction
    const onSelectEvent = (event: CalendarEvent, e: React.SyntheticEvent) => {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        console.log('📅 CALENDAR CLICK:', {
            tache: event.resource.type_tache_detail?.nom_tache,
            clickPosition: {
                mouseEvent: e.nativeEvent instanceof MouseEvent ? {
                    clientX: (e.nativeEvent as MouseEvent).clientX,
                    clientY: (e.nativeEvent as MouseEvent).clientY
                } : 'not a mouse event',
            },
            targetElement: {
                tag: target.tagName,
                class: target.className,
                boundingRect: {
                    top: rect.top,
                    left: rect.left,
                    right: rect.right,
                    bottom: rect.bottom,
                    width: rect.width,
                    height: rect.height,
                }
            }
        });

        setPopoverInfo({
            tache: event.resource,
            reference: target, // Floating UI handles positioning automatically
            eventStart: event.start,
            eventEnd: event.end,
            distributionStatus: event.distributionStatus,  // ✅ Statut de la distribution
            distributionId: event.distributionId  // ✅ ID de la distribution
        });
    };

    const onNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        if (action === 'TODAY') { setSlideDirection(currentDate < new Date() ? 'right' : 'left'); setCurrentDate(new Date()); return; }
        setSlideDirection(action === 'NEXT' ? 'right' : 'left');
        switch (currentView) {
            case 'month': setCurrentDate(prev => action === 'NEXT' ? addMonths(prev, 1) : subMonths(prev, 1)); break;
            case 'week': setCurrentDate(prev => action === 'NEXT' ? addWeeks(prev, 1) : subWeeks(prev, 1)); break;
            case 'day': setCurrentDate(prev => action === 'NEXT' ? addDays(prev, 1) : subDays(prev, 1)); break;
            case 'agenda': setCurrentDate(prev => action === 'NEXT' ? addMonths(prev, 1) : subMonths(prev, 1)); break;
        }
    };

    const dateLabel = useMemo(() => {
        switch (currentView) {
            case 'month': return format(currentDate, 'MMMM yyyy', { locale: fr });
            case 'week': { const start = startOfWeek(currentDate, { locale: fr, weekStartsOn: 1 }); const end = endOfWeek(currentDate, { locale: fr, weekStartsOn: 1 }); return `${format(start, 'd MMM', { locale: fr })} - ${format(end, 'd MMM yyyy', { locale: fr })}`; }
            case 'day': return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr });
            case 'agenda': return `Agenda - ${format(currentDate, 'MMMM yyyy', { locale: fr })}`;
            default: return '';
        }
    }, [currentDate, currentView]);

    const events: CalendarEvent[] = useMemo(() => {
        // ✅ STRATÉGIE UNIFIÉE POUR LES EMPLACEMENTS, MAIS CONTENU ADAPTÉ À LA VUE
        // - Tous les événements sont positionnés sur les jours de distribution (jamais de bloc continu)
        // - EN VUE MOIS : On masque les IDs de distribution pour que le popover affiche la "Tâche globale"
        // - AUTRES VUES : On garde les IDs pour afficher/gérer la "Distribution spécifique"

        return filteredTaches.flatMap(t => {
            // CAS 1: Tâche avec distributions de charge
            if (t.distributions_charge && t.distributions_charge.length > 0) {
                return t.distributions_charge.map(dist => {
                    // Construction déterministe des dates (éviter string parsing et TZ offsets)
                    const [year = 0, month = 0, day = 0] = dist.date.split('-').map(Number);

                    let startTime = dist.heure_debut || '08:00:00';
                    let endTime = dist.heure_fin || '17:00:00';

                    const [sh = 0, sm = 0] = startTime.split(':').map(Number);
                    const [eh = 0, em = 0] = endTime.split(':').map(Number);

                    // Note: Month est 0-indexed dans Date constructor
                    const start = new Date(year, month - 1, day, sh, sm, 0);
                    const end = new Date(year, month - 1, day, eh, em, 0);

                    // ✅ LOGIQUE VUE MOIS: Masquer l'identité "Distribution" pour forcer le mode "Tâche"
                    const isMonthView = currentView === 'month';

                    return {
                        id: t.id,
                        title: t.type_tache_detail.nom_tache,
                        start,
                        end,
                        resource: t,
                        distributionStatus: isMonthView ? undefined : dist.status,
                        distributionId: isMonthView ? undefined : dist.id
                    };
                });
            }

            // CAS 2: Tâche sans distributions (héritage ou simple)
            // On crée un événement unique basé sur les dates de la tâche
            const startDate = new Date(t.date_debut_planifiee);
            const endDate = new Date(t.date_fin_planifiee);

            // Si pas d'heures définies dans les dates (souvent minuit pour les dates sans heure), mettre des défauts
            if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
                startDate.setHours(8, 0, 0);
            }
            if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
                // Si même jour, fin à 17h, sinon conserver la date (l'affichage sur plusieurs jours sera géré par le calendrier)
                endDate.setHours(17, 0, 0);
            }

            return [{
                id: t.id,
                title: t.type_tache_detail.nom_tache,
                start: startDate,
                end: endDate,
                resource: t
                // Pas de distributionId/distributionStatus
            }];
        });
    }, [filteredTaches, currentView]);

    // Group tasks by date for List View
    const tasksByDate = useMemo(() => {
        const groups: { [key: string]: Tache[] } = {};

        filteredTaches.forEach(t => {
            // Si la tâche a des distributions de charge, l'ajouter pour chaque jour de distribution
            if (t.distributions_charge && t.distributions_charge.length > 0) {
                t.distributions_charge.forEach(dist => {
                    const dateKey = dist.date; // déjà au format YYYY-MM-DD
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(t);
                });
            } else {
                // Sinon, utiliser la date_debut_planifiee comme avant
                const dateKey = format(new Date(t.date_debut_planifiee), 'yyyy-MM-dd');
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(t);
            }
        });

        return groups;
    }, [filteredTaches]);

    // Drag & Drop
    const handleEventDrop = useCallback(async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
        try {
            const tache = event.resource;
            await planningService.updateTache(tache.id, { date_debut_planifiee: (start as Date).toISOString(), date_fin_planifiee: (end as Date).toISOString() });
            setTaches(prev => prev.map(t => t.id === tache.id ? { ...t, date_debut_planifiee: (start as Date).toISOString(), date_fin_planifiee: (end as Date).toISOString() } : t));
        } catch (err) { loadTaches(); }
    }, []);
    const handleEventResize = useCallback(async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
        try {
            const tache = event.resource;
            await planningService.updateTache(tache.id, { date_debut_planifiee: (start as Date).toISOString(), date_fin_planifiee: (end as Date).toISOString() });
            setTaches(prev => prev.map(t => t.id === tache.id ? { ...t, date_debut_planifiee: (start as Date).toISOString(), date_fin_planifiee: (end as Date).toISOString() } : t));
        } catch (err) { loadTaches(); }
    }, []);

    // Custom Event Prop Getter to make RBC events transparent
    const eventPropGetter = useCallback(() => ({
        style: { backgroundColor: 'transparent', boxShadow: 'none', padding: 0, border: 'none' }
    }), []);

    // View Selector Component
    const ViewSelector = () => {
        const views = [
            { id: 'month', label: 'Mois' },
            { id: 'week', label: 'Semaine' },
            { id: 'day', label: 'Jour' },
            { id: 'agenda', label: 'Agenda' }
        ];
        const currentLabel = views.find(v => v.id === currentView)?.label;

        return (
            <div className="relative">
                <button
                    onClick={() => setShowViewSelector(!showViewSelector)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
                >
                    {currentLabel}
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {showViewSelector && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowViewSelector(false)} />
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            {views.map(view => (
                                <button
                                    key={view.id}
                                    onClick={() => { setCurrentView(view.id); setShowViewSelector(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${currentView === view.id ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-gray-700'}`}
                                >
                                    {view.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    };

    if (loading) return (
        <div className="fixed inset-0 z-50">
            <LoadingScreen isLoading={true} loop={true} minDuration={0} />
        </div>
    );
    if (error) return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;

    return (
        <div className="h-full flex flex-col bg-white font-sans relative">
            <style>{customCalendarStyles}</style>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center px-6 py-3 border-b border-gray-200 gap-4 bg-white z-20">
                {/* LEFT: Navigation calendrier + Filtres */}
                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto scrollbar-hide">
                    {viewMode === 'calendar' && (
                        <>
                            <button onClick={() => onNavigate('TODAY')} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors shadow-sm shrink-0">Aujourd'hui</button>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => onNavigate('PREV')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                                <button onClick={() => onNavigate('NEXT')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                            </div>
                            <span className="text-xl font-normal text-gray-800 capitalize min-w-[150px] shrink-0">{dateLabel}</span>
                        </>
                    )}
                    {viewMode === 'list' && <h2 className="text-xl font-normal text-gray-800 shrink-0">Agenda des tâches</h2>}

                </div>

                {/* Spacer flexible pour pousser le reste à droite */}
                <div className="flex-1" />

                {/* RIGHT: View controls */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {/* Toggle Filtres (Superposé en dessous) */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`relative p-2.5 rounded-xl transition-all duration-200 shrink-0 ${showFilters || activeFiltersCount > 0
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-2 ring-emerald-500/20'
                                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 shadow-sm'
                                }`}
                            title="Filtres"
                        >
                            <Filter className="w-4 h-4" />
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-md border-2 border-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>

                        {showFilters && (
                            <div className="absolute top-full right-0 mt-3 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="bg-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 min-w-[700px]">
                                    <div className="flex justify-between items-center mb-3 px-1">
                                        <h3 className="text-sm font-semibold text-slate-800">Filtres avancés sur les Tâches</h3>
                                        <button
                                            onClick={() => setShowFilters(false)}
                                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <PlanningFiltersComponent
                                        filters={filters}
                                        onFiltersChange={setFilters}
                                        structures={structures}
                                        sites={sites}
                                        equipes={equipes}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-8 w-px bg-gray-200 hidden md:block shrink-0 mx-1" />

                    {viewMode === 'calendar' && <ViewSelector />}

                    <div className="flex bg-gray-100 p-1 rounded-full">
                        <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-full transition-all duration-200 ${viewMode === 'calendar' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Vue Calendrier"><CalendarIcon className="w-5 h-5" /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all duration-200 ${viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Vue Liste"><List className="w-5 h-5" /></button>
                    </div>

                    {viewMode === 'calendar' && (
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors disabled:opacity-50"
                            title="Exporter en PDF"
                        >
                            {isExporting ? (
                                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Download className="w-5 h-5" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* ✅ NOUVEAU: Légende visuelle */}
            {viewMode === 'calendar' && (
                <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-6 text-xs">
                        <span className="font-medium text-gray-600">Légende:</span>

                        {/* Tâche planifiée */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded border-l-4 border-gray-400 bg-gradient-to-r from-gray-50 to-transparent">
                                <CalendarIcon className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-700">Tâche planifiée</span>
                            </div>
                        </div>

                        {/* Distribution (Dashed) */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded border-l-4 border-gray-400 border-dashed bg-white">
                                <Clock className="w-3 h-3 text-blue-600" />
                                <span className="text-gray-700">Distribution planifiée</span>
                            </div>
                        </div>

                        {/* Réalisée / Terminée */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded border-l-4 border-emerald-500 bg-emerald-50">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span className="text-gray-700">Terminée / Réalisée</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'calendar' ? (
                    <div className={`h-full p-4 transition-opacity duration-300 ${slideDirection === 'right' ? 'animate-slide-right' : slideDirection === 'left' ? 'animate-slide-left' : ''}`} ref={calendarRef} key={currentDate.toString() + currentView}>
                        <DnDCalendar
                            components={{
                                event: TaskEvent,
                            }}
                            localizer={localizer}
                            events={events}
                            popup={true}
                            startAccessor="start"
                            endAccessor="end"
                            // Limite le nombre de lignes visibles dans chaque cellule de mois
                            length={1}
                            style={{ height: '100%' }}
                            messages={{
                                next: "Suivant",
                                previous: "Précédent",
                                today: "Aujourd'hui",
                                month: "Mois",
                                week: "Semaine",
                                day: "Jour",
                                agenda: "Agenda",
                                date: "Date",
                                time: "Heure",
                                event: "Événement",
                                noEventsInRange: "Aucune tâche.",
                                showMore: (count: number) => `+${count} tâche${count > 1 ? 's' : ''}`
                            }}
                            culture='fr'
                            min={new Date(2024, 0, 1, 7, 0, 0)}
                            max={new Date(2024, 0, 1, 19, 0, 0)}
                            step={30}
                            timeslots={2}
                            selectable={!isReadOnly && !(currentUser as any)?.roles?.includes('CLIENT')}
                            onSelectSlot={handleSelectSlot}
                            onSelectEvent={onSelectEvent}
                            views={['month', 'week', 'day', 'agenda']}
                            onEventDrop={(isReadOnly || (currentUser as any)?.roles?.includes('CLIENT')) ? undefined : handleEventDrop}
                            onEventResize={(isReadOnly || (currentUser as any)?.roles?.includes('CLIENT')) ? undefined : handleEventResize}
                            resizable={!isReadOnly && !(currentUser as any)?.roles?.includes('CLIENT')}
                            draggableAccessor={() => !isReadOnly && !(currentUser as any)?.roles?.includes('CLIENT')}
                            date={currentDate}
                            view={currentView as any}
                            onNavigate={setCurrentDate}
                            onView={setCurrentView as any}
                            toolbar={false}
                            eventPropGetter={eventPropGetter}
                        />
                    </div>
                ) : (
                    <div className="p-6 space-y-8 overflow-y-auto h-full bg-white">
                        {Object.keys(tasksByDate).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                                <p>Aucune tâche planifiée.</p>
                            </div>
                        ) : (
                            Object.entries(tasksByDate).map(([dateKey, dayTasks]) => {
                                const date = new Date(dateKey);
                                const isTodayDate = isToday(date);

                                return (
                                    <div key={dateKey} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {/* Date Header */}
                                        <div className="flex items-baseline gap-3 mb-4 sticky top-0 bg-white/95 backdrop-blur-sm py-2 z-10 border-b border-gray-100">
                                            <span className={`text-2xl font-semibold ${isTodayDate ? 'text-emerald-600' : 'text-gray-800'}`}>
                                                {format(date, 'd')}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-medium uppercase tracking-wide ${isTodayDate ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                    {format(date, 'EEEE', { locale: fr })}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {format(date, 'MMMM yyyy', { locale: fr })}
                                                </span>
                                            </div>
                                            {isTodayDate && (
                                                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                    Aujourd'hui
                                                </span>
                                            )}
                                        </div>

                                        {/* Tasks Grid */}
                                        <div className="grid grid-cols-1 gap-3 pl-4 md:pl-10 border-l-2 border-gray-100">
                                            {dayTasks.map((tache) => {
                                                const equipesNames = tache.equipes_detail?.length > 0
                                                    ? tache.equipes_detail.map(e => (e as any).nom_equipe || e.nomEquipe).join(', ')
                                                    : (tache.equipe_detail as any)?.nom_equipe || tache.equipe_detail?.nomEquipe || '';
                                                const hasEquipe = tache.equipes_detail?.length > 0 || tache.equipe_detail;

                                                // Chercher la distribution de charge pour cette date
                                                const distribution = tache.distributions_charge?.find(d => d.date === dateKey);
                                                const heureDebut = distribution?.heure_debut || '08:00';
                                                const heureFin = distribution?.heure_fin || '17:00';

                                                // Créer les dates pour le popover
                                                const eventStart = new Date(`${dateKey}T${heureDebut.split(':').length === 2 ? heureDebut + ':00' : heureDebut}`);
                                                const eventEnd = new Date(`${dateKey}T${heureFin.split(':').length === 2 ? heureFin + ':00' : heureFin}`);

                                                return (
                                                    <div
                                                        key={tache.id}
                                                        onClick={(e) => {
                                                            console.log('📋 AGENDA CLICK:', {
                                                                tache: tache.type_tache_detail?.nom_tache,
                                                                clickPosition: {
                                                                    clientX: e.clientX,
                                                                    clientY: e.clientY,
                                                                    pageX: e.pageX,
                                                                    pageY: e.pageY,
                                                                },
                                                                targetElement: {
                                                                    tag: e.currentTarget.tagName,
                                                                    boundingRect: e.currentTarget.getBoundingClientRect(),
                                                                },
                                                            });

                                                            // Create virtual reference at mouse position (Floating UI pattern)
                                                            const virtualReference: VirtualElement = {
                                                                getBoundingClientRect() {
                                                                    return {
                                                                        width: 0,
                                                                        height: 0,
                                                                        x: e.clientX,
                                                                        y: e.clientY,
                                                                        top: e.clientY,
                                                                        left: e.clientX,
                                                                        right: e.clientX,
                                                                        bottom: e.clientY,
                                                                    };
                                                                },
                                                            };

                                                            console.log('📋 VIRTUAL REFERENCE:', {
                                                                rect: virtualReference.getBoundingClientRect(),
                                                            });

                                                            setPopoverInfo({
                                                                tache: tache,
                                                                reference: virtualReference,
                                                                eventStart: eventStart,
                                                                eventEnd: eventEnd,
                                                                distributionStatus: distribution?.status,
                                                                distributionId: distribution?.id
                                                            });
                                                        }}
                                                        className={`bg-white p-4 rounded-xl border-l-4 border shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group flex flex-col sm:flex-row gap-4 items-start sm:items-center ${distribution?.status === 'REALISEE'
                                                            ? 'border-l-green-500 border-2 bg-green-50'
                                                            : distribution
                                                                ? 'border-l-blue-500 border-gray-200 bg-gradient-to-r from-blue-50/30 to-transparent'
                                                                : 'border-l-gray-400 border-gray-200'
                                                            }`}
                                                    >
                                                        {/* Time Column */}
                                                        <div className="min-w-[80px] text-sm text-gray-500 font-medium flex flex-col items-start">
                                                            <span>{heureDebut.substring(0, 5)}</span>
                                                            <span className="text-xs text-gray-400">{heureFin.substring(0, 5)}</span>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className={`w-2 h-2 rounded-full ${STATUT_TACHE_COLORS[tache.statut].bg.replace('bg-', 'bg-').replace('100', '500')}`} />
                                                                {/* ✅ NOUVEAU: Icône distinctive */}
                                                                {distribution ? (
                                                                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                                ) : (
                                                                    <CalendarIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                                                )}
                                                                <h3 className={`font-semibold transition-colors truncate ${tache.statut === 'TERMINEE' ? 'line-through text-gray-500' : 'text-gray-900 group-hover:text-emerald-600'}`}>
                                                                    {tache.reference && (
                                                                        <span className="text-xs font-mono text-gray-400 mr-2 opacity-70">
                                                                            {tache.reference}
                                                                        </span>
                                                                    )}
                                                                    {tache.type_tache_detail.nom_tache}
                                                                </h3>
                                                                {/* ✅ NOUVEAU: Badge de comptage */}
                                                                {tache.distributions_charge && tache.distributions_charge.length > 1 && !distribution && (
                                                                    <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-semibold">
                                                                        {tache.distributions_charge.length}j
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-500 flex items-center gap-3">
                                                                {hasEquipe ? (
                                                                    <span className="flex items-center gap-1.5 text-gray-600">
                                                                        <Users className="w-3.5 h-3.5" />
                                                                        {equipesNames}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-amber-600 italic text-xs flex items-center gap-1">
                                                                        <AlertTriangle className="w-3 h-3" />
                                                                        Non assignée
                                                                    </span>
                                                                )}
                                                                {tache.charge_estimee_heures && (
                                                                    <span className="flex items-center gap-1 text-gray-400 text-xs">
                                                                        <Timer className="w-3 h-3" />
                                                                        {tache.charge_estimee_heures}h
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Status Badges */}
                                                        <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
                                                            <StatusBadge status={tache.statut}>
                                                                {STATUT_TACHE_LABELS[tache.statut]}
                                                            </StatusBadge>
                                                            {/* Badge statut distribution */}
                                                            {distribution?.status && (
                                                                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_DISTRIBUTION_COLORS[distribution.status].bg} ${STATUS_DISTRIBUTION_COLORS[distribution.status].text}`}>
                                                                    {STATUS_DISTRIBUTION_LABELS[distribution.status]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* POPOVER DETAIL */}
            {popoverInfo && (
                <TaskDetailPopover
                    tache={popoverInfo.tache}
                    eventStart={popoverInfo.eventStart}
                    eventEnd={popoverInfo.eventEnd}
                    distributionStatus={popoverInfo.distributionStatus}
                    distributionId={popoverInfo.distributionId}
                    onClose={() => setPopoverInfo(null)}
                    onEdit={() => { setTacheToEdit(popoverInfo.tache); setShowCreateForm(true); }}
                    onDelete={() => {
                        if (popoverInfo.distributionId) {
                            handleDeleteDistribution(popoverInfo.distributionId);
                        } else {
                            handleDeleteTache(popoverInfo.tache.id);
                        }
                    }}
                    onToggleDistribution={
                        popoverInfo.distributionId && popoverInfo.distributionStatus
                            ? () => handleToggleDistribution(popoverInfo.distributionId!, popoverInfo.distributionStatus!)
                            : undefined
                    }
                    onUpdate={loadTaches}
                    isReadOnly={isReadOnly || (currentUser as any)?.roles?.includes('CLIENT')}
                />
            )}

            {/* TOAST NOTIFICATION */}
            {toast.visible && (
                <div className="fixed bottom-6 left-6 z-[100] bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <span className="text-sm font-medium">{toast.message}</span>
                    {toast.undoAction && (
                        <button
                            onClick={() => { toast.undoAction?.(); setToast(prev => ({ ...prev, visible: false })); }}
                            className="text-emerald-400 hover:text-emerald-300 text-sm font-bold uppercase tracking-wide flex items-center gap-1"
                        >
                            <CornerUpLeft className="w-3 h-3" /> Annuler
                        </button>
                    )}
                    <button onClick={() => setToast(prev => ({ ...prev, visible: false }))} className="text-gray-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Create/Edit Modal - Only ADMIN and SUPERVISEUR can create/edit tasks */}
            {showCreateForm && permissions.canCreateTask && (() => {
                console.log('🟡 [Planning] Rendu TaskFormModal - tacheToEdit:', tacheToEdit);
                console.log('🟡 [Planning] onSubmit sera:', tacheToEdit ? 'handleUpdateTache' : 'handleCreateTache');
                return (
                    <TaskFormModal
                        tache={tacheToEdit || undefined}
                        initialValues={initialTaskValues}
                        preSelectedObjects={preSelectedObjects}
                        equipes={equipes}
                        typesTaches={typesTaches}
                        onClose={() => { setShowCreateForm(false); setTacheToEdit(null); setInitialTaskValues(undefined); setPreSelectedObjects(undefined); }}
                        onSubmit={tacheToEdit ? handleUpdateTache : handleCreateTache}
                        onResetCharge={handleResetCharge}
                    />
                );
            })()}

            {/* Delete Confirmation Modal */}
            {tacheToDelete && (
                <ConfirmDeleteModal
                    title="Supprimer la tâche ?"
                    message="Cette action est irréversible."
                    onConfirm={confirmDelete}
                    onCancel={() => setTacheToDelete(null)}
                />
            )}

            {/* Delete Distribution Confirmation Modal */}
            {distributionToDelete && (
                <ConfirmDeleteModal
                    title="Supprimer la distribution ?"
                    message="Voulez-vous vraiment supprimer cette journée d'intervention ? La tâche globale ne sera pas supprimée."
                    onConfirm={confirmDeleteDistribution}
                    onCancel={() => setDistributionToDelete(null)}
                />
            )}

            {/* Quick Task Creator - Only ADMIN and SUPERVISEUR */}
            {showQuickCreator && permissions.canCreateTask && (
                <QuickTaskCreator
                    isOpen={showQuickCreator}
                    onClose={() => setShowQuickCreator(false)}
                    onSubmit={handleCreateTache}
                    typesTaches={typesTaches}
                    equipes={equipes}
                    sites={sites.map(s => ({ id: Number(s.id), name: s.name }))}
                    initialDate={quickCreatorDate}
                    initialStartTime={quickCreatorStartTime}
                    initialEndTime={quickCreatorEndTime}
                    onLoadObjects={handleLoadObjects}
                    onCheckTaskTypeCompatibility={handleCheckTaskTypeCompatibility}
                />
            )}
        </div>
    );
};

export default Planning;