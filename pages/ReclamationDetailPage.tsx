import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { AlertCircle, MapPin, Clock, ClipboardList, Star, Eye, X, Info } from 'lucide-react';

import {
  fetchReclamationById,
  fetchTypesReclamations,
  fetchUrgences,
} from '../services/reclamationsApi';
import { ReclamationEditModal } from '../components/reclamations/ReclamationEditModal';
import { planningService } from '../services/planningService';
import { fetchEquipes, fetchCurrentUser } from '../services/usersApi';
import { getObjectsInGeometry } from '../services/api';
import { createTaskWithRecurrence, formatRecurrenceToast } from '../utils/taskRecurrence';
import { TacheCreate } from '../types/planning';
import { EquipeList } from '../types/users';
import { SatisfactionForm } from '../components/SatisfactionForm';
import TaskFormModal, { type InventoryObjectOption } from '../components/planning/TaskFormModal';
import { formatLocalDate } from '../utils/dateHelpers';
import { format } from 'date-fns';
import LoadingScreen from '../components/LoadingScreen';
import ConfirmModal from '../components/ConfirmModal';
import { ReclamationTimeline } from '../components/ReclamationTimeline';
import OLMap from '../components/OLMap';
import { RECLAMATION_STATUS_COLORS, MAP_LAYERS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { useUrlModal } from '../hooks/useUrlModal';
import { getGeometryCenter } from '../utils/geometryCenter';
import ReclamationActionModal from '../components/reclamations/ReclamationActionModal';
import ReclamationInfoPanel from '../components/reclamations/ReclamationInfoPanel';
import { ReclamationDetailHeader } from '../components/reclamations/ReclamationDetailHeader';
import { useReclamationDetailActions } from '../hooks/useReclamationDetailActions';

const ReclamationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  // Données principales + référentiels via React Query (cache, pas de refetch inutile)
  const {
    data: reclamation,
    isLoading: loadingRec,
    error: recError,
    refetch: refetchReclamation,
  } = useQuery({
    queryKey: id ? queryKeys.reclamations.detail(Number(id)) : ['reclamations', 'none'],
    queryFn: () => fetchReclamationById(Number(id)),
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
  });

  const { data: currentUser } = useQuery({
    queryKey: queryKeys.user.current,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
  const { data: typesTaches = [] } = useQuery({
    queryKey: ['typesTaches'],
    queryFn: () => planningService.getTypesTaches(),
    staleTime: 10 * 60 * 1000,
  });
  const { data: equipesRaw } = useQuery({
    queryKey: ['equipes'],
    queryFn: () => fetchEquipes(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: typesReclamation = [] } = useQuery({
    queryKey: ['typesReclamation'],
    queryFn: fetchTypesReclamations,
    staleTime: 10 * 60 * 1000,
  });
  const { data: urgences = [] } = useQuery({
    queryKey: ['urgences'],
    queryFn: fetchUrgences,
    staleTime: 10 * 60 * 1000,
  });

  const equipes: EquipeList[] = equipesRaw?.results ?? [];
  const loading = loadingRec;
  const error = recError
    ? (recError as Error).message || 'Impossible de charger la réclamation'
    : null;

  // Edit modal
  const editModal = useUrlModal('edit');
  const deleteConfirmModal = useUrlModal('delete');
  const taskModal = useUrlModal('create-task');

  // Task modal
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskInitialValues, setTaskInitialValues] = useState<Partial<TacheCreate>>({});
  const [taskSiteFilter, setTaskSiteFilter] = useState<{ id: number; name: string } | undefined>(
    undefined,
  );
  const [taskPreSelectedObjects, setTaskPreSelectedObjects] = useState<InventoryObjectOption[]>([]);
  const [isLoadingObjects, setIsLoadingObjects] = useState(false);

  // Helpers rôles
  const isAdmin = !!currentUser?.roles?.includes('ADMIN');
  const isSupervisor = !!currentUser?.roles?.includes('SUPERVISEUR');
  const isClient = !!currentUser?.roles?.includes('CLIENT');

  // All workflow actions (clôture, refus, rejet, satisfaction, delete, visibility)
  const actions = useReclamationDetailActions(reclamation, refetchReclamation);

  // ===================================
  // TASK CREATION HANDLERS
  // ===================================

  const handleOpenTaskModal = async () => {
    if (!reclamation) return;

    setTaskInitialValues({
      priorite: 3,
      commentaires: `Tâche liée à la réclamation ${reclamation.numero_reclamation}`,
      date_debut_planifiee: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      date_fin_planifiee: format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
      reclamation: reclamation.id,
    });

    if (reclamation.site) {
      setTaskSiteFilter({
        id: reclamation.site,
        name: reclamation.site_nom || `Site #${reclamation.site}`,
      });
    } else {
      setTaskSiteFilter(undefined);
    }

    setTaskPreSelectedObjects([]);
    if (reclamation.localisation) {
      setIsLoadingObjects(true);
      try {
        const result = await getObjectsInGeometry(reclamation.localisation, {
          site_id: reclamation.site || undefined,
        });

        if (result.objects && result.objects.length > 0) {
          const preSelected: InventoryObjectOption[] = result.objects.map((obj) => ({
            id: obj.id,
            type: obj.type,
            nom: obj.nom || `${obj.type} #${obj.id}`,
            site: obj.site_nom || '',
            soussite: obj.sous_site_nom || undefined,
          }));
          setTaskPreSelectedObjects(preSelected);
          showToast(`${result.count} objet(s) trouvé(s) dans la zone de la réclamation`, 'info');
        }
      } catch (_error: any) {
        showToast(
          'Impossible de récupérer les objets dans la zone de la réclamation. Vous pouvez sélectionner manuellement des objets.',
          'error',
        );
      } finally {
        setIsLoadingObjects(false);
      }
    }

    taskModal.open();
  };

  const handleTaskSubmit = async (data: TacheCreate) => {
    if (!reclamation) return;

    setIsSubmittingTask(true);
    try {
      const payload: TacheCreate = {
        ...data,
        reclamation: reclamation.id,
      };

      const { recurrenceResult } = await createTaskWithRecurrence(payload);
      const prefix = reclamation.numero_reclamation
        ? `Réclamation ${reclamation.numero_reclamation} :`
        : undefined;
      showToast(formatRecurrenceToast(recurrenceResult, prefix), 'success');

      taskModal.close();
      setTaskInitialValues({});
      setTaskSiteFilter(undefined);
      refetchReclamation();
    } catch (_error: any) {
      showToast('Échec de la création de la tâche.', 'error');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleCloseTaskModal = () => {
    taskModal.close();
    setTaskInitialValues({});
    setTaskSiteFilter(undefined);
  };

  // ===================================
  // RENDER
  // ===================================

  if (loading) {
    return (
      <div className="fixed inset-0 z-50">
        <LoadingScreen isLoading={true} loop={true} minDuration={0} />
      </div>
    );
  }

  if (error || !reclamation) {
    return (
      <div className="flex items-center justify-center bg-slate-50 min-h-[400px]">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
          <p className="text-red-600">{error || 'Réclamation non trouvée'}</p>
          <Link
            to="/reclamations"
            className="mt-4 inline-block text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50">
      {/* Bannière Réclamation Rejetée */}
      {reclamation.statut === 'REJETEE' && (
        <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-center gap-3">
          <X className="w-5 h-5" />
          <span className="font-medium">
            Cette réclamation a été rejetée et est en lecture seule. Aucune action n'est possible.
          </span>
        </div>
      )}

      {/* Bannière Réclamation Clôturée */}
      {reclamation.statut === 'CLOTUREE' && !reclamation.auto_cloturee && (
        <div className="bg-emerald-600 text-white px-6 py-3 flex items-center justify-center gap-3">
          <Star className="w-5 h-5" />
          <span className="font-medium">Cette réclamation a été clôturée avec succès.</span>
        </div>
      )}

      {/* Bannière Auto-Clôture (48h sans retour client) */}
      {reclamation.statut === 'CLOTUREE' && reclamation.auto_cloturee && (
        <div className="bg-amber-500 text-white px-6 py-3 flex items-start justify-center gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="font-medium text-center">
            Clôture automatique — aucune réponse du client sous 48h après la proposition de clôture.
            La note de satisfaction a été générée automatiquement (5/5).
          </span>
        </div>
      )}

      {/* Header */}
      <ReclamationDetailHeader
        reclamation={reclamation}
        currentUser={currentUser}
        isAdmin={isAdmin}
        isSupervisor={isSupervisor}
        isClient={isClient}
        onEdit={editModal.open}
        onDelete={deleteConfirmModal.open}
        onOpenTaskModal={handleOpenTaskModal}
        onCloturer={actions.handleCloturer}
        onValiderCloture={actions.handleValiderCloture}
        onRefuserCloture={() => actions.setShowRefuserClotureModal(true)}
        onRejeter={() => actions.setShowRejeterModal(true)}
        onRefuserIntervention={() => actions.setShowRefuserInterventionModal(true)}
        onReprendreIntervention={actions.handleReprendreIntervention}
        onEvaluer={() => actions.setShowSatisfactionForm(true)}
        onToggleVisibility={actions.handleToggleVisibility}
      />

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations principales */}
            <ReclamationInfoPanel reclamation={reclamation} />

            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Description</h2>
              <p className="text-slate-700 whitespace-pre-line">{reclamation.description}</p>
            </div>

            {/* Dates clés + Interventions + Satisfaction en grille */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Dates clés */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Dates clés</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Prise en compte</span>
                    <span className="text-sm font-medium text-slate-800">
                      {formatLocalDate(reclamation.date_prise_en_compte, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Début traitement</span>
                    <span className="text-sm font-medium text-slate-800">
                      {formatLocalDate(reclamation.date_debut_traitement, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Résolution</span>
                    <span className="text-sm font-medium text-emerald-600">
                      {formatLocalDate(reclamation.date_resolution, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Clôture réelle</span>
                    <span className="text-sm font-medium text-slate-800">
                      {formatLocalDate(reclamation.date_cloture_reelle, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interventions liées */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Interventions liées</h2>
                {reclamation.taches_liees_details && reclamation.taches_liees_details.length > 0 ? (
                  <div className="space-y-3">
                    {reclamation.taches_liees_details.map((t: any) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <ClipboardList className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{t.type_tache}</p>
                            <p className="text-xs text-slate-500">
                              {t.equipe || 'Équipe non assignée'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
                          >
                            {t.statut}
                          </span>
                          <Link
                            to={`/suivi-taches?task_id=${t.id}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Voir le détail de la tâche"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Aucune intervention liée</p>
                )}
              </div>

              {/* Satisfaction */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Évaluation client</h2>
                {reclamation.satisfaction ? (
                  <div className="text-center">
                    <div className="flex justify-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${star <= (reclamation.satisfaction?.note ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                      {reclamation.satisfaction?.note ?? 0}/5
                    </p>
                    {reclamation.satisfaction?.auto_evaluee && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                        <Info className="w-3.5 h-3.5" />
                        Note générée automatiquement (pas d'évaluation client)
                      </div>
                    )}
                    {reclamation.satisfaction?.commentaire && (
                      <p className="mt-3 text-sm text-slate-600 italic">
                        "{reclamation.satisfaction.commentaire}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic text-center">Non évaluée</p>
                )}
              </div>
            </div>

            {/* Photos */}
            {((reclamation.photos && reclamation.photos.length > 0) ||
              (reclamation.photos_taches && reclamation.photos_taches.length > 0)) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Photos</h2>

                {reclamation.photos && reclamation.photos.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-medium text-slate-500 mb-3">Photos initiales</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {reclamation.photos.map((p, i) => (
                        <div
                          key={i}
                          className="relative group cursor-pointer shrink-0"
                          onClick={() => actions.setSelectedPhoto(p.url_fichier)}
                        >
                          <img
                            src={p.url_fichier}
                            alt={`Photo ${i}`}
                            className="h-32 w-44 object-cover rounded-lg border border-slate-200 hover:border-emerald-500 transition-colors"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg flex items-center justify-center transition-all">
                            <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reclamation.photos_taches && reclamation.photos_taches.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 mb-3">Photos des travaux</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {reclamation.photos_taches.map((p, i) => (
                        <div
                          key={i}
                          className="relative group cursor-pointer shrink-0"
                          onClick={() => actions.setSelectedPhoto(p.url_fichier)}
                        >
                          <img
                            src={p.url_fichier}
                            alt={`Photo travaux ${i}`}
                            className="h-32 w-44 object-cover rounded-lg border border-slate-200 hover:border-blue-500 transition-colors"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/50 text-xs text-white p-1.5 text-center rounded-b-lg">
                            {new Date(p.date_prise).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Suivi de traitement
              </h2>
              <ReclamationTimeline
                historique={reclamation.historique || []}
                photos={reclamation.photos || []}
                photosTaches={reclamation.photos_taches || []}
                satisfaction={reclamation.satisfaction}
                canEvaluate={
                  (reclamation.statut === 'CLOTUREE' || reclamation.statut === 'RESOLUE') &&
                  !reclamation.satisfaction
                }
                onEvaluate={() => actions.setShowSatisfactionForm(true)}
              />
            </div>
          </div>

          {/* Sidebar - Carte */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Localisation sur carte
                </h2>
              </div>
              <div className="h-[500px]">
                {(() => {
                  const center = getGeometryCenter(reclamation.localisation);
                  if (center) {
                    return (
                      <OLMap
                        isMiniMap={true}
                        activeLayer={MAP_LAYERS.SATELLITE}
                        targetLocation={{
                          coordinates: center,
                          zoom: 17,
                        }}
                        highlightedGeometry={{
                          type: 'Feature',
                          geometry: reclamation.localisation,
                          properties: {
                            couleur_statut:
                              RECLAMATION_STATUS_COLORS[reclamation.statut] || '#f97316',
                          },
                        }}
                      />
                    );
                  }
                  return (
                    <div className="h-full flex items-center justify-center bg-slate-50">
                      <p className="text-slate-400 text-sm">Aucune localisation disponible</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {taskModal.isOpen && (
        <TaskFormModal
          initialValues={taskInitialValues}
          equipes={equipes}
          typesTaches={typesTaches}
          preSelectedObjects={taskPreSelectedObjects}
          siteFilter={taskSiteFilter}
          isSubmitting={isSubmittingTask || isLoadingObjects}
          onClose={handleCloseTaskModal}
          onSubmit={handleTaskSubmit}
        />
      )}

      {/* Satisfaction Form */}
      {actions.showSatisfactionForm && reclamation && (
        <SatisfactionForm
          reclamationId={reclamation.id}
          reclamationNumero={reclamation.numero_reclamation}
          onSubmit={actions.handleSatisfactionSubmit}
          onClose={() => actions.setShowSatisfactionForm(false)}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={actions.modalConfig.isOpen}
        title={actions.modalConfig.title}
        message={actions.modalConfig.message}
        variant={actions.modalConfig.variant === 'success' ? 'info' : actions.modalConfig.variant}
        confirmLabel={actions.modalConfig.confirmLabel || 'OK'}
        onConfirm={actions.confirmModal}
        onCancel={actions.closeModal}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <ConfirmModal
          isOpen={deleteConfirmModal.isOpen}
          title="Supprimer la réclamation ?"
          message={`Êtes-vous sûr de vouloir supprimer la réclamation ${reclamation?.numero_reclamation} ? Cette action est irréversible.`}
          variant="danger"
          confirmLabel="Supprimer"
          onConfirm={() => {
            deleteConfirmModal.close();
            actions.handleDelete();
          }}
          onCancel={deleteConfirmModal.close}
        />
      )}

      {/* Photo Preview Modal */}
      {actions.selectedPhoto && (
        <div
          className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => actions.setSelectedPhoto(null)}
        >
          <button
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              actions.setSelectedPhoto(null);
            }}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={actions.selectedPhoto}
            alt="Aperçu"
            className="max-w-full max-h-full object-contain rounded shadow-2xl animate-in zoom-in-95 duration-300"
          />
        </div>
      )}

      {/* Modal de refus de clôture */}
      {actions.showRefuserClotureModal && (
        <ReclamationActionModal
          title="Refuser la clôture"
          subtitle="Expliquez pourquoi vous refusez cette clôture"
          warningTitle="Commentaire obligatoire"
          warningMessage="Vous devez expliquer les raisons de votre refus pour permettre à l'équipe d'effectuer les corrections nécessaires."
          warningColor="red"
          textareaLabel="Motif du refus"
          textareaPlaceholder="Décrivez les raisons du refus et les actions attendues..."
          textareaValue={actions.commentaireRefus}
          onTextareaChange={actions.setCommentaireRefus}
          infoTitle="Après validation de votre refus :"
          infoItems={[
            'La réclamation retournera au statut "Résolue"',
            "L'équipe sera notifiée de votre refus avec votre commentaire",
            'De nouvelles interventions pourront être planifiées',
          ]}
          confirmLabel="Confirmer le refus"
          confirmColor="red"
          isSubmitting={actions.isSubmittingRefus}
          onConfirm={actions.handleRefuserCloture}
          onCancel={() => {
            actions.setShowRefuserClotureModal(false);
            actions.setCommentaireRefus('');
          }}
        />
      )}

      {/* Modal de rejet de réclamation */}
      {actions.showRejeterModal && (
        <ReclamationActionModal
          title="Rejeter la réclamation"
          subtitle="Expliquez pourquoi vous rejetez cette réclamation"
          warningTitle="Justification obligatoire"
          warningMessage="Une réclamation rejetée sera définitivement archivée. Vous devez justifier cette décision."
          warningColor="red"
          textareaLabel="Motif du rejet"
          textareaPlaceholder="Décrivez les raisons du rejet de cette réclamation..."
          textareaValue={actions.justificationRejet}
          onTextareaChange={actions.setJustificationRejet}
          infoTitle="⚠️ Attention :"
          infoTitleClassName="text-red-700"
          infoItems={[
            'La réclamation passera au statut "Rejetée" (définitif)',
            'Le créateur sera notifié de ce rejet avec votre justification',
            'Aucune intervention ne pourra être planifiée sur cette réclamation',
          ]}
          confirmLabel="Confirmer le rejet"
          confirmColor="red"
          isSubmitting={actions.isSubmittingRejet}
          onConfirm={actions.handleRejeter}
          onCancel={() => {
            actions.setShowRejeterModal(false);
            actions.setJustificationRejet('');
          }}
        />
      )}

      {/* Modal de refus d'intervention par le client */}
      {actions.showRefuserInterventionModal && (
        <ReclamationActionModal
          title="Refuser l'intervention"
          subtitle="L'intervention effectuée ne vous convient pas ?"
          warningTitle="Commentaire obligatoire"
          warningMessage="Veuillez expliquer précisément ce qui ne convient pas dans l'intervention effectuée. Cela permettra à l'équipe de comprendre le problème et d'effectuer les corrections nécessaires."
          warningColor="orange"
          textareaLabel="Motif du refus"
          textareaPlaceholder="Décrivez précisément ce qui ne va pas : qualité insuffisante, travaux incomplets, erreur de réalisation..."
          textareaValue={actions.motifRefusIntervention}
          onTextareaChange={actions.setMotifRefusIntervention}
          infoTitle="Après validation de votre refus :"
          infoItems={[
            'La réclamation passera au statut "Intervention refusée"',
            "L'équipe sera notifiée de votre refus avec votre commentaire",
            'Une nouvelle intervention sera planifiée pour résoudre le problème',
          ]}
          confirmLabel="Confirmer le refus"
          confirmColor="orange"
          isSubmitting={actions.isSubmittingRefusIntervention}
          onConfirm={actions.handleRefuserIntervention}
          onCancel={() => {
            actions.setShowRefuserInterventionModal(false);
            actions.setMotifRefusIntervention('');
          }}
          extraContent={
            reclamation && reclamation.nombre_refus && reclamation.nombre_refus > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Cette réclamation a déjà été refusée {reclamation.nombre_refus} fois.
                </span>
              </div>
            ) : undefined
          }
        />
      )}

      {/* Modal d'édition de réclamation */}
      {reclamation && (
        <ReclamationEditModal
          isOpen={editModal.isOpen}
          onClose={editModal.close}
          onSuccess={() => {
            editModal.close();
            actions.handleEditSuccess();
          }}
          types={typesReclamation}
          urgences={urgences}
          editingId={reclamation.id}
          canSetVisibility={isAdmin || isSupervisor}
        />
      )}
    </div>
  );
};

export default ReclamationDetailPage;
