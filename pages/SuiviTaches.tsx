import React, { useState, useEffect, useCallback } from 'react';
import { useSuiviTachesData } from '../hooks/useSuiviTachesData';
import { useDistributionActions } from '../hooks/useDistributionActions';
import {
  TaskListPanel,
  TaskDetailPanel,
  SuiviTachesToolbar,
  DistributionsParJour,
  ReporterDistributionModal,
  AnnulerDistributionModal,
  HistoriqueDistributionModal,
  TerminerDistributionModal,
  DemarrerDistributionModal,
} from '../components/suivi-taches';
import { AnnulerTacheModal } from '../components/suivi-taches/AnnulerTacheModal';
import { ViewMode } from '../components/suivi-taches/SuiviTachesToolbar';
import {
  TacheCreate,
  DistributionCharge,
  DistributionChargeEnriched,
  DistributionFilters as DistributionFiltersType,
  MotifAnnulationTache,
} from '../types/planning';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import TaskFormModal from '../components/planning/TaskFormModal';
import { DistributionEditForm } from '../components/planning/DistributionEditForm';
import SelectDaysModal from '../components/modals/SelectDaysModal';
import { planningService } from '../services/planningService';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';

// React Query hooks for distributions
import { useDistributionsParJour, useDistributions } from '../hooks/queries';

