import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, User, Phone, Mail, Calendar, Hash, Users } from 'lucide-react';
import { OperateurCreate, EquipeList } from '../../types/users';
import { createOperateur, fetchEquipes } from '../../services/usersApi';

interface CreateOperateurModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateOperateurModal: React.FC<CreateOperateurModalProps> = ({
  onClose,
  onCreated
}) => {
  const [formData, setFormData] = useState<OperateurCreate>({
    nom: '',
    prenom: '',
    email: '',
    numeroImmatriculation: '',
    telephone: '',
    dateEmbauche: new Date().toISOString().split('T')[0] || '',
    statut: 'ACTIF',
    equipe: null
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
        setEquipes(equipesData.results.filter(e => e.actif));
      } catch (error) {
        console.error('Erreur chargement equipes:', error);
      } finally {
        setLoadingEquipes(false);
      }
    };
    loadEquipes();
  }, []);

  // Generateur automatique de matricule
  const generateMatricule = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `OP-${year}-${random}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'equipe' ? (value === '' ? null : Number(value)) : value
    }));
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
      console.error('Erreur creation operateur:', err);
      if (err.data) {
        const messages: string[] = [];
        for (const [field, value] of Object.entries(err.data)) {
          if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(', ')}`);
          } else if (typeof value === 'string') {
            messages.push(value);
          }
        }
        setError(messages.length > 0 ? messages.join('\n') : err.message || 'Erreur lors de la creation');
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    required
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="Dupont"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Prenom <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="Jean"
                />
              </div>
            </div>

            {/* Matricule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Matricule <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    required
                    type="text"
                    name="numeroImmatriculation"
                    value={formData.numeroImmatriculation}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="OP-2024-0001"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, numeroImmatriculation: generateMatricule() }))}
                  className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Generer
                </button>
              </div>
            </div>

            {/* Email et Telephone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="jean.dupont@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telephone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone || ''}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
            </div>

            {/* Date d'embauche */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date d'embauche <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="date"
                  name="dateEmbauche"
                  value={formData.dateEmbauche}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Statut
              </label>
              <select
                name="statut"
                value={formData.statut}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="ACTIF">Actif</option>
                <option value="INACTIF">Inactif</option>
                <option value="EN_CONGE">En congé</option>
              </select>
            </div>

            {/* Equipe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Equipe (optionnel)
              </label>
              {loadingEquipes ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement des equipes...
                </div>
              ) : (
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    name="equipe"
                    value={formData.equipe ?? ''}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none"
                  >
                    <option value="">Aucune equipe</option>
                    {equipes.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.nomEquipe}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Vous pourrez affecter l'operateur a une equipe plus tard
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