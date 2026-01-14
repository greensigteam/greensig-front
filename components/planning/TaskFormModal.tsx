import { useState, useEffect, useMemo, useRef, type FC, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
    Clock, X, Search, ChevronDown, Timer, RefreshCw, Gauge, ExternalLink, Calculator, TreePine, AlertTriangle, MapPin, Ban, MessageSquare, ClipboardList, Users
} from 'lucide-react';

// ============================================================================
// HELPER: Format date for datetime-local input (respects local timezone)
// ============================================================================
const formatDateTimeLocal = (date: Date): string => {
    return format(date, "yyyy-MM-dd'T'HH:mm");
};

const formatDateLocal = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
};
import { planningService } from '../../services/planningService';
import { fetchInventory, type InventoryResponse } from '../../services/api';
import {
    Tache, TacheCreate, TypeTache,
    PRIORITE_LABELS,
    PrioriteTache,
    RatioProductivite,
    DistributionChargeData
} from '../../types/planning';
import { EquipeList } from '../../types/users';
import FormModal from '../FormModal';
import { PremiumInput, PremiumSelect, PremiumTextarea, PremiumSearchableSelect, PremiumMultiSelect } from '../modals/PremiumFormComponents';
import { DistributionChargeEditor } from './DistributionChargeEditor';


// ============================================================================
// CREATE/EDIT TASK MODAL
// ============================================================================

// Type for inventory object in selector
export interface InventoryObjectOption {
    id: number;
    type: string;
    nom: string;
    site: string;
    soussite?: string;
    superficie?: number;
    etat?: string;
    famille?: string;
}

interface TaskFormModalProps {
    tache?: Tache;
    initialValues?: Partial<TacheCreate>;
    equipes: EquipeList[];
    typesTaches: TypeTache[];
    preSelectedObjects?: InventoryObjectOption[];
    /** Filtre par site - ne charge que les objets de ce site */
    siteFilter?: { id: number; name: string };
    /** État de chargement pendant la soumission */
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (data: TacheCreate) => void;
    onResetCharge?: (tacheId: number) => Promise<void>;
}

