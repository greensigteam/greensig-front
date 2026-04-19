import React from 'react';
import { X, History, ArrowRight, CheckCircle, XCircle, Clock, CalendarClock } from 'lucide-react';
import {
  DistributionHistorique,
  STATUS_DISTRIBUTION_LABELS,
  STATUS_DISTRIBUTION_COLORS,
  StatusDistribution,
} from '../../types/planning';

interface HistoriqueDistributionModalProps {
  isOpen: boolean;
  historique: DistributionHistorique[] | null;
  nombreReports: number;
  onClose: () => void;
  isLoading?: boolean;
}

export const HistoriqueDistributionModal: React.FC<HistoriqueDistributionModalProps> = ({
  isOpen,
  historique,
  nombreReports,
  onClose,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  // Icône selon le statut
  const getStatusIcon = (status: StatusDistribution) => {
    switch (status) {
      case 'REALISEE':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'EN_COURS':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'REPORTEE':
        return <CalendarClock className="w-4 h-4 text-purple-600" />;
      case 'ANNULEE':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-purple-50">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-slate-800">Historique des reports</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              {nombreReports} report{nombreReports > 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <p className="mt-3 text-sm text-slate-500">Chargement de l'historique...</p>
            </div>
          ) : historique && historique.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

              {/* Timeline items */}
              <div className="space-y-4">
                {historique.map((item, index) => {
                  const date = new Date(item.date);
                  const isFirst = index === 0;
                  const isLast = index === historique.length - 1;
                  const statusColors = STATUS_DISTRIBUTION_COLORS[
                    item.status as StatusDistribution
                  ] || { bg: 'bg-slate-100', text: 'text-slate-700' };

                  return (
                    <div key={item.id} className="relative pl-10">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                          isLast
                            ? 'bg-purple-600 ring-4 ring-purple-100'
                            : 'bg-white border-2 border-slate-300'
                        }`}
                      >
                        {isLast ? <div className="w-2 h-2 bg-white rounded-full" /> : null}
                      </div>

                      {/* Arrow between items */}
                      {!isLast && (
                        <div className="absolute left-2.5 top-6 w-4 h-4">
                          <ArrowRight className="w-3 h-3 text-slate-400 rotate-90" />
                        </div>
                      )}

                      {/* Content card */}
                      <div
                        className={`p-3 rounded-lg border ${
                          isLast ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(item.status as StatusDistribution)}
                              <span className="font-medium text-slate-800">
                                {date.toLocaleDateString('fr-FR', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">
                              {item.heures_planifiees?.toFixed(2) || '0.00'}h planifiées
                              {item.heures_reelles &&
                                ` / ${item.heures_reelles.toFixed(2)}h réelles`}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusColors?.bg || 'bg-slate-100'} ${statusColors?.text || 'text-slate-700'}`}
                          >
                            {STATUS_DISTRIBUTION_LABELS[item.status as StatusDistribution] ||
                              item.status}
                          </span>
                        </div>

                        {item.motif && (
                          <p className="text-xs text-slate-600 mt-2">
                            <span className="font-medium">Motif:</span> {item.motif}
                          </p>
                        )}
                        {item.commentaire && (
                          <p className="text-xs text-slate-500 mt-1 italic">{item.commentaire}</p>
                        )}

                        {isFirst && (
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                            Distribution d'origine
                          </span>
                        )}
                        {isLast && !isFirst && (
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                            Distribution actuelle
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Aucun historique disponible</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoriqueDistributionModal;
