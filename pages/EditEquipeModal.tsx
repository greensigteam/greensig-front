import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  AlertCircle,
  Save,
  UserCheck,
  Loader2,
  MapPin,
  Building2,
} from 'lucide-react';
import { EquipeList, EquipeUpdate, OperateurList } from '../types/users';
import {
  updateEquipe,
  fetchEquipeMembres,
  fetchOperateurs,
  affecterMembres,
  retirerMembre,
} from '../services/usersApi';
import { invalidateCacheByPrefix } from '../hooks/useDataCache';
import DetailModal from '../components/DetailModal';
import { fetchAllSites, SiteFrontend } from '../services/api';
import {
  PremiumInput,
  PremiumSelect,
  PremiumMultiSelect,
} from '../components/modals/PremiumFormComponents';
import { useToast } from '../contexts/ToastContext';

interface EditEquipeModalProps {
  equipe: EquipeList;
  onClose: () => void;
  onSaved: () => void;
}

// Helper pour nettoyer les valeurs numériques (éviter NaN)
const cleanNumericValue = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return value;
};

const EditEquipeModal: React.FC<EditEquipeModalProps> = ({ equipe, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState<EquipeUpdate>({
    nomEquipe: equipe.nomEquipe,
    chefEquipe: cleanNumericValue(equipe.chefEquipe),
    sitePrincipal: equipe.sitePrincipal,
    sitesSecondaires: equipe.sitesSecondaires || [],
    actif: equipe.actif,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'membres'>('info');

  // Sites management
  const [sites, setSites] = useState<SiteFrontend[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  // Members management
  const [membres, setMembres] = useState<OperateurList[]>([]);
  const [availableOperateurs, setAvailableOperateurs] = useState<OperateurList[]>([]);
  const [loadingMembres, setLoadingMembres] = useState(true);
  const [memberAction, setMemberAction] = useState<string | null>(null);

  useEffect(() => {
    loadMembres();
    loadSites();
  }, [equipe.id]);

  const loadSites = async () => {
    setLoadingSites(true);
    try {
      const sitesData = await fetchAllSites();
      setSites(sitesData.filter((s) => s.actif !== false));
    } catch (error) {
      showToast('Erreur lors du chargement des sites', 'error');
    } finally {
      setLoadingSites(false);
    }
  };

  const loadMembres = async () => {
    setLoadingMembres(true);
    try {
      // Invalider le cache des opérateurs pour forcer un appel API frais
      invalidateCacheByPrefix('operateurs');

      const [membresRes, operateursRes] = await Promise.all([
        fetchEquipeMembres(equipe.id),
        fetchOperateurs({ sansEquipe: true }),
      ]);
      setMembres(membresRes);
      setAvailableOperateurs(operateursRes.results);
    } catch (err) {
      showToast('Erreur lors du chargement des membres', 'error');
    } finally {
      setLoadingMembres(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setForm((f) => ({
      ...f,
      [field]: value,
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
      const currentMemberIds = membres.map((m) => m.id);
      await affecterMembres(equipe.id, { operateurs: [...currentMemberIds, operateurId] });
      await loadMembres();
    } catch (err: any) {
      // Prefer server-provided details when available
      const serverData = err?.data || err?.response || null;
      setError(
        serverData ? JSON.stringify(serverData) : err.message || "Erreur lors de l'ajout du membre",
      );
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
      const serverData = err?.data || err?.response || null;
      setError(
        serverData ? JSON.stringify(serverData) : err.message || 'Erreur lors du retrait du membre',
      );
    } finally {
      setMemberAction(null);
    }
  };

  // Tout membre actif peut être nommé chef d'équipe
  const membresActifs = membres.filter((m) => m.statut === 'ACTIF');

  // Note: On n'utilise plus de tableaux pré-créés pour éviter les problèmes de clés React

  // Onglet Informations (formulaire d'édition)
  const infoContent = (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <PremiumInput
        type="text"
        value={form.nomEquipe || ''}
        onChange={(value) => handleChange('nomEquipe', value)}
        label="Nom de l'équipe"
        placeholder="Ex: Équipe Nord"
        icon={<Users className="w-4 h-4" />}
        variant="outlined"
        size="md"
        required
      />

      <PremiumSelect
        value={form.chefEquipe?.toString() ?? ''}
        onChange={(value) => handleChange('chefEquipe', value ? parseInt(value) : null)}
        options={membresActifs.map((op) => ({
          value: op.id.toString(),
          label: `${op.fullName} (${op.numeroImmatriculation})${op.id === equipe.chefEquipe ? ' (actuel)' : ''}`,
        }))}
        label="Chef d'équipe sur le terrain"
        placeholder={
          membresActifs.length === 0
            ? "Aucun membre actif dans l'équipe"
            : "Sélectionner un chef d'équipe"
        }
        icon={<UserCheck className="w-4 h-4" />}
        variant="outlined"
        size="md"
        hint="Tout membre actif de l'équipe peut être nommé chef"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Site principal */}
        {loadingSites ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement des sites...
          </div>
        ) : (
          <PremiumSelect
            value={form.sitePrincipal?.toString() ?? ''}
            onChange={(value) => handleChange('sitePrincipal', value ? parseInt(value) : null)}
            options={sites.map((site) => ({
              value: site.id,
              label: `${site.name}${site.code_site ? ` (${site.code_site})` : ''}`,
            }))}
            label="Site principal"
            placeholder="Sélectionner un site"
            icon={<Building2 className="w-4 h-4" />}
            variant="outlined"
            size="md"
            hint="Détermine le superviseur de l'équipe"
          />
        )}

        {/* Sites secondaires */}
        {loadingSites ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement des sites...
          </div>
        ) : (
          <PremiumMultiSelect
            values={(form.sitesSecondaires || []).map(String)}
            onChange={(values) => {
              handleChange('sitesSecondaires', values.map(Number));
            }}
            options={sites
              .filter((site) => {
                const siteIdNum = parseInt(site.id);
                return form.sitePrincipal ? siteIdNum !== form.sitePrincipal : true;
              })
              .map((site) => ({
                value: site.id.toString(),
                label: `${site.name}${site.code_site ? ` (${site.code_site})` : ''}`,
              }))}
            label="Sites secondaires"
            placeholder="Sélectionner les sites"
            icon={<MapPin className="w-4 h-4" />}
            variant="outlined"
            size="md"
            hint="Sites proches géographiquement"
          />
        )}
      </div>

      <div className="flex items-center gap-3 py-2">
        <label className="text-sm font-medium text-gray-700">Statut de l'equipe</label>
        <button
          type="button"
          onClick={() => setForm({ ...form, actif: !form.actif })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.actif ? 'bg-emerald-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.actif ? 'translate-x-6' : 'translate-x-1'
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
                key={membre.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      membre.id === equipe.chefEquipe ? 'bg-emerald-200' : 'bg-gray-200'
                    }`}
                  >
                    {membre.id === equipe.chefEquipe ? (
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
                  {membre.id === equipe.chefEquipe ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      Chef d'equipe
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRemoveMembre(membre.id)}
                      disabled={memberAction === `remove-${membre.id}`}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                      title="Retirer de l'equipe"
                    >
                      {memberAction === `remove-${membre.id}` ? (
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
                key={op.id}
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
                  onClick={() => handleAddMembre(op.id)}
                  disabled={memberAction === `add-${op.id}`}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg disabled:opacity-50"
                  title="Ajouter a l'equipe"
                >
                  {memberAction === `add-${op.id}` ? (
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
  const actions =
    activeTab === 'info' ? (
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
        { key: 'membres', label: `Membres (${membres.length})`, content: membresContent },
      ]}
      defaultTab="info"
      onTabChange={(key) => setActiveTab(key as 'info' | 'membres')}
      actions={actions}
    />
  );
};

export default EditEquipeModal;
