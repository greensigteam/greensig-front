import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, Users as UsersIcon, Building2 } from 'lucide-react';
import { OperateurList } from '../../types/users';
import { createEquipe, affecterMembres, fetchOperateurs } from '../../services/usersApi';
import { fetchAllSites, SiteFrontend } from '../../services/api';
import TransferList from '../TransferList';
import { PremiumInput, PremiumSelect } from '../modals/PremiumFormComponents';
import CreateOperateurModal from './CreateOperateurModal';
import { useToast } from '../../contexts/ToastContext';

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
  operateursSansEquipe,
}) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    nomEquipe: '',
    chefEquipe: null as number | null,
    sitePrincipal: null as number | null,
  });
  const [selectedMembres, setSelectedMembres] = useState<OperateurList[]>([]);
  const [sites, setSites] = useState<SiteFrontend[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État pour la modale de création d'opérateur
  const [showCreateOperateur, setShowCreateOperateur] = useState(false);
  const [availableOperateurs, setAvailableOperateurs] =
    useState<OperateurList[]>(operateursSansEquipe);

  // Rafraîchir la liste des opérateurs disponibles
  const refreshOperateurs = async () => {
    try {
      const response = await fetchOperateurs({ pageSize: 1000 });
      const sansEquipe = response.results.filter((op) => !op.equipe);
      setAvailableOperateurs(sansEquipe);
    } catch (error) {
      showToast('Erreur lors du rafraîchissement des opérateurs', 'error');
    }
  };

  // Callback quand un nouvel opérateur est créé
  const handleOperateurCreated = async () => {
    await refreshOperateurs();
  };

  useEffect(() => {
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
    loadSites();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nomEquipe.trim()) {
      setError("Le nom de l'equipe est requis");
      return;
    }

    setLoading(true);
    try {
      const membresIds = selectedMembres.map((op) => op.id);

      const equipe = await createEquipe({
        nomEquipe: formData.nomEquipe,
        chefEquipe: formData.chefEquipe || undefined,
        sitePrincipal: formData.sitePrincipal || undefined,
        membres: membresIds.length > 0 ? membresIds : undefined,
      });

      if (membresIds.length > 0) {
        await affecterMembres(equipe.id, { operateurs: membresIds });
      }

      onCreated();
      onClose();
    } catch (error: any) {
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
        setError(
          messages.length > 0 ? messages.join('\n') : error.message || 'Erreur lors de la creation',
        );
      } else {
        setError(error.message || "Erreur lors de la creation de l'equipe");
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
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Section 1: Informations générales */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <UsersIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-800">Informations générales</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nom de l'équipe */}
                <PremiumInput
                  type="text"
                  value={formData.nomEquipe}
                  onChange={(value) => setFormData({ ...formData, nomEquipe: value })}
                  label="Nom de l'équipe"
                  placeholder="Ex: Équipe C - Irrigation"
                  icon={<UsersIcon className="w-4 h-4" />}
                  required
                  variant="outlined"
                  size="md"
                />

                {/* Chef d'équipe */}
                <PremiumSelect
                  value={formData.chefEquipe?.toString() || ''}
                  onChange={(value) =>
                    setFormData({ ...formData, chefEquipe: value ? Number(value) : null })
                  }
                  options={chefsPotentiels.map((op) => ({
                    value: op.id.toString(),
                    label: `${op.fullName} (${op.numeroImmatriculation})`,
                  }))}
                  label="Chef d'équipe (optionnel)"
                  placeholder="Sélectionner un chef"
                  icon={<UsersIcon className="w-4 h-4" />}
                  variant="outlined"
                  size="md"
                />
              </div>
            </div>

            {/* Section 2: Site d'affectation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-800">Site d'affectation</h3>
              </div>

              {loadingSites ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-3 px-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  Chargement...
                </div>
              ) : (
                <PremiumSelect
                  value={formData.sitePrincipal?.toString() || ''}
                  onChange={(value) =>
                    setFormData({ ...formData, sitePrincipal: value ? Number(value) : null })
                  }
                  options={sites.map((site) => ({
                    value: site.id,
                    label: `${site.name}${site.code_site ? ` (${site.code_site})` : ''}`,
                  }))}
                  label="Site principal (optionnel)"
                  placeholder="Sélectionner un site"
                  icon={<Building2 className="w-4 h-4" />}
                  hint="Détermine le superviseur de l'équipe"
                  variant="outlined"
                  size="md"
                />
              )}
            </div>

            {/* Section 3: Membres de l'équipe */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <UsersIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-800">Membres de l'équipe</h3>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  {availableOperateurs.length} opérateur{availableOperateurs.length > 1 ? 's' : ''}{' '}
                  disponible{availableOperateurs.length > 1 ? 's' : ''}
                </p>
                <TransferList
                  available={availableOperateurs}
                  selected={selectedMembres}
                  onChange={setSelectedMembres}
                  getItemId={(op) => op.id}
                  getItemLabel={(op) => op.fullName || `${op.nom} ${op.prenom}`}
                  getItemSubtitle={(op) =>
                    `${op.numeroImmatriculation}${op.equipeNom ? ` • ${op.equipeNom}` : ''}`
                  }
                  availableLabel="Opérateurs disponibles"
                  selectedLabel="Membres de l'équipe"
                  searchPlaceholder="Rechercher (nom, matricule)..."
                  emptyAvailableMessage="Aucun opérateur disponible"
                  emptySelectedMessage="Aucun membre sélectionné"
                  onAddNew={() => setShowCreateOperateur(true)}
                  height="240px"
                />
              </div>
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
              {loading
                ? 'Création...'
                : `Créer l'équipe ${selectedMembres.length > 0 ? `(${selectedMembres.length} membre${selectedMembres.length > 1 ? 's' : ''})` : ''}`}
            </button>
          </div>
        </form>
      </div>

      {/* Modale de création d'opérateur */}
      {showCreateOperateur && (
        <CreateOperateurModal
          onClose={() => setShowCreateOperateur(false)}
          onCreated={handleOperateurCreated}
        />
      )}
    </div>
  );
};

export default CreateTeamModal;
