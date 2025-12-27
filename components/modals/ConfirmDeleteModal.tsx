import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  title: string;
  message?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

/**
 * Modale générique de confirmation de suppression
 *
 * Usage:
 * ```tsx
 * <ConfirmDeleteModal
 *   title="Supprimer l'équipe ?"
 *   message="Cette action est irréversible."
 *   onConfirm={async () => await deleteEquipe(id)}
 *   onCancel={() => setShowModal(false)}
 * />
 * ```
 */
const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  title,
  message = 'Cette action est irréversible.',
  onConfirm,
  onCancel,
  confirmText = 'Supprimer',
  cancelText = 'Annuler'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      await onConfirm();
      onCancel(); // Fermer la modale après succès
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      setError(err?.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <p className="text-gray-600 mb-4 text-center text-sm">{message}</p>

        {error && (
          <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 w-full">
          <button
            className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Suppression...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
