import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Hash, Ruler, Building2, Users, Loader2 } from 'lucide-react';
import { updateSite, UpdateSiteData, SiteFrontend, calculateGeometryMetrics } from '../../services/api';
import { fetchClients, fetchSuperviseurs } from '../../services/usersApi';
import { Client, SuperviseurList } from '../../types/users';
import { useToast } from '../../contexts/ToastContext';
import FormModal, { FormField, FormInput, FormTextarea } from '../FormModal';

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
            console.log('Initializing form with site data:', site);
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
        console.log(`Field changed: ${field}`, value);
        setFormData(prev => {
            const newState = { ...prev, [field]: value };
            return newState;
        });
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
                showToast(`Superficie recalculée : ${area} m²`, 'success');
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

    const superficieAction = (
        <button
            type="button"
            onClick={handleRecalculateArea}
            disabled={loading}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
            title="Recalculer à partir de la géométrie sur la carte"
        >
            <Ruler className="w-3 h-3" />
            Recalculer
        </button>
    );

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title="Modifier le site"
            subtitle={site.name}
            icon={<Building2 className="w-5 h-5" />}
            size="lg"
            loading={loading}
            error={error}
            submitLabel="Enregistrer"
            cancelLabel="Annuler"
        >
            {/* Client */}
            <FormField label="Client" icon={<Users className="w-4 h-4" />}>
                {isLoadingClients ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement des clients...
                    </div>
                ) : (
                    <select
                        value={formData.client || ''}
                        onChange={(e) => handleChange('client', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
                        disabled={loading}
                    >
                        <option value="">-- Aucun client --</option>
                        {clients.map((client) => (
                            <option key={client.utilisateur} value={client.utilisateur}>
                                {client.nomStructure} ({client.nom} {client.prenom})
                            </option>
                        ))}
                    </select>
                )}
            </FormField>

            {/* Superviseur affecté */}
            <FormField label="Superviseur affecté" icon={<Users className="w-4 h-4" />}>
                {isLoadingSuperviseurs ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement des superviseurs...
                    </div>
                ) : (
                    <select
                        value={formData.superviseur || ''}
                        onChange={(e) => handleChange('superviseur', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
                        disabled={loading}
                    >
                        <option value="">-- Aucun superviseur --</option>
                        {superviseurs.map((superviseur) => (
                            <option key={superviseur.utilisateur} value={superviseur.utilisateur}>
                                {superviseur.fullName}
                            </option>
                        ))}
                    </select>
                )}
            </FormField>

            {/* Nom du site */}
            <FormField label="Nom du site" required icon={<Building2 className="w-4 h-4" />}>
                <FormInput
                    type="text"
                    value={formData.nom_site || ''}
                    onChange={(value) => handleChange('nom_site', value)}
                    placeholder="Nom du site"
                    disabled={loading}
                    required
                />
            </FormField>

            {/* Code du site */}
            <FormField label="Code du site" icon={<Hash className="w-4 h-4" />}>
                <FormInput
                    type="text"
                    value={formData.code_site || ''}
                    onChange={(value) => handleChange('code_site', value)}
                    placeholder="Code unique (ex: SITE_001)"
                    disabled={loading}
                />
            </FormField>

            {/* Adresse */}
            <FormField label="Adresse" icon={<MapPin className="w-4 h-4" />}>
                <FormTextarea
                    value={formData.adresse || ''}
                    onChange={(value) => handleChange('adresse', value)}
                    placeholder="Adresse du site"
                    rows={2}
                    disabled={loading}
                />
            </FormField>

            {/* Superficie avec bouton Recalculer */}
            <div className="relative">
                <FormField label="Superficie totale (m²)" icon={<Ruler className="w-4 h-4" />}>
                    <div className="flex gap-2">
                        <FormInput
                            type="number"
                            value={formData.superficie_totale || ''}
                            onChange={(value) => handleChange('superficie_totale', value ? parseFloat(value) : null)}
                            placeholder="Surface en m²"
                            min={0}
                            step={0.01}
                            disabled={loading}
                        />
                    </div>
                </FormField>
                <div className="absolute top-0 right-0">
                    {superficieAction}
                </div>
            </div>

            {/* Dates de contrat */}
            <div className="grid grid-cols-2 gap-4">
                <FormField label="Début contrat" icon={<Calendar className="w-4 h-4" />}>
                    <FormInput
                        type="date"
                        value={formatDateForInput(formData.date_debut_contrat)}
                        onChange={(value) => {
                            console.log('Date debut changed:', value);
                            handleChange('date_debut_contrat', value || null);
                        }}
                        disabled={loading}
                    />
                </FormField>

                <FormField label="Fin contrat" icon={<Calendar className="w-4 h-4" />}>
                    <FormInput
                        type="date"
                        value={formatDateForInput(formData.date_fin_contrat)}
                        onChange={(value) => {
                            console.log('Date fin changed:', value);
                            handleChange('date_fin_contrat', value || null);
                        }}
                        disabled={loading}
                    />
                </FormField>
            </div>

            {/* Actif toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Site actif</label>
                    <p className="text-xs text-gray-500">
                        Les sites inactifs ne sont pas affichés par défaut
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => handleChange('actif', !formData.actif)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
                    style={{ backgroundColor: formData.actif ? '#10b981' : '#d1d5db' }}
                    disabled={loading}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.actif ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
        </FormModal>
    );
}
