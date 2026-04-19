import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Loader2,
  User,
  Phone,
  Mail,
  Calendar,
  Hash,
  Users,
  RefreshCw,
} from 'lucide-react';
import { OperateurCreate, EquipeList } from '../../types/users';
import { createOperateur, fetchEquipes } from '../../services/usersApi';
import { PremiumInput, PremiumSelect, PremiumButton } from '../modals/PremiumFormComponents';
import { useToast } from '../../contexts/ToastContext';

interface CreateOperateurModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateOperateurModal: React.FC<CreateOperateurModalProps> = ({ onClose, onCreated }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<OperateurCreate>({
    nom: '',
    prenom: '',
    email: '',
    numeroImmatriculation: '',
    telephone: '',
    dateEmbauche: new Date().toISOString().split('T')[0] || '',
    statut: 'ACTIF',
    equipe: null,
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

  // Generateur automatique de matricule
  const generateMatricule = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `OP-${year}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.nom.trim()) {
      setError('Le nom est requis');
      return;
    }
    if (!formData.prenom.trim()) {
      setError('Le prenom est requis');
      return;
    }
    if (!formData.numeroImmatriculation.trim()) {
      setError('Le matricule est requis');
      return;
    }
    if (!formData.dateEmbauche) {
      setError("La date d'embauche est requise");
      return;
    }

    setLoading(true);
    try {
      await createOperateur(formData);
      onCreated();
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
          messages.length > 0 ? messages.join('\n') : err.message || 'Erreur lors de la creation',
        );
      } else {
        setError(err.message || "Erreur lors de la creation de l'operateur");
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
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nouvel operateur</h2>
              <p className="text-sm text-gray-500">Ajouter un operateur terrain</p>
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
                placeholder="Dupont"
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
                placeholder="Jean"
                icon={<User className="w-4 h-4" />}
                required
                variant="outlined"
                size="md"
              />
            </div>

            {/* Matricule */}
            <div className="flex gap-2">
              <div className="flex-1">
                <PremiumInput
                  type="text"
                  value={formData.numeroImmatriculation}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, numeroImmatriculation: value }))
                  }
                  label="Matricule"
                  placeholder="OP-2024-0001"
                  icon={<Hash className="w-4 h-4" />}
                  required
                  variant="outlined"
                  size="md"
                />
              </div>
              <div className="flex items-end pb-2">
                <PremiumButton
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, numeroImmatriculation: generateMatricule() }))
                  }
                  variant="ghost"
                  size="md"
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  Générer
                </PremiumButton>
              </div>
            </div>

            {/* Email et Telephone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PremiumInput
                type="email"
                value={formData.email || ''}
                onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
                label="Email"
                placeholder="jean.dupont@email.com"
                icon={<Mail className="w-4 h-4" />}
                variant="outlined"
                size="md"
              />
              <PremiumInput
                type="tel"
                value={formData.telephone || ''}
                onChange={(value) => setFormData((prev) => ({ ...prev, telephone: value }))}
                label="Téléphone"
                placeholder="06 12 34 56 78"
                icon={<Phone className="w-4 h-4" />}
                variant="outlined"
                size="md"
              />
            </div>

            {/* Date d'embauche */}
            <PremiumInput
              type="date"
              value={formData.dateEmbauche}
              onChange={(value) => setFormData((prev) => ({ ...prev, dateEmbauche: value }))}
              label="Date d'embauche"
              icon={<Calendar className="w-4 h-4" />}
              required
              variant="outlined"
              size="md"
            />

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
                  label="Équipe (optionnel)"
                  placeholder="Sélectionner une équipe"
                  icon={<Users className="w-4 h-4" />}
                  hint="Vous pourrez affecter l'opérateur à une équipe plus tard"
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
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creation...
                </>
              ) : (
                "Creer l'operateur"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOperateurModal;
