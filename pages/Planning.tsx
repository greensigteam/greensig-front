import { useState, useCallback, useRef, type FC } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, addMonths as addMonthsFn } from 'date-fns';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';

import { usePlanningData } from '../hooks/usePlanningData';
import { planningService } from '../services/planningService';
import {
    TaskEvent, CalendarEvent,
    TaskDetailPopover,
    PlanningToolbar,
    PlanningCalendar, PlanningLegend,
    PlanningListView
} from '../components/planning/planningIndex';
import TaskFormModal from '../components/planning/TaskFormModal';
import QuickTaskCreator from '../components/planning/QuickTaskCreator';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import LoadingScreen from '../components/LoadingScreen';
import {
    ReporterDistributionModal,
    AnnulerDistributionModal,
    HistoriqueDistributionModal,
    TerminerDistributionModal,
    DemarrerDistributionModal
} from '../components/suivi-taches';
import { DistributionCharge, DistributionHistorique } from '../types/planning';

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
    @keyframes expandIn {
        0% { transform: scale(0.9) translateY(-10px); opacity: 0; }
        100% { transform: scale(1) translateY(0); opacity: 1; }
    }

    .animate-slide-right .rbc-month-view, .animate-slide-right .rbc-time-view { animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
    .animate-slide-left .rbc-month-view, .animate-slide-left .rbc-time-view { animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
    .animate-popover { animation: genieAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    .animate-check { animation: checkBurst 0.3s ease-out; }

    /* Global RBC Overrides */
    .rbc-calendar { font-family: 'Inter', system-ui, sans-serif; color: #3c4043; }
    .rbc-header { border-bottom: none !important; padding: 12px 0 !important; font-size: 11px; font-weight: 600; color: #70757a; text-transform: uppercase; }
    .rbc-month-view { border: none !important; }
    .rbc-day-bg { border-left: 1px solid #f1f3f4 !important; transition: background-color 0.15s ease; }
    .rbc-day-bg:hover { background-color: #f8fffe !important; }
    .rbc-month-row { border-top: 1px solid #f1f3f4 !important; }
    .rbc-off-range-bg { background-color: #fcfcfc !important; }
    .rbc-date-cell { padding: 8px !important; font-size: 12px; font-weight: 500; color: #3c4043; text-align: center; cursor: pointer; transition: all 0.15s ease; }
    .rbc-date-cell:hover { background-color: #ecfdf5; }
    .rbc-date-cell .rbc-button-link { transition: all 0.15s ease; }
    .rbc-date-cell:hover .rbc-button-link { color: #059669; transform: scale(1.1); }

    /* Aujourd'hui */
    .rbc-today { background-color: #f0fdf4 !important; }
    .rbc-now .rbc-button-link { background-color: #10b981; color: white; border-radius: 50%; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; margin-top: -4px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35); font-weight: 600; }

    /* Vue Mois - Ajustements améliorés */
    .rbc-month-view .rbc-row-content {
        overflow: visible !important;
        position: relative;
    }
    .rbc-month-row {
        min-height: 140px !important;
        overflow: visible !important;
    }
    .rbc-month-view .rbc-row-segment {
        padding: 1px 4px !important;
    }
    .rbc-month-view .rbc-event {
        margin-bottom: 2px !important;
        height: auto !important;
        max-height: none !important;
        min-height: 28px !important;
        line-height: normal !important;
    }
    .rbc-month-view .rbc-event-content {
        height: auto !important;
        overflow: visible !important;
        white-space: normal !important;
    }
    .rbc-month-view .rbc-row-content .rbc-row {
        min-height: 32px !important;
    }

    /* TaskEvent compact en vue mois */
    .rbc-month-view .task-event-root {
        padding: 2px 6px !important;
        gap: 4px !important;
        min-height: 24px !important;
        height: auto !important;
    }
    .rbc-month-view .task-event-root > div:first-child {
        /* Checkbox plus petite */
        width: 12px !important;
        height: 12px !important;
        min-width: 12px !important;
        margin-top: 2px !important;
    }
    .rbc-month-view .task-event-root > div:first-child svg {
        width: 8px !important;
        height: 8px !important;
    }
    .rbc-month-view .task-event-content {
        gap: 0 !important;
    }
    .rbc-month-view .task-event-content > div:first-child {
        /* Ligne titre */
        gap: 4px !important;
    }
    .rbc-month-view .task-event-content > div:first-child svg {
        width: 10px !important;
        height: 10px !important;
    }
    .rbc-month-view .task-event-content > div:first-child > span:first-of-type {
        /* Titre */
        font-size: 11px !important;
        line-height: 1.2 !important;
    }
    .rbc-month-view .task-event-content > div:last-child {
        /* Métadonnées - masquer en vue mois pour gagner de l'espace */
        display: none !important;
    }

    /* Le bouton "Show More" - Design moderne */
    .rbc-show-more {
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%) !important;
        color: #047857 !important;
        font-weight: 700 !important;
        font-size: 11px !important;
        padding: 4px 10px !important;
        border-radius: 8px !important;
        margin-top: 4px !important;
        text-decoration: none !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        width: auto !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 1px 3px rgba(5, 150, 105, 0.15) !important;
        cursor: pointer !important;
    }
    .rbc-show-more:hover {
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 3px 8px rgba(5, 150, 105, 0.25) !important;
    }
    .rbc-show-more::after {
        content: '→';
        font-size: 10px;
        opacity: 0.7;
    }

    /* Événements Transparents */
    .rbc-event {
        background-color: transparent !important;
        padding: 0 !important;
        border-radius: 0 !important;
        outline: none !important;
        box-shadow: none !important;
        overflow: visible !important;
        border: none !important;
    }
    .rbc-event:focus { outline: none !important; }
    .rbc-event-label { display: none !important; }
    .rbc-event-content {
        overflow: visible !important;
        height: auto !important;
    }

    /* Time View */
    .rbc-time-header { border-bottom: 1px solid #dadce0 !important; }
    .rbc-time-content { border-top: none !important; }
    .rbc-timeslot-group { border-bottom: 1px solid #f1f3f4 !important; }
    .rbc-time-view { border: none !important; }
    .rbc-day-slot .rbc-time-slot { border-top: 1px solid #f8f9fa !important; }
    .rbc-current-time-indicator { background-color: #ea4335 !important; height: 2px !important; }

    /* Custom Scrollbar for expanded modal */
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

    /* ========================
       RESPONSIVE CALENDAR
       ======================== */

    /* Mobile: Smaller cells and text */
    @media (max-width: 767px) {
        .rbc-calendar {
            font-size: 12px;
        }
        .rbc-header {
            padding: 8px 0 !important;
            font-size: 9px;
        }
        .rbc-month-row {
            min-height: 100px !important;
        }
        .rbc-date-cell {
            padding: 4px !important;
            font-size: 11px;
        }
        .rbc-now .rbc-button-link {
            width: 22px;
            height: 22px;
            font-size: 11px;
        }
        .rbc-month-view .rbc-event {
            margin-bottom: 1px !important;
            min-height: 22px !important;
        }
        .rbc-row-segment {
            padding: 0 2px !important;
        }
        .rbc-show-more {
            font-size: 9px !important;
            padding: 3px 6px !important;
        }
        /* TaskEvent encore plus compact sur mobile */
        .rbc-month-view .task-event-root {
            padding: 1px 4px !important;
            gap: 3px !important;
            min-height: 20px !important;
        }
        .rbc-month-view .task-event-content > div:first-child > span:first-of-type {
            font-size: 10px !important;
        }
    }

    /* Extra small screens */
    @media (max-width: 400px) {
        .rbc-header {
            font-size: 8px;
            padding: 6px 0 !important;
        }
        .rbc-date-cell {
            padding: 2px !important;
            font-size: 10px;
        }
        .rbc-month-row {
            min-height: 80px !important;
        }
        .rbc-show-more {
            font-size: 8px !important;
            padding: 2px 4px !important;
        }
        .rbc-show-more::after {
            display: none;
        }
        /* TaskEvent minimal sur très petit écran */
        .rbc-month-view .task-event-root {
            padding: 1px 3px !important;
            min-height: 18px !important;
        }
        .rbc-month-view .task-event-root > div:first-child {
            width: 10px !important;
            height: 10px !important;
            min-width: 10px !important;
        }
        .rbc-month-view .task-event-content > div:first-child > span:first-of-type {
            font-size: 9px !important;
        }
        .rbc-month-view .task-event-content > div:first-child svg {
            width: 8px !important;
            height: 8px !important;
        }
    }

    /* Tablet adjustments */
    @media (min-width: 768px) and (max-width: 1023px) {
        .rbc-month-row {
            min-height: 100px !important;
        }
        .rbc-header {
            font-size: 10px;
        }
    }
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Planning: FC = () => {
    // Get all data and handlers from custom hook
    const {
        // Data
        taches,
        filteredTaches,
        equipes,
        typesTaches,
        sites,
        structures,

        // Loading states
        loading,
        error,

        // User & Permissions
        currentUser,
        isReadOnly,

        // Filters
        filters,
        setFilters,
        showFilters,
        setShowFilters,
        activeFiltersCount,

        // Popover
        popoverInfo,
        setPopoverInfo,

        // Modals
        showCreateForm,
        setShowCreateForm,
        tacheToDelete,
        setTacheToDelete,
        distributionToDelete,
        setDistributionToDelete,
        tacheToEdit,
        setTacheToEdit,

        // Quick Creator
        showQuickCreator,
        setShowQuickCreator,
        quickCreatorDate,
        setQuickCreatorDate,
        quickCreatorStartTime,
        setQuickCreatorStartTime,
        quickCreatorEndTime,
        setQuickCreatorEndTime,

        // Initial values for task form
        initialTaskValues,
        setInitialTaskValues,
        preSelectedObjects,
        setPreSelectedObjects,

        // Distribution action modals
        reporterModalDistribution,
        setReporterModalDistribution,
        annulerModalDistribution,
        setAnnulerModalDistribution,
        terminerModalDistribution,
        setTerminerModalDistribution,
        demarrerModalDistribution,
        setDemarrerModalDistribution,
        distributionActionLoading,

        // Toast (global)
        showToast,

        // Actions
        loadTaches,
        handleCreateTache,
        handleUpdateTache,
        handleDeleteTache,
        handleDeleteDistribution,
        handleLoadObjects,
        handleCheckTaskTypeCompatibility,

        // Actions - Distribution Status (nouveau workflow)
        handleDistributionDemarrer,
        handleDistributionDemarrerConfirm,
        handleDistributionTerminer,
        handleDistributionTerminerConfirm,
        handleDistributionReporter,
        handleDistributionAnnuler,
        handleDistributionRestaurer,
        canPerformDistributionAction,

        // Calendar helpers
        tasksByDate,
    } = usePlanningData();

    // Local state for view management
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    // Historique modal state
    const [historiqueModalData, setHistoriqueModalData] = useState<{
        isOpen: boolean;
        historique: DistributionHistorique[] | null;
        nombreReports: number;
        isLoading: boolean;
    }>({ isOpen: false, historique: null, nombreReports: 0, isLoading: false });

    // ========================================================================
    // NAVIGATION HANDLERS
    // ========================================================================

    const onNavigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY') => {
        if (action === 'TODAY') {
            setSlideDirection(currentDate < new Date() ? 'right' : 'left');
            setCurrentDate(new Date());
            return;
        }
        setSlideDirection(action === 'NEXT' ? 'right' : 'left');
        switch (currentView) {
            case 'month':
                setCurrentDate(prev => action === 'NEXT' ? addMonths(prev, 1) : subMonths(prev, 1));
                break;
            case 'week':
                setCurrentDate(prev => action === 'NEXT' ? addWeeks(prev, 1) : subWeeks(prev, 1));
                break;
            case 'day':
                setCurrentDate(prev => action === 'NEXT' ? addDays(prev, 1) : subDays(prev, 1));
                break;
            case 'agenda':
                setCurrentDate(prev => action === 'NEXT' ? addMonths(prev, 1) : subMonths(prev, 1));
                break;
        }
    }, [currentDate, currentView]);

    // ========================================================================
    // CALENDAR HANDLERS
    // ========================================================================

    const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
        if (isReadOnly) return;
        setQuickCreatorDate(slotInfo.start);
        setQuickCreatorStartTime(format(slotInfo.start, 'HH:mm'));
        setQuickCreatorEndTime(format(slotInfo.end, 'HH:mm'));
        setShowQuickCreator(true);
    }, [isReadOnly, setQuickCreatorDate, setQuickCreatorStartTime, setQuickCreatorEndTime, setShowQuickCreator]);

    const onSelectEvent = useCallback((event: CalendarEvent, e: React.SyntheticEvent) => {
        const target = e.currentTarget as HTMLElement;
        setPopoverInfo({
            tache: event.resource,
            reference: target,
            eventStart: event.start,
            eventEnd: event.end,
            distributionStatus: event.distributionStatus,
            distributionId: event.distributionId
        });
    }, [setPopoverInfo]);

    const handleEventDrop = useCallback(async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
        try {
            const tache = event.resource;
            await planningService.updateTache(tache.id, {
                date_debut_planifiee: (start as Date).toISOString(),
                date_fin_planifiee: (end as Date).toISOString()
            });
            await loadTaches();
        } catch (err) {
            await loadTaches();
        }
    }, [loadTaches]);

    const handleEventResize = useCallback(async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
        try {
            const tache = event.resource;
            await planningService.updateTache(tache.id, {
                date_debut_planifiee: (start as Date).toISOString(),
                date_fin_planifiee: (end as Date).toISOString()
            });
            await loadTaches();
        } catch (err) {
            await loadTaches();
        }
    }, [loadTaches]);

    // ========================================================================
    // LIST VIEW HANDLER
    // ========================================================================

    const handleListTaskClick = useCallback((tache: any, dateKey: string, e: React.MouseEvent) => {
        const distribution = tache.distributions_charge?.find((d: any) => d.date === dateKey);
        const heureDebut = distribution?.heure_debut || '08:00';
        const heureFin = distribution?.heure_fin || '17:00';

        const eventStart = new Date(`${dateKey}T${heureDebut.length === 5 ? heureDebut + ':00' : heureDebut}`);
        const eventEnd = new Date(`${dateKey}T${heureFin.length === 5 ? heureFin + ':00' : heureFin}`);

        setPopoverInfo({
            tache,
            reference: e.currentTarget as HTMLElement,
            eventStart,
            eventEnd,
            distributionStatus: distribution?.status,
            distributionId: distribution?.id
        });
    }, [setPopoverInfo]);

    // ========================================================================
    // DISTRIBUTION HISTORIQUE HANDLER
    // ========================================================================

    const handleDistributionHistorique = useCallback(async (distributionId: number, nombreReports: number) => {
        setHistoriqueModalData({ isOpen: true, historique: null, nombreReports, isLoading: true });
        try {
            const response = await planningService.getHistoriqueDistribution(distributionId);
            setHistoriqueModalData({
                isOpen: true,
                historique: response.chaine_reports,
                nombreReports: response.nombre_reports,
                isLoading: false
            });
        } catch (error) {
            console.error('Erreur chargement historique:', error);
            setHistoriqueModalData(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    // ========================================================================
    // PDF EXPORT - Export asynchrone via Celery
    // ========================================================================

    /**
     * Calcule la plage de dates en fonction de la vue actuelle du calendrier.
     */
    const getDateRangeFromView = useCallback((date: Date, view: string): { startDate: Date; endDate: Date } => {
        switch (view) {
            case 'month':
                return {
                    startDate: startOfMonth(date),
                    endDate: endOfMonth(date)
                };
            case 'week':
                return {
                    startDate: startOfWeek(date, { weekStartsOn: 1 }),
                    endDate: endOfWeek(date, { weekStartsOn: 1 })
                };
            case 'day':
                return {
                    startDate: startOfDay(date),
                    endDate: endOfDay(date)
                };
            case 'agenda':
                // Vue agenda: 1 mois complet
                return {
                    startDate: startOfMonth(date),
                    endDate: endOfMonth(addMonthsFn(date, 1))
                };
            default:
                // Fallback: mois courant
                return {
                    startDate: startOfMonth(date),
                    endDate: endOfMonth(date)
                };
        }
    }, []);

    const handleExportPDF = useCallback(async () => {
        setIsExporting(true);
        try {
            // Calculer la plage de dates selon la vue
            const { startDate, endDate } = getDateRangeFromView(currentDate, currentView);

            const exportParams = {
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd'),
                structureClientId: filters.clientId || undefined,
                equipeId: filters.equipeId || undefined,
                siteId: filters.siteId || undefined,
                statuts: filters.statuts.length > 0 ? filters.statuts : undefined,
            };

            console.log('[PDF Export] Lancement avec params:', exportParams);

            // Fonction pour télécharger le PDF
            const downloadPDF = (downloadUrl: string, recordCount: number) => {
                console.log('[PDF Export] Téléchargement:', downloadUrl);
                window.open(downloadUrl, '_blank');
                setIsExporting(false);
                showToast(`Export terminé (${recordCount} tâches)`, 'success');
            };

            // Fonction pour relancer en mode sync (fallback)
            const runSyncExport = async () => {
                console.log('[PDF Export] Fallback vers mode synchrone...');
                showToast('Export en cours (mode direct)...', 'info');

                const syncResult = await planningService.exportPDF({ ...exportParams, sync: true });

                if (syncResult.ready && syncResult.result) {
                    downloadPDF(syncResult.result.download_url, syncResult.result.record_count);
                } else {
                    throw new Error('Export synchrone échoué');
                }
            };

            // Lancer l'export asynchrone
            const response = await planningService.exportPDF(exportParams);

            // Si déjà prêt (mode sync retourné directement), télécharger
            if (response.ready && response.result) {
                downloadPDF(response.result.download_url, response.result.record_count);
                return;
            }

            const task_id = response.task_id;
            console.log('[PDF Export] Task ID reçu:', task_id);
            showToast('Export PDF en cours de génération...', 'info');

            let pendingCount = 0; // Compteur de statuts PENDING consécutifs

            // Polling du statut (max 60 secondes)
            const pollStatus = async (attempts = 0): Promise<void> => {
                if (attempts >= 60) {
                    setIsExporting(false);
                    showToast('Export PDF trop long. Réessayez plus tard.', 'warning');
                    console.error('[PDF Export] Timeout après 60 tentatives');
                    return;
                }

                try {
                    const status = await planningService.getExportStatus(task_id);
                    console.log(`[PDF Export] Polling #${attempts + 1}:`, status);

                    if (status.status === 'SUCCESS' && status.result) {
                        downloadPDF(status.result.download_url, status.result.record_count);
                    } else if (status.status === 'FAILURE') {
                        setIsExporting(false);
                        console.error('[PDF Export] Échec:', status.error);
                        showToast(status.error || 'Erreur lors de l\'export PDF', 'error');
                    } else if (status.status === 'PENDING') {
                        pendingCount++;

                        // Si PENDING depuis 10 secondes, Celery n'est probablement pas actif
                        // Basculer vers le mode synchrone
                        if (pendingCount >= 10) {
                            console.warn('[PDF Export] Celery semble inactif, bascule en mode sync');
                            try {
                                await runSyncExport();
                            } catch (syncErr) {
                                console.error('[PDF Export] Erreur mode sync:', syncErr);
                                setIsExporting(false);
                                showToast('Erreur lors de l\'export PDF', 'error');
                            }
                            return;
                        }

                        // Continuer le polling
                        setTimeout(() => pollStatus(attempts + 1), 1000);
                    } else {
                        // STARTED ou autre statut: réinitialiser le compteur PENDING et continuer
                        pendingCount = 0;
                        setTimeout(() => pollStatus(attempts + 1), 1000);
                    }
                } catch (pollError) {
                    console.error('[PDF Export] Erreur polling:', pollError);
                    setIsExporting(false);
                    showToast('Erreur lors de la vérification du statut de l\'export', 'error');
                }
            };

            // Commencer le polling
            pollStatus();
        } catch (err: unknown) {
            console.error('[PDF Export] Erreur:', err);
            setIsExporting(false);
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du lancement de l\'export PDF';
            showToast(errorMessage, 'error');
        }
    }, [currentDate, currentView, filters.clientId, filters.equipeId, filters.siteId, filters.statuts, getDateRangeFromView, showToast]);

    // ========================================================================
    // RENDER
    // ========================================================================

    if (loading) {
        return (
            <div className="fixed inset-0 z-50">
                <LoadingScreen isLoading={true} loop={true} minDuration={0} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-red-500">
                {error}
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-white font-sans relative">
            <style>{customCalendarStyles}</style>

            {/* Toolbar */}
            <PlanningToolbar
                viewMode={viewMode}
                setViewMode={setViewMode}
                currentView={currentView}
                setCurrentView={setCurrentView}
                currentDate={currentDate}
                onNavigate={onNavigate}
                filters={filters}
                setFilters={setFilters}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                activeFiltersCount={activeFiltersCount}
                structures={structures}
                sites={sites}
                equipes={equipes}
                isExporting={isExporting}
                onExportPDF={handleExportPDF}
            />

            {/* Legend (calendar view only) */}
            {viewMode === 'calendar' && <PlanningLegend />}

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'calendar' ? (
                    <PlanningCalendar
                        filteredTaches={filteredTaches}
                        currentDate={currentDate}
                        currentView={currentView}
                        slideDirection={slideDirection}
                        isReadOnly={isReadOnly || (currentUser as any)?.roles?.includes('CLIENT')}
                        calendarRef={calendarRef as any}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={onSelectEvent}
                        onNavigate={setCurrentDate}
                        onView={setCurrentView as any}
                        onEventDrop={handleEventDrop}
                        onEventResize={handleEventResize}
                    />
                ) : (
                    <PlanningListView
                        tasksByDate={tasksByDate}
                        onTaskClick={handleListTaskClick}
                        isReadOnly={isReadOnly}
                    />
                )}
            </div>

            {/* Popover */}
            {popoverInfo && (
                <TaskDetailPopover
                    tache={popoverInfo.tache}
                    eventStart={popoverInfo.eventStart}
                    eventEnd={popoverInfo.eventEnd}
                    distributionStatus={popoverInfo.distributionStatus}
                    distributionId={popoverInfo.distributionId}
                    onClose={() => setPopoverInfo(null)}
                    onEdit={() => {
                        setTacheToEdit(popoverInfo.tache);
                        setPopoverInfo(null);
                    }}
                    onDelete={() => {
                        if (popoverInfo.distributionId) {
                            setDistributionToDelete(popoverInfo.distributionId);
                        } else {
                            setTacheToDelete(popoverInfo.tache.id);
                        }
                        setPopoverInfo(null);
                    }}
                    // Nouveau workflow distribution
                    onDemarrer={popoverInfo.distributionId ? () => {
                        handleDistributionDemarrer(popoverInfo.distributionId!);
                    } : undefined}
                    onTerminer={popoverInfo.distributionId ? () => {
                        handleDistributionTerminer(popoverInfo.distributionId!);
                    } : undefined}
                    onReporter={popoverInfo.distributionId ? () => {
                        // Créer un objet DistributionChargeEnriched à partir des infos du popover
                        const distribution = popoverInfo.tache.distributions_charge?.find(
                            d => d.id === popoverInfo.distributionId
                        );
                        if (distribution) {
                            setReporterModalDistribution({
                                ...distribution,
                                tache_id: popoverInfo.tache.id,
                                tache_titre: popoverInfo.tache.type_tache_detail?.nom_tache,
                                tache_type: popoverInfo.tache.type_tache_detail?.nom_tache,
                                tache_statut: popoverInfo.tache.statut,
                            } as any);
                        }
                    } : undefined}
                    onAnnuler={popoverInfo.distributionId ? () => {
                        const distribution = popoverInfo.tache.distributions_charge?.find(
                            d => d.id === popoverInfo.distributionId
                        );
                        if (distribution) {
                            setAnnulerModalDistribution({
                                ...distribution,
                                tache_id: popoverInfo.tache.id,
                                tache_titre: popoverInfo.tache.type_tache_detail?.nom_tache,
                                tache_type: popoverInfo.tache.type_tache_detail?.nom_tache,
                                tache_statut: popoverInfo.tache.statut,
                            } as any);
                        }
                    } : undefined}
                    onRestaurer={popoverInfo.distributionId ? () => {
                        handleDistributionRestaurer(popoverInfo.distributionId!);
                    } : undefined}
                    onHistorique={popoverInfo.distributionId ? () => {
                        const distribution = popoverInfo.tache.distributions_charge?.find(
                            d => d.id === popoverInfo.distributionId
                        );
                        if (distribution) {
                            handleDistributionHistorique(popoverInfo.distributionId!, distribution.nombre_reports || 0);
                        }
                    } : undefined}
                    isActionLoading={distributionActionLoading}
                    nombreReports={
                        popoverInfo.distributionId
                            ? popoverInfo.tache.distributions_charge?.find(d => d.id === popoverInfo.distributionId)?.nombre_reports || 0
                            : 0
                    }
                    onUpdate={loadTaches}
                    isReadOnly={isReadOnly}
                />
            )}

            {/* Task Form Modal */}
            {(showCreateForm || tacheToEdit) && (
                <TaskFormModal
                    tache={tacheToEdit || undefined}
                    open={showCreateForm || !!tacheToEdit}
                    onClose={() => {
                        setShowCreateForm(false);
                        setTacheToEdit(null);
                        setInitialTaskValues(undefined);
                        setPreSelectedObjects(undefined);
                    }}
                    onSubmit={async (data) => {
                        if (tacheToEdit) {
                            await handleUpdateTache(tacheToEdit.id, data);
                        } else {
                            await handleCreateTache(data);
                        }
                    }}
                    equipes={equipes}
                    typesTaches={typesTaches}
                    sites={sites}
                    initialValues={tacheToEdit ? {
                        id_type_tache: tacheToEdit.type_tache_detail?.id || 0,
                        date_debut_planifiee: tacheToEdit.date_debut_planifiee,
                        date_fin_planifiee: tacheToEdit.date_fin_planifiee,
                        priorite: tacheToEdit.priorite,
                        commentaires: tacheToEdit.commentaires,
                        equipes_ids: tacheToEdit.equipes_detail?.map(e => e.id) || [],
                        objets: tacheToEdit.objets_detail?.map(o => o.id) || [],
                        charge_estimee_heures: tacheToEdit.charge_estimee_heures,
                    } : initialTaskValues}
                    preSelectedObjects={tacheToEdit?.objets_detail?.map(o => ({
                        id: o.id,
                        type: o.nom_type || '',
                        nom: o.display || '',
                        site: o.site_nom || '',
                        soussite: o.sous_site_nom,
                        superficie: o.superficie_calculee,
                        etat: o.etat,
                        famille: o.famille
                    })) || preSelectedObjects}
                    onLoadObjects={handleLoadObjects}
                    onCheckTypeCompatibility={handleCheckTaskTypeCompatibility}
                    mode={tacheToEdit ? 'edit' : 'create'}
                />
            )}

            {/* Quick Task Creator */}
            {showQuickCreator && (
                <QuickTaskCreator
                    isOpen={showQuickCreator}
                    onClose={() => setShowQuickCreator(false)}
                    initialDate={quickCreatorDate}
                    initialStartTime={quickCreatorStartTime}
                    initialEndTime={quickCreatorEndTime}
                    onSubmit={async (data) => {
                        await handleCreateTache(data);
                        setShowQuickCreator(false);
                    }}
                    typesTaches={typesTaches}
                    equipes={equipes}
                    sites={sites}
                    onLoadObjects={handleLoadObjects}
                    onCheckTaskTypeCompatibility={handleCheckTaskTypeCompatibility}
                />
            )}

            {/* Delete Task Modal */}
            <ConfirmDeleteModal
                isOpen={typeof tacheToDelete === 'number'}
                onClose={() => setTacheToDelete(null)}
                onConfirm={handleDeleteTache}
                title="Supprimer cette tâche ?"
                message="Cette action est irréversible. La tâche et toutes ses distributions seront supprimées."
            />

            {/* Delete Distribution Modal */}
            <ConfirmDeleteModal
                isOpen={typeof distributionToDelete === 'number'}
                onClose={() => setDistributionToDelete(null)}
                onConfirm={handleDeleteDistribution}
                title="Supprimer cette distribution ?"
                message="Cette action supprimera uniquement cette journée de distribution, pas la tâche entière."
            />

            {/* Reporter Distribution Modal */}
            {reporterModalDistribution && (
                <ReporterDistributionModal
                    isOpen={true}
                    distribution={reporterModalDistribution as unknown as DistributionCharge}
                    onClose={() => setReporterModalDistribution(null)}
                    onConfirm={handleDistributionReporter}
                    isLoading={distributionActionLoading}
                />
            )}

            {/* Annuler Distribution Modal */}
            {annulerModalDistribution && (
                <AnnulerDistributionModal
                    isOpen={true}
                    distribution={annulerModalDistribution as unknown as DistributionCharge}
                    onClose={() => setAnnulerModalDistribution(null)}
                    onConfirm={handleDistributionAnnuler}
                    isLoading={distributionActionLoading}
                />
            )}

            {/* Terminer Distribution Modal */}
            {terminerModalDistribution && (
                <TerminerDistributionModal
                    isOpen={true}
                    distribution={terminerModalDistribution as unknown as DistributionCharge}
                    onClose={() => setTerminerModalDistribution(null)}
                    onConfirm={handleDistributionTerminerConfirm}
                    isLoading={distributionActionLoading}
                />
            )}

            {/* Demarrer Distribution Modal */}
            {demarrerModalDistribution && (
                <DemarrerDistributionModal
                    isOpen={true}
                    distribution={demarrerModalDistribution as unknown as DistributionCharge}
                    onClose={() => setDemarrerModalDistribution(null)}
                    onConfirm={handleDistributionDemarrerConfirm}
                    isLoading={distributionActionLoading}
                />
            )}

            {/* Historique Distribution Modal */}
            <HistoriqueDistributionModal
                isOpen={historiqueModalData.isOpen}
                historique={historiqueModalData.historique}
                nombreReports={historiqueModalData.nombreReports}
                onClose={() => setHistoriqueModalData({ isOpen: false, historique: null, nombreReports: 0, isLoading: false })}
                isLoading={historiqueModalData.isLoading}
            />
        </div>
    );
};

export default Planning;
