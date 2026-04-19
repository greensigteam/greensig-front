import { useState, useCallback, useEffect, useRef, type FC } from 'react';
import { useSearch } from '../contexts/SearchContext';
import { useExport } from '../contexts/ExportContext';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  addMonths as addMonthsFn,
} from 'date-fns';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { useQueryClient } from '@tanstack/react-query';

import { usePlanningData } from '../hooks/usePlanningData';
import { planningService } from '../services/planningService';
import { queryKeys } from '../lib/queryKeys';
import { Tache } from '../types/planning';
import {
  CalendarEvent,
  TaskDetailPopover,
  PlanningToolbar,
  PlanningCalendar,
  PlanningLegend,
  PlanningListView,
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
  DemarrerDistributionModal,
} from '../components/suivi-taches';
import { customCalendarStyles } from '../components/planning/planningStyles';
import { DistributionCharge, DistributionHistorique } from '../types/planning';

const Planning: FC = () => {
  // Get all data and handlers from custom hook
  const {
    // Data
    taches: _taches,
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
    restorePopover,
    canPerformDistributionAction: _canPerformDistributionAction,

    // Calendar helpers
    tasksByDate,
    setCalendarWindow,
  } = usePlanningData();

  const queryClient = useQueryClient();
  const { searchQuery } = useSearch();

  // Local state for view management
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const { startExport, endExport, isExportRunning } = useExport();
  const isExporting = isExportRunning('planning-pdf');

  // Synchronise la fenêtre de requête serveur avec la navigation Gantt
  useEffect(() => {
    setCalendarWindow({
      start: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
      end: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
    });
  }, [currentDate, setCalendarWindow]);
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

  const onNavigate = useCallback(
    (action: 'PREV' | 'NEXT' | 'TODAY') => {
      if (action === 'TODAY') {
        setSlideDirection(currentDate < new Date() ? 'right' : 'left');
        setCurrentDate(new Date());
        return;
      }
      setSlideDirection(action === 'NEXT' ? 'right' : 'left');
      switch (currentView) {
        case 'month':
          setCurrentDate((prev) => (action === 'NEXT' ? addMonths(prev, 1) : subMonths(prev, 1)));
          break;
        case 'week':
          setCurrentDate((prev) => (action === 'NEXT' ? addWeeks(prev, 1) : subWeeks(prev, 1)));
          break;
        case 'day':
          setCurrentDate((prev) => (action === 'NEXT' ? addDays(prev, 1) : subDays(prev, 1)));
          break;
        case 'agenda':
          setCurrentDate((prev) => (action === 'NEXT' ? addMonths(prev, 1) : subMonths(prev, 1)));
          break;
      }
    },
    [currentDate, currentView],
  );

  // ========================================================================
  // CALENDAR HANDLERS
  // ========================================================================

  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      if (isReadOnly) return;
      setQuickCreatorDate(slotInfo.start);
      setQuickCreatorStartTime(format(slotInfo.start, 'HH:mm'));
      setQuickCreatorEndTime(format(slotInfo.end, 'HH:mm'));
      setShowQuickCreator(true);
    },
    [
      isReadOnly,
      setQuickCreatorDate,
      setQuickCreatorStartTime,
      setQuickCreatorEndTime,
      setShowQuickCreator,
    ],
  );

  const onSelectEvent = useCallback(
    (event: CalendarEvent, e: React.SyntheticEvent) => {
      const target = e.currentTarget as HTMLElement;
      setPopoverInfo({
        tache: event.resource,
        reference: target,
        eventStart: event.start,
        eventEnd: event.end,
        distributionStatus: event.distributionStatus,
        distributionId: event.distributionId,
      });
    },
    [setPopoverInfo],
  );

  const patchTacheInCache = useCallback(
    (updated: Tache) => {
      queryClient.setQueryData(queryKeys.taches.detail(updated.id), updated);
      // @ok-patch: drag-and-drop calendar — le serveur renvoie la tâche à jour, patcher la
      // liste évite le refetch qui ferait sauter le focus du calendrier pendant le drag.
      queryClient.setQueriesData<Tache[]>(
        { queryKey: queryKeys.taches.lists(), exact: false },
        (old) => (old ? old.map((t) => (t.id === updated.id ? updated : t)) : old),
      );
    },
    [queryClient],
  );

  const handleEventDrop = useCallback(
    async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
      try {
        const tache = event.resource;
        const updated = await planningService.updateTache(tache.id, {
          date_debut_planifiee: (start as Date).toISOString(),
          date_fin_planifiee: (end as Date).toISOString(),
        });
        patchTacheInCache(updated);
      } catch (err) {
        await loadTaches();
      }
    },
    [patchTacheInCache, loadTaches],
  );

  const handleEventResize = useCallback(
    async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
      try {
        const tache = event.resource;
        const updated = await planningService.updateTache(tache.id, {
          date_debut_planifiee: (start as Date).toISOString(),
          date_fin_planifiee: (end as Date).toISOString(),
        });
        patchTacheInCache(updated);
      } catch (err) {
        await loadTaches();
      }
    },
    [patchTacheInCache, loadTaches],
  );

  // ========================================================================
  // LIST VIEW HANDLER
  // ========================================================================

  const handleListTaskClick = useCallback(
    (tache: any, dateKey: string, e: React.MouseEvent) => {
      const distribution = tache.distributions_charge?.find((d: any) => d.date === dateKey);
      const heureDebut = distribution?.heure_debut || '08:00';
      const heureFin = distribution?.heure_fin || '17:00';

      const eventStart = new Date(
        `${dateKey}T${heureDebut.length === 5 ? heureDebut + ':00' : heureDebut}`,
      );
      const eventEnd = new Date(
        `${dateKey}T${heureFin.length === 5 ? heureFin + ':00' : heureFin}`,
      );

      setPopoverInfo({
        tache,
        reference: e.currentTarget as HTMLElement,
        eventStart,
        eventEnd,
        distributionStatus: distribution?.status,
        distributionId: distribution?.id,
      });
    },
    [setPopoverInfo],
  );

  // ========================================================================
  // DISTRIBUTION HISTORIQUE HANDLER
  // ========================================================================

  const handleDistributionHistorique = useCallback(
    async (distributionId: number, nombreReports: number) => {
      setHistoriqueModalData({ isOpen: true, historique: null, nombreReports, isLoading: true });
      try {
        const response = await planningService.getHistoriqueDistribution(distributionId);
        setHistoriqueModalData({
          isOpen: true,
          historique: response.chaine_reports,
          nombreReports: response.nombre_reports,
          isLoading: false,
        });
      } catch (error) {
        setHistoriqueModalData((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [],
  );

  // ========================================================================
  // PDF EXPORT - Export asynchrone via Celery
  // ========================================================================

  /**
   * Calcule la plage de dates en fonction de la vue actuelle du calendrier.
   */
  const getDateRangeFromView = useCallback(
    (date: Date, view: string): { startDate: Date; endDate: Date } => {
      switch (view) {
        case 'month':
          return {
            startDate: startOfMonth(date),
            endDate: endOfMonth(date),
          };
        case 'week':
          return {
            startDate: startOfWeek(date, { weekStartsOn: 1 }),
            endDate: endOfWeek(date, { weekStartsOn: 1 }),
          };
        case 'day':
          return {
            startDate: startOfDay(date),
            endDate: endOfDay(date),
          };
        case 'agenda':
          // Vue agenda: 1 mois complet
          return {
            startDate: startOfMonth(date),
            endDate: endOfMonth(addMonthsFn(date, 1)),
          };
        default:
          // Fallback: mois courant
          return {
            startDate: startOfMonth(date),
            endDate: endOfMonth(date),
          };
      }
    },
    [],
  );

  const handleExportPDF = useCallback(async () => {
    startExport('planning-pdf', 'Export PDF planning');
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
        // Passer les IDs filtrés si une recherche ou un filtre type de tâche est actif
        tacheIds:
          searchQuery.trim() || filters.typeTacheId != null
            ? filteredTaches.map((t) => t.id)
            : undefined,
      };

      // Fonction pour télécharger le PDF
      const downloadPDF = (downloadUrl: string, recordCount: number) => {
        window.open(downloadUrl, '_blank');
        endExport('planning-pdf');
        showToast(`Export terminé (${recordCount} tâches)`, 'success');
      };

      // Fonction pour relancer en mode sync (fallback)
      const runSyncExport = async () => {
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
      showToast('Export PDF en cours de génération...', 'info');

      let pendingCount = 0; // Compteur de statuts PENDING consécutifs

      // Polling du statut (max 60 secondes)
      const pollStatus = async (attempts = 0): Promise<void> => {
        if (attempts >= 60) {
          endExport('planning-pdf');
          showToast('Export PDF trop long. Réessayez plus tard.', 'warning');
          return;
        }

        try {
          const status = await planningService.getExportStatus(task_id);

          if (status.status === 'SUCCESS' && status.result) {
            downloadPDF(status.result.download_url, status.result.record_count);
          } else if (status.status === 'FAILURE') {
            endExport('planning-pdf');
            showToast(status.error || "Erreur lors de l'export PDF", 'error');
          } else if (status.status === 'PENDING') {
            pendingCount++;

            // Si PENDING depuis 10 secondes, Celery n'est probablement pas actif
            // Basculer vers le mode synchrone
            if (pendingCount >= 10) {
              console.warn('[PDF Export] Celery semble inactif, bascule en mode sync');
              try {
                await runSyncExport();
              } catch (syncErr) {
                endExport('planning-pdf');
                showToast("Erreur lors de l'export PDF", 'error');
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
          endExport('planning-pdf');
          showToast("Erreur lors de la vérification du statut de l'export", 'error');
        }
      };

      // Commencer le polling
      pollStatus();
    } catch (err: unknown) {
      endExport('planning-pdf');
      const errorMessage =
        err instanceof Error ? err.message : "Erreur lors du lancement de l'export PDF";
      showToast(errorMessage, 'error');
    }
  }, [
    currentDate,
    currentView,
    filters.clientId,
    filters.equipeId,
    filters.siteId,
    filters.statuts,
    filters.typeTacheId,
    filteredTaches,
    searchQuery,
    getDateRangeFromView,
    showToast,
    startExport,
    endExport,
  ]);

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
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
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
        typesTaches={typesTaches}
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
            isReadOnly={isReadOnly || currentUser?.role === 'CLIENT'}
            calendarRef={calendarRef}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={onSelectEvent}
            onNavigate={setCurrentDate}
            onView={setCurrentView}
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
          onDemarrer={
            popoverInfo.distributionId
              ? () => {
                  handleDistributionDemarrer(popoverInfo.distributionId!);
                }
              : undefined
          }
          onTerminer={
            popoverInfo.distributionId
              ? () => {
                  handleDistributionTerminer(popoverInfo.distributionId!);
                }
              : undefined
          }
          onReporter={
            popoverInfo.distributionId
              ? () => {
                  // Créer un objet DistributionChargeEnriched à partir des infos du popover
                  const distribution = popoverInfo.tache.distributions_charge?.find(
                    (d) => d.id === popoverInfo.distributionId,
                  );
                  if (distribution) {
                    setReporterModalDistribution({
                      ...distribution,
                      tache_id: popoverInfo.tache.id,
                      tache_titre: popoverInfo.tache.type_tache_detail?.nom_tache,
                      tache_type: popoverInfo.tache.type_tache_detail?.nom_tache,
                      tache_statut: popoverInfo.tache.statut,
                    });
                  }
                }
              : undefined
          }
          onAnnuler={
            popoverInfo.distributionId
              ? () => {
                  const distribution = popoverInfo.tache.distributions_charge?.find(
                    (d) => d.id === popoverInfo.distributionId,
                  );
                  if (distribution) {
                    setAnnulerModalDistribution({
                      ...distribution,
                      tache_id: popoverInfo.tache.id,
                      tache_titre: popoverInfo.tache.type_tache_detail?.nom_tache,
                      tache_type: popoverInfo.tache.type_tache_detail?.nom_tache,
                      tache_statut: popoverInfo.tache.statut,
                    });
                  }
                }
              : undefined
          }
          onRestaurer={
            popoverInfo.distributionId
              ? () => {
                  handleDistributionRestaurer(popoverInfo.distributionId!);
                }
              : undefined
          }
          onHistorique={
            popoverInfo.distributionId
              ? () => {
                  const distribution = popoverInfo.tache.distributions_charge?.find(
                    (d) => d.id === popoverInfo.distributionId,
                  );
                  if (distribution) {
                    handleDistributionHistorique(
                      popoverInfo.distributionId!,
                      distribution.nombre_reports || 0,
                    );
                  }
                }
              : undefined
          }
          isActionLoading={distributionActionLoading}
          nombreReports={
            popoverInfo.distributionId
              ? popoverInfo.tache.distributions_charge?.find(
                  (d) => d.id === popoverInfo.distributionId,
                )?.nombre_reports || 0
              : 0
          }
          onUpdate={async () => {
            try {
              const updatedTache = await planningService.getTache(popoverInfo.tache.id);
              patchTacheInCache(updatedTache);
              setPopoverInfo((prev) => (prev ? { ...prev, tache: updatedTache } : null));
            } catch {
              await loadTaches();
            }
          }}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Task Form Modal */}
      {!isReadOnly && (showCreateForm || tacheToEdit) && (
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
          initialValues={
            tacheToEdit
              ? {
                  id_type_tache: tacheToEdit.type_tache_detail?.id || 0,
                  date_debut_planifiee: tacheToEdit.date_debut_planifiee,
                  date_fin_planifiee: tacheToEdit.date_fin_planifiee,
                  priorite: tacheToEdit.priorite,
                  commentaires: tacheToEdit.commentaires,
                  equipes_ids: tacheToEdit.equipes_detail?.map((e) => e.id) || [],
                  objets: tacheToEdit.objets_detail?.map((o) => o.id) || [],
                  charge_estimee_heures: tacheToEdit.charge_estimee_heures,
                }
              : initialTaskValues
          }
          preSelectedObjects={
            tacheToEdit?.objets_detail?.map((o) => ({
              id: o.id,
              type: o.nom_type || '',
              nom: o.display || '',
              site: o.site_nom || '',
              soussite: o.sous_site_nom,
              superficie: o.superficie_calculee,
              etat: o.etat,
              famille: o.famille,
            })) || preSelectedObjects
          }
          onLoadObjects={handleLoadObjects}
          onCheckTypeCompatibility={handleCheckTaskTypeCompatibility}
          mode={tacheToEdit ? 'edit' : 'create'}
        />
      )}

      {/* Quick Task Creator */}
      {!isReadOnly && showQuickCreator && (
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
          onClose={() => {
            setReporterModalDistribution(null);
            restorePopover();
          }}
          onConfirm={handleDistributionReporter}
          isLoading={distributionActionLoading}
        />
      )}

      {/* Annuler Distribution Modal */}
      {annulerModalDistribution && (
        <AnnulerDistributionModal
          isOpen={true}
          distribution={annulerModalDistribution as unknown as DistributionCharge}
          onClose={() => {
            setAnnulerModalDistribution(null);
            restorePopover();
          }}
          onConfirm={handleDistributionAnnuler}
          isLoading={distributionActionLoading}
        />
      )}

      {/* Terminer Distribution Modal */}
      {terminerModalDistribution && (
        <TerminerDistributionModal
          isOpen={true}
          distribution={terminerModalDistribution as unknown as DistributionCharge}
          onClose={() => {
            setTerminerModalDistribution(null);
            restorePopover();
          }}
          onConfirm={handleDistributionTerminerConfirm}
          isLoading={distributionActionLoading}
        />
      )}

      {/* Demarrer Distribution Modal */}
      {demarrerModalDistribution && (
        <DemarrerDistributionModal
          isOpen={true}
          distribution={demarrerModalDistribution as unknown as DistributionCharge}
          onClose={() => {
            setDemarrerModalDistribution(null);
            restorePopover();
          }}
          onConfirm={handleDistributionDemarrerConfirm}
          isLoading={distributionActionLoading}
        />
      )}

      {/* Historique Distribution Modal */}
      <HistoriqueDistributionModal
        isOpen={historiqueModalData.isOpen}
        historique={historiqueModalData.historique}
        nombreReports={historiqueModalData.nombreReports}
        onClose={() =>
          setHistoriqueModalData({
            isOpen: false,
            historique: null,
            nombreReports: 0,
            isLoading: false,
          })
        }
        isLoading={historiqueModalData.isLoading}
      />
    </div>
  );
};

export default Planning;