const SuiviTaches: React.FC = () => {
  const data = useSuiviTachesData();
  const { searchQuery, setPlaceholder } = useSearch();
  const { showToast } = useToast();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return today ?? new Date().toISOString().slice(0, 10);
  });

  // Filtres avancés pour les distributions
  const [distributionFilters, setDistributionFilters] = useState<DistributionFiltersType>({});
  const [useAdvancedFilters, setUseAdvancedFilters] = useState(false);

  // React Query for distributions (par jour - sans filtres avancés)
  const distributionsParJourQuery = useDistributionsParJour(selectedDate, {
    enabled: viewMode === 'distributions' && !useAdvancedFilters,
  });

  // React Query for distributions with advanced filters
  const distributionsFilteredQuery = useDistributions(
    { ...distributionFilters, date: selectedDate },
    { enabled: viewMode === 'distributions' && useAdvancedFilters },
  );

  // Derived distribution data - use filtered or par-jour based on filter state
  const distributionsParJour = useAdvancedFilters
    ? (distributionsFilteredQuery.data ?? [])
    : (distributionsParJourQuery.data?.distributions ?? []);
  const loadingDistributions = useAdvancedFilters
    ? distributionsFilteredQuery.isLoading || distributionsFilteredQuery.isFetching
    : distributionsParJourQuery.isLoading || distributionsParJourQuery.isFetching;

  // Distribution actions (mutations, modals, handlers)
  const distActions = useDistributionActions({
    selectedDate,
    distributionsParJour,
    selectedTache: data.selectedTache,
    reloadSelectedTask: data.reloadSelectedTask,
  });

  // Mettre à jour le placeholder de recherche selon le mode de vue
  useEffect(() => {
    if (viewMode === 'distributions') {
      setPlaceholder('Rechercher une distribution (référence, tâche, type...)');
    } else {
      setPlaceholder('Rechercher une tâche...');
    }
    // Cleanup: reset placeholder when leaving the page
    return () => setPlaceholder('Rechercher...');
  }, [viewMode, setPlaceholder]);

  // Synchroniser la recherche du header avec les filtres de distribution
  useEffect(() => {
    if (viewMode === 'distributions') {
      setDistributionFilters((prev) => ({
        ...prev,
        search: searchQuery || undefined,
      }));
    }
  }, [searchQuery, viewMode]);

  // Local modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingTacheId, setDeletingTacheId] = useState<number | null>(null);
  const [editingDistributionId, setEditingDistributionId] = useState<number | null>(null);
  const [deletingDistributionId, setDeletingDistributionId] = useState<number | null>(null);
  const [showAddDistributionsModal, setShowAddDistributionsModal] = useState(false);

  // Confirmation modal state (for start and complete only)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'start' | 'complete';
  } | null>(null);

  // Task cancellation modal state (separate from confirmModal)
  const [showCancelTacheModal, setShowCancelTacheModal] = useState(false);

  // Validation modal state
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    type: 'VALIDEE' | 'REJETEE';
  } | null>(null);
  const [validationComment, setValidationComment] = useState('');

  // Cloture proposal modal state
  const [clotureProposalModal, setClotureProposalModal] = useState<{
    reclamation_id: number;
    reclamation_numero: string;
    nombre_taches_validees: number;
  } | null>(null);

  // --- Distributions par jour ---

  // Manual refetch function for distributions
  const refetchDistributions = useCallback(() => {
    if (useAdvancedFilters) {
      distributionsFilteredQuery.refetch();
    } else {
      distributionsParJourQuery.refetch();
    }
  }, [useAdvancedFilters, distributionsFilteredQuery, distributionsParJourQuery]);

  // Check for advanced filters and handle accordingly
  useEffect(() => {
    if (viewMode === 'distributions') {
      const hasAdvancedFilters = Object.keys(distributionFilters).some(
        (key) => distributionFilters[key as keyof DistributionFiltersType] !== undefined,
      );
      setUseAdvancedFilters(hasAdvancedFilters);
    }
  }, [viewMode, distributionFilters]);

  const handleSelectTaskFromDistribution = async (tacheId: number) => {
    setViewMode('tasks');
    const existingTache = data.taches.find((t) => t.id === tacheId);
    if (existingTache) {
      data.setSelectedTache(existingTache);
    } else {
      try {
        const tache = await planningService.getTache(tacheId);
        data.setSelectedTache(tache);
      } catch (error: any) {
        showToast(error.message || 'Erreur lors du chargement de la tâche', 'error');
      }
    }
  };

  // --- Modal Handlers ---
  const openEditModal = async () => {
    await data.loadTypesTaches();
    setShowEditModal(true);
  };

  const handleTaskUpdate = async (taskData: TacheCreate) => {
    await data.handleTaskUpdate(taskData);
    setShowEditModal(false);
  };

  const openConfirmModal = (type: 'start' | 'complete' | 'cancel') => {
    // ✅ ANNULATION: Afficher le modal de justification au lieu d'une simple confirmation
    if (type === 'cancel') {
      setShowCancelTacheModal(true);
      return;
    }

    const configs = {
      start: {
        title: 'Démarrer la tâche',
        message: 'Êtes-vous sûr de vouloir démarrer cette tâche maintenant ?',
      },
      complete: {
        title: 'Terminer la tâche',
        message: 'Êtes-vous sûr de vouloir marquer cette tâche comme terminée ?',
      },
    };

    setConfirmModal({ isOpen: true, type, ...configs[type] });
  };

  const executeConfirmedAction = async () => {
    if (!confirmModal) return;
    await data.handleChangeStatut(confirmModal.type);
    setConfirmModal(null);
  };

  // Handler pour l'annulation de tâche avec justification obligatoire
  const handleCancelTache = async (motif: MotifAnnulationTache, commentaire: string) => {
    try {
      await data.handleChangeStatut('cancel', {
        motif_annulation: motif,
        commentaire_annulation: commentaire,
      });
      setShowCancelTacheModal(false);
      showToast('Tâche annulée avec succès', 'success');
    } catch (error: any) {
      showToast(error.message || "Erreur lors de l'annulation", 'error');
    }
  };

  const openValidationModal = (type: 'VALIDEE' | 'REJETEE') => {
    setValidationModal({ isOpen: true, type });
    setValidationComment('');
  };

  const handleValidation = async () => {
    if (!validationModal) return;
    try {
      const response = await data.handleValidation(validationModal.type, validationComment);
      setValidationModal(null);
      setValidationComment('');

      // Si proposition de clôture possible
      if (
        response.proposition_cloture_possible &&
        response.reclamation_id &&
        response.reclamation_numero
      ) {
        setClotureProposalModal({
          reclamation_id: response.reclamation_id,
          reclamation_numero: response.reclamation_numero,
          nombre_taches_validees: response.nombre_taches_validees || 0,
        });
      }
    } catch {
      // Error handled in hook
    }
  };

  const handleProposerCloture = async () => {
    if (!clotureProposalModal) return;
    try {
      await data.handleProposerCloture(clotureProposalModal.reclamation_id);
      setClotureProposalModal(null);
    } catch {
      // Error handled in hook
    }
  };

  const handleAddDistributions = async (selectedDays: any[]) => {
    await data.handleAddDistributions(selectedDays);
    setShowAddDistributionsModal(false);
  };

  const handleDeleteDistribution = async (distributionId: number) => {
    await data.handleDeleteDistribution(distributionId);
    setDeletingDistributionId(null);
  };

  return (
    <div className="flex flex-col bg-slate-50 h-full">
      {/* Toolbar */}
      <SuiviTachesToolbar
        filters={data.filters}
        onFiltersChange={data.setFilters}
        showFilters={data.showFilters}
        onShowFiltersChange={data.setShowFilters}
        activeFiltersCount={data.activeFiltersCount}
        onClearFilters={data.clearFilters}
        distributionFilters={distributionFilters}
        onDistributionFiltersChange={setDistributionFilters}
        structures={data.structures}
        equipes={data.equipes}
        filteredSites={data.filteredSites}
        loadingFilters={data.loadingFilters}
        filteredTachesCount={data.filteredTaches.length}
        loadingTasks={data.loadingTasks || loadingDistributions}
        onRefresh={viewMode === 'distributions' ? refetchDistributions : data.loadTaches}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          // ⚡ OPTIMISATION: Ne plus réinitialiser la recherche au changement de vue
          // Préserve le contexte utilisateur pour une meilleure UX
        }}
        distributionsCount={distributionsParJour.length}
      />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* View: Distributions par jour */}
        {viewMode === 'distributions' ? (
          <div className="flex-1 p-0 lg:p-4 min-h-0">
            <DistributionsParJour
              distributions={distributionsParJour}
              selectedDate={selectedDate}
              onDateChange={(date) => {
                // Si filtres avancés actifs, réinitialiser avant de changer de date
                if (useAdvancedFilters) {
                  setDistributionFilters({});
                }
                setSelectedDate(date);
              }}
              loading={loadingDistributions}
              onDemarrer={distActions.handleDemarrer}
              onTerminer={distActions.handleTerminer}
              onReporter={distActions.setReporterModalDistribution}
              onAnnuler={distActions.setAnnulerModalDistribution}
              onRestaurer={distActions.handleRestaurer}
              onHistorique={distActions.handleHistorique}
              onSelectTask={handleSelectTaskFromDistribution}
              isActionLoading={distActions.actionLoading}
              isClientView={data.isClientView}
            />
          </div>
        ) : (
          <>
            {/* Left Panel: Task List */}
            <div
              className={`${data.selectedTache ? 'hidden lg:flex' : 'flex'} flex-1 flex-col min-h-0`}
            >
              <TaskListPanel
                taches={data.taches}
                paginatedTaches={data.paginatedTaches}
                filteredTachesCount={data.filteredTaches.length}
                selectedTache={data.selectedTache}
                onSelectTache={data.setSelectedTache}
                loading={data.loadingTasks}
                currentPage={data.currentPage}
                totalPages={data.totalPages}
                itemsPerPage={data.itemsPerPage}
                onPageChange={data.setCurrentPage}
              />
            </div>

            {/* Right Panel: Task Detail - conteneur isolé pour le scroll */}
            {data.selectedTache && (
              <div className="flex-1 lg:flex-none flex flex-col min-h-0">
                <TaskDetailPanel
                  key={data.detailKey}
                  tache={data.selectedTache}
                  photos={data.photos}
                  consommations={data.consommations}
                  produitsOptions={data.produitsOptions}
                  equipesDisponibles={data.equipes}
                  isAdmin={data.isAdmin}
                  isClientView={data.isClientView}
                  loadingPhotos={data.loadingPhotos}
                  loadingConsommations={data.loadingConsommations}
                  loadingTypesTaches={data.loadingTypesTaches}
                  uploadingPhoto={data.uploadingPhoto}
                  changingStatut={data.changingStatut}
                  assigningEquipe={data.assigningEquipe}
                  onClose={() => data.setSelectedTache(null)}
                  onEdit={openEditModal}
                  onDelete={() => setDeletingTacheId(data.selectedTache!.id)}
                  onStartTask={distActions.handleStartTask}
                  onCompleteTask={distActions.handleCompleteTask}
                  onDemarrerDistribution={distActions.handleDemarrer}
                  onTerminerDistribution={distActions.handleTerminer}
                  onReporterDistribution={(distributionId) => {
                    const dist = data.selectedTache?.distributions_charge?.find(
                      (d) => d.id === distributionId,
                    );
                    if (dist)
                      distActions.setReporterModalDistribution(
                        dist as unknown as DistributionChargeEnriched,
                      );
                  }}
                  onAnnulerDistribution={(distributionId) => {
                    const dist = data.selectedTache?.distributions_charge?.find(
                      (d) => d.id === distributionId,
                    );
                    if (dist)
                      distActions.setAnnulerModalDistribution(
                        dist as unknown as DistributionChargeEnriched,
                      );
                  }}
                  onRestaurerDistribution={(distributionId) =>
                    distActions.handleRestaurer(distributionId)
                  }
                  onHistoriqueDistribution={(distributionId) => {
                    const dist = data.selectedTache?.distributions_charge?.find(
                      (d) => d.id === distributionId,
                    );
                    if (dist)
                      distActions.handleHistorique(dist as unknown as DistributionChargeEnriched);
                  }}
                  onGoToDistribution={(date) => {
                    setSelectedDate(date);
                    setViewMode('distributions');
                  }}
                  onCancelTask={() => openConfirmModal('cancel')}
                  onValidate={openValidationModal}
                  onToggleDistribution={data.handleToggleDistribution}
                  onEditDistribution={setEditingDistributionId}
                  onDeleteDistribution={setDeletingDistributionId}
                  onAddDistributions={async () => {
                    if (data.selectedTache) {
                      await data.reloadSelectedTask(data.selectedTache.id);
                    }
                    setShowAddDistributionsModal(true);
                  }}
                  onPhotoUpload={data.handlePhotoUpload}
                  onPhotoDelete={data.handleDeletePhoto}
                  onConsommationAdd={data.handleAddConsommation}
                  onConsommationDelete={data.handleDeleteConsommation}
                  onAssignEquipe={data.handleAssignEquipe}
                  onRemoveEquipe={data.handleRemoveEquipe}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}

      {/* Task Edit Modal */}
      {!data.isClientView && showEditModal && data.selectedTache && (
        <TaskFormModal
          tache={data.selectedTache}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleTaskUpdate}
          equipes={data.equipes || []}
          typesTaches={data.typesTaches}
          isSubmitting={data.updatingTask}
        />
      )}

      {/* Task Delete Confirmation */}
      {!data.isClientView && deletingTacheId && (
        <ConfirmDeleteModal
          title="Supprimer cette tâche ?"
          message="Cette action supprimera définitivement la tâche ainsi que toutes ses distributions, photos et consommations associées. Cette action est irréversible."
          onConfirm={async () => {
            await data.handleDeleteTache(deletingTacheId);
            setDeletingTacheId(null);
          }}
          onCancel={() => setDeletingTacheId(null)}
        />
      )}

      {/* Status Change Confirmation */}
      {!data.isClientView && confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-slate-600 mb-4">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={executeConfirmedAction}
                disabled={data.changingStatut}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {!data.isClientView && validationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {validationModal.type === 'VALIDEE' ? 'Valider la tâche' : 'Rejeter la tâche'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {validationModal.type === 'VALIDEE'
                ? 'Confirmez-vous la validation de cette tâche ?'
                : 'Confirmez-vous le rejet de cette tâche ?'}
            </p>
            <textarea
              value={validationComment}
              onChange={(e) => setValidationComment(e.target.value)}
              placeholder="Commentaire (optionnel)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4 resize-none h-24 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setValidationModal(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleValidation}
                disabled={data.validating}
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  validationModal.type === 'VALIDEE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {data.validating ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloture Proposal Modal */}
      {!data.isClientView && clotureProposalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Proposer la clôture ?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Toutes les tâches ({clotureProposalModal.nombre_taches_validees}) liées à la
              réclamation <strong>#{clotureProposalModal.reclamation_numero}</strong> sont validées.
              Voulez-vous proposer la clôture de cette réclamation ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setClotureProposalModal(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Plus tard
              </button>
              <button
                onClick={handleProposerCloture}
                disabled={data.processingCloture}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {data.processingCloture ? 'En cours...' : 'Proposer la clôture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distribution Edit Modal */}
      {!data.isClientView &&
        editingDistributionId &&
        data.selectedTache &&
        (() => {
          const distribution = data.selectedTache.distributions_charge?.find(
            (d) => d.id === editingDistributionId,
          );
          if (!distribution || !distribution.date) return null;

          // Créer les dates avec validation
          const dateStr = distribution.date;
          const heureDebut = distribution.heure_debut || '08:00';
          const heureFin = distribution.heure_fin || '17:00';
          const eventStart = new Date(`${dateStr}T${heureDebut}`);
          const eventEnd = new Date(`${dateStr}T${heureFin}`);

          // Si les dates sont invalides, ne pas afficher le modal
          if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
            showToast('Dates de distribution invalides', 'error');
            return null;
          }

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <DistributionEditForm
                  distributionId={editingDistributionId}
                  eventDate={distribution.date}
                  eventStart={eventStart}
                  eventEnd={eventEnd}
                  commentaire={distribution.commentaire}
                  heuresReelles={distribution.heures_reelles}
                  heuresPlanifiees={distribution.heures_planifiees}
                  isCompleted={distribution.status === 'REALISEE'}
                  tacheId={data.selectedTache.id}
                  onSuccess={async () => {
                    await data.reloadSelectedTask(data.selectedTache!.id);
                    setEditingDistributionId(null);
                  }}
                  onClose={() => setEditingDistributionId(null)}
                />
              </div>
            </div>
          );
        })()}

      {/* Distribution Delete Confirmation */}
      {!data.isClientView && deletingDistributionId && data.selectedTache && (
        <ConfirmDeleteModal
          title="Supprimer cette distribution ?"
          message={(() => {
            const dist = data.selectedTache.distributions_charge?.find(
              (d) => d.id === deletingDistributionId,
            );
            if (!dist) return 'Êtes-vous sûr de vouloir supprimer cette distribution ?';
            const date = new Date(dist.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            return `Êtes-vous sûr de vouloir supprimer la distribution du ${date} ? Cette action est irréversible.`;
          })()}
          onConfirm={() => handleDeleteDistribution(deletingDistributionId)}
          onCancel={() => setDeletingDistributionId(null)}
        />
      )}

      {/* Add Distributions Modal */}
      {!data.isClientView && showAddDistributionsModal && data.selectedTache && (
        <SelectDaysModal
          dateDebut={new Date(data.selectedTache.date_debut_planifiee)}
          dateFin={new Date(data.selectedTache.date_fin_planifiee)}
          initialSelection={data.selectedTache.distributions_charge?.map((d) => d.date) || []}
          protectedDates={data.selectedTache.distributions_charge?.map((d) => d.date) || []}
          existingDistributions={
            data.selectedTache.distributions_charge?.map((d) => ({
              date: d.date,
              heure_debut: d.heure_debut || '08:00',
              heure_fin: d.heure_fin || '17:00',
            })) || []
          }
          onConfirm={handleAddDistributions}
          onCancel={() => setShowAddDistributionsModal(false)}
        />
      )}

      {/* Modals pour les actions de distribution (vue par jour) */}

      {/* Reporter Distribution Modal */}
      {!data.isClientView && distActions.reporterModalDistribution && (
        <ReporterDistributionModal
          isOpen={true}
          distribution={distActions.reporterModalDistribution as unknown as DistributionCharge}
          onClose={() => {
            distActions.setReporterModalDistribution(null);
          }}
          onConfirm={distActions.handleReporter}
          isLoading={distActions.actionLoading}
        />
      )}

      {/* Annuler Distribution Modal */}
      {!data.isClientView && distActions.annulerModalDistribution && (
        <AnnulerDistributionModal
          isOpen={true}
          distribution={distActions.annulerModalDistribution as unknown as DistributionCharge}
          onClose={() => {
            distActions.setAnnulerModalDistribution(null);
          }}
          onConfirm={distActions.handleAnnuler}
          isLoading={distActions.actionLoading}
        />
      )}

      {/* Terminer Distribution Modal */}
      {!data.isClientView && distActions.terminerModalDistribution && (
        <TerminerDistributionModal
          isOpen={true}
          distribution={distActions.terminerModalDistribution as unknown as DistributionCharge}
          onClose={() => {
            distActions.setTerminerModalDistribution(null);
          }}
          onConfirm={
            viewMode === 'distributions'
              ? distActions.handleTerminerConfirm
              : distActions.handleTaskTerminerConfirm
          }
          isLoading={distActions.actionLoading}
        />
      )}

      {/* Demarrer Distribution Modal */}
      {!data.isClientView && distActions.demarrerModalDistribution && (
        <DemarrerDistributionModal
          isOpen={true}
          distribution={distActions.demarrerModalDistribution as unknown as DistributionCharge}
          onClose={() => {
            distActions.setDemarrerModalDistribution(null);
          }}
          onConfirm={
            viewMode === 'distributions'
              ? distActions.handleDemarrerConfirm
              : distActions.handleTaskDemarrerConfirm
          }
          isLoading={distActions.actionLoading}
        />
      )}

      {/* Historique Distribution Modal */}
      <HistoriqueDistributionModal
        isOpen={distActions.historiqueModalData.isOpen}
        historique={distActions.historiqueModalData.historique}
        nombreReports={distActions.historiqueModalData.nombreReports}
        onClose={distActions.closeHistoriqueModal}
        isLoading={distActions.historiqueModalData.isLoading}
      />

      {/* Annuler Tâche Modal (justification obligatoire) */}
      <AnnulerTacheModal
        isOpen={!data.isClientView && showCancelTacheModal}
        tache={data.selectedTache}
        onClose={() => setShowCancelTacheModal(false)}
        onConfirm={handleCancelTache}
        isLoading={data.changingStatut}
      />
    </div>
  );
};

export default SuiviTaches;
