import React from 'react';
import { Clock, CheckCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { Tache, StatusDistribution, STATUS_DISTRIBUTION_LABELS, STATUS_DISTRIBUTION_COLORS } from '../../types/planning';

interface DistributionCharge {
    id: number;
    date: string;
    heure_debut: string | null;
    heure_fin: string | null;
    heures_planifiees: number | null;
    heures_reelles: number | null;
    status: StatusDistribution;
    commentaire: string | null;
}

interface DistributionsListProps {
    tache: Tache;
    isClientView: boolean;
    onToggleDistribution: (distributionId: number, currentStatus: StatusDistribution) => void;
    onEditDistribution: (distributionId: number) => void;
    onDeleteDistribution: (distributionId: number) => void;
    onAddDistributions: () => void;
}

export const DistributionsList: React.FC<DistributionsListProps> = ({
    tache,
    isClientView,
    onToggleDistribution,
    onEditDistribution,
    onDeleteDistribution,
    onAddDistributions,
}) => {
    const distributions = tache.distributions_charge || [];
    const isTaskTerminee = tache.statut === 'TERMINEE';
    const hasEquipe = (tache.equipes_detail?.length ?? 0) > 0 || !!tache.equipe_detail;
    const canAddDistributions = tache.statut !== 'TERMINEE' && hasEquipe && !isClientView;

    const sortedDistributions = [...distributions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const totalHours = tache.charge_totale_distributions ??
        distributions.reduce((sum, d) => sum + (d.heures_planifiees || 0), 0);

    return (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Distribution de charge {distributions.length > 0 && `(${distributions.length} jour${distributions.length > 1 ? 's' : ''})`}
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
                            />
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 font-medium">Total planifié</span>
                            <span className="text-emerald-600 font-bold">
                                {totalHours.toFixed(2)}h
                            </span>
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
}

const DistributionItem: React.FC<DistributionItemProps> = ({
    distribution: dist,
    isTaskTerminee,
    hasEquipe,
    isClientView,
    onToggle,
    onEdit,
    onDelete,
}) => {
    const date = new Date(dist.date);
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isRealisee = dist.status === 'REALISEE';
    const canModify = !isTaskTerminee && hasEquipe && !isClientView;
    const canToggle = canModify;

    const getTooltip = () => {
        if (!hasEquipe) {
            return '❌ Veuillez assigner une équipe avant de modifier les distributions';
        }
        if (isTaskTerminee) {
            return '🔒 Les distributions ne peuvent pas être modifiées pour une tâche terminée';
        }
        if (isRealisee) {
            const heures = dist.heures_planifiees?.toFixed(2) || '0';
            return `✓ Distribution réalisée (${heures}h) - Cliquer pour marquer comme non réalisée`;
        }
        const heures = dist.heures_planifiees?.toFixed(2) || '0';
        return `○ Distribution non réalisée (${heures}h planifiées) - Cliquer pour marquer comme réalisée`;
    };

    return (
        <div
            className={`
                p-3 rounded-lg border text-sm transition-all
                ${isRealisee
                    ? 'bg-green-50 border-green-500 border-2'
                    : isSunday
                        ? 'bg-red-50 border-red-200'
                        : isWeekend
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-slate-200'
                }
            `}
        >
            <div className="flex items-start justify-between gap-3">
                {/* Toggle checkbox */}
                <button
                    onClick={canToggle ? onToggle : undefined}
                    disabled={!canToggle}
                    title={getTooltip()}
                    className={`
                        mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0
                        ${isRealisee
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-gray-400 hover:border-emerald-500 hover:bg-emerald-50'
                        }
                        ${!canToggle ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                >
                    {isRealisee && <CheckCircle className="w-3 h-3" />}
                </button>

                <div className="flex-1">
                    <div className="font-medium text-slate-800 mb-1">
                        {date.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {dist.heure_debut ? dist.heure_debut.substring(0, 5) : '08:00'} - {dist.heure_fin ? dist.heure_fin.substring(0, 5) : '17:00'}
                        </span>
                        <span className="font-semibold text-emerald-600">
                            {dist.heures_planifiees?.toFixed(2) || '0.00'}h
                        </span>
                    </div>
                    {dist.commentaire && (
                        <p className="mt-2 text-xs text-slate-500 italic">
                            {dist.commentaire}
                        </p>
                    )}
                </div>

                {/* Status badge and action buttons */}
                <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${STATUS_DISTRIBUTION_COLORS[dist.status].bg} ${STATUS_DISTRIBUTION_COLORS[dist.status].text}`}>
                        {STATUS_DISTRIBUTION_LABELS[dist.status]}
                    </span>
                    {canModify && !isRealisee && (
                        <div className="flex items-center gap-1 mt-1">
                            <button
                                onClick={onEdit}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Modifier la date et les heures"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={onDelete}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer cette distribution"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DistributionsList;
