import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, User, Phone, Mail, Hash, Users, Edit2 } from 'lucide-react';
import { OperateurList, OperateurUpdate, EquipeList } from '../../types/users';
import { updateOperateur, fetchEquipes } from '../../services/usersApi';
import { PremiumInput, PremiumSelect } from '../modals/PremiumFormComponents';
import { useToast } from '../../contexts/ToastContext';

interface EditOperateurModalProps {
  operateur: OperateurList;
  onClose: () => void;
  onUpdated: () => void;
}

const EditOperateurModal: React.FC<EditOperateurModalProps> = ({
  operateur,
  onClose,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<OperateurUpdate>({
    nom: operateur.nom,
    prenom: operateur.prenom,
    email: operateur.email,
    numeroImmatriculation: operateur.numeroImmatriculation,
    telephone: operateur.telephone,
    statut: operateur.statut,
    equipe: operateur.equipe,
  });

  const [equipes, setEquipes] = useState<EquipeList[]>([]);
  const [loadingEquipes, setLoadingEquipes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEquipes = async () => {
      setLoadingEquipes(true);
      try {
        const equipesData = await fetchEquipes({ pageSize: 100 });
        setEquipes(equipesData.results.filter((e) => e.actif));
      } catch (error) {
        showToast('Erreur lors du chargement des équipes', 'error');
      } finally {
        setLoadingEquipes(false);
      }
    };
    loadEquipes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation simple
    if (!formData.nom?.trim()) {
      setError('Le nom est requis');
      return;
    }
    if (!formData.prenom?.trim()) {
      setError('Le prenom est requis');
      return;
    }
    if (!formData.numeroImmatriculation?.trim()) {
      setError('Le matricule est requis');
      return;
    }

    setLoading(true);
    try {
      await updateOperateur(operateur.id, formData);
      onUpdated();
      onClose();
    } catch (err: any) {
      if (err.data) {
        const messages: string[] = [];
        for (const [field, value] of Object.entries(err.data)) {
          if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(', ')}`);
          } else if (typeof value === 'string') {
            messages.push(value);
          }
        }
        setError(
          messages.length > 0
            ? messages.join('\n')
            : err.message || 'Erreur lors de la mise a jour',
        );
      } else {
        setError(err.message || "Erreur lors de la mise a jour de l'operateur");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Edit2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Modifier l'opérateur</h2>
              <p className="text-sm text-gray-500">Mettre à jour les informations</p>
            </div>
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
          <div className="p-6 space-y-5 flex-1">
            {/* Erreur */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm whitespace-pre-line">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Nom et Prenom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PremiumInput
                type="text"
                value={formData.nom}
                onChange={(value) => setFormData((prev) => ({ ...prev, nom: value }))}
                label="Nom"
                icon={<User className="w-4 h-4" />}
                required
                variant="outlined"
                size="md"
              />
              <PremiumInput
                type="text"
                value={formData.prenom}
                onChange={(value) => setFormData((prev) => ({ ...prev, prenom: value }))}
                label="Prénom"
                icon={<User className="w-4 h-4" />}
                required
                variant="outlined"
                size="md"
              />
            </div>

            {/* Matricule */}
            <PremiumInput
              type="text"
              value={formData.numeroImmatriculation}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, numeroImmatriculation: value }))
              }
              label="Matricule"
              icon={<Hash className="w-4 h-4" />}
              required
              variant="outlined"
              size="md"
            />

            {/* Email et Telephone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PremiumInput
                type="email"
                value={formData.email || ''}
                onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
                label="Email"
                icon={<Mail className="w-4 h-4" />}
                variant="outlined"
                size="md"
              />
              <PremiumInput
                type="tel"
                value={formData.telephone || ''}
                onChange={(value) => setFormData((prev) => ({ ...prev, telephone: value }))}
                label="Téléphone"
                icon={<Phone className="w-4 h-4" />}
                variant="outlined"
                size="md"
              />
            </div>

            {/* Statut */}
            <PremiumSelect
              value={formData.statut}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  statut: value as 'ACTIF' | 'INACTIF' | 'EN_CONGE',
                }))
              }
              options={[
                { value: 'ACTIF', label: 'Actif' },
                { value: 'INACTIF', label: 'Inactif' },
                { value: 'EN_CONGE', label: 'En congé' },
              ]}
              label="Statut"
              placeholder="Sélectionner un statut"
              variant="outlined"
              size="md"
            />

            {/* Equipe */}
            <div>
              {loadingEquipes ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-3 px-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  Chargement des équipes...
                </div>
              ) : (
                <PremiumSelect
                  value={formData.equipe?.toString() ?? ''}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      equipe: value === '' ? null : Number(value),
                    }))
                  }
                  options={[
                    { value: '', label: 'Aucune équipe' },
                    ...equipes.map((eq) => ({
                      value: eq.id.toString(),
                      label: eq.nomEquipe,
                    })),
                  ]}
                  label="Équipe"
                  placeholder="Sélectionner une équipe"
                  icon={<Users className="w-4 h-4" />}
                  variant="outlined"
                  size="md"
                />
              )}
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
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOperateurModal;
