import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, AlertCircle, Save, UserCheck } from 'lucide-react';
import { EquipeList, EquipeUpdate, OperateurList } from '../types/users';
import {
  updateEquipe,
  fetchEquipeMembres,
  fetchOperateurs,
  fetchChefsPotentiels,
  affecterMembres,
  retirerMembre
} from '../services/usersApi';
import DetailModal from '../components/DetailModal';

interface EditEquipeModalProps {
  equipe: EquipeList;
  onClose: () => void;
  onSaved: () => void;
}

const EditEquipeModal: React.FC<EditEquipeModalProps> = ({ equipe, onClose, onSaved }) => {
  const [form, setForm] = useState<EquipeUpdate>({
    nomEquipe: equipe.nomEquipe,
    chefEquipe: equipe.chefEquipe,
    actif: equipe.actif,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'membres'>('info');

  // Members management
  const [membres, setMembres] = useState<OperateurList[]>([]);
  const [availableOperateurs, setAvailableOperateurs] = useState<OperateurList[]>([]);
  const [chefsPotentiels, setChefsPotentiels] = useState<OperateurList[]>([]);
  const [loadingMembres, setLoadingMembres] = useState(true);
  const [memberAction, setMemberAction] = useState<string | null>(null);

  useEffect(() => {
    loadMembres();
  }, [equipe.id]);

  const loadMembres = async () => {
    setLoadingMembres(true);
    try {
      const [membresRes, operateursRes, chefsRes] = await Promise.all([
        fetchEquipeMembres(equipe.id),
        fetchOperateurs({ sansEquipe: true }),
        fetchChefsPotentiels()
      ]);
      setMembres(membresRes);
      setAvailableOperateurs(operateursRes.results);
      setChefsPotentiels(chefsRes);
    } catch (err) {
      console.error('Erreur chargement membres:', err);
    } finally {
      setLoadingMembres(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | boolean | number | null = value;
    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    }
    if (name === 'chefEquipe') {
      // Treat empty string as null to allow removing the chef
      newValue = value === '' ? null : Number(value);
    }
    setForm(f => ({
      ...f,
      [name]: newValue
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateEquipe(equipe.id, form);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembre = async (operateurId: number) => {
    setMemberAction(`add-${operateurId}`);
    try {
      const currentMemberIds = membres.map(m => m.utilisateur);
      await affecterMembres(equipe.id, { operateurs: [...currentMemberIds, operateurId] });
      await loadMembres();
    } catch (err: any) {
      console.error('affecterMembres error:', err);
      // Prefer server-provided details when available
      const serverData = err?.data || err?.response || null;
      setError(serverData ? JSON.stringify(serverData) : (err.message || "Erreur lors de l'ajout du membre"));
    } finally {
      setMemberAction(null);
    }
  };

  const handleRemoveMembre = async (operateurId: number) => {
    setMemberAction(`remove-${operateurId}`);
    try {
      await retirerMembre(equipe.id, operateurId);
      await loadMembres();
    } catch (err: any) {
      console.error('retirerMembre error:', err);
      const serverData = err?.data || err?.response || null;
      setError(serverData ? JSON.stringify(serverData) : (err.message || 'Erreur lors du retrait du membre'));
    } finally {
      setMemberAction(null);
    }
  };

  // Combine current chef with chefs potentiels for the dropdown
  const chefOptions = [
    ...chefsPotentiels,
    ...membres.filter(m => m.estChefEquipe || m.utilisateur === equipe.chefEquipe)
  ].filter((op, index, self) =>
    index === self.findIndex(o => o.utilisateur === op.utilisateur)
  );

  // Onglet Informations (formulaire d'édition)
  const infoContent = (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom de l'equipe <span className="text-red-500">*</span>
        </label>
        <input
          name="nomEquipe"
          value={form.nomEquipe || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chef d'equipe (optionnel)
        </label>
        <select
          name="chefEquipe"
          value={form.chefEquipe ?? ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="">-- Aucun --</option>
          <option disabled value="divider">──────────</option>
          <option value="">Selectionner un chef</option>
          {chefOptions.map((op) => (
            <option key={op.utilisateur} value={op.utilisateur}>
              {op.fullName} ({op.numeroImmatriculation})
              {op.utilisateur === equipe.chefEquipe ? ' (actuel)' : ''}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Seuls les operateurs avec la competence "Gestion d'equipe" sont affiches
        </p>
      </div>

      <div className="flex items-center gap-3 py-2">
        <label className="text-sm font-medium text-gray-700">Statut de l'equipe</label>
        <button
          type="button"
          onClick={() => setForm({ ...form, actif: !form.actif })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.actif ? 'bg-emerald-600' : 'bg-gray-300'
            }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.actif ? 'translate-x-6' : 'translate-x-1'
              }`}
          />
        </button>
        <span className={`text-sm ${form.actif ? 'text-emerald-600' : 'text-gray-500'}`}>
          {form.actif ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );

  // Onglet Membres (gestion d'équipe)
  const membresContent = loadingMembres ? (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  ) : (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Current members */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Membres actuels ({membres.length})
        </h3>
        {membres.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
            Aucun membre dans cette equipe
          </p>
        ) : (
          <div className="space-y-2">
            {membres.map((membre) => (
              <div
                key={membre.utilisateur}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${membre.utilisateur === equipe.chefEquipe
                    ? 'bg-emerald-200'
                    : 'bg-gray-200'
                    }`}>
                    {membre.utilisateur === equipe.chefEquipe ? (
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Users className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{membre.fullName}</p>
                    <p className="text-xs text-gray-500">{membre.numeroImmatriculation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {membre.utilisateur === equipe.chefEquipe ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      Chef d'equipe
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRemoveMembre(membre.utilisateur)}
                      disabled={memberAction === `remove-${membre.utilisateur}`}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                      title="Retirer de l'equipe"
                    >
                      {memberAction === `remove-${membre.utilisateur}` ? (
                        <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                      ) : (
                        <UserMinus className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available operators */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Operateurs disponibles ({availableOperateurs.length})
        </h3>
        {availableOperateurs.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
            Aucun operateur disponible
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {availableOperateurs.map((op) => (
              <div
                key={op.utilisateur}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{op.fullName}</p>
                    <p className="text-xs text-gray-500">{op.numeroImmatriculation}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAddMembre(op.utilisateur)}
                  disabled={memberAction === `add-${op.utilisateur}`}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg disabled:opacity-50"
                  title="Ajouter a l'equipe"
                >
                  {memberAction === `add-${op.utilisateur}` ? (
                    <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Footer conditionnel (boutons visibles seulement sur onglet "info")
  const actions = activeTab === 'info' ? (
    <div className="flex gap-3 w-full">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Save className="w-4 h-4" />
            Enregistrer
          </>
        )}
      </button>
    </div>
  ) : null;

  return (
    <DetailModal
      isOpen={true}
      onClose={onClose}
      title="Modifier l'equipe"
      subtitle={equipe.nomEquipe}
      icon={<Users className="w-5 h-5 text-emerald-600" />}
      size="lg"
      tabs={[
        { key: 'info', label: 'Informations', content: infoContent },
        { key: 'membres', label: `Membres (${membres.length})`, content: membresContent }
      ]}
      defaultTab="info"
      onTabChange={(key) => setActiveTab(key)}
      actions={actions}
    />
  );
};

export default EditEquipeModal;
