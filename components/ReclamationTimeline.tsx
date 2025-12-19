import React from 'react';
import { HistoriqueReclamation } from '../types/reclamations';
import { CheckCircle2, Clock, AlertCircle, Circle, User, X, Star } from 'lucide-react';

interface Satisfaction {
    id: number;
    note: number;
    commentaire?: string;
    date_evaluation: string;
}

interface ReclamationTimelineProps {
    historique: HistoriqueReclamation[];
    photos?: any[];
    photosTaches?: any[];
    satisfaction?: Satisfaction | null;
    canEvaluate?: boolean;
    onEvaluate?: () => void;
}

export const ReclamationTimeline: React.FC<ReclamationTimelineProps> = ({
    historique,
    photos = [],
    photosTaches = [],
    satisfaction,
    canEvaluate = false,
    onEvaluate
}) => {
    const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);

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

    // Toutes les photos combinées pour la galerie
    const allPhotos = [...photos, ...photosTaches];

    // Fonction pour vérifier si une photo correspond à un événement (même minute environ)
    const getPhotosForEvent = (eventDate: string) => {
        const eTime = new Date(eventDate).getTime();
        return allPhotos.filter(p => {
            const pTime = new Date(p.date_prise).getTime();
            return Math.abs(eTime - pTime) < 120000; // 2 minutes de delta max
        });
    };

    return (
        <>
            <div className="relative pl-4 border-l-2 border-gray-200 space-y-8 my-4">
                {sortedHistory.map((event) => {
                    const eventPhotos = getPhotosForEvent(event.date_changement);
                    return (
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
                                <div className="absolute top-0 left-4 w-3 h-3 bg-gray-50 border-t border-l border-gray-50 transform -translate-y-1/2 rotate-45"></div>

                                <p className="font-medium text-slate-800 mb-1 flex items-center gap-2">
                                    <User className="w-3 h-3 text-gray-400" />
                                    {event.auteur_nom}
                                </p>
                                <p className="text-gray-600 leading-relaxed">
                                    {event.commentaire || "Aucun commentaire."}
                                </p>

                                {/* Affichage des photos liées à ce changement */}
                                {eventPhotos.length > 0 && (
                                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                        {eventPhotos.map((p, idx) => (
                                            <div
                                                key={p.id || idx}
                                                className="relative group cursor-pointer shrink-0"
                                                onClick={() => setSelectedPhoto(p.url_fichier)}
                                            >
                                                <img
                                                    src={p.url_fichier}
                                                    alt={p.legende || 'Photo suivi'}
                                                    className="w-20 h-20 object-cover rounded-md border border-gray-200 hover:border-emerald-500 transition-colors"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Photos non matchées ou galerie complète si besoin */}
            {allPhotos.length > 0 && (
                <div className="mt-10 pt-6 border-t border-gray-100">
                    <h5 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Circle className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                        Galerie complète des photos ({allPhotos.length})
                    </h5>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {allPhotos.map((p, idx) => (
                            <div
                                key={p.id || idx}
                                className="aspect-square relative group cursor-pointer rounded-lg overflow-hidden border border-gray-100 shadow-sm"
                                onClick={() => setSelectedPhoto(p.url_fichier)}
                            >
                                <img
                                    src={p.url_fichier}
                                    alt={p.legende || 'Photo'}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {p.tache && (
                                    <div className="absolute bottom-0 inset-x-0 bg-black/40 text-[10px] text-white p-1 text-center backdrop-blur-[2px]">
                                        Tâche
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section Satisfaction Client */}
            {satisfaction ? (
                <div className="mt-8 pt-6 border-t border-gray-100">
                    <h5 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        Évaluation du client
                    </h5>
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-100">
                        <div className="flex items-center gap-4">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-6 h-6 ${star <= satisfaction.note
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                            }`}
                                    />
                                ))}
                            </div>
                            <div className="text-sm">
                                <span className="font-semibold text-gray-800">
                                    {satisfaction.note === 1 && 'Très insatisfait'}
                                    {satisfaction.note === 2 && 'Insatisfait'}
                                    {satisfaction.note === 3 && 'Neutre'}
                                    {satisfaction.note === 4 && 'Satisfait'}
                                    {satisfaction.note === 5 && 'Très satisfait'}
                                </span>
                                <span className="text-gray-500 ml-2">
                                    ({satisfaction.note}/5)
                                </span>
                            </div>
                        </div>
                        {satisfaction.commentaire && (
                            <p className="mt-3 text-sm text-gray-700 italic bg-white/50 rounded-lg p-3">
                                "{satisfaction.commentaire}"
                            </p>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                            Évalué le {new Date(satisfaction.date_evaluation).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>
            ) : canEvaluate && onEvaluate ? (
                <div className="mt-8 pt-6 border-t border-gray-100">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100 text-center">
                        <Star className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                        <h5 className="text-lg font-bold text-gray-800 mb-2">
                            Donnez votre avis !
                        </h5>
                        <p className="text-sm text-gray-600 mb-4">
                            Votre réclamation a été traitée. Évaluez la qualité du travail effectué.
                        </p>
                        <button
                            onClick={onEvaluate}
                            className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 mx-auto"
                        >
                            <Star className="w-4 h-4" />
                            Évaluer le travail
                        </button>
                    </div>
                </div>
            ) : null}

            {/* Modal de prévisualisation Photo */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <button
                        className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhoto(null);
                        }}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={selectedPhoto}
                        alt="Aperçu"
                        className="max-w-full max-h-full object-contain rounded shadow-2xl animate-in zoom-in-95 duration-300"
                    />
                </div>
            )}
        </>
    );
};
