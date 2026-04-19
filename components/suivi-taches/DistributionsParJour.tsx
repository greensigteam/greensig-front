import React, { useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  CalendarClock,
  History,
  AlertTriangle,
  MapPin,
  FileText,
  Users,
  RotateCcw,
} from 'lucide-react';
import {
  DistributionCharge,
  StatusDistribution,
  STATUS_DISTRIBUTION_LABELS,
  STATUS_DISTRIBUTION_COLORS,
  ALLOWED_DISTRIBUTION_TRANSITIONS,
} from '../../types/planning';

interface DistributionWithTask extends DistributionCharge {
  tache_titre?: string;
  tache_type?: string;
  tache_site_nom?: string;
  tache_equipes?: string[];
  tache_id: number;
}

interface DistributionsParJourProps {
  distributions: DistributionWithTask[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  loading?: boolean;
  onDemarrer?: (distributionId: number) => void;
  onTerminer?: (distributionId: number) => void;
  onReporter?: (distribution: DistributionWithTask) => void;
  onAnnuler?: (distribution: DistributionWithTask) => void;
  onRestaurer?: (distributionId: number) => void;
  onHistorique?: (distribution: DistributionWithTask) => void;
  onSelectTask?: (tacheId: number) => void;
  isActionLoading?: boolean;
  /** Si true, les actions de modification sont cachées (vue client) */
  isClientView?: boolean;
}

export const DistributionsParJour: React.FC<DistributionsParJourProps> = ({
  distributions,
  selectedDate,
  onDateChange,
  loading = false,
  onDemarrer,
  onTerminer,
  onReporter,
  onAnnuler,
  onRestaurer,
  onHistorique,
  onSelectTask,
  isActionLoading = false,
  isClientView = false,
}) => {
  // Statistiques par statut
  const stats = useMemo(() => {
    const counts: Record<StatusDistribution, number> = {
      NON_REALISEE: 0,
      EN_COURS: 0,
      REALISEE: 0,
      REPORTEE: 0,
      ANNULEE: 0,
    };
    distributions.forEach((d) => {
      const status = d.status as StatusDistribution;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  }, [distributions]);

  // Tri : REALISEE en dernier, puis par heure de début
  const sortedDistributions = useMemo(() => {
    return [...distributions].sort((a, b) => {
      const aRealisee = a.status === 'REALISEE' ? 1 : 0;
      const bRealisee = b.status === 'REALISEE' ? 1 : 0;
      if (aRealisee !== bRealisee) return aRealisee - bRealisee;
      const timeA = a.heure_debut || '00:00';
      const timeB = b.heure_debut || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [distributions]);

  // Navigation de date
  const navigateDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    onDateChange(date.toISOString().split('T')[0]!);
  };

  const goToToday = () => {
    onDateChange(new Date().toISOString().split('T')[0]!);
  };

  // Format de la date pour l'affichage
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Vérifier si c'est aujourd'hui
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Icône selon le statut (✅ SIMPLIFIÉ: Plus de EN_RETARD)
  const getStatusIcon = (status: StatusDistribution) => {
    switch (status) {
      case 'REALISEE':
        return <CheckCircle className="w-4 h-4" />;
      case 'EN_COURS':
        return <Clock className="w-4 h-4" />;
      case 'REPORTEE':
        return <CalendarClock className="w-4 h-4" />;
      case 'ANNULEE':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Vérifier si une action est autorisée
  const isActionAllowed = (currentStatus: StatusDistribution, targetStatus: StatusDistribution) => {
    return ALLOWED_DISTRIBUTION_TRANSITIONS[currentStatus]?.includes(targetStatus);
  };

  // Rendu du bloc navigation + stats (partagé desktop/mobile)
  const renderDateNav = () => (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base lg:text-lg font-semibold text-slate-800">
            Distributions du jour
          </h2>
        </div>
        <div className="flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => navigateDate(-1)}
            className="p-1.5 lg:p-2 hover:bg-emerald-100 rounded-lg transition-colors"
            title="Jour précédent"
          >
            <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-slate-600" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-2 lg:px-3 py-1 lg:py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <button
            onClick={() => navigateDate(1)}
            className="p-1.5 lg:p-2 hover:bg-emerald-100 rounded-lg transition-colors"
            title="Jour suivant"
          >
            <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-slate-600" />
          </button>
          {!isToday && (
            <button
              onClick={goToToday}
              className="px-2 lg:px-3 py-1 lg:py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
            >
              Auj.
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-600 capitalize">
        {formatDisplayDate(selectedDate)}
        {isToday && (
          <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            Aujourd'hui
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {Object.entries(stats).map(([status, count]) => {
          if (count === 0) return null;
          const colors = STATUS_DISTRIBUTION_COLORS[status as StatusDistribution];
          return (
            <span
              key={status}
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${colors?.bg || 'bg-slate-100'} ${colors?.text || 'text-slate-700'}`}
            >
              {getStatusIcon(status as StatusDistribution)}
              {STATUS_DISTRIBUTION_LABELS[status as StatusDistribution] || status}: {count}
            </span>
          );
        })}
        {distributions.length === 0 && !loading && (
          <span className="text-sm text-slate-500">Aucune distribution</span>
        )}
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full bg-white lg:rounded-xl lg:shadow-sm lg:border lg:border-slate-200">
      {/* ═══ Header fixe — DESKTOP UNIQUEMENT ═══ */}
      <div className="hidden lg:block shrink-0 p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50 lg:rounded-t-xl">
        {renderDateNav()}
      </div>

      {/* ═══ Zone scrollable ═══ */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* MOBILE: navigation dans le scroll */}
        <div className="lg:hidden p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
          {renderDateNav()}
        </div>

        {/* Liste des distributions */}
        <div className="p-3 lg:p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <p className="mt-4 text-sm text-slate-500">Chargement des distributions...</p>
            </div>
          ) : sortedDistributions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500 text-sm">
                Aucune distribution planifiée pour cette date
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Sélectionnez une autre date ou créez une nouvelle tâche
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDistributions.map((distribution) => {
                const status = distribution.status as StatusDistribution;
                const colors = STATUS_DISTRIBUTION_COLORS[status] || {
                  bg: 'bg-slate-100',
                  text: 'text-slate-700',
                };
                const canDemarrer = isActionAllowed(status, 'EN_COURS');
                const canTerminer = status === 'EN_COURS';
                const canReporter = isActionAllowed(status, 'REPORTEE');
                const canAnnuler = isActionAllowed(status, 'ANNULEE');
                const canRestaurer =
                  isActionAllowed(status, 'NON_REALISEE') && status === 'ANNULEE';
                const hasHistorique = (distribution.nombre_reports ?? 0) > 0;
                // Vérifier si une équipe est assignée à la tâche
                const hasEquipe =
                  distribution.tache_equipes && distribution.tache_equipes.length > 0;
                const isBlockedByNoEquipe = !hasEquipe && !isClientView;

                return (
                  <div
                    key={distribution.id}
                    className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      status === 'EN_COURS'
                        ? 'border-orange-300 bg-orange-50'
                        : status === 'REALISEE'
                          ? 'border-green-300 bg-green-50'
                          : status === 'REPORTEE'
                            ? 'border-purple-300 bg-purple-50'
                            : status === 'ANNULEE'
                              ? 'border-red-200 bg-red-50'
                              : 'border-slate-200 bg-white'
                    }`}
                  >
                    {/* En-tête avec statut et heures */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {/* Badge statut */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}
                        >
                          {getStatusIcon(status)}
                          {STATUS_DISTRIBUTION_LABELS[status] || status}
                        </span>

                        {/* Heures */}
                        <span className="text-sm text-slate-600 font-medium">
                          {distribution.heure_debut || '08:00'} -{' '}
                          {distribution.heure_fin || '17:00'}
                        </span>

                        {/* Badge reports */}
                        {hasHistorique && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                            {distribution.nombre_reports} report
                            {(distribution.nombre_reports ?? 0) > 1 ? 's' : ''}
                          </span>
                        )}

                        {/* Badge "Sans équipe" */}
                        {isBlockedByNoEquipe && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Sans équipe
                          </span>
                        )}
                      </div>

                      {/* Heures planifiées/réelles */}
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">
                          {distribution.heures_planifiees?.toFixed(2) || '0.00'}h
                        </p>
                        {distribution.heures_reelles && (
                          <p className="text-xs text-slate-500">
                            Réel: {distribution.heures_reelles.toFixed(2)}h
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Informations de la tâche */}
                    <div
                      className="mb-3 cursor-pointer hover:bg-white/50 rounded-lg p-2 -mx-2 transition-colors"
                      onClick={() => onSelectTask?.(distribution.tache_id)}
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {distribution.tache_titre || `Tâche #${distribution.tache_id}`}
                          </p>
                          {distribution.tache_type && (
                            <p className="text-xs text-slate-500">{distribution.tache_type}</p>
                          )}
                        </div>
                      </div>

                      {distribution.tache_site_nom && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {distribution.tache_site_nom}
                          </span>
                        </div>
                      )}

                      {distribution.tache_equipes && distribution.tache_equipes.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {distribution.tache_equipes.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Commentaire/motif si présent */}
                    {distribution.commentaire && (
                      <p className="text-xs text-slate-600 mb-3 italic bg-white/50 p-2 rounded">
                        {distribution.commentaire}
                      </p>
                    )}

                    {/* Actions - cachées pour les clients */}
                    {!isClientView && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/50">
                        {/* Démarrer */}
                        {canDemarrer && onDemarrer && (
                          <button
                            onClick={
                              isBlockedByNoEquipe ? undefined : () => onDemarrer(distribution.id)
                            }
                            disabled={isActionLoading || isBlockedByNoEquipe}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                              isBlockedByNoEquipe
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'text-white bg-orange-500 hover:bg-orange-600'
                            }`}
                            title={
                              isBlockedByNoEquipe
                                ? "Assignez d'abord une équipe à la tâche"
                                : 'Démarrer'
                            }
                          >
                            <Play className="w-3.5 h-3.5" />
                            Démarrer
                          </button>
                        )}

                        {/* Terminer */}
                        {canTerminer && onTerminer && (
                          <button
                            onClick={
                              isBlockedByNoEquipe ? undefined : () => onTerminer(distribution.id)
                            }
                            disabled={isActionLoading || isBlockedByNoEquipe}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                              isBlockedByNoEquipe
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'text-white bg-green-500 hover:bg-green-600'
                            }`}
                            title={
                              isBlockedByNoEquipe
                                ? "Assignez d'abord une équipe à la tâche"
                                : 'Terminer'
                            }
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Terminer
                          </button>
                        )}

                        {/* Reporter */}
                        {canReporter && onReporter && (
                          <button
                            onClick={
                              isBlockedByNoEquipe ? undefined : () => onReporter(distribution)
                            }
                            disabled={isActionLoading || isBlockedByNoEquipe}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                              isBlockedByNoEquipe
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                            }`}
                            title={
                              isBlockedByNoEquipe
                                ? "Assignez d'abord une équipe à la tâche"
                                : 'Reporter'
                            }
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            Reporter
                          </button>
                        )}

                        {/* Annuler */}
                        {canAnnuler && onAnnuler && (
                          <button
                            onClick={
                              isBlockedByNoEquipe ? undefined : () => onAnnuler(distribution)
                            }
                            disabled={isActionLoading || isBlockedByNoEquipe}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                              isBlockedByNoEquipe
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'text-red-700 bg-red-100 hover:bg-red-200'
                            }`}
                            title={
                              isBlockedByNoEquipe
                                ? "Assignez d'abord une équipe à la tâche"
                                : 'Annuler'
                            }
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Annuler
                          </button>
                        )}

                        {/* Restaurer */}
                        {canRestaurer && onRestaurer && (
                          <button
                            onClick={
                              isBlockedByNoEquipe ? undefined : () => onRestaurer(distribution.id)
                            }
                            disabled={isActionLoading || isBlockedByNoEquipe}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                              isBlockedByNoEquipe
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                            }`}
                            title={
                              isBlockedByNoEquipe
                                ? "Assignez d'abord une équipe à la tâche"
                                : 'Restaurer'
                            }
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restaurer
                          </button>
                        )}

                        {/* Historique - visible pour tous car lecture seule */}
                        {hasHistorique && onHistorique && (
                          <button
                            onClick={() => onHistorique(distribution)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                            Historique
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer résumé (dans le scroll) */}
        {sortedDistributions.length > 0 && (
          <div className="p-3 lg:p-4 border-t border-slate-200 bg-slate-50 lg:rounded-b-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                {sortedDistributions.length} distribution{sortedDistributions.length > 1 ? 's' : ''}
              </span>
              <span className="font-medium text-slate-700">
                Total:{' '}
                {sortedDistributions
                  .reduce((sum, d) => sum + (d.heures_planifiees || 0), 0)
                  .toFixed(2)}
                h
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DistributionsParJour;
