import React from 'react';
import { HistoriqueReclamation } from '../types/reclamations';
import { CheckCircle2, Clock, AlertCircle, Circle, User } from 'lucide-react';

interface ReclamationTimelineProps {
    historique: HistoriqueReclamation[];
}

export const ReclamationTimeline: React.FC<ReclamationTimelineProps> = ({ historique }) => {
    if (!historique || historique.length === 0) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 italic">
                Aucun historique disponible.
            </div>
        );
    }

    // On s'assure que l'historique est trié du plus récent au plus ancien
    const sortedHistory = [...historique].sort((a, b) =>
        new Date(b.date_changement).getTime() - new Date(a.date_changement).getTime()
    );

    const getStatusColor = (statut: string) => {
        switch (statut) {
            case 'NOUVELLE': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'PRISE_EN_COMPTE': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'EN_COURS': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'RESOLUE': return 'bg-green-100 text-green-800 border-green-200';
            case 'CLOTUREE': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'REJETEE': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getStatusIcon = (statut: string) => {
        switch (statut) {
            case 'RESOLUE': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
            case 'REJETEE': return <AlertCircle className="w-5 h-5 text-red-600" />;
            case 'EN_COURS': return <Clock className="w-5 h-5 text-yellow-600" />;
            default: return <Circle className="w-5 h-5 text-blue-600" />;
        }
    };

    const formatStatus = (s: string) => s ? s.toLowerCase().replace(/_/g, ' ') : '';

    return (
        <div className="relative pl-4 border-l-2 border-gray-200 space-y-8 my-4">
            {sortedHistory.map((event) => (
                <div key={event.id} className="relative pl-6">
                    {/* Icone sur la ligne */}
                    <div className="absolute -left-[25px] top-0 bg-white p-1 rounded-full border border-gray-100 shadow-sm">
                        {getStatusIcon(event.statut_nouveau)}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide border ${getStatusColor(event.statut_nouveau)}`}>
                                {formatStatus(event.statut_nouveau)}
                            </span>

                            {event.statut_precedent && (
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                    Précédemment : {formatStatus(event.statut_precedent)}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                                {new Date(event.date_changement).toLocaleDateString('fr-FR', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </p>
                            <p className="text-xs text-gray-500">
                                {new Date(event.date_changement).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm text-gray-700 relative">
                        {/* Petit triangle bubble */}
                        <div className="absolute top-0 left-4 w-3 h-3 bg-gray-50 border-t border-l border-gray-50 transform -translate-y-1/2 rotate-45"></div>

                        <p className="font-medium text-slate-800 mb-1 flex items-center gap-2">
                            <User className="w-3 h-3 text-gray-400" />
                            {event.auteur_nom}
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            {event.commentaire || "Aucun commentaire."}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};
