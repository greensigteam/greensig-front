import { useState, useEffect, useMemo, useCallback, memo, useRef, type FC } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { useLocation } from 'react-router-dom';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import {
    Users, Clock, X, Trash2, Edit, Search, Filter, UserPlus, Timer, AlertTriangle, Download, Eye
} from 'lucide-react';
// Dynamic imports pour réduire le bundle initial (PDF export utilisé rarement)
// html2canvas et jsPDF sont importés dynamiquement dans handleExportPDF
import { planningService } from '../services/planningService';
import { fetchClients, fetchEquipes } from '../services/usersApi';
import { fetchCurrentUser } from '../services/api';
import {
    Tache, TacheCreate, TacheUpdate, TypeTache,
    STATUT_TACHE_LABELS, STATUT_TACHE_COLORS,
    PRIORITE_LABELS, PRIORITE_COLORS
} from '../types/planning';
import { Client, EquipeList } from '../types/users';
import TaskFormModal, { InventoryObjectOption } from '../components/planning/TaskFormModal';
import { StatusBadge } from '../components/StatusBadge';

// ============================================================================
// CONFIGURATION CALENDRIER
// ============================================================================

const locales = {
    'fr': fr,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// Create Drag and Drop Calendar
const DnDCalendar = withDragAndDrop<CalendarEvent>(BigCalendar);

// Custom Event Interface for RBC
interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource: Tache;
}

// TaskFormModal is imported from '../components/planning/TaskFormModal'

// ============================================================================
// CUSTOM EVENT COMPONENT (memoized for performance)
// ============================================================================

const TaskEvent = memo(function TaskEvent({ event }: { event: CalendarEvent }) {
    const tache = event.resource;
    const isUrgent = tache.priorite === 5;
    const equipesCount = tache.equipes_detail?.length || (tache.equipe_detail ? 1 : 0);
    const equipesNames = tache.equipes_detail?.length > 0
        ? tache.equipes_detail.map(e => (e as any).nom_equipe || e.nomEquipe).join(', ')
        : (tache.equipe_detail as any)?.nom_equipe || tache.equipe_detail?.nomEquipe || '';

    return (
        <div
            className="flex flex-col h-full justify-start leading-tight min-h-[24px] group relative"
            title={`${tache.type_tache_detail.nom_tache}\nÉquipe: ${equipesNames || 'Aucune équipe'}\nPriorité: ${PRIORITE_LABELS[tache.priorite]}\n${tache.charge_estimee_heures ? `Charge: ${tache.charge_estimee_heures}h` : ''}`}
        >
            {/* Priority indicator + Task name */}
            <div className="font-semibold text-xs truncate flex items-center gap-1">
                {isUrgent && (
                    <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 animate-pulse" />
                )}
                {tache.type_tache_detail.nom_tache}
            </div>

            {/* Équipe info */}
            <div className="text-[10px] truncate opacity-90 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-black/20 shrink-0" />
                {equipesCount === 0 ? (
                    <span className="text-orange-600 italic flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Aucune équipe
                    </span>
                ) : (
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {equipesNames}
                    </span>
                )}
            </div>

            {/* Charge info */}
            <div className="flex items-center gap-2 text-[9px] opacity-75 mt-0.5">
                {tache.charge_estimee_heures && (
                    <span className="flex items-center gap-0.5 text-emerald-700/80">
                        <Timer className="w-2.5 h-2.5" />
                        {tache.charge_estimee_heures}h
                    </span>
                )}
            </div>
        </div>
    );
});

// ============================================================================
// MAIN PLANNING COMPONENT
// ============================================================================

