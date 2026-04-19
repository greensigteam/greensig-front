import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import {
  useUpdateReclamation,
  useDeleteReclamation,
  useCloturerReclamation,
  useValiderCloture,
  useRefuserCloture,
  useRejeterReclamation,
  useRefuserIntervention,
  useReprendreIntervention,
  useCreateSatisfaction,
} from './mutations/useReclamationMutations';
import type { Reclamation, ReclamationCreate } from '../types/reclamations';

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  variant: 'info' | 'success' | 'danger' | 'warning';
  confirmLabel?: string;
  onConfirm?: () => void;
}

const INITIAL_MODAL_CONFIG: ModalConfig = {
  isOpen: false,
  title: '',
  message: '',
  variant: 'info',
};

export function useReclamationDetailActions(
  reclamation: Reclamation | undefined,
  refetchReclamation: () => void,
) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const updateMutation = useUpdateReclamation();
  const deleteMutation = useDeleteReclamation();
  const cloturerMutation = useCloturerReclamation();
  const validerClotureMutation = useValiderCloture();
  const refuserClotureMutation = useRefuserCloture();
  const rejeterMutation = useRejeterReclamation();
  const refuserInterventionMutation = useRefuserIntervention();
  const reprendreInterventionMutation = useReprendreIntervention();
  const satisfactionMutation = useCreateSatisfaction();

  const [modalConfig, setModalConfig] = useState<ModalConfig>(INITIAL_MODAL_CONFIG);

  // Refus de clôture
  const [showRefuserClotureModal, setShowRefuserClotureModal] = useState(false);
  const [commentaireRefus, setCommentaireRefus] = useState('');
  const [isSubmittingRefus, setIsSubmittingRefus] = useState(false);

  // Rejet
  const [showRejeterModal, setShowRejeterModal] = useState(false);
  const [justificationRejet, setJustificationRejet] = useState('');
  const [isSubmittingRejet, setIsSubmittingRejet] = useState(false);

  // Refus d'intervention
  const [showRefuserInterventionModal, setShowRefuserInterventionModal] = useState(false);
  const [motifRefusIntervention, setMotifRefusIntervention] = useState('');
  const [isSubmittingRefusIntervention, setIsSubmittingRefusIntervention] = useState(false);

  // Satisfaction
  const [showSatisfactionForm, setShowSatisfactionForm] = useState(false);

  // Photo preview
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handleCloturer = useCallback(async () => {
    if (!reclamation) return;

    const hasUnfinishedTasks = reclamation.taches_liees_details?.some(
      (t: any) => t.statut !== 'TERMINEE',
    );
    if (hasUnfinishedTasks) {
      setModalConfig({
        isOpen: true,
        title: 'Impossible de proposer la clôture',
        message: 'Toutes les tâches associées doivent être terminées avant de proposer la clôture.',
        variant: 'danger',
      });
      return;
    }

    try {
      await cloturerMutation.mutateAsync(reclamation.id);
      showToast(
        'Clôture proposée avec succès. En attente de validation par le créateur.',
        'success',
      );
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la proposition de clôture.', 'error');
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: error.message || 'Erreur lors de la proposition de clôture.',
        variant: 'danger',
      });
    }
  }, [reclamation, cloturerMutation, showToast]);

  const handleValiderCloture = useCallback(async () => {
    if (!reclamation) return;

    try {
      await validerClotureMutation.mutateAsync(reclamation.id);
      showToast(
        'Clôture validée avec succès. La réclamation est définitivement clôturée.',
        'success',
      );
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la validation de la clôture.', 'error');
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: error.message || 'Erreur lors de la validation de la clôture.',
        variant: 'danger',
      });
    }
  }, [reclamation, validerClotureMutation, showToast]);

  const handleRefuserCloture = useCallback(async () => {
    if (!reclamation) return;

    if (!commentaireRefus.trim()) {
      setModalConfig({
        isOpen: true,
        title: 'Commentaire requis',
        message: 'Vous devez obligatoirement expliquer pourquoi vous refusez la clôture.',
        variant: 'warning',
      });
      return;
    }

    setIsSubmittingRefus(true);
    try {
      await refuserClotureMutation.mutateAsync({
        id: reclamation.id,
        commentaire: commentaireRefus.trim(),
      });
      setShowRefuserClotureModal(false);
      setCommentaireRefus('');
      showToast(
        'Votre refus a bien été enregistré. La réclamation retourne au statut "Résolue".',
        'info',
      );
    } catch (error: any) {
      showToast(error.message || 'Erreur lors du refus de la clôture.', 'error');
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: error.message || 'Erreur lors du refus de la clôture.',
        variant: 'danger',
      });
    } finally {
      setIsSubmittingRefus(false);
    }
  }, [reclamation, commentaireRefus, refuserClotureMutation, showToast]);

  const handleRejeter = useCallback(async () => {
    if (!reclamation) return;

    if (!justificationRejet.trim()) {
      setModalConfig({
        isOpen: true,
        title: 'Justification requise',
        message: 'Vous devez obligatoirement justifier le rejet de cette réclamation.',
        variant: 'warning',
      });
      return;
    }

    setIsSubmittingRejet(true);
    try {
      await rejeterMutation.mutateAsync({
        id: reclamation.id,
        justification: justificationRejet.trim(),
      });
      setShowRejeterModal(false);
      setJustificationRejet('');
      showToast('La réclamation a été rejetée avec succès.', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erreur lors du rejet de la réclamation.', 'error');
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: error.message || 'Erreur lors du rejet de la réclamation.',
        variant: 'danger',
      });
    } finally {
      setIsSubmittingRejet(false);
    }
  }, [reclamation, justificationRejet, rejeterMutation, showToast]);

  const handleRefuserIntervention = useCallback(async () => {
    if (!reclamation) return;

    if (!motifRefusIntervention.trim()) {
      setModalConfig({
        isOpen: true,
        title: 'Motif requis',
        message: "Vous devez obligatoirement expliquer pourquoi vous refusez l'intervention.",
        variant: 'warning',
      });
      return;
    }

    setIsSubmittingRefusIntervention(true);
    try {
      await refuserInterventionMutation.mutateAsync({
        id: reclamation.id,
        motif: motifRefusIntervention.trim(),
      });
      setShowRefuserInterventionModal(false);
      setMotifRefusIntervention('');
      showToast(
        'Votre refus a bien été enregistré. Une nouvelle intervention sera planifiée.',
        'info',
      );
    } catch (error: any) {
      showToast(error.message || "Erreur lors du refus de l'intervention.", 'error');
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: error.message || "Erreur lors du refus de l'intervention.",
        variant: 'danger',
      });
    } finally {
      setIsSubmittingRefusIntervention(false);
    }
  }, [reclamation, motifRefusIntervention, refuserInterventionMutation, showToast]);

  const handleReprendreIntervention = useCallback(async () => {
    if (!reclamation) return;

    try {
      await reprendreInterventionMutation.mutateAsync(reclamation.id);
      showToast('Réclamation reprise. Une nouvelle intervention peut être planifiée.', 'success');
    } catch (error: any) {
      showToast(error.message || "Erreur lors de la reprise de l'intervention.", 'error');
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: error.message || "Erreur lors de la reprise de l'intervention.",
        variant: 'danger',
      });
    }
  }, [reclamation, reprendreInterventionMutation, showToast]);

  const handleSatisfactionSubmit = useCallback(
    async (data: { reclamation: number; note: number; commentaire?: string }) => {
      try {
        await satisfactionMutation.mutateAsync(data);
        setShowSatisfactionForm(false);
        showToast('Votre évaluation a été enregistrée avec succès.', 'success');
      } catch (error: any) {
        showToast(error.message || "Erreur lors de l'enregistrement de l'évaluation.", 'error');
        setModalConfig({
          isOpen: true,
          title: 'Erreur',
          message: error.message || "Erreur lors de l'enregistrement.",
          variant: 'danger',
        });
      }
    },
    [satisfactionMutation, showToast],
  );

  const handleToggleVisibility = useCallback(async () => {
    if (!reclamation) return;
    try {
      await updateMutation.mutateAsync({
        id: reclamation.id,
        data: { visible_client: !reclamation.visible_client } as Partial<ReclamationCreate>,
      });
      showToast(
        reclamation.visible_client
          ? 'Réclamation masquée au client'
          : 'Réclamation rendue visible au client',
        'success',
      );
    } catch {
      showToast('Erreur lors du changement de visibilité', 'error');
    }
  }, [reclamation, updateMutation, showToast]);

  const handleDelete = useCallback(async () => {
    if (!reclamation) return;

    try {
      await deleteMutation.mutateAsync(reclamation.id);
      setModalConfig({
        isOpen: true,
        title: 'Suppression réussie',
        message: 'La réclamation a été supprimée avec succès.',
        variant: 'success',
        onConfirm: () => {
          navigate('/reclamations');
        },
      });
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la suppression de la réclamation.', 'error');
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression.',
        variant: 'danger',
      });
    }
  }, [reclamation, deleteMutation, navigate, showToast]);

  const handleEditSuccess = useCallback(async () => {
    await refetchReclamation();
    showToast('Réclamation mise à jour avec succès', 'success');
  }, [refetchReclamation, showToast]);

  const closeModal = useCallback(() => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const confirmModal = useCallback(() => {
    if (modalConfig.onConfirm) modalConfig.onConfirm();
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  }, [modalConfig]);

  return {
    modalConfig,
    confirmModal,
    closeModal,

    showRefuserClotureModal,
    setShowRefuserClotureModal,
    commentaireRefus,
    setCommentaireRefus,
    isSubmittingRefus,

    showRejeterModal,
    setShowRejeterModal,
    justificationRejet,
    setJustificationRejet,
    isSubmittingRejet,

    showRefuserInterventionModal,
    setShowRefuserInterventionModal,
    motifRefusIntervention,
    setMotifRefusIntervention,
    isSubmittingRefusIntervention,

    showSatisfactionForm,
    setShowSatisfactionForm,

    selectedPhoto,
    setSelectedPhoto,

    handleCloturer,
    handleValiderCloture,
    handleRefuserCloture,
    handleRejeter,
    handleRefuserIntervention,
    handleReprendreIntervention,
    handleSatisfactionSubmit,
    handleToggleVisibility,
    handleDelete,
    handleEditSuccess,
  };
}
