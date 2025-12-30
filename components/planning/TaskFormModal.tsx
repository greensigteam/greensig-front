import { useState, useEffect, useMemo, useRef, type FC, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
import {
    Clock, X, Search, ChevronDown, Timer, RefreshCw, Gauge, ExternalLink, Calculator, TreePine, AlertTriangle, MapPin, Ban
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
    PrioriteTache, FrequenceRecurrence,
    RatioProductivite
} from '../../types/planning';
import { EquipeList } from '../../types/users';
import FormModal, { FormField, FormInput, FormTextarea, FormSelect } from '../FormModal';
import { RecurrenceSelector, type RecurrenceParams } from './RecurrenceSelector';


// ============================================================================
// TYPE TACHE SELECTOR (avec création dynamique)
// ============================================================================

interface TypeTacheSelectorProps {
    value: number | null;
    typesTaches: TypeTache[];
    onChange: (id: number) => void;
}

const TypeTacheSelector: FC<TypeTacheSelectorProps> = ({ value, typesTaches, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const selectedType = typesTaches.find(t => t.id === value);

    const filteredTypes = useMemo(() => {
        if (!searchQuery.trim()) return typesTaches;
        const q = searchQuery.toLowerCase();
        return typesTaches.filter(t => t.nom_tache.toLowerCase().includes(q));
    }, [typesTaches, searchQuery]);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
                <span className={selectedType ? 'text-gray-900' : 'text-gray-400'}>
                    {selectedType?.nom_tache || 'Sélectionner un type'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredTypes.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => {
                                    onChange(type.id);
                                    setIsOpen(false);
                                    setSearchQuery('');
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-sm"
                            >
                                {type.nom_tache}
                            </button>
                        ))}
                        {filteredTypes.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                Aucun résultat
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// MULTI EQUIPE SELECTOR (US-PLAN-013 - Multi-teams)
// ============================================================================

interface MultiEquipeSelectorProps {
    values: number[];
    equipes: EquipeList[];
    onChange: (ids: number[]) => void;
}

const MultiEquipeSelector: FC<MultiEquipeSelectorProps> = ({ values, equipes, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const selectedEquipes = equipes.filter(e => values.includes(e.id));

    const filteredEquipes = useMemo(() => {
        if (!searchQuery.trim()) return equipes;
        const q = searchQuery.toLowerCase();
        return equipes.filter(e => e.nomEquipe.toLowerCase().includes(q));
    }, [equipes, searchQuery]);

    const toggleEquipe = (equipeId: number) => {
        if (values.includes(equipeId)) {
            onChange(values.filter(id => id !== equipeId));
        } else {
            onChange([...values, equipeId]);
        }
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[42px]"
            >
                <div className="flex-1 flex flex-wrap gap-1">
                    {selectedEquipes.length > 0 ? (
                        selectedEquipes.map(e => (
                            <span key={e.id} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
                                {e.nomEquipe}
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(ev) => {
                                        ev.stopPropagation();
                                        toggleEquipe(e.id);
                                    }}
                                    onKeyDown={(ev) => {
                                        if (ev.key === 'Enter' || ev.key === ' ') {
                                            ev.stopPropagation();
                                            toggleEquipe(e.id);
                                        }
                                    }}
                                    className="hover:text-red-500 cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </span>
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-400">Sélectionner des équipes</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredEquipes.map((equipe) => {
                            const isSelected = values.includes(equipe.id);
                            return (
                                <button
                                    key={equipe.id}
                                    type="button"
                                    onClick={() => toggleEquipe(equipe.id)}
                                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <span>{equipe.nomEquipe}</span>
                                    {isSelected && <span className="text-emerald-600">✓</span>}
                                </button>
                            );
                        })}
                        {filteredEquipes.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                Aucun résultat
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

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
    onClose: () => void;
    onSubmit: (data: TacheCreate) => void;
    onResetCharge?: (tacheId: number) => Promise<void>;
}

const TaskFormModal: FC<TaskFormModalProps> = ({ tache, initialValues, equipes, typesTaches, preSelectedObjects, siteFilter, onClose, onSubmit, onResetCharge }) => {
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
        id_client: tache?.client_detail?.id || initialValues?.id_client || null,
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

    // State for ratios and charge preview
    const [ratios, setRatios] = useState<RatioProductivite[]>([]);
    const [loadingRatios, setLoadingRatios] = useState(false);

    // State for object selector
    const [selectedObjects, setSelectedObjects] = useState<InventoryObjectOption[]>(
        preSelectedObjects ||
        tache?.objets_detail?.map(o => ({ id: o.id, type: o.nom_type, nom: o.display, site: o.site, soussite: o.sous_site })) ||
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
            return siteFilter.name;
        }
        if (selectedObjects.length > 0) {
            return selectedObjects[0].site;
        }
        return null;
    }, [selectedObjects, siteFilter]);

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
        const uniqueTypes = [...new Set(selectedObjects.map(obj => obj.type))];

        setLoadingFilteredTypes(true);
        setIncompatibleObjectsError(null);

        planningService.getApplicableTypesTaches(uniqueTypes)
            .then(result => {
                setFilteredTypesTaches(result.types_taches);

                // If no applicable task types, show error
                if (result.types_taches.length === 0) {
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

    // Calculate estimated charge preview based on selected objects and ratios
    const chargePreview = useMemo(() => {
        if (!formData.id_type_tache || selectedObjects.length === 0 || ratios.length === 0) {
            return null;
        }

        // Group objects by type
        const objectsByType = selectedObjects.reduce((acc, obj) => {
            acc[obj.type] = (acc[obj.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        let totalHeures = 0;
        const details: { type: string; count: number; ratio: RatioProductivite | null; heures: number }[] = [];

        for (const [type, count] of Object.entries(objectsByType)) {
            // Find matching ratio for this task type and object type
            const ratio = ratios.find(r =>
                r.id_type_tache === formData.id_type_tache &&
                r.type_objet.toLowerCase() === type.toLowerCase()
            );

            if (ratio) {
                // For 'unite' measure, ratio is units per hour
                // So hours = count / ratio
                const heures = count / ratio.ratio;
                totalHeures += heures;
                details.push({ type, count, ratio, heures });
            } else {
                details.push({ type, count, ratio: null, heures: 0 });
            }
        }

        return {
            totalHeures: Math.round(totalHeures * 100) / 100,
            details,
            hasUnconfiguredTypes: details.some(d => d.ratio === null)
        };
    }, [formData.id_type_tache, selectedObjects, ratios]);

    // Fetch inventory objects when siteFilter is set (on mount) - for reclamation context
    useEffect(() => {
        if (siteFilter && availableObjects.length === 0) {
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
                            soussite: item.properties.sous_site_nom
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
                            soussite: item.properties.sous_site_nom
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
            filtered = filtered.filter(o => o.site === lockedSite);
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
    }, [formData.date_debut_planifiee, formData.charge_estimee_heures, chargePreview?.totalHeures]);

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
            // Initialize equipes from M2M or legacy single equipe
            const equipesIds = (): number[] => {
                if (tache.equipes_detail && tache.equipes_detail.length > 0) {
                    return tache.equipes_detail.map(e => e.id);
                }
                if (tache.equipe_detail?.id) {
                    return [tache.equipe_detail.id];
                }
                return [];
            };

            setFormData({
                id_client: tache.client_detail ? ((tache.client_detail as any).utilisateur || tache.client_detail.utilisateur) : null,
                id_type_tache: tache.type_tache_detail ? tache.type_tache_detail.id : 0,
                equipes_ids: equipesIds(),
                date_debut_planifiee: formatDateTimeLocal(new Date(tache.date_debut_planifiee)),
                date_fin_planifiee: formatDateTimeLocal(new Date(tache.date_fin_planifiee)),
                priorite: tache.priorite,
                commentaires: tache.commentaires || '',
                parametres_recurrence: tache.parametres_recurrence || null
            });
        }
    }, [tache]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (!formData.id_type_tache || formData.id_type_tache === 0) {
            setValidationError('Veuillez sélectionner un type de tâche');
            return;
        }

        onSubmit(formData);
    };

    return (
        <FormModal
            isOpen={true}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={tache ? 'Modifier la tâche' : 'Nouvelle tâche'}
            icon={<Clock className="w-5 h-5 text-emerald-600" />}
            size="2xl"
            loading={false}
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type de tâche <span className="text-red-500">*</span>
                                {selectedObjects.length > 0 && filteredTypesTaches.length < typesTaches.length && !loadingFilteredTypes && (
                                    <span className="ml-2 text-xs text-amber-600 font-normal">
                                        ({filteredTypesTaches.length} types applicables sur {typesTaches.length})
                                    </span>
                                )}
                                {loadingFilteredTypes && (
                                    <span className="ml-2 text-xs text-gray-400 font-normal">
                                        Chargement...
                                    </span>
                                )}
                            </label>
                            <TypeTacheSelector
                                value={formData.id_type_tache || null}
                                typesTaches={filteredTypesTaches}
                                onChange={(id) => setFormData({ ...formData, id_type_tache: id })}
                            />
                            {selectedObjects.length > 0 && filteredTypesTaches.length > 0 && filteredTypesTaches.length < typesTaches.length && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Seuls les types de tâches applicables aux objets sélectionnés sont affichés.
                                </p>
                            )}
                        </div>

                        {/* Équipes avec sélection multiple (US-PLAN-013) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Équipes
                            </label>
                            <MultiEquipeSelector
                                values={formData.equipes_ids || []}
                                equipes={equipes}
                                onChange={(ids) => setFormData({ ...formData, equipes_ids: ids })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date début <span className="text-red-500">*</span>
                                </label>
                                <input
                                    ref={startDateRef}
                                    required
                                    type="datetime-local"
                                    value={formData.date_debut_planifiee}
                                    onChange={(e) => {
                                        setFormData({ ...formData, date_debut_planifiee: e.target.value });
                                        // Auto-fermeture du picker après sélection
                                        setTimeout(() => {
                                            startDateRef.current?.blur();
                                        }, 100);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date fin <span className="text-red-500">*</span>
                                </label>
                                <input
                                    ref={endDateRef}
                                    required
                                    type="datetime-local"
                                    value={formData.date_fin_planifiee}
                                    onChange={(e) => {
                                        setFormData({ ...formData, date_fin_planifiee: e.target.value });
                                        // Auto-fermeture du picker après sélection
                                        setTimeout(() => {
                                            endDateRef.current?.blur();
                                        }, 100);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Priorité
                            </label>
                            <select
                                value={formData.priorite}
                                onChange={(e) => setFormData({ ...formData, priorite: Number(e.target.value) as PrioriteTache })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                {Object.entries(PRIORITE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Commentaires
                            </label>
                            <textarea
                                value={formData.commentaires}
                                onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Détails de la tâche..."
                            />
                        </div>

                        {/* Charge estimée (uniquement en mode édition) */}
                        {tache && (
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
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
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            value={formData.charge_estimee_heures ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                                setFormData({ ...formData, charge_estimee_heures: val });
                                                if (val !== null) setChargeManuelle(true);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none pr-16"
                                            placeholder="Auto"
                                        />
                                        <span className="absolute right-3 top-2.5 text-sm text-gray-400">heures</span>
                                    </div>
                                    {!chargeManuelle && tache.charge_estimee_heures !== null && (
                                        <span className="text-sm text-gray-500 whitespace-nowrap">
                                            Calculé: {tache.charge_estimee_heures}h
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
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
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
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
                                        <span>Site : <strong>{lockedSite}</strong></span>
                                        <span className="text-blue-500 text-xs">(seuls les objets de ce site sont affichés)</span>
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
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={objectSearchQuery}
                                            onChange={(e) => setObjectSearchQuery(e.target.value)}
                                            placeholder="Rechercher par nom, type ou site..."
                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>

                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                        {loadingObjects ? (
                                            <div className="text-center py-4 text-gray-500 text-sm">Chargement...</div>
                                        ) : filteredObjects.length === 0 ? (
                                            <div className="text-center py-4 text-gray-500 text-sm">
                                                {objectSearchQuery
                                                    ? 'Aucun résultat pour cette recherche'
                                                    : lockedSite
                                                        ? `Aucun autre objet disponible sur le site "${lockedSite}"`
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
                                                            : 'bg-white hover:bg-gray-100 border border-gray-200'
                                                            }`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium truncate">{obj.nom}</span>
                                                                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                                                    {obj.type}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500 truncate">
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
                                            <div className="text-center py-2 text-xs text-gray-400">
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
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
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
                                    <div className="bg-gray-50 p-3 rounded-lg text-center text-gray-500 text-sm">
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
                                    <div className="bg-gray-50 p-3 rounded-lg text-center text-gray-500 text-sm">
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

                        {/* Smart Alert: Suggest recurrence for large workloads */}
                        {chargePreview && chargePreview.totalHeures > 10 && !formData.parametres_recurrence && (
                            <div className="border-t pt-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                    <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-blue-900">
                                            Charge importante détectée ({chargePreview.totalHeures.toFixed(1)}h)
                                        </h4>
                                        <p className="text-sm text-blue-700 mt-1">
                                            Cette tâche dépasse une journée de travail (10h max selon la loi marocaine). Pour respecter la règle d'or (1 tâche = 1 jour),
                                            activez la récurrence quotidienne ci-dessous.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const days = Math.ceil(chargePreview.totalHeures / 10);
                                                setFormData({
                                                    ...formData,
                                                    parametres_recurrence: {
                                                        frequence: 'daily',
                                                        interval: 1,
                                                        nombre_occurrences: days,
                                                    }
                                                });
                                            }}
                                            className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Activer récurrence ({Math.ceil(chargePreview.totalHeures / 10)} jours)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Récurrence (Google Calendar style) */}
                        <div className="border-t pt-4">
                            <RecurrenceSelector
                                value={formData.parametres_recurrence as RecurrenceParams | null}
                                onChange={(params) => setFormData({ ...formData, parametres_recurrence: params })}
                                startDate={formData.date_debut_planifiee || new Date().toISOString()}
                            />
                        </div>
            </div>
        </FormModal>
    );
};

export default TaskFormModal;