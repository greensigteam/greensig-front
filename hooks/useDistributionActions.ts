import { useState, useCallback, useRef } from 'react';
import {
  DistributionChargeEnriched,
  MotifDistribution,
  DistributionHistorique,
} from '../types/planning';
import { Tache } from '../types/planning';
import { planningService } from '../services/planningService';
import { useToast } from '../contexts/ToastContext';
import {
  useDemarrerDistribution,
  useTerminerDistribution,
  useReporterDistribution,
  useAnnulerDistribution,
  useRestaurerDistribution,
} from './mutations';

interface UseDistributionActionsParams {
  selectedDate: string;
  distributionsParJour: DistributionChargeEnriched[];
  selectedTache: Tache | null;
  reloadSelectedTask: (id: number) => Promise<void>;
}

export function useDistributionActions({
  selectedDate,
  distributionsParJour,
  selectedTache,
  reloadSelectedTask,
}: UseDistributionActionsParams) {
  const { showToast } = useToast();

  const demarrerMutation = useDemarrerDistribution();
  const terminerMutation = useTerminerDistribution();
  const reporterMutation = useReporterDistribution();
  const annulerMutation = useAnnulerDistribution();
  const restaurerMutation = useRestaurerDistribution();

  const [reporterModalDistribution, setReporterModalDistribution] =
    useState<DistributionChargeEnriched | null>(null);
  const [annulerModalDistribution, setAnnulerModalDistribution] =
    useState<DistributionChargeEnriched | null>(null);
  const [terminerModalDistribution, setTerminerModalDistribution] =
    useState<DistributionChargeEnriched | null>(null);
  const [demarrerModalDistribution, setDemarrerModalDistribution] =
    useState<DistributionChargeEnriched | null>(null);

  // Ref pour garder l'id de la tâche sélectionnée au moment de l'ouverture de la modale
  const selectedTacheRef = useRef<Tache | null>(null);
  selectedTacheRef.current = selectedTache;
  const [historiqueModalData, setHistoriqueModalData] = useState<{
    isOpen: boolean;
    historique: DistributionHistorique[] | null;
    nombreReports: number;
    isLoading: boolean;
  }>({ isOpen: false, historique: null, nombreReports: 0, isLoading: false });

  const actionLoading =
    demarrerMutation.isPending ||
    terminerMutation.isPending ||
    reporterMutation.isPending ||
    annulerMutation.isPending ||
    restaurerMutation.isPending;

  const handleDemarrer = (distributionId: number) => {
    const distribution = distributionsParJour.find((d) => d.id === distributionId);
    if (distribution) {
      setDemarrerModalDistribution(distribution);
    }
  };

  const handleDemarrerConfirm = async (modalData: {
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
      if (selectedTacheRef.current) await reloadSelectedTask(selectedTacheRef.current.id);
      showToast('Distribution démarrée', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erreur lors du démarrage', 'error');
    }
  };

  const handleTerminer = (distributionId: number) => {
    const distribution = distributionsParJour.find((d) => d.id === distributionId);
    if (distribution) {
      setTerminerModalDistribution(distribution);
    }
  };

  const handleTerminerConfirm = async (modalData: {
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
      if (selectedTacheRef.current) await reloadSelectedTask(selectedTacheRef.current.id);
      showToast('Distribution terminée', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la terminaison', 'error');
    }
  };

  const handleReporter = async (
    nouvelleDate: string,
    motif: MotifDistribution,
    commentaire: string,
  ) => {
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
      if (selectedTacheRef.current) await reloadSelectedTask(selectedTacheRef.current.id);
      showToast('Distribution reportée', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erreur lors du report', 'error');
    }
  };

  const handleAnnuler = async (motif: MotifDistribution, commentaire: string) => {
    if (!annulerModalDistribution) return;
    try {
      await annulerMutation.mutateAsync({
        distributionId: annulerModalDistribution.id,
        date: selectedDate,
        motif,
        commentaire,
      });
      setAnnulerModalDistribution(null);
      if (selectedTacheRef.current) await reloadSelectedTask(selectedTacheRef.current.id);
      showToast('Distribution annulée', 'success');
    } catch (error: any) {
      showToast(error.message || "Erreur lors de l'annulation", 'error');
    }
  };

  const handleRestaurer = async (distributionId: number) => {
    try {
      await restaurerMutation.mutateAsync({
        distributionId,
        date: selectedDate,
      });
      if (selectedTache) {
        await reloadSelectedTask(selectedTache.id);
      }
      showToast('Distribution restaurée', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la restauration', 'error');
    }
  };

  const handleHistorique = async (distribution: DistributionChargeEnriched) => {
    setHistoriqueModalData({
      isOpen: true,
      historique: null,
      nombreReports: distribution.nombre_reports || 0,
      isLoading: true,
    });
    try {
      const response = await planningService.getHistoriqueDistribution(distribution.id);
      setHistoriqueModalData({
        isOpen: true,
        historique: response.chaine_reports,
        nombreReports: response.nombre_reports,
        isLoading: false,
      });
    } catch (error: any) {
      setHistoriqueModalData((prev) => ({ ...prev, isLoading: false }));
      showToast(error.message || "Erreur lors du chargement de l'historique", 'error');
    }
  };

  const handleStartTask = () => {
    if (!selectedTache) return;
    const distributions = selectedTache.distributions_charge || [];
    const firstPendingDistribution = distributions
      .filter((d) => d.status === 'NON_REALISEE')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    if (firstPendingDistribution) {
      setDemarrerModalDistribution({
        ...firstPendingDistribution,
        tache_id: selectedTache.id,
        tache_titre: selectedTache.type_tache_detail?.nom_tache,
        tache_type: selectedTache.type_tache_detail?.nom_tache,
        tache_statut: selectedTache.statut,
      } as DistributionChargeEnriched);
    } else {
      showToast('Aucune distribution à démarrer pour cette tâche', 'warning');
    }
  };

  const handleTaskDemarrerConfirm = async (modalData: {
    heure_debut_reelle?: string;
    date_debut_reelle?: string;
  }) => {
    if (!demarrerModalDistribution) return;
    try {
      await demarrerMutation.mutateAsync({
        distributionId: demarrerModalDistribution.id,
        date: demarrerModalDistribution.date,
        data: modalData,
      });
      setDemarrerModalDistribution(null);
      if (selectedTacheRef.current) await reloadSelectedTask(selectedTacheRef.current.id);
      showToast('Distribution démarrée', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erreur lors du démarrage', 'error');
    }
  };

  const handleCompleteTask = () => {
    if (!selectedTache) return;
    const distributions = selectedTache.distributions_charge || [];
    const inProgressDistribution = distributions.find((d) => d.status === 'EN_COURS');

    if (inProgressDistribution) {
      setTerminerModalDistribution({
        ...inProgressDistribution,
        tache_id: selectedTache.id,
        tache_titre: selectedTache.type_tache_detail?.nom_tache,
        tache_type: selectedTache.type_tache_detail?.nom_tache,
        tache_statut: selectedTache.statut,
      } as DistributionChargeEnriched);
    } else {
      showToast('Aucune distribution en cours à terminer', 'warning');
    }
  };

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
      if (selectedTacheRef.current) await reloadSelectedTask(selectedTacheRef.current.id);
      showToast('Distribution terminée', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la terminaison', 'error');
    }
  };

  const closeHistoriqueModal = useCallback(() => {
    setHistoriqueModalData({ isOpen: false, historique: null, nombreReports: 0, isLoading: false });
  }, []);

  return {
    actionLoading,
    reporterModalDistribution,
    setReporterModalDistribution,
    annulerModalDistribution,
    setAnnulerModalDistribution,
    terminerModalDistribution,
    setTerminerModalDistribution,
    demarrerModalDistribution,
    setDemarrerModalDistribution,
    historiqueModalData,
    closeHistoriqueModal,
    handleDemarrer,
    handleDemarrerConfirm,
    handleTerminer,
    handleTerminerConfirm,
    handleReporter,
    handleAnnuler,
    handleRestaurer,
    handleHistorique,
    handleStartTask,
    handleTaskDemarrerConfirm,
    handleCompleteTask,
    handleTaskTerminerConfirm,
  };
}
