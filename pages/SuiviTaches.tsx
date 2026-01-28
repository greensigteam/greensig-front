import React, { useState, useEffect, useCallback } from 'react';
import { useSuiviTachesData } from '../hooks/useSuiviTachesData';
import {
    TaskListPanel, TaskDetailPanel, SuiviTachesToolbar,
    DistributionsParJour,
    ReporterDistributionModal, AnnulerDistributionModal, HistoriqueDistributionModal,
    TerminerDistributionModal, DemarrerDistributionModal
} from '../components/suivi-taches';
import { ViewMode } from '../components/suivi-taches/SuiviTachesToolbar';
import {
    TacheCreate, DistributionChargeEnriched,
    DistributionCharge, MotifDistribution, DistributionHistorique,
    DistributionFilters as DistributionFiltersType
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
import {
    useDemarrerDistribution,
    useTerminerDistribution,
    useReporterDistribution,
    useAnnulerDistribution,
    useRestaurerDistribution,
} from '../hooks/mutations';

const SuiviTaches: React.FC = () => {
    const data = useSuiviTachesData();
    const { searchQuery, setPlaceholder, setSearchQuery } = useSearch();
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
        { enabled: viewMode === 'distributions' && useAdvancedFilters }
    );

    // Distribution mutations
    const demarrerMutation = useDemarrerDistribution();
    const terminerMutation = useTerminerDistribution();
    const reporterMutation = useReporterDistribution();
    const annulerMutation = useAnnulerDistribution();
    const restaurerMutation = useRestaurerDistribution();

    // Derived distribution data - use filtered or par-jour based on filter state
    const distributionsParJour = useAdvancedFilters
        ? (distributionsFilteredQuery.data ?? [])
        : (distributionsParJourQuery.data?.distributions ?? []);
    const loadingDistributions = useAdvancedFilters
        ? (distributionsFilteredQuery.isLoading || distributionsFilteredQuery.isFetching)
        : (distributionsParJourQuery.isLoading || distributionsParJourQuery.isFetching);
    const distributionActionLoading =
        demarrerMutation.isPending ||
        terminerMutation.isPending ||
        reporterMutation.isPending ||
        annulerMutation.isPending ||
        restaurerMutation.isPending;

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
            setDistributionFilters(prev => ({
                ...prev,
                search: searchQuery || undefined
            }));
        }
    }, [searchQuery, viewMode]);

    // Modal states for distribution actions
    const [reporterModalDistribution, setReporterModalDistribution] = useState<DistributionChargeEnriched | null>(null);
    const [annulerModalDistribution, setAnnulerModalDistribution] = useState<DistributionChargeEnriched | null>(null);
    const [terminerModalDistribution, setTerminerModalDistribution] = useState<DistributionChargeEnriched | null>(null);
    const [demarrerModalDistribution, setDemarrerModalDistribution] = useState<DistributionChargeEnriched | null>(null);
    const [historiqueModalData, setHistoriqueModalData] = useState<{
        isOpen: boolean;
        historique: DistributionHistorique[] | null;
        nombreReports: number;
        isLoading: boolean;
    }>({ isOpen: false, historique: null, nombreReports: 0, isLoading: false });

    // Local modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [deletingTacheId, setDeletingTacheId] = useState<number | null>(null);
    const [editingDistributionId, setEditingDistributionId] = useState<number | null>(null);
    const [deletingDistributionId, setDeletingDistributionId] = useState<number | null>(null);
    const [showAddDistributionsModal, setShowAddDistributionsModal] = useState(false);

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'start' | 'complete' | 'cancel';
    } | null>(null);

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
                key => distributionFilters[key as keyof DistributionFiltersType] !== undefined
            );
            setUseAdvancedFilters(hasAdvancedFilters);
        }
    }, [viewMode, distributionFilters]);

    // Handlers pour les actions de distribution (vue par jour) - Using React Query mutations
    const handleDistributionDemarrer = (distributionId: number) => {
        const distribution = distributionsParJour.find(d => d.id === distributionId);
        if (distribution) {
            setDemarrerModalDistribution(distribution);
        }
    };

    const handleDistributionDemarrerConfirm = async (modalData: {
        heure_debut_reelle?: string;
        date_debut_reelle?: string;
    }) => {
        if (!demarrerModalDistribution) return;
        try {
            await demarrerMutation.mutateAsync({
                distributionId: demarrerModalDistribution.id,
                date: selectedDate,
                data: modalData,
            });
            setDemarrerModalDistribution(null);
            // Recharger la tâche sélectionnée (le statut tâche peut changer: PLANIFIEE → EN_COURS)
            if (data.selectedTache) {
                await data.reloadSelectedTask(data.selectedTache.id);
            }
            await data.loadTaches();
            showToast('Distribution démarrée', 'success');
        } catch (error: any) {
            console.error('Erreur démarrage distribution:', error);
            showToast(error.message || 'Erreur lors du démarrage', 'error');
        }
    };

    const handleDistributionTerminer = (distributionId: number) => {
        const distribution = distributionsParJour.find(d => d.id === distributionId);
        if (distribution) {
            setTerminerModalDistribution(distribution);
        }
    };

    const handleDistributionTerminerConfirm = async (modalData: {
        heure_debut_reelle?: string;
        heure_fin_reelle?: string;
        heures_reelles?: number;
    }) => {
        if (!terminerModalDistribution) return;
        try {
            await terminerMutation.mutateAsync({
                distributionId: terminerModalDistribution.id,
                date: selectedDate,
                data: modalData,
            });
            setTerminerModalDistribution(null);
            // Recharger la tâche sélectionnée (le statut tâche peut changer: EN_COURS → TERMINEE)
            if (data.selectedTache) {
                await data.reloadSelectedTask(data.selectedTache.id);
            }
            await data.loadTaches();
            showToast('Distribution terminée', 'success');
        } catch (error: any) {
            console.error('Erreur terminaison distribution:', error);
            showToast(error.message || 'Erreur lors de la terminaison', 'error');
        }
    };

    const handleDistributionReporter = async (nouvelleDate: string, motif: MotifDistribution, commentaire: string) => {
        if (!reporterModalDistribution) return;
        try {
            await reporterMutation.mutateAsync({
                distributionId: reporterModalDistribution.id,
                oldDate: selectedDate,
                newDate: nouvelleDate,
                motif,
                commentaire,
            });
            setReporterModalDistribution(null);
            // Recharger les données tâche (le report peut affecter le statut tâche)
            if (data.selectedTache) {
                await data.reloadSelectedTask(data.selectedTache.id);
            }
            await data.loadTaches();
            showToast('Distribution reportée', 'success');
        } catch (error: any) {
            console.error('Erreur report distribution:', error);
            showToast(error.message || 'Erreur lors du report', 'error');
        }
    };

    const handleDistributionAnnuler = async (motif: MotifDistribution, commentaire: string) => {
        if (!annulerModalDistribution) return;
        try {
            await annulerMutation.mutateAsync({
                distributionId: annulerModalDistribution.id,
                date: selectedDate,
                motif,
                commentaire,
            });
            setAnnulerModalDistribution(null);
            // Recharger les données tâche (l'annulation peut affecter le statut tâche)
            if (data.selectedTache) {
                await data.reloadSelectedTask(data.selectedTache.id);
            }
            await data.loadTaches();
            showToast('Distribution annulée', 'success');
        } catch (error: any) {
            console.error('Erreur annulation distribution:', error);
            showToast(error.message || 'Erreur lors de l\'annulation', 'error');
        }
    };

    const handleDistributionRestaurer = async (distributionId: number) => {
        try {
            await restaurerMutation.mutateAsync({
                distributionId,
                date: selectedDate,
            });
            // Recharger les données tâche (la restauration peut affecter le statut tâche)
            if (data.selectedTache) {
                await data.reloadSelectedTask(data.selectedTache.id);
            }
            await data.loadTaches();
            showToast('Distribution restaurée', 'success');
        } catch (error: any) {
            console.error('Erreur restauration distribution:', error);
            showToast(error.message || 'Erreur lors de la restauration', 'error');
        }
    };

    const handleDistributionHistorique = async (distribution: DistributionChargeEnriched) => {
        setHistoriqueModalData({ isOpen: true, historique: null, nombreReports: distribution.nombre_reports || 0, isLoading: true });
        try {
            const response = await planningService.getHistoriqueDistribution(distribution.id);
            setHistoriqueModalData({
                isOpen: true,
                historique: response.chaine_reports,
                nombreReports: response.nombre_reports,
                isLoading: false
            });
        } catch (error: any) {
            console.error('Erreur chargement historique:', error);
            setHistoriqueModalData(prev => ({ ...prev, isLoading: false }));
            showToast(error.message || 'Erreur lors du chargement de l\'historique', 'error');
        }
    };

    const handleSelectTaskFromDistribution = async (tacheId: number) => {
        // Passer en mode tâches et sélectionner la tâche
        setViewMode('tasks');
        // Chercher la tâche dans la liste existante ou la charger
        const existingTache = data.taches.find(t => t.id === tacheId);
        if (existingTache) {
            data.setSelectedTache(existingTache);
        } else {
            // Charger la tâche depuis le backend
            try {
                const tache = await planningService.getTache(tacheId);
                data.setSelectedTache(tache);
            } catch (error: any) {
                console.error('Erreur chargement tâche:', error);
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

    // "Démarrer tâche" = démarrer la prochaine distribution non réalisée
    // Fonctionne pour PLANIFIEE (première distribution) et EN_COURS (distribution suivante)
    const handleStartTask = () => {
        if (!data.selectedTache) return;

        const distributions = data.selectedTache.distributions_charge || [];
        const firstPendingDistribution = distributions
            .filter(d => d.status === 'NON_REALISEE')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

        if (firstPendingDistribution) {
            setDemarrerModalDistribution({
                ...firstPendingDistribution,
                tache_id: data.selectedTache.id,
                tache_titre: data.selectedTache.type_tache_detail?.nom_tache,
                tache_type: data.selectedTache.type_tache_detail?.nom_tache,
                tache_statut: data.selectedTache.statut,
            } as DistributionChargeEnriched);
        } else {
            showToast('Aucune distribution à démarrer pour cette tâche', 'warning');
        }
    };

    // Handler pour confirmer le démarrage via le modal (pour les tâches)
    const handleTaskDemarrerConfirm = async (modalData: { heure_debut_reelle?: string; date_debut_reelle?: string }) => {
        if (!demarrerModalDistribution) return;
        try {
            await demarrerMutation.mutateAsync({
                distributionId: demarrerModalDistribution.id,
                date: demarrerModalDistribution.date,
                data: modalData,
            });
            setDemarrerModalDistribution(null);
            // Recharger la tâche sélectionnée pour voir le nouveau statut
            if (data.selectedTache) {
                await data.reloadSelectedTask(data.selectedTache.id);
            }
            await data.loadTaches();
            showToast('Distribution démarrée', 'success');
        } catch (error: any) {
            console.error('Erreur démarrage distribution:', error);
            showToast(error.message || 'Erreur lors du démarrage', 'error');
        }
    };

    // "Terminer tâche" = terminer la distribution EN_COURS
    const handleCompleteTask = () => {
        if (!data.selectedTache) return;

        // Trouver la distribution EN_COURS
        const distributions = data.selectedTache.distributions_charge || [];
        const inProgressDistribution = distributions.find(d => d.status === 'EN_COURS');

        if (inProgressDistribution) {
            // Ouvrir le modal de terminaison de distribution avec cette distribution
            setTerminerModalDistribution({
                ...inProgressDistribution,
                tache_id: data.selectedTache.id,
                tache_titre: data.selectedTache.type_tache_detail?.nom_tache,
                tache_type: data.selectedTache.type_tache_detail?.nom_tache,
                tache_statut: data.selectedTache.statut,
            } as DistributionChargeEnriched);
        } else {
            // Pas de distribution en cours à terminer
            showToast('Aucune distribution en cours à terminer', 'warning');
        }
    };

    // Handler pour confirmer la terminaison via le modal (pour les tâches)
    const handleTaskTerminerConfirm = async (modalData: {
        heure_debut_reelle?: string;
        heure_fin_reelle?: string;
        heures_reelles?: number;
    }) => {
        if (!terminerModalDistribution) return;
        try {
            await terminerMutation.mutateAsync({
                distributionId: terminerModalDistribution.id,
                date: terminerModalDistribution.date,
                data: modalData,
            });
            setTerminerModalDistribution(null);
            // Recharger la tâche sélectionnée pour voir le nouveau statut
            if (data.selectedTache) {
                await data.reloadSelectedTask(data.selectedTache.id);
            }
            await data.loadTaches();
            showToast('Distribution terminée', 'success');
        } catch (error: any) {
            console.error('Erreur terminaison distribution:', error);
            showToast(error.message || 'Erreur lors de la terminaison', 'error');
        }
    };

    const openConfirmModal = (type: 'start' | 'complete' | 'cancel') => {
        // ✅ SIMPLIFIÉ: Plus de EN_RETARD ni EXPIREE
        const configs = {
            start: {
                title: 'Démarrer la tâche',
                message: 'Êtes-vous sûr de vouloir démarrer cette tâche maintenant ?',
            },
            complete: {
                title: 'Terminer la tâche',
                message: 'Êtes-vous sûr de vouloir marquer cette tâche comme terminée ?',
            },
            cancel: {
                title: 'Annuler la tâche',
                message: 'Êtes-vous sûr de vouloir annuler cette tâche ?',
            }
        };

        setConfirmModal({ isOpen: true, type, ...configs[type] });
    };

    const executeConfirmedAction = async () => {
        if (!confirmModal) return;
        await data.handleChangeStatut(confirmModal.type);
        setConfirmModal(null);
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
            if (response.proposition_cloture_possible && response.reclamation_id && response.reclamation_numero) {
                setClotureProposalModal({
                    reclamation_id: response.reclamation_id,
                    reclamation_numero: response.reclamation_numero,
                    nombre_taches_validees: response.nombre_taches_validees || 0
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
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden min-h-0">
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
                onRefresh={viewMode === 'distributions'
                    ? refetchDistributions
                    : data.loadTaches}
                viewMode={viewMode}
                onViewModeChange={(mode) => {
                    setViewMode(mode);
                    setSearchQuery(''); // Clear search when switching modes
                }}
                distributionsCount={distributionsParJour.length}
            />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* View: Distributions par jour */}
                {viewMode === 'distributions' ? (
                    <div className="flex-1 p-4 overflow-hidden">
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
                            onDemarrer={handleDistributionDemarrer}
                            onTerminer={handleDistributionTerminer}
                            onReporter={setReporterModalDistribution}
                            onAnnuler={setAnnulerModalDistribution}
                            onRestaurer={handleDistributionRestaurer}
                            onHistorique={handleDistributionHistorique}
                            onSelectTask={handleSelectTaskFromDistribution}
                            isActionLoading={distributionActionLoading}
                            isClientView={data.isClientView}
                        />
                    </div>
                ) : (
                    <>
                        {/* Left Panel: Task List */}
                        <div className={`${data.selectedTache ? 'hidden lg:flex' : 'flex'} flex-1 flex-col min-h-0`}>
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

                        {/* Right Panel: Task Detail */}
                        {data.selectedTache && (
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
                                onStartTask={handleStartTask}
                                onCompleteTask={handleCompleteTask}
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
                        )}
                    </>
                )}
            </div>

            {/* Modals */}

            {/* Task Edit Modal */}
            {showEditModal && data.selectedTache && (
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
            {deletingTacheId && (
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
            {confirmModal && (
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
            {validationModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                            {validationModal.type === 'VALIDEE' ? 'Valider la tâche' : 'Rejeter la tâche'}
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            {validationModal.type === 'VALIDEE'
                                ? 'Confirmez-vous la validation de cette tâche ?'
                                : 'Confirmez-vous le rejet de cette tâche ?'
                            }
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
                                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${validationModal.type === 'VALIDEE'
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
            {clotureProposalModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Proposer la clôture ?</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Toutes les tâches ({clotureProposalModal.nombre_taches_validees}) liées à la réclamation{' '}
                            <strong>#{clotureProposalModal.reclamation_numero}</strong> sont validées.
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
            {editingDistributionId && data.selectedTache && (() => {
                const distribution = data.selectedTache.distributions_charge?.find(d => d.id === editingDistributionId);
                if (!distribution || !distribution.date) return null;

                // Créer les dates avec validation
                const dateStr = distribution.date;
                const heureDebut = distribution.heure_debut || '08:00';
                const heureFin = distribution.heure_fin || '17:00';
                const eventStart = new Date(`${dateStr}T${heureDebut}`);
                const eventEnd = new Date(`${dateStr}T${heureFin}`);

                // Si les dates sont invalides, ne pas afficher le modal
                if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
                    console.error('Distribution dates invalides:', { dateStr, heureDebut, heureFin });
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
            {deletingDistributionId && data.selectedTache && (
                <ConfirmDeleteModal
                    title="Supprimer cette distribution ?"
                    message={(() => {
                        const dist = data.selectedTache.distributions_charge?.find(d => d.id === deletingDistributionId);
                        if (!dist) return 'Êtes-vous sûr de vouloir supprimer cette distribution ?';
                        const date = new Date(dist.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        });
                        return `Êtes-vous sûr de vouloir supprimer la distribution du ${date} ? Cette action est irréversible.`;
                    })()}
                    onConfirm={() => handleDeleteDistribution(deletingDistributionId)}
                    onCancel={() => setDeletingDistributionId(null)}
                />
            )}

            {/* Add Distributions Modal */}
            {showAddDistributionsModal && data.selectedTache && (
                <SelectDaysModal
                    startDate={data.selectedTache.date_debut_planifiee}
                    endDate={data.selectedTache.date_fin_planifiee}
                    initialSelection={data.selectedTache.distributions_charge?.map(d => d.date) || []}
                    protectedDates={data.selectedTache.distributions_charge?.map(d => d.date) || []}
                    existingDistributions={data.selectedTache.distributions_charge?.map(d => ({
                        date: d.date,
                        heure_debut: d.heure_debut || '08:00',
                        heure_fin: d.heure_fin || '17:00'
                    })) || []}
                    onConfirm={handleAddDistributions}
                    onCancel={() => setShowAddDistributionsModal(false)}
                />
            )}

            {/* Modals pour les actions de distribution (vue par jour) */}

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
                    onConfirm={viewMode === 'distributions' ? handleDistributionTerminerConfirm : handleTaskTerminerConfirm}
                    isLoading={distributionActionLoading}
                />
            )}

            {/* Demarrer Distribution Modal */}
            {demarrerModalDistribution && (
                <DemarrerDistributionModal
                    isOpen={true}
                    distribution={demarrerModalDistribution as unknown as DistributionCharge}
                    onClose={() => setDemarrerModalDistribution(null)}
                    onConfirm={viewMode === 'distributions' ? handleDistributionDemarrerConfirm : handleTaskDemarrerConfirm}
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

export default SuiviTaches;
