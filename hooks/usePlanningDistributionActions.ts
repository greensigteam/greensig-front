import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { planningService } from '../services/planningService';
import {
  Tache,
  DistributionCharge,
  DistributionChargeEnriched,
  type StatusDistribution,
  type MotifDistribution,
  type StatutTache,
  ALLOWED_DISTRIBUTION_TRANSITIONS,
} from '../types/planning';
import { queryKeys } from '../lib/queryKeys';
import type { PopoverInfo } from './usePlanningData';

export interface UsePlanningDistributionActionsParams {
  popoverInfo: PopoverInfo | null;
  setPopoverInfo: React.Dispatch<React.SetStateAction<PopoverInfo | null>>;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

function enrichDistribution(
  distribution: DistributionCharge,
  tache: Tache,
): DistributionChargeEnriched {
  return {
    ...distribution,
    tache_id: tache.id,
    tache_titre: tache.type_tache_detail?.nom_tache,
    tache_type: tache.type_tache_detail?.nom_tache,
    tache_statut: tache.statut,
    tache_site_nom: tache.site_nom || undefined,
    tache_equipes: tache.equipes_detail?.map((e) => e.nomEquipe) || [],
    tache_priorite: String(tache.priorite),
  };
}

export function usePlanningDistributionActions({
  popoverInfo,
  setPopoverInfo,
  showToast,
}: UsePlanningDistributionActionsParams) {
  const queryClient = useQueryClient();

  // Distribution action modals — state machine : une seule action active à la fois.
  const [reporterModalDistribution, _setReporter] = useState<DistributionChargeEnriched | null>(
    null,
  );
  const [annulerModalDistribution, _setAnnuler] = useState<DistributionChargeEnriched | null>(null);
  const [terminerModalDistribution, _setTerminer] = useState<DistributionChargeEnriched | null>(
    null,
  );
  const [demarrerModalDistribution, _setDemarrer] = useState<DistributionChargeEnriched | null>(
    null,
  );
  const [distributionActionLoading, setDistributionActionLoading] = useState(false);

  // Sauvegarde du popover pour restauration quand l'utilisateur annule la modale d'action
  const savedPopoverRef = useRef<PopoverInfo | null>(null);
  const popoverInfoRef = useRef(popoverInfo);
  popoverInfoRef.current = popoverInfo;

  const hidePopoverForAction = useCallback(() => {
    const current = popoverInfoRef.current;
    if (current) {
      savedPopoverRef.current = current;
      setPopoverInfo(null);
    }
  }, [setPopoverInfo]);

  const restorePopover = useCallback(() => {
    if (savedPopoverRef.current) {
      setPopoverInfo(savedPopoverRef.current);
      savedPopoverRef.current = null;
    }
  }, [setPopoverInfo]);

  const clearSavedPopover = useCallback(() => {
    savedPopoverRef.current = null;
  }, []);

  const setReporterModalDistribution = useCallback<
    React.Dispatch<React.SetStateAction<DistributionChargeEnriched | null>>
  >(
    (value) => {
      const next = typeof value === 'function' ? value(null) : value;
      if (next) {
        _setAnnuler(null);
        _setTerminer(null);
        _setDemarrer(null);
        hidePopoverForAction();
      }
      _setReporter(value);
    },
    [hidePopoverForAction],
  );

  const setAnnulerModalDistribution = useCallback<
    React.Dispatch<React.SetStateAction<DistributionChargeEnriched | null>>
  >(
    (value) => {
      const next = typeof value === 'function' ? value(null) : value;
      if (next) {
        _setReporter(null);
        _setTerminer(null);
        _setDemarrer(null);
        hidePopoverForAction();
      }
      _setAnnuler(value);
    },
    [hidePopoverForAction],
  );

  const setTerminerModalDistribution = useCallback<
    React.Dispatch<React.SetStateAction<DistributionChargeEnriched | null>>
  >(
    (value) => {
      const next = typeof value === 'function' ? value(null) : value;
      if (next) {
        _setReporter(null);
        _setAnnuler(null);
        _setDemarrer(null);
        hidePopoverForAction();
      }
      _setTerminer(value);
    },
    [hidePopoverForAction],
  );

  const setDemarrerModalDistribution = useCallback<
    React.Dispatch<React.SetStateAction<DistributionChargeEnriched | null>>
  >(
    (value) => {
      const next = typeof value === 'function' ? value(null) : value;
      if (next) {
        _setReporter(null);
        _setAnnuler(null);
        _setTerminer(null);
        hidePopoverForAction();
      }
      _setDemarrer(value);
    },
    [hidePopoverForAction],
  );

  const updateDistributionInCache = useCallback(
    (
      distributionId: number,
      updatedDistribution: DistributionCharge,
      options?: {
        tacheNouveauStatut?: string | null;
        nouvelleDistribution?: DistributionCharge;
      },
    ) => {
      // @ok-partial-update: distribution action returns updated distribution + task status;
      // invalidateQueries would trigger a full planning list refetch (expensive, flickery UX).
      queryClient.setQueriesData<Tache[]>(
        { queryKey: queryKeys.taches.lists(), exact: false },
        (oldTaches) => {
          if (!oldTaches) return oldTaches;
          return oldTaches.map((tache) => {
            const distIndex =
              tache.distributions_charge?.findIndex((d) => d.id === distributionId) ?? -1;
            if (distIndex === -1) return tache;

            const newDists = [...(tache.distributions_charge ?? [])];
            newDists[distIndex] = updatedDistribution;
            if (options?.nouvelleDistribution) {
              newDists.push(options.nouvelleDistribution);
            }

            return {
              ...tache,
              distributions_charge: newDists,
              ...(options?.tacheNouveauStatut
                ? { statut: options.tacheNouveauStatut as StatutTache }
                : {}),
            };
          });
        },
      );
    },
    [queryClient],
  );

  const canPerformDistributionAction = useCallback(
    (currentStatus: StatusDistribution, targetStatus: StatusDistribution): boolean => {
      return ALLOWED_DISTRIBUTION_TRANSITIONS[currentStatus]?.includes(targetStatus) || false;
    },
    [],
  );

  const handleDistributionDemarrer = useCallback(
    (distributionId: number) => {
      const tache = popoverInfo?.tache;
      if (tache?.distributions_charge) {
        const distribution = tache.distributions_charge.find((d) => d.id === distributionId);
        if (distribution) {
          setDemarrerModalDistribution(enrichDistribution(distribution, tache));
        }
      }
    },
    [popoverInfo, setDemarrerModalDistribution],
  );

  const handleDistributionDemarrerConfirm = useCallback(
    async (data: { heure_debut_reelle?: string }) => {
      if (!demarrerModalDistribution) return;
      setDistributionActionLoading(true);
      try {
        const result = await planningService.demarrerDistribution(
          demarrerModalDistribution.id,
          data,
        );
        updateDistributionInCache(demarrerModalDistribution.id, result.distribution, {
          tacheNouveauStatut: result.tache_synchronisee ? result.tache_nouveau_statut : null,
        });
        setDemarrerModalDistribution(null);
        clearSavedPopover();
        showToast('Distribution démarrée', 'success');
      } catch (err: any) {
        showToast(err.message || 'Erreur lors du démarrage', 'error');
      } finally {
        setDistributionActionLoading(false);
      }
    },
    [
      demarrerModalDistribution,
      updateDistributionInCache,
      showToast,
      setPopoverInfo,
      setDemarrerModalDistribution,
    ],
  );

  const handleDistributionTerminer = useCallback(
    (distributionId: number) => {
      const tache = popoverInfo?.tache;
      if (tache?.distributions_charge) {
        const distribution = tache.distributions_charge.find((d) => d.id === distributionId);
        if (distribution) {
          setTerminerModalDistribution(enrichDistribution(distribution, tache));
        }
      }
    },
    [popoverInfo, setTerminerModalDistribution],
  );

  const handleDistributionTerminerConfirm = useCallback(
    async (data: {
      heure_debut_reelle?: string;
      heure_fin_reelle?: string;
      heures_reelles?: number;
    }) => {
      if (!terminerModalDistribution) return;
      setDistributionActionLoading(true);
      try {
        const result = await planningService.terminerDistribution(
          terminerModalDistribution.id,
          data,
        );
        updateDistributionInCache(terminerModalDistribution.id, result.distribution, {
          tacheNouveauStatut: result.tache_synchronisee ? result.tache_nouveau_statut : null,
        });
        setTerminerModalDistribution(null);
        clearSavedPopover();
        showToast('Distribution terminée', 'success');
      } catch (err: any) {
        showToast(err.message || 'Erreur lors de la terminaison', 'error');
      } finally {
        setDistributionActionLoading(false);
      }
    },
    [
      terminerModalDistribution,
      updateDistributionInCache,
      showToast,
      setPopoverInfo,
      setTerminerModalDistribution,
    ],
  );

  const handleDistributionReporter = useCallback(
    async (nouvelleDate: string, motif: MotifDistribution, commentaire: string) => {
      if (!reporterModalDistribution) return;
      setDistributionActionLoading(true);
      try {
        const result = await planningService.reporterDistribution(
          reporterModalDistribution.id,
          nouvelleDate,
          motif,
          commentaire,
        );
        updateDistributionInCache(reporterModalDistribution.id, result.distribution_originale, {
          nouvelleDistribution: result.nouvelle_distribution,
        });
        setReporterModalDistribution(null);
        clearSavedPopover();
        showToast('Distribution reportée', 'success');
      } catch (err: any) {
        showToast(err.message || 'Erreur lors du report', 'error');
      } finally {
        setDistributionActionLoading(false);
      }
    },
    [
      reporterModalDistribution,
      updateDistributionInCache,
      showToast,
      setPopoverInfo,
      setReporterModalDistribution,
    ],
  );

  const handleDistributionAnnuler = useCallback(
    async (motif: MotifDistribution, commentaire: string) => {
      if (!annulerModalDistribution) return;
      setDistributionActionLoading(true);
      try {
        const result = await planningService.annulerDistribution(
          annulerModalDistribution.id,
          motif,
          commentaire,
        );
        updateDistributionInCache(annulerModalDistribution.id, result.distribution, {
          tacheNouveauStatut: result.tache_synchronisee ? result.tache_nouveau_statut : null,
        });
        setAnnulerModalDistribution(null);
        clearSavedPopover();
        showToast('Distribution annulée', 'success');
      } catch (err: any) {
        showToast(err.message || "Erreur lors de l'annulation", 'error');
      } finally {
        setDistributionActionLoading(false);
      }
    },
    [
      annulerModalDistribution,
      updateDistributionInCache,
      showToast,
      setPopoverInfo,
      setAnnulerModalDistribution,
    ],
  );

  const handleDistributionRestaurer = useCallback(
    async (distributionId: number) => {
      setDistributionActionLoading(true);
      try {
        const result = await planningService.restaurerDistribution(distributionId);
        updateDistributionInCache(distributionId, result.distribution, {
          tacheNouveauStatut: result.tache_synchronisee ? result.tache_nouveau_statut : null,
        });
        if (popoverInfo && popoverInfo.distributionId === distributionId) {
          setPopoverInfo({ ...popoverInfo, distributionStatus: 'NON_REALISEE' });
        }
        showToast('Distribution restaurée', 'success');
      } catch (err: any) {
        showToast(err.message || 'Erreur lors de la restauration', 'error');
      } finally {
        setDistributionActionLoading(false);
      }
    },
    [popoverInfo, updateDistributionInCache, showToast, setPopoverInfo],
  );

  return {
    reporterModalDistribution,
    setReporterModalDistribution,
    annulerModalDistribution,
    setAnnulerModalDistribution,
    terminerModalDistribution,
    setTerminerModalDistribution,
    demarrerModalDistribution,
    setDemarrerModalDistribution,
    distributionActionLoading,
    canPerformDistributionAction,
    handleDistributionDemarrer,
    handleDistributionDemarrerConfirm,
    handleDistributionTerminer,
    handleDistributionTerminerConfirm,
    handleDistributionReporter,
    handleDistributionAnnuler,
    handleDistributionRestaurer,
    restorePopover,
  };
}
