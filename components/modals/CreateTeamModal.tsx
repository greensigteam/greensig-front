import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { OperateurList } from '../../types/users';
import { createEquipe, affecterMembres } from '../../services/usersApi';
import TransferList from '../TransferList';

interface CreateTeamModalProps {
  onClose: () => void;
  onCreated: () => void;
  chefsPotentiels: OperateurList[];
  operateursSansEquipe: OperateurList[];
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  onClose,
  onCreated,
  chefsPotentiels,
  operateursSansEquipe
}) => {
  const [formData, setFormData] = useState({
    nomEquipe: '',
    chefEquipe: 0
  });
  const [selectedMembres, setSelectedMembres] = useState<OperateurList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nomEquipe.trim()) {
      setError("Le nom de l'equipe est requis");
      return;
    }

    setLoading(true);
    try {
      const membresIds = selectedMembres.map(op => op.id);

      const equipe = await createEquipe({
        nomEquipe: formData.nomEquipe,
        chefEquipe: formData.chefEquipe && formData.chefEquipe !== 0 ? formData.chefEquipe : undefined,
        membres: membresIds.length > 0 ? membresIds : undefined
      });

      if (membresIds.length > 0) {
        await affecterMembres(equipe.id, { operateurs: membresIds });
      }

      onCreated();
      onClose();
    } catch (error: any) {
      console.error('Erreur creation equipe:', error);
      // Extraire le message d'erreur du backend
      if (error.data) {
        const messages: string[] = [];
        for (const [field, value] of Object.entries(error.data)) {
          if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(', ')}`);
          } else if (typeof value === 'string') {
            messages.push(value);
          }
        }
        setError(messages.length > 0 ? messages.join('\n') : error.message || 'Erreur lors de la creation');
      } else {
        setError(error.message || 'Erreur lors de la creation de l\'equipe');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nouvelle équipe</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configurez le nom, le chef et les membres de l'équipe
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 space-y-6 flex-1">
            {/* Erreur */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm whitespace-pre-line">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Nom de l'équipe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'équipe <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.nomEquipe}
                onChange={(e) => setFormData({ ...formData, nomEquipe: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ex: Équipe C - Irrigation"
              />
            </div>

            {/* Chef d'équipe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chef d'équipe (optionnel)
              </label>
              <select
                value={formData.chefEquipe}
                onChange={(e) => setFormData({ ...formData, chefEquipe: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value={0}>Sélectionner un chef</option>
                {chefsPotentiels.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.fullName} ({op.numeroImmatriculation})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Seuls les opérateurs avec la compétence "Gestion d'équipe" sont affichés
              </p>
            </div>

            {/* Membres à affecter - TransferList */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Membres à affecter
              </label>
              <TransferList
                available={operateursSansEquipe}
                selected={selectedMembres}
                onChange={setSelectedMembres}
                getItemId={(op) => op.id}
                getItemLabel={(op) => op.fullName || `${op.nom} ${op.prenom}`}
                getItemSubtitle={(op) => `Mat: ${op.numeroImmatriculation}${op.equipeNom ? ` • ${op.equipeNom}` : ''}`}
                availableLabel="Opérateurs disponibles"
                selectedLabel="Membres de l'équipe"
                searchPlaceholder="Rechercher un opérateur (nom, matricule)..."
                emptyAvailableMessage="Aucun opérateur disponible"
                emptySelectedMessage="Sélectionnez des membres pour l'équipe"
                height="280px"
              />
              <p className="mt-2 text-xs text-gray-500">
                💡 Cliquez sur un opérateur pour l'ajouter/retirer, ou utilisez les boutons pour tout ajouter/retirer
              </p>
            </div>
          </div>

          {/* Footer avec boutons */}
          <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            >
              {loading ? 'Création...' : `Créer l'équipe ${selectedMembres.length > 0 ? `(${selectedMembres.length} membre${selectedMembres.length > 1 ? 's' : ''})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeamModal;
