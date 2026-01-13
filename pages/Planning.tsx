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
    ChevronLeft, ChevronRight, CheckCircle2, MoreVertical, CornerUpLeft, ChevronDown
} from 'lucide-react';
import { planningService } from '../services/planningService';
import { fetchEquipes, fetchClients } from '../services/usersApi';
import { fetchCurrentUser } from '../services/api';
import {
    Tache, TacheCreate, TacheUpdate, TypeTache,
    STATUT_TACHE_LABELS, STATUT_TACHE_COLORS,
    PRIORITE_LABELS,
    STATUS_DISTRIBUTION_LABELS, STATUS_DISTRIBUTION_COLORS,
    type StatusDistribution
} from '../types/planning';
import { EquipeList, Client } from '../types/users';
import { usePermissions } from '../hooks/usePermissions';
import type { User, Role } from '../types';
import TaskFormModal, { InventoryObjectOption } from '../components/planning/TaskFormModal';
import QuickTaskCreator from '../components/planning/QuickTaskCreator';
import { StatusBadge } from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';
import { fetchSites, fetchInventory } from '../services/api';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
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
                border-l-4 relative
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
    isReadOnly?: boolean;
}

const TaskDetailPopover: FC<PopoverProps> = ({ tache, eventStart, eventEnd, distributionStatus, distributionId, onClose, onEdit, onDelete, onToggleDistribution, isReadOnly }) => {
    // Si on a une distribution, on utilise son statut, sinon on utilise le statut de la tâche
    const isCompleted = distributionStatus ? distributionStatus === 'REALISEE' : tache.statut === 'TERMINEE';
    // Vérifier si la tâche a au moins une équipe
    const hasEquipe = (tache.equipes_detail && tache.equipes_detail.length > 0) || tache.equipe_detail;
    // Désactiver le toggle si la tâche est terminée ou si pas d'équipe
    const isDistributionDisabled = isReadOnly || tache.statut === 'TERMINEE' || !hasEquipe;

    // Handle escape key and click outside
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
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
                    className="w-[420px] max-w-full bg-white rounded-xl shadow-2xl border border-gray-100 animate-popover flex flex-col overflow-hidden pointer-events-auto"
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
                                    <button onClick={onEdit} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Modifier">
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
                    <div className="px-6 py-5">
                        <div className="flex items-start gap-4">
                            {/* Big Checkbox - disabled for CLIENT (readOnly), TERMINEE tasks, or tasks without team */}
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
                                mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                                ${isCompleted
                                            ? 'bg-emerald-600 border-emerald-600 text-white animate-check'
                                            : 'bg-white border-gray-400 hover:border-emerald-500 hover:bg-emerald-50'
                                        }
                                ${isDistributionDisabled ? 'cursor-not-allowed opacity-60' : ''}
                            `}
                                >
                                    {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                            )}

                            <div className="flex-1">
                                <h3 className={`text-lg font-medium leading-snug ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                    {tache.type_tache_detail.nom_tache}
                                    {tache.reference && (
                                        <span className="ml-2 text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded align-middle">
                                            {tache.reference}
                                        </span>
                                    )}
                                </h3>
                                <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span>
                                            {eventStart
                                                ? format(eventStart, 'EEEE d MMMM', { locale: fr })
                                                : format(new Date(tache.date_debut_planifiee), 'EEEE d MMMM', { locale: fr })
                                            }
                                            <span className="mx-1">•</span>
                                            {eventStart && eventEnd
                                                ? `${format(eventStart, 'HH:mm')} - ${format(eventEnd, 'HH:mm')}`
                                                : `${format(new Date(tache.date_debut_planifiee), 'HH:mm')} - ${format(new Date(tache.date_fin_planifiee), 'HH:mm')}`
                                            }
                                        </span>
                                    </div>
                                    {(tache.equipes_detail?.length > 0 || tache.equipe_detail) ? (
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span>
                                                {tache.equipes_detail?.length > 0
                                                    ? tache.equipes_detail.map(e => (e as any).nom_equipe || e.nomEquipe).join(', ')
                                                    : (tache.equipe_detail as any)?.nom_equipe || tache.equipe_detail?.nomEquipe}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span className="text-sm font-medium">Assigner une équipe à cette tâche</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body / Context */}
                    {(tache.commentaires || tache.priorite) && (
                        <div className="px-6 pb-6 pt-0 space-y-4">
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
    const [sites, setSites] = useState<Array<{ id: number; name: string }>>([]);

    const [_clients, setClients] = useState<Client[]>([]);
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

    // Toutes les tâches (pas de filtrage dans Planning, les filtres sont dans SuiviTaches)
    const filteredTaches = taches;

    // ... (Data Loading & Navigation Effects - unchanged)
    useEffect(() => { loadStableData(); loadTaches(); }, []);
    // ... (Keep existing useEffects for location state)

    const loadStableData = async () => {
        try {
            setLoading(true);
            const [equipesData, typesData, userData, clientsData] = await Promise.all([
                fetchEquipes().then(data => data.results || data),
                planningService.getTypesTaches(),
                fetchCurrentUser(),
                fetchClients() // NOUVEAU: Fetch clients for filters
            ]);
            setEquipes(Array.isArray(equipesData) ? equipesData : []);
            setTypesTaches(typesData);

            // NOUVEAU: Extraire clients
            const clientsArray = clientsData.results || [];
            console.log('📊 [CLIENTS] Clients chargés:', clientsArray);
            console.log('  → Nombre de clients:', clientsArray.length);
            console.log('  → Premiers clients:', clientsArray.slice(0, 3).map(c => ({
                utilisateur: c.utilisateur,
                nom: c.structure?.nom || c.nomStructure
            })));
            setClients(clientsArray);

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

            // Load sites separately (non-blocking)
            fetchSites()
                .then(sitesData => {
                    console.log('Sites data received:', sitesData);
                    console.log('Sites data type:', typeof sitesData);
                    console.log('Sites data.results type:', typeof sitesData?.results);

                    // Extract array from various possible formats
                    let results: any[] = [];
                    if (Array.isArray(sitesData)) {
                        console.log('✓ sitesData is array, length:', sitesData.length);
                        results = sitesData;
                    } else if (sitesData.results) {
                        console.log('sitesData.results exists');

                        // Check if results is a FeatureCollection (has type and features properties)
                        if (typeof sitesData.results === 'object' &&
                            !Array.isArray(sitesData.results) &&
                            'features' in sitesData.results &&
                            Array.isArray(sitesData.results.features)) {
                            console.log('✓ sitesData.results.features is array (GeoJSON), length:', sitesData.results.features.length);
                            results = sitesData.results.features;
                        }
                        // Check if results is an array
                        else if (Array.isArray(sitesData.results)) {
                            console.log('✓ sitesData.results is array, length:', sitesData.results.length);
                            results = sitesData.results;
                        }
                        // Unexpected format
                        else {
                            console.log('⚠️ sitesData.results is object, keys:', Object.keys(sitesData.results));
                            console.log('This should not happen - unexpected format');
                            results = [];
                        }
                    } else if ('features' in sitesData && Array.isArray(sitesData.features)) {
                        console.log('✓ sitesData.features is array (GeoJSON at root), length:', sitesData.features.length);
                        results = sitesData.features;
                    }

                    console.log('Results before mapping:', results);
                    console.log('Results length:', results.length);

                    const sitesArray = results
                        .filter((s: any) => s != null) // Filter out null/undefined
                        .map((s: any) => {
                            // Handle both GeoJSON format and plain format
                            const id = s.properties?.id || s.id;
                            const name = s.properties?.nom_site || s.nom_site || `Site #${id}`;
                            console.log('Processing site:', { raw: s, extracted: { id, name } });
                            return { id, name };
                        })
                        .filter((s: any) => s.id != null); // Filter out items without valid id

                    console.log('Sites processed:', sitesArray);
                    console.log('Final sites count:', sitesArray.length);
                    setSites(sitesArray);
                })
                .catch(err => {
                    console.warn('Sites non disponibles:', err);
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
                // For week view, include tasks from the displayed week
                const weekStart = new Date(currentDate);
                weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));

                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);

                tasksToRender = filteredTaches.filter(t => {
                    const taskDate = new Date(t.date_debut_planifiee);
                    return taskDate >= weekStart && taskDate < weekEnd;
                });
            } else if (currentView === 'day') {
                // For day view, include tasks from the current day
                const dayStart = new Date(currentDate);
                dayStart.setHours(0, 0, 0, 0);

                const dayEnd = new Date(currentDate);
                dayEnd.setHours(23, 59, 59, 999);

                tasksToRender = filteredTaches.filter(t => {
                    const taskDate = new Date(t.date_debut_planifiee);
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
                const startY = 32;
                const cellWidth = (pageWidth - 20) / 7;
                const cellHeight = 26;
                const headerHeight = 8;

                // En-têtes des jours avec style amélioré
                const dayNames = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
                pdf.setFillColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                pdf.rect(10, startY, pageWidth - 20, headerHeight, 'F');

                pdf.setFontSize(9);
                pdf.setTextColor(255, 255, 255);
                pdf.setFont('helvetica', 'bold');
                dayNames.forEach((day, i) => {
                    const x = 10 + (i * cellWidth) + (cellWidth / 2);
                    pdf.text(day, x, startY + 5.5, { align: 'center' });
                });

                // Calculer les jours du mois
                const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));

                // Dessiner la grille et les tâches
                for (let i = 0; i < 42; i++) {
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + i);

                    const currentRow = Math.floor(i / 7);
                    const currentCol = i % 7;

                    const x = 10 + (currentCol * cellWidth);
                    const y = startY + headerHeight + (currentRow * cellHeight);

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

                    // Tâches du jour
                    const dayTasks = tasksToRender.filter(t => {
                        const taskDate = new Date(t.date_debut_planifiee);
                        return taskDate.getDate() === date.getDate() &&
                            taskDate.getMonth() === date.getMonth() &&
                            taskDate.getFullYear() === date.getFullYear();
                    }).sort((a, b) => new Date(a.date_debut_planifiee).getTime() - new Date(b.date_debut_planifiee).getTime());

                    let taskY = y + 8;
                    const maxTasksPerCell = 3;
                    const taskHeight = 4.2;

                    dayTasks.slice(0, maxTasksPerCell).forEach((task) => {
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

                        const taskTime = format(new Date(task.date_debut_planifiee), 'HH:mm');
                        const taskText = `${taskTime} ${task.type_tache_detail.nom_tache}`;

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
                        taskY += taskHeight + 0.6;
                    });

                    // Indicateur "+X autres"
                    if (dayTasks.length > maxTasksPerCell) {
                        pdf.setFontSize(6);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
                        pdf.text(`+${dayTasks.length - maxTasksPerCell} autre${dayTasks.length - maxTasksPerCell > 1 ? 's' : ''}`, x + 2, taskY + 2);
                    }
                }
            } else if (currentView === 'week') {
                // Vue semaine
                const startY = 32;
                const timeColWidth = 15;
                const cellWidth = (pageWidth - 20 - timeColWidth) / 7;
                const headerHeight = 10;
                const hourHeight = 12;
                const startHour = 7;
                const endHour = 19;

                // En-têtes des jours avec dates
                const weekStart = startOfWeek(currentDate, { locale: fr, weekStartsOn: 1 });
                const dayNames = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

                pdf.setFillColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                pdf.rect(10 + timeColWidth, startY, pageWidth - 20 - timeColWidth, headerHeight, 'F');

                pdf.setFontSize(8);
                pdf.setTextColor(255, 255, 255);
                pdf.setFont('helvetica', 'bold');

                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(dayDate.getDate() + i);
                    const x = 10 + timeColWidth + (i * cellWidth) + (cellWidth / 2);
                    const isToday = dayDate.toDateString() === today.toDateString();

                    if (isToday) {
                        pdf.setFillColor(255, 255, 255);
                        pdf.circle(x, startY + 5, 4, 'F');
                        pdf.setTextColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                    } else {
                        pdf.setTextColor(255, 255, 255);
                    }
                    pdf.text(`${dayNames[i]} ${dayDate.getDate()}`, x, startY + 6, { align: 'center' });
                }

                // Grille horaire
                const gridStartY = startY + headerHeight;
                for (let hour = startHour; hour <= endHour; hour++) {
                    const y = gridStartY + (hour - startHour) * hourHeight;

                    // Ligne de l'heure
                    pdf.setDrawColor(230, 230, 230);
                    pdf.setLineWidth(0.1);
                    pdf.line(10, y, pageWidth - 10, y);

                    // Label de l'heure
                    pdf.setFontSize(7);
                    pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(`${hour.toString().padStart(2, '0')}:00`, 12, y + 3);
                }

                // Bordures des colonnes
                for (let i = 0; i <= 7; i++) {
                    const x = 10 + timeColWidth + (i * cellWidth);
                    pdf.setDrawColor(220, 220, 220);
                    pdf.line(x, gridStartY, x, gridStartY + (endHour - startHour) * hourHeight);
                }

                // Dessiner les tâches de la semaine
                for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(dayDate.getDate() + dayIndex);

                    const dayTasks = tasksToRender.filter(t => {
                        const taskDate = new Date(t.date_debut_planifiee);
                        return taskDate.toDateString() === dayDate.toDateString();
                    });

                    dayTasks.forEach((task) => {
                        const taskStart = new Date(task.date_debut_planifiee);
                        const taskEnd = new Date(task.date_fin_planifiee);
                        const startHourTask = taskStart.getHours() + taskStart.getMinutes() / 60;
                        const endHourTask = taskEnd.getHours() + taskEnd.getMinutes() / 60;

                        if (startHourTask >= startHour && startHourTask < endHour) {
                            const x = 10 + timeColWidth + (dayIndex * cellWidth) + 1;
                            const y = gridStartY + (startHourTask - startHour) * hourHeight;
                            const height = Math.min((endHourTask - startHourTask) * hourHeight, (endHour - startHourTask) * hourHeight);
                            const width = cellWidth - 2;

                            const taskColor = getTaskColor(task);

                            pdf.setFillColor(taskColor.bg.r, taskColor.bg.g, taskColor.bg.b);
                            pdf.roundedRect(x, y, width, Math.max(height, 6), 1, 1, 'F');

                            pdf.setFillColor(taskColor.border.r, taskColor.border.g, taskColor.border.b);
                            pdf.rect(x, y + 0.5, 1, Math.max(height, 6) - 1, 'F');

                            pdf.setFontSize(6);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setTextColor(taskColor.text.r, taskColor.text.g, taskColor.text.b);

                            const taskText = task.type_tache_detail.nom_tache;
                            const maxTextWidth = width - 3;
                            let displayText = taskText;
                            if (pdf.getTextWidth(taskText) > maxTextWidth) {
                                let truncated = taskText;
                                while (pdf.getTextWidth(truncated + '…') > maxTextWidth && truncated.length > 0) {
                                    truncated = truncated.slice(0, -1);
                                }
                                displayText = truncated + '…';
                            }
                            pdf.text(displayText, x + 2, y + 4);
                        }
                    });
                }
            } else {
                // Vue liste (agenda/day) - Affichage en tableau
                const startY = 35;
                const rowHeight = 8;
                const colWidths = {
                    date: 35,
                    time: 20,
                    task: 90,
                    client: 50,
                    status: 30
                };

                // En-tête du tableau
                pdf.setFillColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
                pdf.rect(10, startY, pageWidth - 20, rowHeight, 'F');

                pdf.setFontSize(8);
                pdf.setTextColor(255, 255, 255);
                pdf.setFont('helvetica', 'bold');

                let xPos = 12;
                pdf.text('Date', xPos, startY + 5.5);
                xPos += colWidths.date;
                pdf.text('Heure', xPos, startY + 5.5);
                xPos += colWidths.time;
                pdf.text('Tâche', xPos, startY + 5.5);
                xPos += colWidths.task;
                pdf.text('Client', xPos, startY + 5.5);
                xPos += colWidths.client;
                pdf.text('Statut', xPos, startY + 5.5);

                // Trier les tâches par date
                const sortedTasks = [...tasksToRender].sort((a, b) =>
                    new Date(a.date_debut_planifiee).getTime() - new Date(b.date_debut_planifiee).getTime()
                );

                let currentY = startY + rowHeight;
                const maxY = pageHeight - 20; // Laisser de l'espace pour la légende

                sortedTasks.forEach((task, index) => {
                    // Vérifier si on a besoin d'une nouvelle page
                    if (currentY + rowHeight > maxY) {
                        pdf.addPage();
                        currentY = 20;
                    }

                    const taskColor = getTaskColor(task);
                    const taskDate = new Date(task.date_debut_planifiee);

                    // Fond alterné pour lisibilité
                    if (index % 2 === 0) {
                        pdf.setFillColor(250, 250, 252);
                        pdf.rect(10, currentY, pageWidth - 20, rowHeight, 'F');
                    }

                    // Bordure gauche colorée selon le statut
                    pdf.setFillColor(taskColor.border.r, taskColor.border.g, taskColor.border.b);
                    pdf.rect(10, currentY, 2, rowHeight, 'F');

                    pdf.setFontSize(7);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);

                    xPos = 14;
                    // Date
                    pdf.text(format(taskDate, 'dd/MM/yyyy', { locale: fr }), xPos, currentY + 5.5);
                    xPos += colWidths.date;

                    // Heure
                    pdf.text(format(taskDate, 'HH:mm'), xPos, currentY + 5.5);
                    xPos += colWidths.time;

                    // Nom de la tâche (tronquer si nécessaire)
                    pdf.setFont('helvetica', 'bold');
                    let taskName = task.type_tache_detail.nom_tache;
                    const maxTaskWidth = colWidths.task - 4;
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
                    let clientName = task.client_detail?.structure?.nom || task.client_detail?.nomStructure || 'N/A';
                    const maxClientWidth = colWidths.client - 4;
                    if (pdf.getTextWidth(clientName) > maxClientWidth) {
                        while (pdf.getTextWidth(clientName + '…') > maxClientWidth && clientName.length > 0) {
                            clientName = clientName.slice(0, -1);
                        }
                        clientName += '…';
                    }
                    pdf.text(clientName, xPos, currentY + 5.5);
                    xPos += colWidths.client;

                    // Statut (badge coloré)
                    const statusLabels: Record<string, string> = {
                        'PLANIFIEE': 'Planifiée',
                        'NON_DEBUTEE': 'Non débutée',
                        'EN_COURS': 'En cours',
                        'TERMINEE': 'Terminée',
                        'ANNULEE': 'Annulée'
                    };
                    const statusText = statusLabels[task.statut] || task.statut;

                    pdf.setFillColor(taskColor.bg.r, taskColor.bg.g, taskColor.bg.b);
                    pdf.roundedRect(xPos, currentY + 1.5, colWidths.status - 2, 5, 1, 1, 'F');

                    pdf.setFontSize(6);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(taskColor.text.r, taskColor.text.g, taskColor.text.b);
                    pdf.text(statusText, xPos + (colWidths.status - 2) / 2, currentY + 5, { align: 'center' });

                    currentY += rowHeight;
                });

                // Message si aucune tâche
                if (sortedTasks.length === 0) {
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'italic');
                    pdf.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
                    pdf.text('Aucune tâche pour cette période', pageWidth / 2, startY + 40, { align: 'center' });
                }
            }


            // Légende en bas (conforme aux statuts du backend)
            const legendY = pageHeight - 8;
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(colors.grayDark.r, colors.grayDark.g, colors.grayDark.b);
            pdf.text('Statuts:', 10, legendY);

            const legendItems = [
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

            // Légende priorité urgente
            pdf.setFont('helvetica', 'bold');
            pdf.text('|  Priorité:', legendX + 2, legendY);
            legendX += pdf.getTextWidth('|  Priorité:') + 4;
            pdf.setFillColor(colors.red.r, colors.red.g, colors.red.b);
            pdf.roundedRect(legendX, legendY - 2.5, 3, 3, 0.5, 0.5, 'F');
            pdf.setFont('helvetica', 'normal');
            pdf.text('Haute/Urgent', legendX + 4.5, legendY);

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
        try {
            // ✅ Ne pas utiliser localInputToUTC car les dates sont maintenant au format YYYY-MM-DD (DateField)
            await planningService.createTache(data);
            await loadTaches();
            setShowCreateForm(false);
        } catch (err) { alert('Erreur création'); }
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
                superficie: item.properties.superficie_calculee // ✅ FIX: Ajouter superficie pour calcul de charge
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
        return filteredTaches.flatMap(t => {
            // Si la tâche a des distributions de charge, créer un événement par jour
            if (t.distributions_charge && t.distributions_charge.length > 0) {
                return t.distributions_charge.map(dist => {
                    // Construire les dates avec les heures depuis les distributions
                    const dateStr = dist.date; // YYYY-MM-DD
                    let startTime = dist.heure_debut || '08:00:00';
                    let endTime = dist.heure_fin || '17:00:00';

                    // Normaliser le format de l'heure (gérer HH:MM et HH:MM:SS)
                    if (startTime.split(':').length === 2) startTime += ':00';
                    if (endTime.split(':').length === 2) endTime += ':00';

                    const start = new Date(`${dateStr}T${startTime}`);
                    const end = new Date(`${dateStr}T${endTime}`);

                    return {
                        id: t.id,
                        title: t.type_tache_detail.nom_tache,
                        start,
                        end,
                        resource: t,
                        distributionStatus: dist.status,  // ✅ Statut de la distribution
                        distributionId: dist.id  // ✅ ID de la distribution
                    };
                });
            }

            // Fallback: utiliser les dates planifiées (pour les tâches sans distributions)
            const startDate = new Date(t.date_debut_planifiee);
            const endDate = new Date(t.date_fin_planifiee);

            // Si pas d'heures, utiliser des heures par défaut
            if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
                startDate.setHours(8, 0, 0);
            }
            if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
                endDate.setHours(17, 0, 0);
            }

            return [{
                id: t.id,
                title: t.type_tache_detail.nom_tache,
                start: startDate,
                end: endDate,
                resource: t
            }];
        });
    }, [filteredTaches]);

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
            <div className="flex flex-col md:flex-row justify-between items-center px-6 py-3 border-b border-gray-200 gap-4 bg-white z-10">
                {/* LEFT: Navigation calendrier */}
                <div className="flex items-center gap-6 w-full md:w-auto">
                    {viewMode === 'calendar' && (
                        <>
                            <button onClick={() => onNavigate('TODAY')} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors shadow-sm">Aujourd'hui</button>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onNavigate('PREV')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                                <button onClick={() => onNavigate('NEXT')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                            </div>
                            <span className="text-xl font-normal text-gray-800 capitalize min-w-[180px]">{dateLabel}</span>
                        </>
                    )}
                    {viewMode === 'list' && <h2 className="text-xl font-normal text-gray-800">Agenda des tâches</h2>}
                </div>

                {/* CENTER: Spacer */}
                <div className="flex-1" />

                {/* RIGHT: View controls */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
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

                        {/* Distribution de charge */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent">
                                <Clock className="w-3 h-3 text-blue-600" />
                                <span className="text-gray-700">Distribution</span>
                            </div>
                        </div>

                        {/* Tâche simple */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded border-l-4 border-gray-400 bg-gradient-to-r from-gray-50 to-transparent">
                                <CalendarIcon className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-700">Tâche simple</span>
                            </div>
                        </div>

                        {/* Tâche avec distributions multiples */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded border-l-4 border-gray-400 bg-gradient-to-r from-gray-50 to-transparent">
                                <CalendarIcon className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-700">Tâche</span>
                                <span className="text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-semibold">3j</span>
                            </div>
                        </div>

                        {/* Distribution réalisée */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded border-l-4 border-green-500 bg-green-50">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                <span className="text-gray-700">Réalisée</span>
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
                            components={{ event: TaskEvent }}
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            messages={{ next: "Suivant", previous: "Précédent", today: "Aujourd'hui", month: "Mois", week: "Semaine", day: "Jour", agenda: "Agenda", date: "Date", time: "Heure", event: "Événement", noEventsInRange: "Aucune tâche." }}
                            culture='fr'
                            min={new Date(2024, 0, 1, 7, 0, 0)}
                            max={new Date(2024, 0, 1, 19, 0, 0)}
                            step={30}
                            timeslots={2}
                            selectable={!isReadOnly}
                            onSelectSlot={handleSelectSlot}
                            onSelectEvent={onSelectEvent}
                            views={['month', 'week', 'day', 'agenda']}
                            onEventDrop={isReadOnly ? undefined : handleEventDrop}
                            onEventResize={isReadOnly ? undefined : handleEventResize}
                            resizable={!isReadOnly}
                            draggableAccessor={() => !isReadOnly}
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
                    onDelete={() => handleDeleteTache(popoverInfo.tache.id)}
                    onToggleDistribution={
                        popoverInfo.distributionId && popoverInfo.distributionStatus
                            ? () => handleToggleDistribution(popoverInfo.distributionId!, popoverInfo.distributionStatus!)
                            : undefined
                    }
                    isReadOnly={isReadOnly}
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
            {showCreateForm && permissions.canCreateTask && (
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
            )}

            {/* Delete Confirmation Modal */}
            {tacheToDelete && (
                <ConfirmDeleteModal
                    title="Supprimer la tâche ?"
                    message="Cette action est irréversible."
                    onConfirm={confirmDelete}
                    onCancel={() => setTacheToDelete(null)}
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
                    sites={sites}
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