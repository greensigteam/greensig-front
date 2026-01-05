import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Hash, Ruler, Building2, Users, Loader2, Power, RefreshCw } from 'lucide-react';
import { updateSite, UpdateSiteData, SiteFrontend, calculateGeometryMetrics } from '../../services/api';
import { fetchClients, fetchSuperviseurs } from '../../services/usersApi';
import { Client, SuperviseurList } from '../../types/users';
import { useToast } from '../../contexts/ToastContext';
import FormModal, { FormField, FormInput, FormTextarea, FormSelect, FormSection, FormGrid } from '../FormModal';

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
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);

    // Superviseurs state
    const [superviseurs, setSuperviseurs] = useState<SuperviseurList[]>([]);
    const [isLoadingSuperviseurs, setIsLoadingSuperviseurs] = useState(false);

    const [formData, setFormData] = useState<UpdateSiteData>({
        nom_site: '',
        code_site: '',
        client: undefined,
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
                const response = await fetchClients();
                // Filter only active clients
                const activeClients = (response.results || []).filter(c => c.actif);
                setClients(activeClients);
            } catch (error) {
                console.error('Error loading clients:', error);
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
                console.error('Error loading superviseurs:', error);
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
                client: site.client,
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
        setFormData(prev => ({ ...prev, [field]: value }));
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
                showToast("Impossible de calculer la superficie", 'error');
            }
        } catch (err: any) {
            console.error(err);
            showToast("Erreur lors du calcul", 'error');
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
    const clientOptions = clients.map(client => ({
        value: client.utilisateur.toString(),
        label: `${client.nomStructure} (${client.nom} ${client.prenom})`
    }));

    const superviseurOptions = superviseurs.map(sup => ({
        value: sup.utilisateur.toString(),
        label: sup.fullName
    }));

    return (
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
            <FormSection
                title="Identification"
                description="Informations de base du site"
            >
                <FormGrid columns={2}>
                    <FormField label="Nom du site" required icon={<Building2 className="w-4 h-4" />}>
                        <FormInput
                            type="text"
                            value={formData.nom_site || ''}
                            onChange={(value) => handleChange('nom_site', value)}
                            placeholder="Ex: Parc Central"
                            disabled={loading}
                            required
                        />
                    </FormField>

                    <FormField label="Code du site" icon={<Hash className="w-4 h-4" />}>
                        <FormInput
                            type="text"
                            value={formData.code_site || ''}
                            onChange={(value) => handleChange('code_site', value)}
                            placeholder="Ex: SITE_001"
                            disabled={loading}
                        />
                    </FormField>
                </FormGrid>

                <FormField label="Adresse" icon={<MapPin className="w-4 h-4" />}>
                    <FormTextarea
                        value={formData.adresse || ''}
                        onChange={(value) => handleChange('adresse', value)}
                        placeholder="Adresse complète du site"
                        rows={2}
                        disabled={loading}
                    />
                </FormField>

                <FormField
                    label="Superficie totale"
                    icon={<Ruler className="w-4 h-4" />}
                    hint="Surface en mètres carrés"
                >
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <FormInput
                                type="number"
                                value={formData.superficie_totale || ''}
                                onChange={(value) => handleChange('superficie_totale', value ? parseFloat(value) : null)}
                                placeholder="0.00"
                                min={0}
                                step={0.01}
                                disabled={loading}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleRecalculateArea}
                            disabled={loading || !site.geometry}
                            className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium border border-slate-200"
                            title="Recalculer à partir de la géométrie sur la carte"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Recalculer
                        </button>
                    </div>
                </FormField>
            </FormSection>

            {/* Section Affectations */}
            <FormSection
                title="Affectations"
                description="Client propriétaire et superviseur responsable"
            >
                <FormGrid columns={2}>
                    <FormField label="Client propriétaire" icon={<Users className="w-4 h-4" />}>
                        {isLoadingClients ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500 py-3 px-3 bg-slate-50 rounded-lg border border-slate-200">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                Chargement des clients...
                            </div>
                        ) : (
                            <FormSelect
                                value={formData.client?.toString() || ''}
                                onChange={(value) => handleChange('client', value ? parseInt(value) : undefined)}
                                options={clientOptions}
                                placeholder="Sélectionner un client"
                                disabled={loading}
                            />
                        )}
                    </FormField>

                    <FormField label="Superviseur affecté" icon={<Users className="w-4 h-4" />}>
                        {isLoadingSuperviseurs ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500 py-3 px-3 bg-slate-50 rounded-lg border border-slate-200">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                Chargement des superviseurs...
                            </div>
                        ) : (
                            <FormSelect
                                value={formData.superviseur?.toString() || ''}
                                onChange={(value) => handleChange('superviseur', value ? parseInt(value) : undefined)}
                                options={superviseurOptions}
                                placeholder="Sélectionner un superviseur"
                                disabled={loading}
                            />
                        )}
                    </FormField>
                </FormGrid>
            </FormSection>

            {/* Section Contrat */}
            <FormSection
                title="Période contractuelle"
                description="Dates de début et fin du contrat de maintenance"
            >
                <FormGrid columns={2}>
                    <FormField label="Date de début" icon={<Calendar className="w-4 h-4" />}>
                        <FormInput
                            type="date"
                            value={formatDateForInput(formData.date_debut_contrat)}
                            onChange={(value) => handleChange('date_debut_contrat', value || null)}
                            disabled={loading}
                        />
                    </FormField>

                    <FormField label="Date de fin" icon={<Calendar className="w-4 h-4" />}>
                        <FormInput
                            type="date"
                            value={formatDateForInput(formData.date_fin_contrat)}
                            onChange={(value) => handleChange('date_fin_contrat', value || null)}
                            disabled={loading}
                        />
                    </FormField>
                </FormGrid>
            </FormSection>

            {/* Section Statut */}
            <FormSection
                title="Statut"
                description="Activation ou désactivation du site"
            >
                <div
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        formData.actif
                            ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => !loading && handleChange('actif', !formData.actif)}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                            formData.actif ? 'bg-emerald-100' : 'bg-slate-200'
                        }`}>
                            <Power className={`w-6 h-6 ${formData.actif ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className={`font-semibold ${formData.actif ? 'text-emerald-900' : 'text-slate-700'}`}>
                                {formData.actif ? 'Site actif' : 'Site inactif'}
                            </p>
                            <p className="text-sm text-slate-500">
                                {formData.actif
                                    ? 'Le site est visible et disponible pour les opérations'
                                    : 'Le site est masqué et non disponible pour les opérations'
                                }
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
    );
}
