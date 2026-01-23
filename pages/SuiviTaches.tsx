import React, { useState, useEffect, useCallback } from 'react';
import { useSuiviTachesData } from '../hooks/useSuiviTachesData';
import {
    TaskListPanel, TaskDetailPanel, SuiviTachesToolbar,
    DistributionsParJour,
    ReporterDistributionModal, AnnulerDistributionModal, HistoriqueDistributionModal
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

const SuiviTaches: React.FC = () => {
    const data = useSuiviTachesData();
    const { searchQuery, setPlaceholder, setSearchQuery } = useSearch();
    const { showToast } = useToast();

    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>('tasks');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [distributionsParJour, setDistributionsParJour] = useState<DistributionChargeEnriched[]>([]);
    const [loadingDistributions, setLoadingDistributions] = useState(false);
    const [distributionActionLoading, setDistributionActionLoading] = useState(false);

    // Filtres avancés pour les distributions
    const [distributionFilters, setDistributionFilters] = useState<DistributionFiltersType>({});
    const [useAdvancedFilters, setUseAdvancedFilters] = useState(false);

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

    const loadDistributionsParJour = useCallback(async (date: string) => {
        setLoadingDistributions(true);
        try {
            const response = await planningService.getDistributionsParJour(date);
            setDistributionsParJour(response.distributions);
        } catch (error) {
            console.error('Erreur chargement distributions:', error);
            setDistributionsParJour([]);
        } finally {
            setLoadingDistributions(false);
        }
    }, []);

    // Charger les distributions avec filtres avancés
    const loadDistributionsWithFilters = useCallback(async (filters: DistributionFiltersType, date?: string) => {
        setLoadingDistributions(true);
        try {
            // Ajouter la date si fournie et pas de filtre de date défini
            const filtersWithDate = {
                ...filters,
                date: filters.date || date
            };
            const distributions = await planningService.getDistributions(filtersWithDate);
            // Convertir en DistributionChargeEnriched (les champs enrichis peuvent être vides)
            setDistributionsParJour(distributions as DistributionChargeEnriched[]);
        } catch (error) {
            console.error('Erreur chargement distributions filtrées:', error);
            setDistributionsParJour([]);
        } finally {
            setLoadingDistributions(false);
        }
    }, []);

    // Charger les distributions quand on passe en mode distributions ou change de date/filtres
    useEffect(() => {
        if (viewMode === 'distributions') {
            // Vérifier si des filtres avancés sont actifs
            const hasAdvancedFilters = Object.keys(distributionFilters).some(
                key => distributionFilters[key as keyof DistributionFiltersType] !== undefined
            );

            if (hasAdvancedFilters) {
                setUseAdvancedFilters(true);
                loadDistributionsWithFilters(distributionFilters, selectedDate);
            } else {
                setUseAdvancedFilters(false);
                loadDistributionsParJour(selectedDate);
            }
        }
    }, [viewMode, selectedDate, distributionFilters, loadDistributionsParJour, loadDistributionsWithFilters]);

    // Handlers pour les actions de distribution (vue par jour)
    const handleDistributionDemarrer = async (distributionId: number) => {
        setDistributionActionLoading(true);
        try {
            await planningService.demarrerDistribution(distributionId);
            await loadDistributionsParJour(selectedDate);
            showToast('Distribution démarrée', 'success');
        } catch (error: any) {
            console.error('Erreur démarrage distribution:', error);
            showToast(error.message || 'Erreur lors du démarrage', 'error');
        } finally {
            setDistributionActionLoading(false);
        }
    };

    const handleDistributionTerminer = async (distributionId: number) => {
        setDistributionActionLoading(true);
        try {
            await planningService.terminerDistribution(distributionId);
            await loadDistributionsParJour(selectedDate);
            showToast('Distribution terminée', 'success');
        } catch (error: any) {
            console.error('Erreur terminaison distribution:', error);
            showToast(error.message || 'Erreur lors de la terminaison', 'error');
        } finally {
            setDistributionActionLoading(false);
        }
    };

    const handleDistributionReporter = async (nouvelleDate: string, motif: MotifDistribution, commentaire: string) => {
        if (!reporterModalDistribution) return;
        setDistributionActionLoading(true);
        try {
            await planningService.reporterDistribution(reporterModalDistribution.id, nouvelleDate, motif, commentaire);
            setReporterModalDistribution(null);
            await loadDistributionsParJour(selectedDate);
            showToast('Distribution reportée', 'success');
        } catch (error: any) {
            console.error('Erreur report distribution:', error);
            showToast(error.message || 'Erreur lors du report', 'error');
        } finally {
            setDistributionActionLoading(false);
        }
    };

    const handleDistributionAnnuler = async (motif: MotifDistribution, commentaire: string) => {
        if (!annulerModalDistribution) return;
        setDistributionActionLoading(true);
        try {
            await planningService.annulerDistribution(annulerModalDistribution.id, motif, commentaire);
            setAnnulerModalDistribution(null);
            await loadDistributionsParJour(selectedDate);
            showToast('Distribution annulée', 'success');
        } catch (error: any) {
            console.error('Erreur annulation distribution:', error);
            showToast(error.message || 'Erreur lors de l\'annulation', 'error');
        } finally {
            setDistributionActionLoading(false);
        }
    };

    const handleDistributionRestaurer = async (distributionId: number) => {
        setDistributionActionLoading(true);
        try {
            await planningService.restaurerDistribution(distributionId);
            await loadDistributionsParJour(selectedDate);
            showToast('Distribution restaurée', 'success');
        } catch (error: any) {
            console.error('Erreur restauration distribution:', error);
            showToast(error.message || 'Erreur lors de la restauration', 'error');
        } finally {
            setDistributionActionLoading(false);
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

    const openConfirmModal = (type: 'start' | 'complete' | 'cancel') => {
        const isLate = data.selectedTache?.statut === 'EN_RETARD';
        const isExpired = data.selectedTache?.statut === 'EXPIREE';

        const configs = {
            start: {
                title: isLate ? 'Démarrer en retard' : 'Démarrer la tâche',
                message: isLate
                    ? 'Cette tâche est en retard. Le démarrage tardif sera enregistré pour la traçabilité. Voulez-vous continuer ?'
                    : 'Êtes-vous sûr de vouloir démarrer cette tâche maintenant ?',
            },
            complete: {
                title: 'Terminer la tâche',
                message: 'Êtes-vous sûr de vouloir marquer cette tâche comme terminée ?',
            },
            cancel: {
                title: isExpired ? 'Annuler la tâche expirée' : 'Annuler la tâche',
                message: isExpired
                    ? 'Cette tâche expirée sera marquée comme annulée. Cette action est irréversible. Continuer ?'
                    : 'Êtes-vous sûr de vouloir annuler cette tâche ?',
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
                    ? () => useAdvancedFilters
                        ? loadDistributionsWithFilters(distributionFilters, selectedDate)
                        : loadDistributionsParJour(selectedDate)
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
                        onStartTask={() => openConfirmModal('start')}
                        onCompleteTask={() => openConfirmModal('complete')}
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
