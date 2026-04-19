import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  Play,
  RotateCcw,
  XCircle,
  ArrowRight,
  History,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';
import {
  Tache,
  StatusDistribution,
  DistributionCharge,
  STATUS_DISTRIBUTION_LABELS,
  STATUS_DISTRIBUTION_COLORS,
  ALLOWED_DISTRIBUTION_TRANSITIONS,
} from '../../types/planning';

interface DistributionsListProps {
  tache: Tache;
  isClientView: boolean;
  onToggleDistribution: (distributionId: number, currentStatus: StatusDistribution) => void;
  onEditDistribution: (distributionId: number) => void;
  onDeleteDistribution: (distributionId: number) => void;
  onAddDistributions: () => void;
  // Nouvelles actions
  onDemarrer?: (distributionId: number) => void;
  onTerminer?: (distributionId: number) => void;
  onReporter?: (distributionId: number) => void;
  onAnnuler?: (distributionId: number) => void;
  onRestaurer?: (distributionId: number) => void;
  onHistorique?: (distributionId: number) => void;
  onGoToDistribution?: (date: string) => void;
}

export const DistributionsList: React.FC<DistributionsListProps> = ({
  tache,
  isClientView,
  onToggleDistribution,
  onEditDistribution,
  onDeleteDistribution,
  onAddDistributions,
  onDemarrer,
  onTerminer,
  onReporter,
  onAnnuler,
  onRestaurer,
  onHistorique,
  onGoToDistribution,
}) => {
  const distributions = tache.distributions_charge || [];
  const isTaskTerminee = tache.statut === 'TERMINEE';
  const hasEquipe = (tache.equipes_detail?.length ?? 0) > 0 || !!tache.equipe_detail;
  const canAddDistributions = tache.statut !== 'TERMINEE' && hasEquipe && !isClientView;

  const sortedDistributions = [...distributions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const totalHours =
    tache.charge_totale_distributions ??
    distributions.reduce((sum, d) => sum + (d.heures_planifiees || 0), 0);

  // Statistiques par statut
  const stats = {
    total: distributions.length,
    realisees: distributions.filter((d) => d.status === 'REALISEE').length,
    enCours: distributions.filter((d) => d.status === 'EN_COURS').length,
    reportees: distributions.filter((d) => d.status === 'REPORTEE').length,
    annulees: distributions.filter((d) => d.status === 'ANNULEE').length,
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          Distribution de charge{' '}
          {distributions.length > 0 &&
            `(${distributions.length} jour${distributions.length > 1 ? 's' : ''})`}
        </h3>
        {canAddDistributions && (
          <button
            onClick={onAddDistributions}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Ajouter des distributions"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mini statistiques */}
      {distributions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {stats.realisees > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              <CheckCircle className="w-3 h-3" /> {stats.realisees} Réalisée
              {stats.realisees > 1 ? 's' : ''}
            </span>
          )}
          {stats.enCours > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              <Play className="w-3 h-3" /> {stats.enCours} En cours
            </span>
          )}
          {stats.reportees > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
              <CalendarClock className="w-3 h-3" /> {stats.reportees} Reportée
              {stats.reportees > 1 ? 's' : ''}
            </span>
          )}
          {stats.annulees > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
              <XCircle className="w-3 h-3" /> {stats.annulees} Annulée
              {stats.annulees > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {distributions.length > 0 ? (
        <>
          <div className="space-y-2">
            {sortedDistributions.map((dist, index) => (
              <DistributionItem
                key={dist.id || index}
                distribution={dist}
                isTaskTerminee={isTaskTerminee}
                hasEquipe={hasEquipe}
                isClientView={isClientView}
                onToggle={() => onToggleDistribution(dist.id, dist.status)}
                onEdit={() => onEditDistribution(dist.id)}
                onDelete={() => onDeleteDistribution(dist.id)}
                onDemarrer={onDemarrer ? () => onDemarrer(dist.id) : undefined}
                onTerminer={onTerminer ? () => onTerminer(dist.id) : undefined}
                onReporter={onReporter ? () => onReporter(dist.id) : undefined}
                onAnnuler={onAnnuler ? () => onAnnuler(dist.id) : undefined}
                onRestaurer={onRestaurer ? () => onRestaurer(dist.id) : undefined}
                onHistorique={onHistorique ? () => onHistorique(dist.id) : undefined}
                onGoToDate={onGoToDistribution ? () => onGoToDistribution(dist.date) : undefined}
              />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Total planifié</span>
              <span className="text-emerald-600 font-bold">{totalHours.toFixed(2)}h</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-6 text-slate-500">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">Aucune distribution de charge définie</p>
          <p className="text-xs mt-1">Cliquez sur le bouton + pour en ajouter</p>
        </div>
      )}
    </div>
  );
};

interface DistributionItemProps {
  distribution: DistributionCharge;
  isTaskTerminee: boolean;
  hasEquipe: boolean;
  isClientView: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDemarrer?: () => void;
  onTerminer?: () => void;
  onReporter?: () => void;
  onAnnuler?: () => void;
  onRestaurer?: () => void;
  onHistorique?: () => void;
  onGoToDate?: () => void;
}

const DistributionItem: React.FC<DistributionItemProps> = ({
  distribution: dist,
  isTaskTerminee,
  hasEquipe,
  isClientView,
  onToggle: _onToggle,
  onEdit,
  onDelete,
  onDemarrer,
  onTerminer,
  onReporter,
  onAnnuler,
  onRestaurer,
  onHistorique,
  onGoToDate,
}) => {
  const [showActions, setShowActions] = useState(false);
  const date = new Date(dist.date);
  const dayOfWeek = date.getDay();
  const isSunday = dayOfWeek === 0;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const status = dist.status;
  const canModify = !isTaskTerminee && !isClientView;

  // Déterminer les actions disponibles selon le statut
  const allowedTransitions = ALLOWED_DISTRIBUTION_TRANSITIONS[status] || [];
  const canDemarrer = allowedTransitions.includes('EN_COURS') && onDemarrer;
  const canTerminer = status === 'EN_COURS' && onTerminer;
  const canReporter = allowedTransitions.includes('REPORTEE') && onReporter;
  const canAnnuler = allowedTransitions.includes('ANNULEE') && onAnnuler;
  const canRestaurer = status === 'ANNULEE' && onRestaurer;

  // Bloquer les actions si pas d'équipe
  const isBlockedByNoEquipe = !hasEquipe && canModify;
  const hasReport = dist.est_report || dist.a_remplacement;

  // Couleurs selon le statut (avec fallback pour statuts legacy comme EN_RETARD)
  const statusColors = STATUS_DISTRIBUTION_COLORS[status] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  };
  const getBgColor = () => {
    // ✅ SIMPLIFIÉ: Plus de EN_RETARD
    if (status === 'REALISEE') return 'bg-green-50 border-green-500 border-2';
    if (status === 'EN_COURS') return 'bg-orange-50 border-orange-400 border-2';
    if (status === 'REPORTEE') return 'bg-purple-50 border-purple-300';
    if (status === 'ANNULEE') return 'bg-red-50 border-red-300';
    if (isSunday) return 'bg-red-50 border-red-200';
    if (isWeekend) return 'bg-blue-50 border-blue-200';
    return 'bg-white border-slate-200';
  };

  // Icône selon le statut (✅ SIMPLIFIÉ: Plus de EN_RETARD)
  const StatusIcon = () => {
    switch (status) {
      case 'REALISEE':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'EN_COURS':
        return <Play className="w-4 h-4 text-orange-600" />;
      case 'REPORTEE':
        return <CalendarClock className="w-4 h-4 text-purple-600" />;
      case 'ANNULEE':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div
      className={`p-3 rounded-lg border text-sm transition-all ${getBgColor()}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icône de statut */}
        <div className="mt-1 shrink-0">
          <StatusIcon />
        </div>

        <div className="flex-1">
          <div className="font-medium text-slate-800 mb-1">
            {onGoToDate ? (
              <button
                onClick={onGoToDate}
                className="hover:text-emerald-600 hover:underline transition-colors text-left"
                title="Voir les distributions de ce jour"
              >
                {date.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </button>
            ) : (
              date.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dist.heure_debut ? dist.heure_debut.substring(0, 5) : '08:00'} -{' '}
              {dist.heure_fin ? dist.heure_fin.substring(0, 5) : '17:00'}
            </span>
            <span className="font-semibold text-emerald-600">
              {dist.heures_planifiees?.toFixed(2) || '0.00'}h
            </span>
            {dist.heures_reelles && (
              <span className="text-slate-500">(réel: {dist.heures_reelles.toFixed(2)}h)</span>
            )}
          </div>
          {dist.commentaire && (
            <p className="mt-2 text-xs text-slate-500 italic">{dist.commentaire}</p>
          )}
          {dist.motif_report_annulation && (
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-medium">Motif:</span> {dist.motif_report_annulation}
            </p>
          )}
          {hasReport && onHistorique && (
            <button
              onClick={onHistorique}
              className="mt-1 text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              <History className="w-3 h-3" />
              {dist.nombre_reports ? `${dist.nombre_reports} report(s)` : 'Voir historique'}
            </button>
          )}
        </div>

        {/* Status badge et actions */}
        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}
          >
            {STATUS_DISTRIBUTION_LABELS[status] || status}
          </span>

          {/* Indicateur "Sans équipe" */}
          {isBlockedByNoEquipe && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300">
              <AlertTriangle className="w-3 h-3" />
              Sans équipe
            </span>
          )}

          {/* Actions selon le statut */}
          {canModify && (showActions || true) && (
            <div className="flex items-center gap-1 mt-1">
              {/* Démarrer (NON_REALISEE → EN_COURS) */}
              {canDemarrer && (
                <button
                  onClick={isBlockedByNoEquipe ? undefined : onDemarrer}
                  disabled={isBlockedByNoEquipe}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isBlockedByNoEquipe
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-orange-600 hover:bg-orange-50'
                  }`}
                  title={
                    isBlockedByNoEquipe ? "Assignez d'abord une équipe à la tâche" : 'Démarrer'
                  }
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Terminer (EN_COURS → REALISEE) */}
              {canTerminer && (
                <button
                  onClick={isBlockedByNoEquipe ? undefined : onTerminer}
                  disabled={isBlockedByNoEquipe}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isBlockedByNoEquipe
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                  title={
                    isBlockedByNoEquipe ? "Assignez d'abord une équipe à la tâche" : 'Terminer'
                  }
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Reporter (NON_REALISEE → REPORTEE) */}
              {canReporter && (
                <button
                  onClick={isBlockedByNoEquipe ? undefined : onReporter}
                  disabled={isBlockedByNoEquipe}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isBlockedByNoEquipe
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-purple-600 hover:bg-purple-50'
                  }`}
                  title={
                    isBlockedByNoEquipe ? "Assignez d'abord une équipe à la tâche" : 'Reporter'
                  }
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Annuler */}
              {canAnnuler && (
                <button
                  onClick={isBlockedByNoEquipe ? undefined : onAnnuler}
                  disabled={isBlockedByNoEquipe}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isBlockedByNoEquipe
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                  title={isBlockedByNoEquipe ? "Assignez d'abord une équipe à la tâche" : 'Annuler'}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Restaurer (ANNULEE → NON_REALISEE) */}
              {canRestaurer && (
                <button
                  onClick={isBlockedByNoEquipe ? undefined : onRestaurer}
                  disabled={isBlockedByNoEquipe}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isBlockedByNoEquipe
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                  title={
                    isBlockedByNoEquipe ? "Assignez d'abord une équipe à la tâche" : 'Restaurer'
                  }
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Modifier (seulement si NON_REALISEE) */}
              {status === 'NON_REALISEE' && (
                <button
                  onClick={onEdit}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Modifier la date et les heures"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Supprimer (seulement si NON_REALISEE) */}
              {status === 'NON_REALISEE' && (
                <button
                  onClick={onDelete}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer cette distribution"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DistributionsList;