const TaskFormModal: FC<TaskFormModalProps> = ({ tache, initialValues, equipes, typesTaches, preSelectedObjects, siteFilter, isSubmitting = false, onClose, onSubmit, onResetCharge }) => {
    // Initialize equipes from M2M or legacy single equipe
    const initialEquipesIds = (): number[] => {
        if (tache?.equipes_detail && tache.equipes_detail.length > 0) {
            return tache.equipes_detail.map(e => e.id);
        }
        if (tache?.equipe_detail?.id) {
            return [tache.equipe_detail.id];
        }
        if (initialValues?.equipes_ids) {
            return initialValues.equipes_ids;
        }
        if (initialValues?.id_equipe) {
            return [initialValues.id_equipe];
        }
        return [];
    };

    // Default dates: today and today (dates only, no time)
    const getDefaultStartDate = () => {
        return formatDateLocal(new Date());
    };
    const getDefaultEndDate = () => {
        // Par défaut, même jour que le début
        return formatDateLocal(new Date());
    };

    const [formData, setFormData] = useState<TacheCreate>({
        id_client: tache?.client_detail?.utilisateur || initialValues?.id_client || null,
        id_type_tache: tache?.type_tache_detail?.id || initialValues?.id_type_tache || 0,
        equipes_ids: initialEquipesIds(),
        date_debut_planifiee: tache?.date_debut_planifiee ? formatDateLocal(new Date(tache.date_debut_planifiee)) : (initialValues?.date_debut_planifiee || getDefaultStartDate()),
        date_fin_planifiee: tache?.date_fin_planifiee ? formatDateLocal(new Date(tache.date_fin_planifiee)) : (initialValues?.date_fin_planifiee || getDefaultEndDate()),
        priorite: tache?.priorite || initialValues?.priorite || 3,
        commentaires: tache?.commentaires || initialValues?.commentaires || '',
        reclamation: tache?.reclamation || initialValues?.reclamation || null,
        objets: tache?.objets_detail?.map(o => o.id) || initialValues?.objets || preSelectedObjects?.map(o => o.id) || [],
        charge_estimee_heures: tache?.charge_estimee_heures || null
    });

    const [chargeManuelle, setChargeManuelle] = useState(tache?.charge_manuelle || false);
    const [isResettingCharge, setIsResettingCharge] = useState(false);

    // ✅ Heures pour tâches d'un seul jour
    const [startTime, setStartTime] = useState<string>(() => {
        // Si la tâche existe et a une distribution, utiliser ses heures
        if (tache?.distributions_charge && tache.distributions_charge.length > 0) {
            const firstDist = tache.distributions_charge[0];
            return firstDist.heure_debut ? firstDist.heure_debut.substring(0, 5) : '08:00';
        }
        return '08:00';
    });
    const [endTime, setEndTime] = useState<string>(() => {
        if (tache?.distributions_charge && tache.distributions_charge.length > 0) {
            const firstDist = tache.distributions_charge[0];
            return firstDist.heure_fin ? firstDist.heure_fin.substring(0, 5) : '17:00';
        }
        return '17:00';
    });

    // ✅ NOUVEAU: Distributions de charge pour tâches multi-jours
    const [distributionsCharge, setDistributionsCharge] = useState<DistributionChargeData[]>(
        tache?.distributions_charge?.map(d => ({
            id: d.id, // ✅ CRITIQUE: Préserver l'ID pour les updates
            date: d.date,
            heure_debut: d.heure_debut ?? undefined, // normalize null -> undefined
            heure_fin: d.heure_fin ?? undefined,     // normalize null -> undefined
            commentaire: d.commentaire,
            status: d.status, // ✅ NOUVEAU: Préserver le statut
            reference: d.reference // ✅ NOUVEAU: Préserver la référence
        })) || []
    );

    // State for ratios and charge preview
    const [ratios, setRatios] = useState<RatioProductivite[]>([]);
    const [loadingRatios, setLoadingRatios] = useState(false);

    // State for object selector
    const [selectedObjects, setSelectedObjects] = useState<InventoryObjectOption[]>(
        preSelectedObjects ||
        tache?.objets_detail?.map(o => ({
            id: o.id,
            type: o.nom_type || '',
            nom: o.display || `Objet #${o.id}`,
            site: o.site_nom || '',
            soussite: o.sous_site_nom
        })) ||
        []
    );
    const [showObjectSelector, setShowObjectSelector] = useState(false);
    const [objectSearchQuery, setObjectSearchQuery] = useState('');
    const [availableObjects, setAvailableObjects] = useState<InventoryObjectOption[]>([]);
    const [loadingObjects, setLoadingObjects] = useState(false);

    // State for filtered task types based on selected objects
    const [filteredTypesTaches, setFilteredTypesTaches] = useState<TypeTache[]>(typesTaches);
    const [loadingFilteredTypes, setLoadingFilteredTypes] = useState(false);
    const [incompatibleObjectsError, setIncompatibleObjectsError] = useState<string | null>(null);

    // Refs for datetime inputs (auto-close pickers)
    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    // Site lock: when objects are selected or siteFilter is set, only allow objects from the same site
    const lockedSite = useMemo(() => {
        // Priority: siteFilter > selectedObjects
        if (siteFilter) {
            return { id: siteFilter.id, name: siteFilter.name };
        }
        if (selectedObjects.length > 0) {
            // Find site ID from available objects
            const firstObj = availableObjects.find(o => o.site === selectedObjects[0]?.site);
            return { id: (firstObj as any)?.siteId || null, name: selectedObjects[0]?.site };
        }
        return null;
    }, [selectedObjects, siteFilter, availableObjects]);

    // Filter equipes by site when a site is locked
    // ✅ NOUVEAU : Prend en compte le système multi-sites (principal + secondaires + legacy)
    const filteredEquipes = useMemo(() => {
        if (!lockedSite) {
            return equipes;
        }
        // Filter by site name - check site principal, sites secondaires, OR legacy site
        const filtered = equipes.filter(e => {
            // Check site principal
            if (e.sitePrincipalNom === lockedSite.name) return true;

            // Check sites secondaires
            if (e.sitesSecondairesNoms && e.sitesSecondairesNoms.includes(lockedSite.name)) return true;

            // Legacy fallback
            if (e.siteNom === lockedSite.name) return true;

            return false;
        });
        return filtered;
    }, [equipes, lockedSite]);

    // Validation state
    const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Validate dates constraints
    useEffect(() => {
        const warnings: string[] = [];

        if (formData.date_debut_planifiee) {
            const start = new Date(formData.date_debut_planifiee);

            // Warning 1 : Date de début dans le passé
            // Comparaison basée uniquement sur les dates (année, mois, jour) sans prendre en compte l'heure
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const startDate = new Date(start);
            startDate.setHours(0, 0, 0, 0);

            if (startDate.getTime() < today.getTime()) {
                warnings.push("La date de début est dans le passé.");
            }

            if (formData.date_fin_planifiee) {
                const end = new Date(formData.date_fin_planifiee);
                if (end.getDate() < start.getDate()) {
                    warnings.push("La date de fin doit être postérieure à la date de début.");
                }
            }
        }

        setValidationWarnings(warnings);
    }, [formData.date_debut_planifiee, formData.date_fin_planifiee]);

    // ❌ SUPPRIMÉ: Auto-activation récurrence multi-jours
    // Remplacé par système de distribution de charge (DistributionChargeEditor)
    // Les tâches multi-jours utilisent maintenant distributions_charge au lieu de récurrence

    // Calculate estimated charge preview based on selected objects and ratios
    // ⚠️ MUST be declared BEFORE the useEffect that uses it (to avoid "Cannot access before initialization")
    const chargePreview = useMemo(() => {
        if (!formData.id_type_tache || selectedObjects.length === 0 || ratios.length === 0) {
            return null;
        }

        // Group objects by type and calculate total superficie if surfacic
        const objectsByType = selectedObjects.reduce((acc, obj) => {
            if (!acc[obj.type]) {
                acc[obj.type] = { count: 0, superficie: 0, objects: [] };
            }
            acc[obj.type].count += 1;
            acc[obj.type].superficie += obj.superficie || 0; // Accumulate superficie
            acc[obj.type].objects.push(obj);
            return acc;
        }, {} as Record<string, { count: number; superficie: number; objects: InventoryObjectOption[] }>);

        let totalHeures = 0;
        const details: { type: string; count: number; superficie?: number; ratio: RatioProductivite | null; heures: number }[] = [];

        for (const [type, data] of Object.entries(objectsByType)) {
            // Find matching ratio for this task type and object type
            const ratio = ratios.find(r =>
                r.id_type_tache === formData.id_type_tache &&
                r.type_objet.toLowerCase() === type.toLowerCase()
            );

            if (ratio) {
                let heures = 0;

                // ✅ Calculate based on unite_mesure
                if (ratio.unite_mesure === 'm2' && data.superficie > 0) {
                    // Surfacic objects: hours = superficie / ratio
                    heures = data.superficie / ratio.ratio;
                } else if (ratio.unite_mesure === 'ml') {
                    // Linear objects: would need longueur (not implemented yet)
                    // For now, fallback to count
                    heures = data.count / ratio.ratio;
                } else {
                    // 'unite' measure: hours = count / ratio
                    heures = data.count / ratio.ratio;
                }

                totalHeures += heures;
                details.push({
                    type,
                    count: data.count,
                    superficie: data.superficie > 0 ? data.superficie : undefined,
                    ratio,
                    heures
                });
            } else {
                details.push({ type, count: data.count, ratio: null, heures: 0 });
            }
        }

        return {
            totalHeures: Math.round(totalHeures * 100) / 100,
            details,
            hasUnconfiguredTypes: details.some(d => d.ratio === null)
        };
    }, [formData.id_type_tache, selectedObjects, ratios]);

    // ❌ SUPPRIMÉ: Auto-activation récurrence si charge > 10h
    // Remplacé par système de distribution de charge qui permet contrôle manuel précis
    // Les tâches avec charge élevée utilisent maintenant l'éditeur de distribution

    // Fetch ratios on mount for charge preview
    useEffect(() => {
        setLoadingRatios(true);
        planningService.getRatios({ actif: true })
            .then(setRatios)
            .catch(err => console.error('Erreur chargement ratios:', err))
            .finally(() => setLoadingRatios(false));
    }, []);

    // ✅ NOUVEAU: Auto-update task dates when distributions change
    // If distributions extend beyond the current date range, or are smaller, adjust the range
    useEffect(() => {
        if (distributionsCharge.length > 0) {
            const dates = distributionsCharge.map(d => d.date).filter(Boolean).sort();
            if (dates.length === 0) return;

            const minDate = dates[0]!;
            const maxDate = dates[dates.length - 1]!;

            // Update form dates to match exactly the distribution range (shrink or expand)
            if (formData.date_debut_planifiee !== minDate || formData.date_fin_planifiee !== maxDate) {
                setFormData(prev => ({
                    ...prev,
                    date_debut_planifiee: minDate,
                    date_fin_planifiee: maxDate
                }));
            }
        }
    }, [distributionsCharge, formData.date_debut_planifiee, formData.date_fin_planifiee]);

    // Filter task types based on selected objects
    useEffect(() => {
        // If no objects selected, show all task types
        if (selectedObjects.length === 0) {
            setFilteredTypesTaches(typesTaches);
            setIncompatibleObjectsError(null);
            return;
        }

        // Get unique object types from selected objects
        const uniqueTypes = [...new Set(selectedObjects.map(obj => obj.type).filter(Boolean))];

        setLoadingFilteredTypes(true);
        setIncompatibleObjectsError(null);

        planningService.getApplicableTypesTaches(uniqueTypes)
            .then(result => {
                const types = result?.types_taches || [];
                setFilteredTypesTaches(types);

                // If no applicable task types, show error
                if (types.length === 0) {
                    const typesList = uniqueTypes.join(', ');
                    setIncompatibleObjectsError(
                        `Aucun type de tâche n'est applicable aux types d'objets sélectionnés (${typesList}). ` +
                        `Veuillez sélectionner des objets compatibles ou configurer les ratios de productivité.`
                    );
                }

                // If current selected task type is not in the filtered list, reset it
                if (formData.id_type_tache && !result.types_taches.find(t => t.id === formData.id_type_tache)) {
                    setFormData(prev => ({ ...prev, id_type_tache: 0 }));
                }
            })
            .catch(err => {
                console.error('Erreur chargement types applicables:', err);
                // Fallback to all types on error
                setFilteredTypesTaches(typesTaches);
            })
            .finally(() => setLoadingFilteredTypes(false));
    }, [selectedObjects, typesTaches]);

    // Fetch inventory objects when siteFilter is set (on mount) - for reclamation context
    useEffect(() => {
        if (siteFilter) {
            // ✅ Toujours recharger les objets quand siteFilter change, même si availableObjects n'est pas vide
            setLoadingObjects(true);
            fetchInventory({ page_size: 200, site: siteFilter.id })
                .then((response: InventoryResponse) => {
                    const objects = response.results.map(item => {
                        const objectId = item.id ?? item.properties?.id;
                        return {
                            id: objectId,
                            type: item.properties.object_type,
                            nom: item.properties.nom || item.properties.famille || `${item.properties.object_type} #${objectId}`,
                            site: item.properties.site_nom,
                            soussite: item.properties.sous_site_nom,
                            superficie: item.properties.superficie_calculee, // ✅ Extraire la superficie
                            etat: item.properties.etat, // ✅ Extraire l'état
                            famille: item.properties.famille // ✅ Extraire la famille
                        };
                    });

                    setAvailableObjects(objects);
                    // Ouvrir automatiquement le sélecteur d'objets
                    setShowObjectSelector(true);
                })
                .catch(err => console.error('Erreur chargement objets:', err))
                .finally(() => setLoadingObjects(false));
        }
    }, [siteFilter]);

    // Fetch inventory objects when selector is opened manually (without siteFilter)
    useEffect(() => {
        if (showObjectSelector && availableObjects.length === 0 && !siteFilter) {
            setLoadingObjects(true);
            fetchInventory({ page_size: 200 })
                .then((response: InventoryResponse) => {
                    const objects = response.results.map(item => {
                        const objectId = item.id ?? item.properties?.id;
                        return {
                            id: objectId,
                            type: item.properties.object_type,
                            nom: item.properties.nom || item.properties.famille || `${item.properties.object_type} #${objectId}`,
                            site: item.properties.site_nom,
                            soussite: item.properties.sous_site_nom,
                            superficie: item.properties.superficie_calculee, // ✅ Extraire la superficie
                            etat: item.properties.etat, // ✅ Extraire l'état
                            famille: item.properties.famille // ✅ Extraire la famille
                        };
                    });

                    setAvailableObjects(objects);
                })
                .catch(err => console.error('Erreur chargement objets:', err))
                .finally(() => setLoadingObjects(false));
        }
    }, [showObjectSelector, siteFilter]);

    // Sync selectedObjects with formData.objets
    useEffect(() => {
        setFormData(prev => ({ ...prev, objets: selectedObjects.map(o => o.id) }));
    }, [selectedObjects]);

    // Filter available objects by search query AND site lock
    const filteredObjects = useMemo(() => {
        let filtered = availableObjects;

        // If a site is locked (objects already selected), filter by that site
        if (lockedSite) {
            filtered = filtered.filter(o => o.site === lockedSite.name);
        }

        // Then apply search query filter
        if (objectSearchQuery.trim()) {
            const q = objectSearchQuery.toLowerCase();
            filtered = filtered.filter(o =>
                o.nom.toLowerCase().includes(q) ||
                o.type.toLowerCase().includes(q) ||
                o.site.toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [availableObjects, objectSearchQuery, lockedSite]);

    // ❌ SUPPRIMÉ: Limitation "même jour calendaire" (RÈGLE D'OR)
    // Les tâches peuvent maintenant s'étendre sur plusieurs jours via distributions_charge
    // La date de fin n'est plus automatiquement limitée à 17:00 du jour de début

    const toggleObjectSelection = (obj: InventoryObjectOption) => {
        setSelectedObjects(prev => {
            const exists = prev.find(o => o.id === obj.id);
            if (exists) {
                return prev.filter(o => o.id !== obj.id);
            } else {
                return [...prev, obj];
            }
        });
    };

    const removeObject = (id: number) => {
        setSelectedObjects(prev => prev.filter(o => o.id !== id));
    };

    // Synchroniser le formulaire quand la tâche change (édition)
    useEffect(() => {
        if (tache) {
            // Initialize teams
            const equipesIds = (): number[] => {
                if (tache.equipes_detail && tache.equipes_detail.length > 0) {
                    return tache.equipes_detail.map(e => e.id);
                }
                if (tache.equipe_detail?.id) {
                    return [tache.equipe_detail.id];
                }
                return [];
            };

            // Initialize selected objects
            // FIX: Map correctly using updated serializer fields
            const newSelectedObjects = tache.objets_detail?.map(o => ({
                id: o.id,
                type: o.nom_type || '', // Now available from backend
                nom: o.display || `Objet #${o.id}`, // Now available from backend
                site: o.site_nom || '',
                soussite: o.sous_site_nom,
                superficie: o.superficie_calculee, // ✅ Extraire la superficie
                etat: o.etat, // ✅ Extraire l'état
                famille: o.famille // ✅ Extraire la famille
            })) || [];

            setSelectedObjects(newSelectedObjects);

            setFormData({
                id_client: tache.client_detail ? tache.client_detail.utilisateur : null,
                id_type_tache: tache.type_tache_detail ? tache.type_tache_detail.id : 0,
                equipes_ids: equipesIds(),
                date_debut_planifiee: formatDateLocal(new Date(tache.date_debut_planifiee)),
                date_fin_planifiee: formatDateLocal(new Date(tache.date_fin_planifiee)),
                priorite: tache.priorite,
                commentaires: tache.commentaires || '',
                charge_estimee_heures: tache.charge_estimee_heures,
                reclamation: tache.reclamation || null,
                objets: newSelectedObjects.map(o => o.id) // Ensure sync immediately
            });

            setChargeManuelle(tache.charge_manuelle);
        }
    }, [tache]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (!formData.id_type_tache || formData.id_type_tache === 0) {
            setValidationError('Veuillez sélectionner un type de tâche');
            return;
        }

        // ✅ Validation: Pour les tâches multi-jours, vérifier qu'au moins un jour est sélectionné
        const isMultiDay = formData.date_debut_planifiee !== formData.date_fin_planifiee;
        console.log('🔍 DEBUG - isMultiDay:', isMultiDay);
        console.log('🔍 DEBUG - distributionsCharge:', distributionsCharge);
        console.log('🔍 DEBUG - distributionsCharge.length:', distributionsCharge.length);

        if (isMultiDay && distributionsCharge.length === 0) {
            setValidationError('Pour une tâche multi-jours, veuillez sélectionner les jours de travail (via "Horaires de la journée" ou l\'éditeur de distribution).');
            return;
        }

        // ❌ SUPPRIMÉ: Validation multi-jours qui forçait la récurrence
        // Les tâches multi-jours sont maintenant gérées nativement via distributions_charge

        // Préparer les données pour soumission
        let distributionsToSend = distributionsCharge;

        // ✅ Si c'est une tâche d'un seul jour et pas de distributions multi-jours, créer une distribution avec les heures
        if (formData.date_debut_planifiee === formData.date_fin_planifiee && distributionsCharge.length === 0) {
            if (startTime >= endTime) {
                setValidationError("L'heure de fin doit être postérieure à l'heure de début.");
                return;
            }
            distributionsToSend = [{
                date: formData.date_debut_planifiee,
                heure_debut: startTime,
                heure_fin: endTime,
                commentaire: ''
            }];
        }

        console.log('🔍 DEBUG - distributionsToSend:', distributionsToSend);
        console.log('🔍 DEBUG - distributionsToSend.length:', distributionsToSend.length);

        const payload = {
            ...formData,
            // ✅ Distributions de charge (multi-jours ou jour unique avec heures)
            ...(distributionsToSend.length > 0 && {
                distributions_charge_data: distributionsToSend
            })
        };

        console.log('📤 Submitting task data:', payload);
        console.log('📤 Submitting distributions_charge_data:', payload.distributions_charge_data);
        onSubmit(payload);
    };

    return (
        <FormModal
            isOpen={true}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={tache ? 'Modifier la tâche' : 'Nouvelle tâche'}
            icon={<Clock className="w-5 h-5 text-emerald-600" />}
            size="2xl"
            loading={isSubmitting}
            error={validationError}
            submitLabel={tache ? 'Modifier' : 'Créer'}
            cancelLabel="Annuler"
            submitDisabled={!!incompatibleObjectsError || filteredTypesTaches.length === 0}
        >
            <div className="space-y-4">


                {/* Validation Warnings */}
                {validationWarnings.length > 0 && (
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-orange-800">
                                    Attention
                                </h3>
                                <div className="mt-1 text-sm text-orange-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        {validationWarnings.map((warning, index) => (
                                            <li key={index}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Erreur d'incompatibilité des objets */}
                {incompatibleObjectsError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <Ban className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">
                                    Objets incompatibles
                                </h3>
                                <div className="mt-1 text-sm text-red-700">
                                    {incompatibleObjectsError}
                                </div>
                                <div className="mt-2">
                                    <Link
                                        to="/parametres?tab=ratios"
                                        target="_blank"
                                        className="text-sm text-red-600 hover:text-red-800 underline flex items-center gap-1"
                                    >
                                        <Gauge className="w-3 h-3" />
                                        Configurer les ratios de productivité
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Type de tâche avec création dynamique */}
                <PremiumSearchableSelect
                    value={formData.id_type_tache || null}
                    onChange={(id) => setFormData({ ...formData, id_type_tache: Number(id) })}
                    options={filteredTypesTaches.map(t => ({
                        value: t.id,
                        label: t.nom_tache
                    }))}
                    label="Type de tâche"
                    placeholder="Sélectionner un type..."
                    icon={<ClipboardList className="w-4 h-4" />}
                    required
                    variant="outlined"
                    size="md"
                    searchPlaceholder="Rechercher un type..."
                    hint={
                        loadingFilteredTypes
                            ? 'Chargement...'
                            : selectedObjects.length > 0 && filteredTypesTaches.length > 0 && filteredTypesTaches.length < typesTaches.length
                                ? `${filteredTypesTaches.length} types applicables sur ${typesTaches.length}`
                                : selectedObjects.length > 0 && filteredTypesTaches.length > 0 && filteredTypesTaches.length < typesTaches.length
                                    ? 'Seuls les types de tâches applicables aux objets sélectionnés sont affichés.'
                                    : undefined
                    }
                />

                {/* Équipes avec sélection multiple (US-PLAN-013) */}
                <PremiumMultiSelect
                    values={formData.equipes_ids || []}
                    onChange={(ids) => setFormData({ ...formData, equipes_ids: ids.map(id => Number(id)) })}
                    options={filteredEquipes.map(e => ({
                        value: e.id,
                        label: e.nomEquipe
                    }))}
                    label="Équipes"
                    placeholder="Sélectionner des équipes..."
                    icon={<Users className="w-4 h-4" />}
                    variant="outlined"
                    size="md"
                    searchPlaceholder="Rechercher une équipe..."
                    hint={
                        lockedSite && filteredEquipes.length < equipes.length
                            ? `${filteredEquipes.length} équipe${filteredEquipes.length > 1 ? 's' : ''} sur le site "${lockedSite.name}"`
                            : lockedSite && filteredEquipes.length === 0
                                ? `Aucune équipe affectée au site "${lockedSite.name}"`
                                : undefined
                    }
                    error={lockedSite && filteredEquipes.length === 0 ? "Vous pouvez créer la tâche sans équipe ou affecter une équipe à ce site depuis la page Équipes." : undefined}
                />

                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                        <PremiumInput
                            type="date"
                            value={formData.date_debut_planifiee}
                            onChange={(value) => setFormData({ ...formData, date_debut_planifiee: value })}
                            label="Date début"
                            icon={<Clock className="w-4 h-4" />}
                            required
                            variant="outlined"
                            size="md"
                        />
                        <PremiumInput
                            type="date"
                            value={formData.date_fin_planifiee}
                            onChange={(value) => setFormData({ ...formData, date_fin_planifiee: value })}
                            label="Date fin"
                            icon={<Clock className="w-4 h-4" />}
                            required
                            variant="outlined"
                            size="md"
                        />
                    </div>
                </div>

                {/* ✅ NOUVEAU: Champs d'heures pour tâches d'un seul jour */}
                {(() => {
                    if (!formData.date_debut_planifiee || !formData.date_fin_planifiee) return null;

                    const startDate = new Date(formData.date_debut_planifiee);
                    const endDate = new Date(formData.date_fin_planifiee);
                    const startDay = format(startDate, 'yyyy-MM-dd');
                    const endDay = format(endDate, 'yyyy-MM-dd');

                    // Afficher les champs d'heures seulement pour les tâches d'un seul jour
                    if (startDay !== endDay) return null;

                    return (
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-emerald-600" />
                                Horaires de la journée
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <PremiumInput
                                    type="time"
                                    value={startTime}
                                    onChange={setStartTime}
                                    label="Heure de début"
                                    icon={<Clock className="w-4 h-4" />}
                                    variant="outlined"
                                    size="md"
                                />
                                <PremiumInput
                                    type="time"
                                    value={endTime}
                                    onChange={setEndTime}
                                    label="Heure de fin"
                                    icon={<Clock className="w-4 h-4" />}
                                    variant="outlined"
                                    size="md"
                                />
                            </div>
                            {(() => {
                                const [startHour = 0, startMin = 0] = startTime.split(':').map(Number);
                                const [endHour = 0, endMin = 0] = endTime.split(':').map(Number);
                                const startMinutes = startHour * 60 + startMin;
                                const endMinutes = endHour * 60 + endMin;
                                const duration = (endMinutes - startMinutes) / 60;

                                if (duration <= 0) {
                                    return (
                                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            L'heure de fin doit être après l'heure de début
                                        </p>
                                    );
                                }

                                return (
                                    <p className="text-xs text-slate-500 mt-2">
                                        Durée: <strong>{duration.toFixed(2)}h</strong>
                                    </p>
                                );
                            })()}
                        </div>
                    );
                })()}

                {/* ✅ NOUVEAU: Éditeur de distribution de charge pour tâches multi-jours */}
                {(() => {
                    // Vérifier si la tâche s'étend sur plusieurs jours
                    if (!formData.date_debut_planifiee || !formData.date_fin_planifiee) return null;

                    const startDate = new Date(formData.date_debut_planifiee);
                    const endDate = new Date(formData.date_fin_planifiee);

                    // Vérifier que les dates sont sur des jours calendaires différents
                    const startDay = format(startDate, 'yyyy-MM-dd');
                    const endDay = format(endDate, 'yyyy-MM-dd');

                    if (startDay === endDay) return null; // Same day task

                    // Multi-day task detected - show editor
                    return (
                        <div className="border-t pt-4">
                            <DistributionChargeEditor
                                dateDebut={startDate}
                                dateFin={endDate}
                                distributions={distributionsCharge}
                                onChange={setDistributionsCharge}
                            />
                        </div>
                    );
                })()}

                <PremiumSelect
                    value={(formData.priorite || 3).toString()}
                    onChange={(value) => setFormData({ ...formData, priorite: Number(value) as PrioriteTache })}
                    options={Object.entries(PRIORITE_LABELS).map(([value, label]) => ({
                        value: value,
                        label: label
                    }))}
                    label="Priorité"
                    icon={<Gauge className="w-4 h-4" />}
                    variant="outlined"
                    size="md"
                />

                <PremiumTextarea
                    value={formData.commentaires}
                    onChange={(value) => setFormData({ ...formData, commentaires: value })}
                    label="Commentaires"
                    placeholder="Détails de la tâche..."
                    rows={3}
                    variant="outlined"
                    size="md"
                />

                {/* Charge estimée (uniquement en mode édition) */}
                {tache && (
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Timer className="w-4 h-4" />
                                Charge estimée
                                {chargeManuelle && (
                                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                                        Manuelle
                                    </span>
                                )}
                            </label>
                            {chargeManuelle && onResetCharge && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setIsResettingCharge(true);
                                        try {
                                            await onResetCharge(tache.id);
                                            setChargeManuelle(false);
                                        } finally {
                                            setIsResettingCharge(false);
                                        }
                                    }}
                                    disabled={isResettingCharge}
                                    className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isResettingCharge ? 'animate-spin' : ''}`} />
                                    Recalculer auto
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <PremiumInput
                                    type="number"
                                    value={formData.charge_estimee_heures?.toString() ?? ''}
                                    onChange={(value) => {
                                        const val = value ? parseFloat(value) : null;
                                        setFormData({ ...formData, charge_estimee_heures: val });
                                        if (val !== null) setChargeManuelle(true);
                                    }}
                                    placeholder="Auto"
                                    icon={<Timer className="w-4 h-4" />}
                                    hint="heures"
                                    variant="outlined"
                                    size="md"
                                />
                            </div>
                            {!chargeManuelle && tache.charge_estimee_heures !== null && (
                                <span className="text-sm text-slate-500 whitespace-nowrap">
                                    Calculé: {tache.charge_estimee_heures}h
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {chargeManuelle
                                ? 'Valeur saisie manuellement. Cliquez sur "Recalculer auto" pour revenir au calcul automatique.'
                                : (
                                    <>
                                        Calculée automatiquement selon les objets liés et les{' '}
                                        <Link to="/parametres?tab=ratios" target="_blank" className="text-emerald-600 hover:underline">
                                            ratios de productivité
                                        </Link>.
                                    </>
                                )}
                        </p>
                    </div>
                )}

                {/* Sélecteur d'objets de l'inventaire */}
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <TreePine className="w-4 h-4" />
                            Objets concernés
                            {selectedObjects.length > 0 && (
                                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
                                    {selectedObjects.length}
                                </span>
                            )}
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowObjectSelector(!showObjectSelector)}
                            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                        >
                            {showObjectSelector ? 'Masquer' : 'Sélectionner'}
                            <ChevronDown className={`w-4 h-4 transition-transform ${showObjectSelector ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Site lock indicator */}
                    {lockedSite && (
                        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
                            <div className="flex items-center gap-2 text-sm text-blue-700">
                                <MapPin className="w-4 h-4" />
                                <span>Site : <strong>{lockedSite.name}</strong></span>
                                <span className="text-blue-500 text-xs">(seuls les objets et équipes de ce site sont affichés)</span>
                            </div>
                            {/* Ne pas afficher le bouton "Changer de site" si le site est verrouillé par siteFilter */}
                            {!siteFilter && selectedObjects.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedObjects([])}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" />
                                    Changer de site
                                </button>
                            )}
                        </div>
                    )}

                    {/* Selected objects chips */}
                    {selectedObjects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {selectedObjects.map((obj) => (
                                <span
                                    key={obj.id}
                                    className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full border border-emerald-200"
                                >
                                    <span className="font-medium">{obj.nom}</span>
                                    {obj.superficie && (
                                        <span className="text-emerald-600 font-semibold">
                                            • {obj.superficie.toFixed(0)}m²
                                        </span>
                                    )}
                                    <span className="text-emerald-500">#{obj.id}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeObject(obj.id)}
                                        className="ml-1 hover:text-red-500"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Object selector dropdown */}
                    {showObjectSelector && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={objectSearchQuery}
                                    onChange={(e) => setObjectSearchQuery(e.target.value)}
                                    placeholder="Rechercher par nom, type ou site..."
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {loadingObjects ? (
                                    <div className="text-center py-4 text-slate-500 text-sm">Chargement...</div>
                                ) : filteredObjects.length === 0 ? (
                                    <div className="text-center py-4 text-slate-500 text-sm">
                                        {objectSearchQuery
                                            ? 'Aucun résultat pour cette recherche'
                                            : lockedSite
                                                ? `Aucun autre objet disponible sur le site "${lockedSite.name}"`
                                                : 'Aucun objet disponible'}
                                    </div>
                                ) : (
                                    filteredObjects.slice(0, 50).map((obj) => {
                                        const isSelected = selectedObjects.some(o => o.id === obj.id);
                                        return (
                                            <button
                                                key={obj.id}
                                                type="button"
                                                onClick={() => toggleObjectSelection(obj)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${isSelected
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                    : 'bg-white hover:bg-slate-100 border border-slate-200'
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium truncate">{obj.nom}</span>
                                                        <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                                            {obj.type}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate">
                                                        {obj.site}{obj.soussite && ` → ${obj.soussite}`}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <span className="ml-2 text-emerald-600">✓</span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                                {filteredObjects.length > 50 && (
                                    <div className="text-center py-2 text-xs text-slate-400">
                                        +{filteredObjects.length - 50} autres résultats...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Aperçu de la charge estimée */}
                {!tache && selectedObjects.length > 0 && formData.id_type_tache > 0 && (
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Calculator className="w-4 h-4" />
                                Aperçu de la charge estimée
                            </label>
                            <Link
                                to="/parametres?tab=ratios"
                                target="_blank"
                                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                                <Gauge className="w-3 h-3" />
                                Configurer les ratios
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        {loadingRatios ? (
                            <div className="bg-slate-50 p-3 rounded-lg text-center text-slate-500 text-sm">
                                Chargement des ratios...
                            </div>
                        ) : chargePreview ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                {/* Total */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-blue-800">
                                        Charge estimée totale
                                    </span>
                                    <span className="text-lg font-bold text-blue-700">
                                        {chargePreview.totalHeures > 0 ? `${chargePreview.totalHeures}h` : '—'}
                                    </span>
                                </div>

                                {/* Details by type */}
                                {chargePreview.details.length > 0 && (
                                    <div className="border-t border-blue-200 pt-2 space-y-1">
                                        {chargePreview.details.map((detail, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                <span className="text-blue-700">
                                                    {detail.count}x {detail.type}
                                                    {detail.superficie && (
                                                        <span className="font-semibold text-blue-800">
                                                            {' '}({detail.superficie.toFixed(0)}m²)
                                                        </span>
                                                    )}
                                                </span>
                                                {detail.ratio ? (
                                                    <span className="text-blue-600">
                                                        {detail.ratio.ratio} {detail.ratio.unite_mesure === 'm2' ? 'm²' : detail.ratio.unite_mesure === 'ml' ? 'ml' : 'unités'}/h
                                                        → <strong>{Math.round(detail.heures * 100) / 100}h</strong>
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600 italic">
                                                        Ratio non configuré
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Warning for unconfigured types */}
                                {chargePreview.hasUnconfiguredTypes && (
                                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                                        Certains types d'objets n'ont pas de ratio configuré pour ce type de tâche.
                                        <Link to="/parametres?tab=ratios" target="_blank" className="underline ml-1">
                                            Configurer les ratios
                                        </Link>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-3 rounded-lg text-center text-slate-500 text-sm">
                                {ratios.length === 0 ? (
                                    <span>
                                        Aucun ratio configuré.{' '}
                                        <Link to="/parametres?tab=ratios" target="_blank" className="text-emerald-600 underline">
                                            Configurer les ratios
                                        </Link>
                                    </span>
                                ) : (
                                    'Sélectionnez un type de tâche et des objets pour voir l\'aperçu'
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ❌ SUPPRIMÉ: Checkboxes "Calculer charge auto" et "Répartir multi-jours" */}
                {/* ❌ SUPPRIMÉ: Banner auto-récurrence */}
                {/* La planification multi-jours est maintenant gérée via l'éditeur de distribution */}

            </div>
        </FormModal>
    );
};

export default TaskFormModal;