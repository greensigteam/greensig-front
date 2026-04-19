import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Hash,
  Ruler,
  Building2,
  Users,
  Loader2,
  Power,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import {
  updateSite,
  UpdateSiteData,
  SiteFrontend,
  calculateGeometryMetrics,
} from '../../services/api';
import { fetchStructures, fetchSuperviseurs } from '../../services/usersApi';
import { StructureClient, SuperviseurList } from '../../types/users';
import { useToast } from '../../contexts/ToastContext';
import FormModal, { FormSection, FormGrid } from '../FormModal';
import {
  PremiumInput,
  PremiumSelect,
  PremiumSearchableSelect,
  PremiumTextarea,
} from '../modals/PremiumFormComponents';
import CreateSuperviseurModal from '../users/CreateSuperviseurModal';

interface SiteEditModalProps {
  site: SiteFrontend;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedSite: SiteFrontend) => void;
}

export default function SiteEditModal({ site, isOpen, onClose, onSaved }: SiteEditModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clients state
  const [clients, setClients] = useState<StructureClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Superviseurs state
  const [superviseurs, setSuperviseurs] = useState<SuperviseurList[]>([]);
  const [isLoadingSuperviseurs, setIsLoadingSuperviseurs] = useState(false);

  // Create superviseur modal state
  const [showCreateSuperviseurModal, setShowCreateSuperviseurModal] = useState(false);

  const [formData, setFormData] = useState<UpdateSiteData>({
    nom_site: '',
    code_site: '',
    superviseur: undefined,
    adresse: '',
    superficie_totale: null,
    date_debut_contrat: null,
    date_fin_contrat: null,
    actif: true,
  });

  // Fetch clients and superviseurs on mount
  useEffect(() => {
    const loadData = async () => {
      // Load clients
      setIsLoadingClients(true);
      try {
        const response = await fetchStructures();
        // Filter only active structures
        const activeClients = (response.results || []).filter((c) => c.actif);
        setClients(activeClients);
      } catch (error) {
        showToast('Erreur lors du chargement des clients', 'error');
      } finally {
        setIsLoadingClients(false);
      }

      // Load superviseurs
      setIsLoadingSuperviseurs(true);
      try {
        const response = await fetchSuperviseurs();
        setSuperviseurs(response.results || []);
      } catch (error) {
        showToast('Erreur lors du chargement des superviseurs', 'error');
      } finally {
        setIsLoadingSuperviseurs(false);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, showToast]);

  // Initialize form data when site changes
  useEffect(() => {
    if (site) {
      setFormData({
        nom_site: site.name || '',
        code_site: site.code_site || '',
        structure_client: site.structure_client,
        superviseur: site.superviseur,
        adresse: site.adresse || '',
        superficie_totale: site.superficie_totale || null,
        date_debut_contrat: site.date_debut_contrat || null,
        date_fin_contrat: site.date_fin_contrat || null,
        actif: site.actif !== undefined ? site.actif : true,
      });
    }
  }, [site]);

  const handleChange = (field: keyof UpdateSiteData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handler pour la création d'un nouveau superviseur
  const handleSuperviseurCreated = async (newSuperviseur: SuperviseurList) => {
    // Rafraîchir la liste des superviseurs
    try {
      const response = await fetchSuperviseurs();
      setSuperviseurs(response.results || []);

      // Pré-sélectionner le nouveau superviseur
      handleChange('superviseur', newSuperviseur.utilisateur);

      showToast(`Superviseur ${newSuperviseur.fullName} créé et sélectionné`, 'success');
    } catch (error) {
      // En cas d'erreur, ajouter manuellement à la liste
      setSuperviseurs((prev) => [...prev, newSuperviseur]);
      handleChange('superviseur', newSuperviseur.utilisateur);
    }
  };

  // Helper pour formater la date pour l'input (YYYY-MM-DD)
  const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return dateStr.split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const handleRecalculateArea = async () => {
    if (!site.geometry) {
      showToast("Ce site n'a pas de géométrie définie", 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await calculateGeometryMetrics(site.geometry);

      if (result.metrics && result.metrics.area_m2) {
        const area = parseFloat(result.metrics.area_m2.toFixed(2));
        handleChange('superficie_totale', area);
        showToast(`Superficie recalculée : ${area.toLocaleString('fr-FR')} m²`, 'success');
      } else {
        showToast('Impossible de calculer la superficie', 'error');
      }
    } catch (err: any) {
      showToast('Erreur lors du calcul', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nom_site?.trim()) {
      setError('Le nom du site est obligatoire');
      return;
    }

    setLoading(true);
    try {
      const updatedSite = await updateSite(parseInt(site.id), formData);
      showToast('Site mis à jour avec succès', 'success');
      onSaved?.(updatedSite);
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la mise à jour';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Préparer les options pour les selects
  const clientOptions = clients.map((client) => ({
    value: client.id.toString(),
    label: client.nom,
  }));

  const superviseurOptions = superviseurs.map((sup) => ({
    value: sup.utilisateur.toString(),
    label: sup.fullName,
  }));

  return (
    <>
      <FormModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleSubmit}
        title="Modifier le site"
        subtitle={site.name}
        icon={<Building2 className="w-5 h-5 text-emerald-600" />}
        size="lg"
        loading={loading}
        error={error}
        submitLabel="Enregistrer les modifications"
        cancelLabel="Annuler"
        useGradientHeader={true}
      >
        {/* Section Identification */}
        <FormSection title="Identification" description="Informations de base du site">
          <FormGrid columns={2}>
            <PremiumInput
              type="text"
              value={formData.nom_site || ''}
              onChange={(value) => handleChange('nom_site', value)}
              label="Nom du site"
              placeholder="Ex: Parc Central"
              icon={<Building2 className="w-4 h-4" />}
              disabled={loading}
              required
              variant="outlined"
              size="md"
            />

            <PremiumInput
              type="text"
              value={formData.code_site || ''}
              onChange={(value) => handleChange('code_site', value)}
              label="Code du site"
              placeholder="Ex: SITE_001"
              icon={<Hash className="w-4 h-4" />}
              disabled={loading}
              variant="outlined"
              size="md"
            />
          </FormGrid>

          <FormGrid columns={1}>
            <PremiumTextarea
              value={formData.adresse || ''}
              onChange={(value) => handleChange('adresse', value)}
              label="Adresse"
              placeholder="Adresse complète du site"
              icon={<MapPin className="w-4 h-4" />}
              rows={2}
              disabled={loading}
              variant="outlined"
              size="md"
            />
          </FormGrid>

          <FormGrid columns={1}>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <PremiumInput
                  type="number"
                  value={formData.superficie_totale || ''}
                  onChange={(value) =>
                    handleChange('superficie_totale', value ? parseFloat(value) : null)
                  }
                  label="Superficie totale (m²)"
                  placeholder="0.00"
                  icon={<Ruler className="w-4 h-4" />}
                  hint="Surface en mètres carrés"
                  min={0}
                  step={0.01}
                  disabled={loading}
                  variant="outlined"
                  size="md"
                />
              </div>
              <button
                type="button"
                onClick={handleRecalculateArea}
                disabled={loading || !site.geometry}
                className="mb-5 h-[2.875rem] px-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border border-slate-200 hover:shadow-sm"
                title="Recalculer à partir de la géométrie sur la carte"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </FormGrid>
        </FormSection>

        {/* Section Affectations */}
        <FormSection
          title="Affectations"
          description="Client propriétaire et superviseur responsable"
        >
          <FormGrid columns={2}>
            {isLoadingClients ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-3 px-3 bg-slate-50 rounded-lg border border-slate-200">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                Chargement des clients...
              </div>
            ) : (
              <PremiumSelect
                value={formData.structure_client?.toString() || ''}
                onChange={(value) =>
                  handleChange('structure_client', value ? parseInt(value) : null)
                }
                options={clientOptions}
                label="Client propriétaire"
                placeholder="Sélectionner un client"
                icon={<Users className="w-4 h-4" />}
                disabled={loading}
                variant="outlined"
                size="md"
              />
            )}

            {isLoadingSuperviseurs ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-3 px-3 bg-slate-50 rounded-lg border border-slate-200">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                Chargement des superviseurs...
              </div>
            ) : (
              <PremiumSearchableSelect
                value={formData.superviseur?.toString() || ''}
                onChange={(value) =>
                  handleChange('superviseur', value ? parseInt(String(value)) : undefined)
                }
                options={superviseurOptions}
                label="Superviseur affecté"
                placeholder="Sélectionner un superviseur"
                icon={<Users className="w-4 h-4" />}
                disabled={loading}
                variant="outlined"
                size="md"
                searchPlaceholder="Rechercher un superviseur..."
                emptyMessage="Aucun superviseur trouvé"
                footerAction={{
                  label: 'Créer un nouveau superviseur',
                  icon: <UserPlus className="w-4 h-4" />,
                  onClick: () => setShowCreateSuperviseurModal(true),
                }}
              />
            )}
          </FormGrid>
        </FormSection>

        {/* Section Contrat */}
        <FormSection
          title="Période contractuelle"
          description="Dates de début et fin du contrat de maintenance"
        >
          <FormGrid columns={2}>
            <PremiumInput
              type="date"
              value={formatDateForInput(formData.date_debut_contrat)}
              onChange={(value) => handleChange('date_debut_contrat', value || null)}
              label="Date de début"
              icon={<Calendar className="w-4 h-4" />}
              disabled={loading}
              variant="outlined"
              size="md"
            />

            <PremiumInput
              type="date"
              value={formatDateForInput(formData.date_fin_contrat)}
              onChange={(value) => handleChange('date_fin_contrat', value || null)}
              label="Date de fin"
              icon={<Calendar className="w-4 h-4" />}
              disabled={loading}
              variant="outlined"
              size="md"
            />
          </FormGrid>
        </FormSection>

        {/* Section Statut */}
        <FormSection title="Statut" description="Activation ou désactivation du site">
          <div
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
              formData.actif
                ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => !loading && handleChange('actif', !formData.actif)}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  formData.actif ? 'bg-emerald-100' : 'bg-slate-200'
                }`}
              >
                <Power
                  className={`w-6 h-6 ${formData.actif ? 'text-emerald-600' : 'text-slate-400'}`}
                />
              </div>
              <div>
                <p
                  className={`font-semibold ${formData.actif ? 'text-emerald-900' : 'text-slate-700'}`}
                >
                  {formData.actif ? 'Site actif' : 'Site inactif'}
                </p>
                <p className="text-sm text-slate-500">
                  {formData.actif
                    ? 'Le site est visible et disponible pour les opérations'
                    : 'Le site est masqué et non disponible pour les opérations'}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!loading) handleChange('actif', !formData.actif);
              }}
              disabled={loading}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                formData.actif
                  ? 'bg-emerald-500 focus:ring-emerald-500'
                  : 'bg-slate-300 focus:ring-slate-500'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                  formData.actif ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </FormSection>
      </FormModal>

      {/* Modale de création de superviseur */}
      <CreateSuperviseurModal
        isOpen={showCreateSuperviseurModal}
        onClose={() => setShowCreateSuperviseurModal(false)}
        onCreated={handleSuperviseurCreated}
      />
    </>
  );
}
