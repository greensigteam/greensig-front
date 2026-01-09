import { useState, useEffect, useMemo, useRef, type FC, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
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
    RatioProductivite
} from '../../types/planning';
import { EquipeList } from '../../types/users';
import FormModal from '../FormModal';
import { RecurrenceSelector, type RecurrenceParams } from './RecurrenceSelector';
import { PremiumInput, PremiumSelect, PremiumTextarea, PremiumSearchableSelect, PremiumMultiSelect } from '../modals/PremiumFormComponents';


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

    // Default dates: current time (real-time) to end of day or +1h if late
    const getDefaultStartDate = () => {
        return formatDateTimeLocal(new Date());
    };
    const getDefaultEndDate = () => {
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(17, 0, 0, 0);

        // Si on est après 16h, mettre fin à +1h de maintenant
        if (now.getHours() >= 16) {
            const end = new Date(now.getTime() + 60 * 60 * 1000); // +1 heure
            return formatDateTimeLocal(end);
        }
        return formatDateTimeLocal(endOfDay);
    };

    const [formData, setFormData] = useState<TacheCreate>({
        id_client: tache?.client_detail?.utilisateur || initialValues?.id_client || null,
        id_type_tache: tache?.type_tache_detail?.id || initialValues?.id_type_tache || 0,
        equipes_ids: initialEquipesIds(),
        date_debut_planifiee: tache?.date_debut_planifiee ? formatDateTimeLocal(new Date(tache.date_debut_planifiee)) : (initialValues?.date_debut_planifiee || getDefaultStartDate()),
        date_fin_planifiee: tache?.date_fin_planifiee ? formatDateTimeLocal(new Date(tache.date_fin_planifiee)) : (initialValues?.date_fin_planifiee || getDefaultEndDate()),
        priorite: tache?.priorite || initialValues?.priorite || 3,
        commentaires: tache?.commentaires || initialValues?.commentaires || '',
        parametres_recurrence: tache?.parametres_recurrence || null,
        reclamation: tache?.reclamation || initialValues?.reclamation || null,
        objets: tache?.objets_detail?.map(o => o.id) || initialValues?.objets || preSelectedObjects?.map(o => o.id) || [],
        charge_estimee_heures: tache?.charge_estimee_heures || null
    });

    const [chargeManuelle, setChargeManuelle] = useState(tache?.charge_manuelle || false);
    const [isResettingCharge, setIsResettingCharge] = useState(false);
    const [autoRecurrenceActivated, setAutoRecurrenceActivated] = useState(false); // Track if recurrence was auto-activated

    // ✅ PHASE 1: Flags pour calcul auto et répartition multi-jours
    const [calculerChargeAuto, setCalculerChargeAuto] = useState(true); // Default: ON
    const [repartirMultiJours, setRepartirMultiJours] = useState(true); // Default: ON

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
            const now = new Date();

            // Check if start date is in the past (only for new tasks or significantly modified dates)
            // Using a small buffer of 5 minutes to avoid annoying warnings for "just now"
            if (start.getTime() < now.getTime() - 5 * 60 * 1000) {
                warnings.push("La date de début est dans le passé.");
            }

            if (formData.date_fin_planifiee) {
                const end = new Date(formData.date_fin_planifiee);
                if (end.getTime() <= start.getTime()) {
                    warnings.push("La date de fin doit être postérieure à la date de début.");
                }
            }
        }

        setValidationWarnings(warnings);
    }, [formData.date_debut_planifiee, formData.date_fin_planifiee]);

    // Auto-activate recurrence when task spans multiple days
    useEffect(() => {
        // Only for new tasks (not editing) or when manually changing dates
        if (!formData.date_debut_planifiee || !formData.date_fin_planifiee) return;

        const start = new Date(formData.date_debut_planifiee);
        const end = new Date(formData.date_fin_planifiee);

        // Check if dates are on different calendar days
        const startDay = format(start, 'yyyy-MM-dd');
        const endDay = format(end, 'yyyy-MM-dd');

        if (startDay !== endDay && !formData.parametres_recurrence) {
            // Calculate number of days
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

            console.log(`🔄 Auto-activating recurrence: ${diffDays} days (${startDay} to ${endDay})`);

            // Auto-activate DAILY recurrence
            setFormData(prev => ({
                ...prev,
                parametres_recurrence: {
                    frequence: 'daily',
                    interval: 1,
                    nombre_occurrences: diffDays,
                    date_fin: endDay
                },
                // Adjust end date to same day to avoid backend validation error
                date_fin_planifiee: formatDateTimeLocal(new Date(start.getFullYear(), start.getMonth(), start.getDate(), 17, 0, 0))
            }));

            // ✅ Mark that recurrence was auto-activated
            setAutoRecurrenceActivated(true);
        }
    }, [formData.date_debut_planifiee, formData.date_fin_planifiee]); // ⚠️ Removed parametres_recurrence to avoid loop

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

    // ✅ PHASE 2.2: Auto-activate recurrence when charge > 10h (with intelligent calculation based on team work hours)
    useEffect(() => {
        // Skip if recurrence already active, or no charge preview
        if (formData.parametres_recurrence || !chargePreview?.totalHeures) return;

        // ✅ PHASE 1: Skip if user disabled auto-calculation or multi-day splitting
        if (!calculerChargeAuto || !repartirMultiJours) return;

        // Skip if charge is reasonable for one day (≤ 10h)
        if (chargePreview.totalHeures <= 10) return;

        // Skip if no team selected (need team to calculate work hours)
        const equipeId = formData.id_equipe || (formData.equipes_ids && formData.equipes_ids.length > 0 ? formData.equipes_ids[0] : null);
        if (!equipeId) {
            console.log('⚠️ No team selected, skipping intelligent recurrence calculation');
            return;
        }

        // ✅ PHASE 2.2: Call API to calculate recommended occurrences based on real work hours
        const startDate = formData.date_debut_planifiee ? new Date(formData.date_debut_planifiee) : new Date();
        const dateDebut = format(startDate, 'yyyy-MM-dd');

        console.log(`🔄 Calculating intelligent recurrence: ${chargePreview.totalHeures}h for team ${equipeId}`);

        planningService.calculateRecurrenceRecommendee({
            equipe_id: equipeId,
            charge_totale_heures: chargePreview.totalHeures,
            date_debut: dateDebut,
            frequence: 'daily'
        })
            .then(response => {
                const days = response.nombre_occurrences;
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + (days - 1));

                console.log(`✅ Intelligent recurrence calculated: ${days} days (avg ${response.heures_par_jour_moyen}h/day)`);

                // Auto-activate DAILY recurrence
                setFormData(prev => ({
                    ...prev,
                    parametres_recurrence: {
                        frequence: 'daily',
                        interval: 1,
                        nombre_occurrences: days,
                        date_fin: format(endDate, 'yyyy-MM-dd')
                    },
                    // Keep end date within same day to avoid backend validation error
                    date_fin_planifiee: formatDateTimeLocal(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 17, 0, 0))
                }));

                // ✅ Mark that recurrence was auto-activated
                setAutoRecurrenceActivated(true);
            })
            .catch(err => {
                console.error('❌ Error calculating intelligent recurrence, falling back to 10h/day:', err);

                // Fallback to hardcoded 10h/day if API fails
                const days = Math.ceil(chargePreview.totalHeures / 10);
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + (days - 1));

                setFormData(prev => ({
                    ...prev,
                    parametres_recurrence: {
                        frequence: 'daily',
                        interval: 1,
                        nombre_occurrences: days,
                        date_fin: format(endDate, 'yyyy-MM-dd')
                    },
                    date_fin_planifiee: formatDateTimeLocal(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 17, 0, 0))
                }));

                setAutoRecurrenceActivated(true);
            });

    }, [chargePreview?.totalHeures, formData.parametres_recurrence, formData.date_debut_planifiee, formData.id_equipe, formData.equipes_ids, calculerChargeAuto, repartirMultiJours]);

    // Fetch ratios on mount for charge preview
    useEffect(() => {
        setLoadingRatios(true);
        planningService.getRatios({ actif: true })
            .then(setRatios)
            .catch(err => console.error('Erreur chargement ratios:', err))
            .finally(() => setLoadingRatios(false));
    }, []);

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
                            superficie: item.properties.superficie_calculee // ✅ Extraire la superficie
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
                            superficie: item.properties.superficie_calculee // ✅ Extraire la superficie
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

    // Auto-calculate end date based on occurrences
    useEffect(() => {
        const p = formData.parametres_recurrence;
        if (!p || !p.nombre_occurrences || !p.frequence || !formData.date_debut_planifiee) return;

        try {
            const start = new Date(formData.date_debut_planifiee);
            if (isNaN(start.getTime())) return;

            const interval = p.interval || 1;
            const count = p.nombre_occurrences;
            let endDate = new Date(start);

            if (p.frequence === 'daily') {
                endDate = addDays(start, (count - 1) * interval);
            } else if (p.frequence === 'weekly') {
                endDate = addWeeks(start, (count - 1) * interval);
            } else if (p.frequence === 'monthly') {
                endDate = addMonths(start, (count - 1) * interval);
            }

            const formattedDate = formatDateLocal(endDate);

            if (p.date_fin !== formattedDate) {
                setFormData(prev => ({
                    ...prev,
                    parametres_recurrence: {
                        ...prev.parametres_recurrence!,
                        date_fin: formattedDate
                    }
                }));
            }
        } catch (e) {
            console.error("Error calculating recurrence end date", e);
        }
    }, [
        formData.parametres_recurrence?.nombre_occurrences,
        formData.parametres_recurrence?.frequence,
        formData.parametres_recurrence?.interval,
        formData.date_debut_planifiee
    ]);

    // Auto-calculate task end date from estimated charge
    // RÈGLE D'OR: Une tâche ne peut dépasser un jour calendaire
    useEffect(() => {
        // Only if start date is valid
        if (!formData.date_debut_planifiee) return;

        // Skip auto-calculation if recurrence is active (multi-day task)
        if (formData.parametres_recurrence) return;

        let hours = 0;
        // In edit mode, prefer manual charge if set
        if (tache && formData.charge_estimee_heures) {
            hours = formData.charge_estimee_heures;
        }
        // In create mode or if no manual charge, use preview
        else if ((!tache || !formData.charge_estimee_heures) && chargePreview?.totalHeures) {
            hours = chargePreview.totalHeures;
        }

        if (hours > 0) {
            const start = new Date(formData.date_debut_planifiee);
            if (!isNaN(start.getTime())) {
                // Calculate end date: add hours but STAY on the same day
                let end = new Date(start.getTime() + hours * 60 * 60 * 1000);

                // RÈGLE D'OR: Si la fin dépasse le jour calendaire, la limiter à 17:00 du même jour
                const endOfDay = new Date(start);
                endOfDay.setHours(17, 0, 0, 0); // Fin de journée par défaut: 17:00

                if (end.getDate() !== start.getDate()) {
                    // La charge dépasse un jour -> limiter à 17:00
                    end = endOfDay;

                    // Avertir l'utilisateur
                    const exceededHours = hours - ((end.getTime() - start.getTime()) / (60 * 60 * 1000));
                    console.warn(
                        `⚠️ Charge estimée (${hours}h) dépasse une journée de travail. ` +
                        `Date de fin limitée à ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. ` +
                        `Utilisez la récurrence pour planifier les ${exceededHours.toFixed(1)}h restantes.`
                    );
                }

                const formattedEnd = formatDateTimeLocal(end);

                if (formData.date_fin_planifiee !== formattedEnd) {
                    setFormData(prev => ({ ...prev, date_fin_planifiee: formattedEnd }));
                }
            }
        }
    }, [formData.date_debut_planifiee, formData.charge_estimee_heures, chargePreview?.totalHeures, formData.parametres_recurrence]);

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
                superficie: o.superficie_calculee // ✅ Extraire la superficie
            })) || [];

            setSelectedObjects(newSelectedObjects);

            setFormData({
                id_client: tache.client_detail ? tache.client_detail.utilisateur : null,
                id_type_tache: tache.type_tache_detail ? tache.type_tache_detail.id : 0,
                equipes_ids: equipesIds(),
                date_debut_planifiee: formatDateTimeLocal(new Date(tache.date_debut_planifiee)),
                date_fin_planifiee: formatDateTimeLocal(new Date(tache.date_fin_planifiee)),
                priorite: tache.priorite,
                commentaires: tache.commentaires || '',
                parametres_recurrence: tache.parametres_recurrence || null,
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

        // ⚠️ CRITICAL: Pre-submission validation for multi-day tasks
        // If user selected dates on different days without recurrence, activate it NOW
        if (formData.date_debut_planifiee && formData.date_fin_planifiee && !formData.parametres_recurrence) {
            const start = new Date(formData.date_debut_planifiee);
            const end = new Date(formData.date_fin_planifiee);
            const startDay = format(start, 'yyyy-MM-dd');
            const endDay = format(end, 'yyyy-MM-dd');

            if (startDay !== endDay) {
                // Different days detected - auto-activate recurrence
                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                console.warn(`⚠️ Multi-day task detected at submit! Auto-activating recurrence for ${diffDays} days`);

                const adjustedData = {
                    ...formData,
                    parametres_recurrence: {
                        frequence: 'daily' as const,
                        interval: 1,
                        nombre_occurrences: diffDays,
                        date_fin: endDay
                    },
                    // Adjust end date to same day
                    date_fin_planifiee: formatDateTimeLocal(
                        new Date(start.getFullYear(), start.getMonth(), start.getDate(), 17, 0, 0)
                    ),
                    // ✅ PHASE 1: Ajouter les flags
                    ...(calculerChargeAuto && chargePreview?.totalHeures && {
                        charge_estimee_heures: chargePreview.totalHeures
                    }),
                    calculer_charge_auto: calculerChargeAuto,
                    repartir_multi_jours: repartirMultiJours
                };

                console.log('📤 Submitting with auto-recurrence:', adjustedData);
                onSubmit(adjustedData);
                return;
            }
        }

        // ✅ PHASE 1: Ajouter les flags de planification intelligente au payload
        const payloadWithFlags = {
            ...formData,
            // Ajouter la charge calculée si option activée
            ...(calculerChargeAuto && chargePreview?.totalHeures && {
                charge_estimee_heures: chargePreview.totalHeures
            }),
            // Flags pour le backend
            calculer_charge_auto: calculerChargeAuto,
            repartir_multi_jours: repartirMultiJours
        };

        console.log('📤 Submitting task data:', payloadWithFlags);
        onSubmit(payloadWithFlags);
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
                                        to="/ratios"
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
                            type="datetime-local"
                            value={formData.date_debut_planifiee}
                            onChange={(value) => setFormData({ ...formData, date_debut_planifiee: value })}
                            label="Date début"
                            icon={<Clock className="w-4 h-4" />}
                            required
                            variant="outlined"
                            size="md"
                            disabled={!!formData.parametres_recurrence}
                        />
                        <PremiumInput
                            type="datetime-local"
                            value={formData.date_fin_planifiee}
                            onChange={(value) => setFormData({ ...formData, date_fin_planifiee: value })}
                            label="Date fin"
                            icon={<Clock className="w-4 h-4" />}
                            required
                            variant="outlined"
                            size="md"
                            disabled={!!formData.parametres_recurrence}
                        />
                    </div>
                    {formData.parametres_recurrence && (
                        <p className="text-xs text-slate-500 italic flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Les dates sont verrouillées car la récurrence est activée. Désactivez-la pour modifier les dates.
                        </p>
                    )}
                </div>

                <PremiumSelect
                    value={formData.priorite.toString()}
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
                                        <Link to="/ratios" target="_blank" className="text-emerald-600 hover:underline">
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
                                to="/ratios"
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
                                        <Link to="/ratios" target="_blank" className="underline ml-1">
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
                                        <Link to="/ratios" target="_blank" className="text-emerald-600 underline">
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

                {/* ✅ PHASE 1: Options de planification intelligente */}
                {selectedObjects.length > 0 && chargePreview && (
                    <div className="border-t pt-4 space-y-3">
                        <label className="block text-sm font-semibold text-slate-800 mb-2">
                            Options de planification
                        </label>

                        {/* Calculer charge automatiquement */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={calculerChargeAuto}
                                onChange={(e) => setCalculerChargeAuto(e.target.checked)}
                                className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                                <div className="text-sm font-medium text-slate-800 group-hover:text-emerald-700 transition-colors">
                                    ✅ Calculer la charge automatiquement
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    La charge est calculée en fonction des superficies et ratios de productivité configurés
                                    {chargePreview.totalHeures > 0 && (
                                        <span className="font-semibold text-emerald-700"> ({chargePreview.totalHeures}h estimées)</span>
                                    )}
                                </p>
                            </div>
                        </label>

                        {/* Répartir sur plusieurs jours */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={repartirMultiJours}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setRepartirMultiJours(isChecked);

                                    // Si décoché et récurrence active, la désactiver
                                    if (!isChecked && formData.parametres_recurrence) {
                                        setFormData({ ...formData, parametres_recurrence: null });
                                        setAutoRecurrenceActivated(false);
                                        console.log('🚫 Répartition multi-jours désactivée - récurrence supprimée');
                                    }
                                }}
                                className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                                <div className="text-sm font-medium text-slate-800 group-hover:text-emerald-700 transition-colors">
                                    📅 Répartir sur plusieurs jours
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Si la charge dépasse 10h, la tâche sera automatiquement divisée en plusieurs jours consécutifs
                                    {chargePreview.totalHeures > 10 && (
                                        <span className="font-semibold text-blue-700"> (recommandé: ~{Math.ceil(chargePreview.totalHeures / 8)} jours)</span>
                                    )}
                                </p>
                            </div>
                        </label>
                    </div>
                )}


                {/* ✅ Auto-Recurrence Banner */}
                {autoRecurrenceActivated && formData.parametres_recurrence && (
                    <div className="border-t pt-4">
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-500 rounded-full p-2 flex-shrink-0">
                                    <RefreshCw className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-blue-900 mb-1">
                                        🔄 Récurrence activée automatiquement
                                    </h4>
                                    <p className="text-sm text-blue-700 mb-2">
                                        {chargePreview?.totalHeures ? (
                                            <>
                                                Charge totale : <strong>{chargePreview.totalHeures}h</strong> répartie sur <strong>{formData.parametres_recurrence.nombre_occurrences} jours</strong>
                                                {' '}(≈ <strong>{(chargePreview.totalHeures / formData.parametres_recurrence.nombre_occurrences).toFixed(1)}h/jour</strong>)
                                            </>
                                        ) : (
                                            <>
                                                La tâche s'étend sur plusieurs jours. Elle sera créée <strong>{formData.parametres_recurrence.nombre_occurrences} fois</strong>
                                            </>
                                        )}
                                        {' '}(du {formData.date_debut_planifiee ? format(new Date(formData.date_debut_planifiee), 'dd/MM/yyyy') : '—'} au {formData.parametres_recurrence.date_fin ? format(new Date(formData.parametres_recurrence.date_fin), 'dd/MM/yyyy') : '—'}).
                                    </p>
                                    <p className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded inline-block mb-2">
                                        💡 La charge sera automatiquement répartie sur chaque jour
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, parametres_recurrence: null });
                                                setAutoRecurrenceActivated(false);
                                            }}
                                            className="text-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                                        >
                                            <X className="w-3 h-3" />
                                            Désactiver la récurrence
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Récurrence (Google Calendar style) */}
                <div className="border-t pt-4">
                    <label className="block text-sm font-semibold text-slate-800 mb-3">Récurrence</label>
                    <RecurrenceSelector
                        value={formData.parametres_recurrence as RecurrenceParams | null}
                        onChange={(params) => {
                            setFormData({ ...formData, parametres_recurrence: params });
                            // ✅ Reset auto-activated flag when user manually changes recurrence
                            if (params === null) {
                                setAutoRecurrenceActivated(false);
                            }
                        }}
                        startDate={formData.date_debut_planifiee || new Date().toISOString()}
                    />
                </div>
            </div>
        </FormModal>
    );
};

export default TaskFormModal;