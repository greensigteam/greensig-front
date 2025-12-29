import { useState, useEffect, useMemo, useCallback, memo, useRef, type FC, type MouseEvent } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { useLocation } from 'react-router-dom';
import {
    format, parse, startOfWeek, getDay, endOfWeek,
    addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import {
    Users, Clock, X, Trash2, Edit, Timer, AlertTriangle, Download, Calendar as CalendarIcon, List,
    ChevronLeft, ChevronRight, Circle, CheckCircle2, MoreVertical, CornerUpLeft, ChevronDown
} from 'lucide-react';
import { planningService } from '../services/planningService';
import { fetchEquipes, fetchClients } from '../services/usersApi';
import { fetchCurrentUser } from '../services/api';
import {
    Tache, TacheCreate, TacheUpdate, TypeTache,
    STATUT_TACHE_LABELS, STATUT_TACHE_COLORS,
    PRIORITE_LABELS, PRIORITE_COLORS,
    PlanningFilters, EMPTY_PLANNING_FILTERS, countActivePlanningFilters
} from '../types/planning';
import { EquipeList, Client } from '../types/users';
import TaskFormModal, { InventoryObjectOption } from '../components/planning/TaskFormModal';
import QuickTaskCreator from '../components/planning/QuickTaskCreator';
import PlanningFiltersComponent from '../components/planning/PlanningFilters';
import { StatusBadge } from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';
import { fetchSites, fetchInventory } from '../services/api';
import {
    useFloating,
    offset,
    flip,
    shift,
    autoUpdate,
    FloatingPortal,
    useDismiss,
    useInteractions,
    type ReferenceType,
    type VirtualElement,
    type Placement
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
}

// ============================================================================
// COMPOSANT TÂCHE (Google Tasks Style)
// ============================================================================

const TaskEvent = memo(function TaskEvent({ event, title }: { event: CalendarEvent, title: string }) {
    const tache = event.resource;
    const isCompleted = tache.statut === 'TERMINEE';
    const isUrgent = tache.priorite === 5;

    // Gestion du clic sur la checkbox (stop propagation pour ne pas ouvrir le détail)
    const handleCheckClick = (e: MouseEvent) => {
        e.stopPropagation();
        // L'action sera gérée par le parent via une fonction passée ou un contexte,
        // mais ici on simule visuellement pour l'instant ou on utilise un bus d'événement
        // Pour simplifier, on laisse le clic global gérer l'ouverture, et le détail aura la checkbox.
        // Si on veut le check direct depuis la grille, il faut passer la fonction update.
    };

    return (
        <div
            className={`
                group flex items-start gap-2 p-1.5 rounded-lg transition-all duration-200
                ${isCompleted ? 'opacity-60' : 'hover:bg-gray-100'}
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
            <div className="flex flex-col leading-tight min-w-0">
                <span
                    className={`
                        text-xs font-medium truncate
                        ${isCompleted ? 'line-through text-gray-500' : 'text-gray-700'}
                        ${isUrgent && !isCompleted ? 'text-red-700 font-semibold' : ''}
                    `}
                >
                    {tache.type_tache_detail.nom_tache}
                </span>

                {/* Métadonnées (Heure si pas all-day, ou équipe) */}
                {!isCompleted && (
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-medium">
                            {format(event.start, 'HH:mm')}
                        </span>
                        {tache.equipes_detail?.length > 0 && (
                            <span className="text-[9px] px-1 py-0.5 bg-gray-100 rounded text-gray-500 truncate max-w-[80px]">
                                {tache.equipes_detail.length > 1 ? `${tache.equipes_detail.length} éq.` : tache.equipes_detail[0].nomEquipe}
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

/**
 * Calculate transform-origin based on Floating UI placement
 * This ensures the "genie lamp" animation originates from the correct direction
 */
const getTransformOrigin = (placement: Placement): string => {
    const [side, alignment = 'center'] = placement.split('-') as [string, string?];

    const sideOrigins: Record<string, string> = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
    };

    const originSide = sideOrigins[side];
    const originAlign = alignment || 'center';

    // Horizontal placements (left/right): "right center", "left start", etc.
    if (side === 'left' || side === 'right') {
        return `${originSide} ${originAlign}`;
    }

    // Vertical placements (top/bottom): "center bottom", "start top", etc.
    return `${originAlign} ${originSide}`;
};

interface PopoverProps {
    tache: Tache;
    reference: ReferenceType;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleComplete: () => void;
}

const TaskDetailPopover: FC<PopoverProps> = ({ tache, reference, onClose, onEdit, onDelete, onToggleComplete }) => {
    const [isOpen, setIsOpen] = useState(true);

    console.log('🎯 POPOVER RENDER:', {
        tache: tache.titre,
        referenceType: reference instanceof Element ? 'DOM Element' : 'VirtualElement',
        referenceBoundingRect: reference && typeof reference === 'object' && 'getBoundingClientRect' in reference
            ? reference.getBoundingClientRect()
            : 'No getBoundingClientRect',
    });

    // Floating UI handles all positioning automatically
    const { refs, floatingStyles, placement, context } = useFloating({
        open: isOpen,
        onOpenChange: (open) => {
            setIsOpen(open);
            if (!open) onClose();
        },
        placement: 'right-start', // Preferred placement
        strategy: 'fixed', // CRITICAL: Use fixed positioning because FloatingPortal renders in body
        middleware: [
            offset(10), // 10px gap from reference element
            flip({
                // Try these placements in order if primary doesn't fit
                fallbackPlacements: [
                    'left-start',
                    'right-end',
                    'left-end',
                    'top-start',
                    'bottom-start',
                    'top',
                    'bottom'
                ],
                padding: 20, // Keep 20px from viewport edges
            }),
            shift({
                padding: 10, // Allow shifting to fit in viewport
            }),
        ],
        whileElementsMounted: autoUpdate, // Auto-repositions on scroll/resize
        elements: {
            reference: reference as any, // Pass reference directly (supports DOM elements and VirtualElement)
        },
    });

    console.log('🎯 FLOATING UI RESULT:', {
        placement,
        floatingStyles,
        transformOrigin: getTransformOrigin(placement),
    });

    // Built-in dismiss handling (ESC key + outside clicks)
    const dismiss = useDismiss(context, {
        outsidePress: true,
        escapeKey: true,
    });

    const { getFloatingProps } = useInteractions([dismiss]);

    const isCompleted = tache.statut === 'TERMINEE';

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={{
                    ...floatingStyles,
                    transformOrigin: getTransformOrigin(placement),
                }}
                {...getFloatingProps()}
                className="z-[1000] w-[400px] bg-white rounded-xl shadow-2xl border border-gray-100 animate-popover flex flex-col overflow-hidden"
            >
                {/* Header Actions */}
                <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-50">
                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1">
                        <button onClick={onEdit} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Modifier">
                            <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={onDelete} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="px-6 py-5">
                    <div className="flex items-start gap-4">
                        {/* Big Checkbox */}
                        <button
                            onClick={onToggleComplete}
                            className={`
                            mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                            ${isCompleted
                                    ? 'bg-emerald-600 border-emerald-600 text-white animate-check'
                                    : 'bg-white border-gray-400 hover:border-emerald-500 hover:bg-emerald-50'
                                }
                        `}
                        >
                            {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                        </button>

                        <div className="flex-1">
                            <h3 className={`text-lg font-medium leading-snug ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {tache.type_tache_detail.nom_tache}
                            </h3>
                            <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span>
                                        {format(new Date(tache.date_debut_planifiee), 'EEEE d MMMM', { locale: fr })}
                                        <span className="mx-1">•</span>
                                        {format(new Date(tache.date_debut_planifiee), 'HH:mm')} - {format(new Date(tache.date_fin_planifiee), 'HH:mm')}
                                    </span>
                                </div>
                                {(tache.equipes_detail?.length > 0 || tache.equipe_detail) && (
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span>
                                            {tache.equipes_detail?.length > 0
                                                ? tache.equipes_detail.map(e => (e as any).nom_equipe || e.nomEquipe).join(', ')
                                                : (tache.equipe_detail as any)?.nom_equipe || tache.equipe_detail?.nomEquipe}
                                        </span>
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
                        <div className="flex items-center gap-2">
                            <StatusBadge variant="default" status={tache.statut}>
                                {STATUT_TACHE_LABELS[tache.statut]}
                            </StatusBadge>
                            {tache.priorite > 1 && (
                                <span className={`text-xs px-2 py-1 rounded-full border ${tache.priorite >= 4 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                    {PRIORITE_LABELS[tache.priorite]}
                                </span>
                            )}
                        </div>
                    </div>
                )}
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

    // === FILTRES STATE ===
    const [clients, setClients] = useState<Client[]>([]);
    const [filters, setFilters] = useState<PlanningFilters>(() => {
        // Restaurer depuis localStorage au mount
        const saved = localStorage.getItem('planningFilters');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse saved filters:', e);
                return EMPTY_PLANNING_FILTERS;
            }
        }
        return EMPTY_PLANNING_FILTERS;
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isReadOnly, setIsReadOnly] = useState(false);
    const [isClientView, setIsClientView] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    // Popover State
    const [popoverInfo, setPopoverInfo] = useState<{ tache: Tache; reference: ReferenceType } | null>(null);

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
    const location = useLocation();
    const [initialTaskValues, setInitialTaskValues] = useState<Partial<TacheCreate> | undefined>(undefined);
    const [preSelectedObjects, setPreSelectedObjects] = useState<InventoryObjectOption[] | undefined>(undefined);

    // === LOGIQUE DE FILTRAGE (Performance optimisée) ===
    const filteredTaches = useMemo(() => {
        let result = taches;

        // Filtre Client
        if (filters.clientId !== null) {
            result = result.filter(t => t.client_detail?.utilisateur === filters.clientId);
        }

        // Filtre Site
        if (filters.siteId !== null) {
            result = result.filter(t =>
                t.objets_detail?.some(obj => obj.site === filters.siteId!.toString())
            );
        }

        // Filtre Équipe (support multi-teams US-PLAN-013)
        if (filters.equipeId !== null) {
            result = result.filter(t => {
                if (t.equipes_detail?.length > 0) {
                    return t.equipes_detail.some(eq => eq.id === filters.equipeId);
                }
                return t.equipe_detail?.id === filters.equipeId;
            });
        }

        // Filtre Statuts (multi-select)
        if (filters.statuts.length > 0) {
            result = result.filter(t => filters.statuts.includes(t.statut));
        }

        return result;
    }, [taches, filters]);

    // Sites filtrés selon client sélectionné
    const availableSites = useMemo(() => {
        console.log('🔍 [FILTRAGE SITES] Début du calcul');
        console.log('  → Client sélectionné:', filters.clientId);
        console.log('  → Nombre total de sites:', sites.length);
        console.log('  → Nombre total de tâches:', taches.length);

        if (filters.clientId === null) {
            console.log('  ✅ Aucun client sélectionné, retour de tous les sites');
            return sites;
        }

        // Filtrer sites via les tâches du client
        const clientTaches = taches.filter(t => t.client_detail?.utilisateur === filters.clientId);
        console.log('  → Tâches du client:', clientTaches.length);

        // Debug: Afficher quelques tâches
        if (clientTaches.length === 0) {
            console.warn('  ⚠️ Aucune tâche trouvée pour ce client !');
            console.log('  → Toutes les tâches:', taches.map(t => ({
                id: t.id,
                client_id: t.client_detail?.utilisateur,
                client_nom: t.client_detail?.nom_structure
            })));
        } else {
            console.log('  → Exemples de tâches client:', clientTaches.slice(0, 3).map(t => ({
                id: t.id,
                type: t.type_tache_detail.nom_tache,
                objets_count: t.objets_detail?.length || 0
            })));
        }

        const siteIds = new Set<number>();

        clientTaches.forEach(t => {
            if (!t.objets_detail || t.objets_detail.length === 0) {
                console.log(`  ⚠️ Tâche ${t.id} n'a pas d'objets liés`);
                return;
            }

            t.objets_detail?.forEach(obj => {
                const siteId = parseInt(obj.site);
                if (!isNaN(siteId)) {
                    siteIds.add(siteId);
                    console.log(`  ✓ Site ${siteId} trouvé via objet ${obj.id}`);
                }
            });
        });

        console.log('  → Sites IDs extraits:', Array.from(siteIds));
        const filteredSites = sites.filter(s => siteIds.has(s.id));
        console.log('  → Sites filtrés:', filteredSites.map(s => ({ id: s.id, name: s.name })));

        return filteredSites;
    }, [filters.clientId, sites, taches]);

    // Handler filtres avec persistence
    const handleFiltersChange = useCallback((newFilters: PlanningFilters) => {
        setFilters(newFilters);
        localStorage.setItem('planningFilters', JSON.stringify(newFilters));
    }, []);

    // Validate saved filters against loaded data (handle deleted IDs)
    useEffect(() => {
        if (loading) return;

        let needsUpdate = false;
        const validated = { ...filters };

        // Validate clientId
        if (filters.clientId !== null && !clients.find(c => c.utilisateur === filters.clientId)) {
            console.warn(`Saved clientId ${filters.clientId} not found in loaded data, resetting`);
            validated.clientId = null;
            validated.siteId = null; // Reset dependent filter
            needsUpdate = true;
        }

        // Validate siteId
        if (filters.siteId !== null && !availableSites.find(s => s.id === filters.siteId)) {
            console.warn(`Saved siteId ${filters.siteId} not found in loaded data, resetting`);
            validated.siteId = null;
            needsUpdate = true;
        }

        // Validate equipeId
        if (filters.equipeId !== null && !equipes.find(e => e.id === filters.equipeId)) {
            console.warn(`Saved equipeId ${filters.equipeId} not found in loaded data, resetting`);
            validated.equipeId = null;
            needsUpdate = true;
        }

        if (needsUpdate) {
            handleFiltersChange(validated);
        }
    }, [loading, clients, equipes, availableSites, filters, handleFiltersChange]);

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
                nom: c.nomStructure
            })));
            setClients(clientsArray);
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

                        // Check if results.features exists (GeoJSON FeatureCollection inside results)
                        if (sitesData.results.features && Array.isArray(sitesData.results.features)) {
                            console.log('✓ sitesData.results.features is array (GeoJSON), length:', sitesData.results.features.length);
                            results = sitesData.results.features;
                        }
                        // Check if results is an array
                        else if (Array.isArray(sitesData.results)) {
                            console.log('✓ sitesData.results is array, length:', sitesData.results.length);
                            results = sitesData.results;
                        }
                        // Check if results is an object (convert to array) - LAST RESORT
                        else if (typeof sitesData.results === 'object' && sitesData.results !== null) {
                            console.log('⚠️ sitesData.results is object, keys:', Object.keys(sitesData.results));
                            console.log('This should not happen - unexpected format');
                            results = [];
                        }
                    } else if (sitesData.features && Array.isArray(sitesData.features)) {
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
                    client_nom: t.client_detail?.nom_structure
                }))
            );

            setTaches(tachesArray);
        } catch (err) {
            console.error('❌ [TÂCHES] Erreur chargement:', err);
        }
    };

    // ... (Keep handleExportPDF)
    const handleExportPDF = async () => {
        if (!calendarRef.current) return;
        setIsExporting(true);
        try {
            const [html2canvasModule, jsPDFModule] = await Promise.all([import('html2canvas'), import('jspdf')]);
            const html2canvas = html2canvasModule.default;
            const { jsPDF } = jsPDFModule;
            const canvas = await html2canvas(calendarRef.current, { scale: 2, useCORS: true, logging: false, windowWidth: calendarRef.current.scrollWidth, windowHeight: calendarRef.current.scrollHeight });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            pdf.setFillColor(245, 247, 250);
            pdf.rect(0, 0, pageWidth, 25, 'F');

            // Ajouter le logo GreenSIG en haut à gauche
            try {
                const logoResponse = await fetch('/logofinal.png');
                if (logoResponse.ok) {
                    const logoBlob = await logoResponse.blob();
                    const logoBase64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(logoBlob);
                    });
                    // Ajouter le logo (30mm largeur x 15mm hauteur)
                    pdf.addImage(logoBase64, 'PNG', 14, 5, 30, 15);
                }
            } catch (logoError) {
                console.error('Erreur chargement logo:', logoError);
            }

            pdf.setFontSize(22);
            pdf.setTextColor(16, 185, 129);
            pdf.text('GreenSIG', 50, 16);
            pdf.setFontSize(14);
            pdf.setTextColor(55, 65, 81);
            pdf.text('Planning des interventions', pageWidth - 14, 16, { align: 'right' });
            const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            pdf.setFontSize(10);
            pdf.setTextColor(107, 114, 128);
            pdf.text(`Exporté le ${dateStr}`, pageWidth - 14, 22, { align: 'right' });
            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const maxHeight = pageHeight - 35;
            let finalHeight = imgHeight;
            let finalWidth = imgWidth;
            if (imgHeight > maxHeight) {
                const ratio = maxHeight / imgHeight;
                finalHeight = maxHeight;
                finalWidth = imgWidth * ratio;
            }
            const xPos = (pageWidth - finalWidth) / 2;
            pdf.addImage(imgData, 'PNG', xPos, 30, finalWidth, finalHeight);
            pdf.setFontSize(8);
            pdf.setTextColor(156, 163, 175);
            pdf.text('Document généré automatiquement par GreenSIG', pageWidth / 2, pageHeight - 5, { align: 'center' });
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
            const updateData: TacheUpdate = { ...data, date_debut_planifiee: new Date(data.date_debut_planifiee).toISOString(), date_fin_planifiee: new Date(data.date_fin_planifiee).toISOString() };
            await planningService.updateTache(target.id, updateData);
            await loadTaches();
            setShowCreateForm(false);
            setTacheToEdit(null);
            setPopoverInfo(null);
        } catch (err) { alert('Erreur modification'); }
    };

    const handleCreateTache = async (data: TacheCreate) => {
        try {
            const createData = { ...data, date_debut_planifiee: new Date(data.date_debut_planifiee).toISOString(), date_fin_planifiee: new Date(data.date_fin_planifiee).toISOString() };
            await planningService.createTache(createData);
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
            // Mise à jour optimiste : retirer la tâche de la liste AVANT l'appel API
            setTaches(prev => prev.filter(t => t.id !== deletedId));
            setTacheToDelete(null); // Fermer le modal immédiatement

            // Appel API en arrière-plan
            await planningService.deleteTache(deletedId);

            // Pas besoin de loadTaches() car on a déjà mis à jour l'état optimistiquement
        } catch (err) {
            // En cas d'erreur, recharger pour restaurer l'état correct
            console.error('Erreur suppression tâche:', err);
            await loadTaches();
            alert('Erreur lors de la suppression');
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
                soussite: item.properties.sous_site_nom
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

    // MICRO-INTERACTION: Toggle Complete
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

    // Calendar Interaction
    const onSelectEvent = (event: CalendarEvent, e: React.SyntheticEvent) => {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        console.log('📅 CALENDAR CLICK:', {
            tache: event.resource.titre,
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

    const events: CalendarEvent[] = useMemo(() => filteredTaches.map(t => ({ id: t.id, title: t.type_tache_detail.nom_tache, start: new Date(t.date_debut_planifiee), end: new Date(t.date_fin_planifiee), resource: t })), [filteredTaches]);

    // Group tasks by date for List View
    const tasksByDate = useMemo(() => {
        const groups: { [key: string]: Tache[] } = {};
        const sorted = [...filteredTaches].sort((a, b) => new Date(a.date_debut_planifiee).getTime() - new Date(b.date_debut_planifiee).getTime());
        sorted.forEach(t => {
            const dateKey = format(new Date(t.date_debut_planifiee), 'yyyy-MM-dd');
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(t);
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

                {/* CENTER: FILTRES */}
                <div className="flex items-center justify-center flex-1">
                    <PlanningFiltersComponent
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        clients={clients}
                        sites={availableSites}
                        equipes={equipes}
                        disabled={loading}
                    />
                </div>

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

                                                return (
                                                    <div
                                                        key={tache.id}
                                                        onClick={(e) => {
                                                            console.log('📋 AGENDA CLICK:', {
                                                                tache: tache.titre,
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
                                                            });
                                                        }}
                                                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                                                    >
                                                        {/* Time Column */}
                                                        <div className="min-w-[80px] text-sm text-gray-500 font-medium flex flex-col items-start">
                                                            <span>{format(new Date(tache.date_debut_planifiee), 'HH:mm')}</span>
                                                            <span className="text-xs text-gray-400">{format(new Date(tache.date_fin_planifiee), 'HH:mm')}</span>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className={`w-2 h-2 rounded-full ${STATUT_TACHE_COLORS[tache.statut].bg.replace('bg-', 'bg-').replace('100', '500')}`} />
                                                                <h3 className={`font-semibold transition-colors truncate ${tache.statut === 'TERMINEE' ? 'line-through text-gray-500' : 'text-gray-900 group-hover:text-emerald-600'}`}>
                                                                    {tache.type_tache_detail.nom_tache}
                                                                </h3>
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

                                                        {/* Status Badge */}
                                                        <div className="flex-shrink-0">
                                                            <StatusBadge variant="default" status={tache.statut}>
                                                                {STATUT_TACHE_LABELS[tache.statut]}
                                                            </StatusBadge>
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
                    reference={popoverInfo.reference}
                    onClose={() => setPopoverInfo(null)}
                    onEdit={() => { setTacheToEdit(popoverInfo.tache); setShowCreateForm(true); }}
                    onDelete={() => handleDeleteTache(popoverInfo.tache.id)}
                    onToggleComplete={() => handleToggleComplete(popoverInfo.tache)}
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

            {/* Create/Edit Modal */}
            {showCreateForm && !isReadOnly && (
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><Trash2 className="w-7 h-7" /></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Supprimer la tâche ?</h3>
                        <p className="text-sm text-gray-500 mb-8">Cette action est irréversible.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setTacheToDelete(null)} className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Task Creator */}
            {showQuickCreator && (
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