import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { SatisfactionCreate } from '../types/reclamations';

interface SatisfactionFormProps {
    reclamationId: number;
    reclamationNumero: string;
    onSubmit: (data: SatisfactionCreate) => Promise<void>;
    onClose: () => void;
}

export const SatisfactionForm: React.FC<SatisfactionFormProps> = ({
    reclamationId,
    reclamationNumero,
    onSubmit,
    onClose
}) => {
    const [note, setNote] = useState<number>(0);
    const [hoverNote, setHoverNote] = useState<number>(0);
    const [commentaire, setCommentaire] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (note === 0) {
            alert('Veuillez sélectionner une note');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({ reclamation: reclamationId, note, commentaire });
            onClose();
        } catch (error) {
            console.error('Erreur lors de la soumission:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Évaluation de satisfaction</h2>
                        <p className="text-sm text-gray-600">Réclamation {reclamationNumero}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Rating Stars */}
                    <div className="text-center">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Comment évaluez-vous la résolution de votre réclamation ?
                        </label>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setNote(star)}
                                    onMouseEnter={() => setHoverNote(star)}
                                    onMouseLeave={() => setHoverNote(0)}
                                    className="transition-transform hover:scale-110 focus:outline-none"
                                >
                                    <Star
                                        className={`w-10 h-10 ${star <= (hoverNote || note)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                            } transition-colors`}
                                    />
                                </button>
                            ))}
                        </div>
                        {note > 0 && (
                            <p className="mt-2 text-sm text-gray-600">
                                {note === 1 && 'Très insatisfait'}
                                {note === 2 && 'Insatisfait'}
                                {note === 3 && 'Neutre'}
                                {note === 4 && 'Satisfait'}
                                {note === 5 && 'Très satisfait'}
                            </p>
                        )}
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Commentaire (optionnel)
                        </label>
                        <textarea
                            value={commentaire}
                            onChange={(e) => setCommentaire(e.target.value)}
                            rows={4}
                            className="w-full rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="Partagez votre expérience..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || note === 0}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Envoi...' : 'Soumettre'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