const Planning: FC = () => {
    const [taches, setTaches] = useState<Tache[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mode lecture seule pour CHEF_EQUIPE et CLIENT
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [isClientView, setIsClientView] = useState(false);

    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedTache, setSelectedTache] = useState<Tache | null>(null);
    const [filterEquipe, setFilterEquipe] = useState<number | 'all'>('all');

    // Nouveaux filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterClient, setFilterClient] = useState<number | 'all'>('all');
    const [filterStatut, setFilterStatut] = useState<string>('all');
    const [filterType, setFilterType] = useState<number | 'all'>('all');
    const [tacheToDelete, setTacheToDelete] = useState<number | null>(null);

    // Export PDF
    const [isExporting, setIsExporting] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    const location = useLocation();
    const [initialTaskValues, setInitialTaskValues] = useState<Partial<TacheCreate> | undefined>(undefined);
    const [preSelectedObjects, setPreSelectedObjects] = useState<InventoryObjectOption[] | undefined>(undefined);

    // Debounce search term (300ms delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Handle navigation from Reclamations
    useEffect(() => {
        if (location.state?.createTaskFromReclamation && location.state.reclamation) {
            const rec = location.state.reclamation;
            // Set defaults suitable for form
            const now = new Date();
            const end = new Date(now.getTime() + 3600000); // +1 hour

            setInitialTaskValues({
                id_client: rec.client,
                id_equipe: rec.equipe_affectee || null,
                priorite: Math.min(Math.max(rec.urgence || 3, 1), 5) as any,
                commentaires: `[Réclamation #${rec.numero_reclamation}] ${rec.description}`,
                reclamation: rec.id,
                date_debut_planifiee: now.toISOString().slice(0, 16),
                date_fin_planifiee: end.toISOString().slice(0, 16),
            });
            setShowCreateForm(true);
        }
    }, [location]);

    // Handle navigation from Map (selection → task creation)
    useEffect(() => {
        if (location.state?.createTaskFromSelection && location.state.preSelectedObjects) {
            const objects = location.state.preSelectedObjects as InventoryObjectOption[];
            const now = new Date();
            const end = new Date(now.getTime() + 3600000); // +1 hour

            // Determine common site from selected objects
            const sites = [...new Set(objects.map(o => o.site))];
            const siteInfo = sites.length === 1 ? sites[0] : `${sites.length} sites`;

            setPreSelectedObjects(objects);
            setInitialTaskValues({
                objets: objects.map(o => o.id),
                commentaires: `Intervention sur ${objects.length} objet(s) - ${siteInfo}`,
                date_debut_planifiee: now.toISOString().slice(0, 16),
                date_fin_planifiee: end.toISOString().slice(0, 16),
            });
            setShowCreateForm(true);

            // Clear location state to prevent re-triggering on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Load stable data only once (clients, equipes, types, user)
    useEffect(() => {
        loadStableData();
    }, []);

    // Load tasks separately (can be refreshed independently)
    useEffect(() => {
        loadTaches();
    }, []);

    const loadStableData = async () => {
        try {
            setLoading(true);
            const [clientsData, equipesData, typesData, userData] = await Promise.all([
                fetchClients().then(data => data.results || data),
                fetchEquipes().then(data => data.results || data),
                planningService.getTypesTaches(),
                fetchCurrentUser()
            ]);

            setClients(Array.isArray(clientsData) ? clientsData : []);
            setEquipes(Array.isArray(equipesData) ? equipesData : []);
            setTypesTaches(typesData);

            // Déterminer si l'utilisateur est en mode lecture seule (CHEF_EQUIPE sans ADMIN ou CLIENT)
            const roles = userData.roles || [];
            const isChefEquipeOnly = roles.includes('CHEF_EQUIPE') && !roles.includes('ADMIN');
            const isClient = roles.includes('CLIENT');
            setIsReadOnly(isChefEquipeOnly || isClient);
            setIsClientView(isClient);
        } catch (err) {
            setError('Erreur lors du chargement des données');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadTaches = async () => {
        try {
            const tachesData = await planningService.getTaches();
            setTaches(tachesData.results || tachesData);
        } catch (err) {
            console.error('Erreur chargement tâches:', err);
        }
    };

    const handleExportPDF = async () => {
        if (!calendarRef.current) return;
        setIsExporting(true);

        try {
            // Dynamic imports pour réduire le bundle initial
            const [html2canvasModule, jsPDFModule] = await Promise.all([
                import('html2canvas'),
                import('jspdf')
            ]);
            const html2canvas = html2canvasModule.default;
            const { jsPDF } = jsPDFModule;

            const canvas = await html2canvas(calendarRef.current, {
                scale: 2, // Meilleure qualité
                useCORS: true,
                logging: false,
                windowWidth: calendarRef.current.scrollWidth,
                windowHeight: calendarRef.current.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png');
            // jsPDF setup (A4 landscape)
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // En-tête professionnel
            // Fond gris clair pour l'en-tête
            pdf.setFillColor(245, 247, 250);
            pdf.rect(0, 0, pageWidth, 25, 'F');

            // Titre
            pdf.setFontSize(22);
            pdf.setTextColor(16, 185, 129); // Emerald 500
            pdf.text('GreenSIG', 14, 16);

            pdf.setFontSize(14);
            pdf.setTextColor(55, 65, 81); // Gray 700
            pdf.text('Planning des interventions', pageWidth - 14, 16, { align: 'right' });

            // Sous-titre avec date
            pdf.setFontSize(10);
            pdf.setTextColor(107, 114, 128); // Gray 500
            const dateStr = new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            pdf.text(`Exporté le ${dateStr}`, pageWidth - 14, 22, { align: 'right' });

            // Ajout de l'image du calendrier
            const imgWidth = pageWidth - 20; // Marge 10mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Gestion de la hauteur (si ça dépasse, on compresse ou coupe, ici on ajuste)
            // On laisse 30mm de marge en haut pour l'en-tête
            const maxHeight = pageHeight - 35;
            let finalHeight = imgHeight;
            let finalWidth = imgWidth;

            if (imgHeight > maxHeight) {
                // Si trop haut, on scale down pour faire tenir sur une page
                const ratio = maxHeight / imgHeight;
                finalHeight = maxHeight;
                finalWidth = imgWidth * ratio;
            }

            // Centrage horizontal si redimensionné
            const xPos = (pageWidth - finalWidth) / 2;

            pdf.addImage(imgData, 'PNG', xPos, 30, finalWidth, finalHeight);

            // Pied de page
            pdf.setFontSize(8);
            pdf.setTextColor(156, 163, 175);
            pdf.text('Document généré automatiquement par GreenSIG', pageWidth / 2, pageHeight - 5, { align: 'center' });

            pdf.save(`planning_greensig_${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error('Erreur export PDF:', error);
            alert('Une erreur est survenue lors de l\'exportation (voir console).');
        } finally {
            setIsExporting(false);
        }
    };

    const handleUpdateTache = async (data: TacheCreate) => {
        if (!selectedTache) return;
        try {
            const updateData: TacheUpdate = {
                ...data,
                date_debut_planifiee: new Date(data.date_debut_planifiee).toISOString(),
                date_fin_planifiee: new Date(data.date_fin_planifiee).toISOString()
            };
            await planningService.updateTache(selectedTache.id, updateData);
            await loadTaches();
            setShowCreateForm(false);
            setSelectedTache(null);
        } catch (err) {
            alert('Erreur lors de la modification');
            console.error(err);
        }
    };

    const handleCreateTache = async (data: TacheCreate) => {
        try {
            const createData = {
                ...data,
                date_debut_planifiee: new Date(data.date_debut_planifiee).toISOString(),
                date_fin_planifiee: new Date(data.date_fin_planifiee).toISOString()
            };

            await planningService.createTache(createData);
            await loadTaches();
            setShowCreateForm(false);
        } catch (err) {
            alert('Erreur lors de la création de la tâche');
            console.error(err);
        }
    };

    const handleDeleteTache = (id: number) => {
        setTacheToDelete(id);
    };

    const confirmDelete = async () => {
        if (!tacheToDelete) return;
        try {
            await planningService.deleteTache(tacheToDelete);
            await loadTaches();
            setSelectedTache(null);
            setTacheToDelete(null);
        } catch (err) {
            alert('Erreur lors de la suppression');
            console.error(err);
        }
    };

    const handleResetCharge = async (tacheId: number) => {
        try {
            await planningService.resetCharge(tacheId);
            await loadTaches();
        } catch (err) {
            alert('Erreur lors du recalcul de la charge');
            console.error(err);
        }
    };

    const filteredTaches = useMemo(() => {
        return taches.filter(t => {
            // 1. Filtre Equipe (check M2M equipes or legacy equipe)
            if (filterEquipe !== 'all') {
                const hasEquipe = t.equipes_detail?.some(e => e.id === filterEquipe) ||
                    t.equipe_detail?.id === filterEquipe;
                if (!hasEquipe) return false;
            }

            // 2. Filtre Client
            if (filterClient !== 'all' && (t.client_detail as any)?.utilisateur !== filterClient) return false;

            // 3. Filtre Statut
            if (filterStatut !== 'all' && t.statut !== filterStatut) return false;

            // 4. Filtre Type
            if (filterType !== 'all' && t.type_tache_detail.id !== filterType) return false;

            // 5. Recherche textuelle (Tâche, Équipe, Description)
            if (debouncedSearchTerm) {
                const term = debouncedSearchTerm.toLowerCase();
                const equipesNames = (t.equipes_detail?.map(e => (e as any).nom_equipe || e.nomEquipe).join(' ') || (t.equipe_detail as any)?.nom_equipe || t.equipe_detail?.nomEquipe || '').toLowerCase();
                const taskName = t.type_tache_detail.nom_tache.toLowerCase();
                const desc = (t.description_travaux || '').toLowerCase();

                return taskName.includes(term) || equipesNames.includes(term) || desc.includes(term);
            }

            return true;
        });
    }, [taches, filterEquipe, filterClient, filterStatut, filterType, debouncedSearchTerm]);

    // Map tasks to RBC events
    const events: CalendarEvent[] = useMemo(() => {
        return filteredTaches.map(tache => {
            const equipesNames = tache.equipes_detail?.length > 0
                ? tache.equipes_detail.map(e => (e as any).nom_equipe || e.nomEquipe).join(', ')
                : (tache.equipe_detail as any)?.nom_equipe || tache.equipe_detail?.nomEquipe || '';
            return {
                id: tache.id,
                title: `${tache.type_tache_detail.nom_tache}${equipesNames ? ` - ${equipesNames}` : ''}`,
                start: new Date(tache.date_debut_planifiee),
                end: new Date(tache.date_fin_planifiee),
                resource: tache
            };
        });
    }, [filteredTaches]);

    // Custom coloring for events based on status and priority
    const eventPropGetter = (event: CalendarEvent) => {
        const tache = event.resource;

        // Priority-based top border colors (green→yellow→orange→red)
        const priorityBorderColors: Record<number, string> = {
            1: '#22C55E', // green-500
            2: '#84CC16', // lime-500
            3: '#EAB308', // yellow-500
            4: '#F97316', // orange-500
            5: '#EF4444', // red-500
        };
        const priorityBorder = priorityBorderColors[tache.priorite] || '#9CA3AF';

        // Si pas d'équipe, style d'alerte (orange) comme dans la liste
        const hasEquipe = tache.equipes_detail?.length > 0 || tache.equipe_detail;
        if (!hasEquipe) {
            return {
                style: {
                    backgroundColor: '#FFF7ED', // orange-50
                    color: '#7C2D12',           // orange-900
                    borderLeft: '4px solid #F97316', // orange-500
                    borderTop: `3px solid ${priorityBorder}`,
                },
                className: `text-xs rounded shadow-sm opacity-95 hover:opacity-100 hover:shadow-md transition-all`
            };
        }

        // Status-based left border colors
        const statusBorderColors: Record<string, string> = {
            'PLANIFIEE': '#3B82F6',  // blue-500
            'NON_DEBUTEE': '#9CA3AF', // gray-400
            'EN_COURS': '#F97316',    // orange-500
            'TERMINEE': '#22C55E',    // green-500
            'ANNULEE': '#EF4444',     // red-500
        };
        const statusBorder = statusBorderColors[tache.statut] || '#9CA3AF';

        // Status-based background colors
        const statusBgColors: Record<string, string> = {
            'PLANIFIEE': '#EFF6FF',   // blue-50
            'NON_DEBUTEE': '#F9FAFB', // gray-50
            'EN_COURS': '#FFF7ED',    // orange-50
            'TERMINEE': '#F0FDF4',    // green-50
            'ANNULEE': '#FEF2F2',     // red-50
        };
        const statusBg = statusBgColors[tache.statut] || '#F9FAFB';

        // Status-based text colors
        const statusTextColors: Record<string, string> = {
            'PLANIFIEE': '#1E40AF',   // blue-800
            'NON_DEBUTEE': '#374151', // gray-700
            'EN_COURS': '#9A3412',    // orange-800
            'TERMINEE': '#166534',    // green-800
            'ANNULEE': '#991B1B',     // red-800
        };
        const statusText = statusTextColors[tache.statut] || '#374151';

        return {
            style: {
                backgroundColor: statusBg,
                color: statusText,
                borderLeft: `4px solid ${statusBorder}`,
                borderTop: `3px solid ${priorityBorder}`,
            },
            className: `text-xs rounded shadow-sm opacity-95 hover:opacity-100 hover:shadow-md transition-all cursor-pointer`
        };
    };

    // Drag & Drop handlers
    const handleEventDrop = useCallback(async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
        try {
            const tache = event.resource;
            await planningService.updateTache(tache.id, {
                date_debut_planifiee: (start as Date).toISOString(),
                date_fin_planifiee: (end as Date).toISOString()
            });
            // Update local state optimistically
            setTaches(prev => prev.map(t =>
                t.id === tache.id
                    ? { ...t, date_debut_planifiee: (start as Date).toISOString(), date_fin_planifiee: (end as Date).toISOString() }
                    : t
            ));
        } catch (err) {
            console.error('Erreur lors du déplacement de la tâche:', err);
            alert('Erreur lors du déplacement de la tâche');
            // Reload tasks to restore correct state
            loadTaches();
        }
    }, []);

    const handleEventResize = useCallback(async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
        try {
            const tache = event.resource;
            await planningService.updateTache(tache.id, {
                date_debut_planifiee: (start as Date).toISOString(),
                date_fin_planifiee: (end as Date).toISOString()
            });
            // Update local state optimistically
            setTaches(prev => prev.map(t =>
                t.id === tache.id
                    ? { ...t, date_debut_planifiee: (start as Date).toISOString(), date_fin_planifiee: (end as Date).toISOString() }
                    : t
            ));
        } catch (err) {
            console.error('Erreur lors du redimensionnement de la tâche:', err);
            alert('Erreur lors du redimensionnement de la tâche');
            // Reload tasks to restore correct state
            loadTaches();
        }
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Chargement...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
                    <p className="text-gray-500 mt-1">
                        {isReadOnly
                            ? (isClientView
                                ? 'Visualisation des tâches planifiées sur vos sites'
                                : 'Visualisation des tâches assignées à vos équipes')
                            : 'Gestion des tâches planifiées'}
                    </p>
                </div>
                {isReadOnly && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                        <Eye className="w-4 h-4" />
                        <span>Mode lecture seule</span>
                    </div>
                )}
            </div>

            {/* Filters & View Toggle */}
            <div className="mb-6 flex flex-col gap-4">
                {/* Ligne du haut : Recherche et Vue */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Rechercher une tâche, une équipe..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg self-start">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${viewMode === 'calendar'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Calendrier
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${viewMode === 'list'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Liste
                        </button>
                    </div>
                    {viewMode === 'calendar' && (
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                        >
                            {isExporting ? '...' : <Download className="w-4 h-4" />}
                            <span className="hidden sm:inline">Exporter PDF</span>
                        </button>
                    )}
                </div>

                {/* Ligne du bas : Filtres déroulants */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Filtres ({filteredTaches.length}) :</span>
                    </div>

                    {!isClientView && (
                        <select
                            value={filterClient}
                            onChange={(e) => setFilterClient(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                        >
                            <option value="all">Tous les clients</option>
                            {clients.map(c => (
                                <option key={c.utilisateur} value={c.utilisateur}>
                                    {(c as any).nom_structure || c.nomStructure || 'Client sans nom'}
                                </option>
                            ))}
                        </select>
                    )}

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                    >
                        <option value="all">Tous les types</option>
                        {typesTaches.map(t => (
                            <option key={t.id} value={t.id}>{t.nom_tache}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatut}
                        onChange={(e) => setFilterStatut(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                    >
                        <option value="all">Tous les statuts</option>
                        {Object.entries(STATUT_TACHE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                    <select
                        value={filterEquipe}
                        onChange={(e) => setFilterEquipe(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                    >
                        <option value="all">Toutes les équipes</option>
                        {equipes.map((equipe) => (
                            <option key={equipe.id} value={equipe.id}>
                                {equipe.nomEquipe}
                            </option>
                        ))}
                    </select>
                </div>
            </div>


            {/* Content */}
            <div className="flex-1 overflow-hidden bg-white rounded-lg border border-gray-200">
                {viewMode === 'calendar' ? (
                    <div className="h-full p-4" ref={calendarRef}>
                        <DnDCalendar
                            components={{
                                event: TaskEvent
                            }}
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
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
                                noEventsInRange: "Aucune tâche dans cette période.",
                            }}
                            formats={{
                                timeGutterFormat: 'HH:mm',
                                eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
                                    `${localizer?.format(start, 'HH:mm', culture)} - ${localizer?.format(end, 'HH:mm', culture)}`,
                                agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
                                    `${localizer?.format(start, 'HH:mm', culture)} - ${localizer?.format(end, 'HH:mm', culture)}`,
                                dayHeaderFormat: 'dddd d MMMM',
                                dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
                                    `${localizer?.format(start, 'd MMM', culture)} - ${localizer?.format(end, 'd MMM', culture)}`,
                            }}
                            culture='fr'
                            min={new Date(2024, 0, 1, 7, 0, 0)}
                            max={new Date(2024, 0, 1, 19, 0, 0)}
                            step={30}
                            timeslots={2}
                            onSelectEvent={(event) => setSelectedTache(event.resource)}
                            eventPropGetter={eventPropGetter}
                            views={['month', 'week', 'day', 'agenda']}
                            onEventDrop={isReadOnly ? undefined : handleEventDrop}
                            onEventResize={isReadOnly ? undefined : handleEventResize}
                            resizable={!isReadOnly}
                            draggableAccessor={() => !isReadOnly}
                        />
                    </div>
                ) : (
                    <div className="p-4 space-y-3 overflow-y-auto h-full">
                        {filteredTaches.map((tache) => {
                            const statutColors = STATUT_TACHE_COLORS[tache.statut];
                            const prioriteColors = PRIORITE_COLORS[tache.priorite];

                            const equipesNames = tache.equipes_detail?.length > 0
                                ? tache.equipes_detail.map(e => (e as any).nom_equipe || e.nomEquipe).join(', ')
                                : (tache.equipe_detail as any)?.nom_equipe || tache.equipe_detail?.nomEquipe || '';
                            const hasEquipe = tache.equipes_detail?.length > 0 || tache.equipe_detail;

                            return (
                                <div
                                    key={tache.id}
                                    onClick={() => setSelectedTache(tache)}
                                    className={`p-4 border rounded-lg cursor-pointer transition-all ${!hasEquipe
                                        ? 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                                        : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {tache.type_tache_detail.nom_tache}
                                            </h3>
                                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                {hasEquipe ? (
                                                    equipesNames
                                                ) : (
                                                    <>
                                                        <span className="text-orange-600 italic">Aucune équipe assignée</span>
                                                        {!isReadOnly && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedTache(tache);
                                                                    setShowCreateForm(true);
                                                                }}
                                                                className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors"
                                                                title="Attribuer une équipe"
                                                            >
                                                                <UserPlus className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <StatusBadge
                                                variant="custom"
                                                bg={statutColors.bg}
                                                text={statutColors.text}
                                            >
                                                {STATUT_TACHE_LABELS[tache.statut]}
                                            </StatusBadge>
                                            <StatusBadge
                                                variant="custom"
                                                bg={prioriteColors.bg}
                                                text={prioriteColors.text}
                                            >
                                                P{tache.priorite}
                                            </StatusBadge>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            {new Date(tache.date_debut_planifiee).toLocaleString('fr-FR')}
                                        </div>
                                        {/* Display multiple equipes or single legacy equipe */}
                                        {(tache.equipes_detail?.length > 0 || tache.equipe_detail) && (
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                <span className="truncate">
                                                    {tache.equipes_detail?.length > 0
                                                        ? tache.equipes_detail.map(e => (e as any).nom_equipe || e.nomEquipe).join(', ')
                                                        : (tache.equipe_detail as any)?.nom_equipe || tache.equipe_detail?.nomEquipe}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal - Non disponible en mode lecture seule */}
            {
                showCreateForm && !isReadOnly && (
                    <TaskFormModal
                        tache={selectedTache || undefined}
                        initialValues={initialTaskValues}
                        preSelectedObjects={preSelectedObjects}
                        equipes={equipes}
                        typesTaches={typesTaches}
                        onClose={() => { setShowCreateForm(false); setSelectedTache(null); setInitialTaskValues(undefined); setPreSelectedObjects(undefined); }}
                        onSubmit={selectedTache ? handleUpdateTache : handleCreateTache}
                        onResetCharge={handleResetCharge}
                    />
                )
            }

            {/* Detail Modal */}
            {
                selectedTache && !showCreateForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold">
                                    {selectedTache.type_tache_detail.nom_tache}
                                </h2>
                                <button
                                    onClick={() => setSelectedTache(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Équipe(s)</span>
                                    <p className="text-gray-900">
                                        {selectedTache.equipes_detail?.length > 0
                                            ? selectedTache.equipes_detail.map(e => (e as any).nom_equipe || e.nomEquipe).join(', ')
                                            : (selectedTache.equipe_detail as any)?.nom_equipe || selectedTache.equipe_detail?.nomEquipe || 'Aucune équipe assignée'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Dates</span>
                                    <p className="text-gray-900">
                                        Du {new Date(selectedTache.date_debut_planifiee).toLocaleString('fr-FR')} <br />
                                        Au {new Date(selectedTache.date_fin_planifiee).toLocaleString('fr-FR')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Statut</span>
                                    <p className="text-gray-900">{STATUT_TACHE_LABELS[selectedTache.statut]}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Priorité</span>
                                    <p className="text-gray-900">{PRIORITE_LABELS[selectedTache.priorite]}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Charge estimée</span>
                                    <p className="text-gray-900 flex items-center gap-2">
                                        {selectedTache.charge_estimee_heures !== null ? (
                                            <>
                                                <Timer className="w-4 h-4 text-emerald-600" />
                                                {selectedTache.charge_estimee_heures} heures
                                                {selectedTache.charge_manuelle && (
                                                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                                                        Manuelle
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-gray-400 italic">Non calculée</span>
                                        )}
                                    </p>
                                </div>
                                {selectedTache.commentaires && (
                                    <div>
                                        <span className="text-sm font-medium text-gray-500">Commentaires</span>
                                        <p className="text-gray-900">{selectedTache.commentaires}</p>
                                    </div>
                                )}

                                {selectedTache.id_recurrence_parent && (
                                    <div className="mt-2 p-2 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100 flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        Cette tâche fait partie d'une série récurrente.
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex gap-3">
                                {!isReadOnly && (
                                    <>
                                        <button
                                            onClick={() => setShowCreateForm(true)}
                                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Modifier
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTache(selectedTache.id)}
                                            className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Supprimer
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setSelectedTache(null)}
                                    className={`px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors ${isReadOnly ? 'flex-1' : ''}`}
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {tacheToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmer la suppression</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setTacheToDelete(null)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Planning;
