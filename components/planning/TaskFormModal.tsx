import { useState, useEffect, useMemo, type FC, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Clock, Gauge, ClipboardList, Users } from 'lucide-react';

// ============================================================================
// HELPER: Format date for datetime-local input (respects local timezone)
// ============================================================================
const formatDateLocal = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};
import { planningService } from '../../services/planningService';
import { useToast } from '../../contexts/ToastContext';
import { fetchInventory, type InventoryResponse } from '../../services/api';
import {
  Tache,
  TacheCreate,
  TypeTache,
  PRIORITE_LABELS,
  PrioriteTache,
  RatioProductivite,
  DistributionChargeData,
} from '../../types/planning';
import { EquipeList } from '../../types/users';
import FormModal from '../FormModal';
import {
  PremiumInput,
  PremiumSelect,
  PremiumTextarea,
  PremiumSearchableSelect,
  PremiumMultiSelect,
} from '../modals/PremiumFormComponents';
import { RecurrenceSelector, type RecurrenceConfig } from './RecurrenceSelector';
import { ValidationWarningsAlert, IncompatibleObjectsError } from './TaskFormAlerts';
import { EstimatedChargeSection } from './EstimatedChargeSection';
import { TaskTimeSection } from './TaskTimeSection';
import { isEndBeforeStartDay } from '../../utils/dateHelpers';
import { useChargePreview } from '../../hooks/useChargePreview';
import { useFilteredEquipes } from '../../hooks/useFilteredEquipes';
import ChargePreviewDisplay from './ChargePreviewDisplay';
import InventoryObjectSelector from './InventoryObjectSelector';

// ============================================================================
// CREATE/EDIT TASK MODAL
// ============================================================================

// Type for inventory object in selector
export interface InventoryObjectOption {
  id: number;
  type: string;
  nom: string;
  site: string;
  /** ID numérique du site, lorsque l'objet provient d'un fetch enrichi. */
  siteId?: number | null;
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
  open?: boolean;
  sites?: Array<{ id: number | string; name?: string; nom?: string } | unknown>;
  onLoadObjects?: Function;
  onCheckTypeCompatibility?: Function;
  mode?: 'create' | 'edit' | string;
}

const TaskFormModal: FC<TaskFormModalProps> = ({
  tache,
  initialValues,
  equipes,
  typesTaches,
  preSelectedObjects,
  siteFilter,
  isSubmitting = false,
  onClose,
  onSubmit,
  onResetCharge,
}) => {
  // Initialize equipes from M2M or legacy single equipe
  const initialEquipesIds = (): number[] => {
    if (tache?.equipes_detail && tache.equipes_detail.length > 0) {
      return tache.equipes_detail.map((e) => e.id);
    }
    if (tache?.equipe_detail?.id) {
      return [tache.equipe_detail.id];
    }
    if (initialValues?.equipes_ids) {
      return initialValues.equipes_ids;
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

  const { showToast } = useToast();

  const [formData, setFormData] = useState<TacheCreate>({
    id_type_tache: tache?.type_tache_detail?.id || initialValues?.id_type_tache || 0,
    equipes_ids: initialEquipesIds(),
    date_debut_planifiee: tache?.date_debut_planifiee
      ? formatDateLocal(new Date(tache.date_debut_planifiee))
      : initialValues?.date_debut_planifiee || getDefaultStartDate(),
    date_fin_planifiee: tache?.date_fin_planifiee
      ? formatDateLocal(new Date(tache.date_fin_planifiee))
      : initialValues?.date_fin_planifiee || getDefaultEndDate(),
    priorite: tache?.priorite || initialValues?.priorite || 3,
    commentaires: tache?.commentaires || initialValues?.commentaires || '',
    reclamation: tache?.reclamation || initialValues?.reclamation || null,
    objets:
      tache?.objets_detail?.map((o) => o.id) ||
      initialValues?.objets ||
      preSelectedObjects?.map((o) => o.id) ||
      [],
    charge_estimee_heures: tache?.charge_estimee_heures || null,
  });

  const [chargeManuelle, setChargeManuelle] = useState(tache?.charge_manuelle || false);
  const [isResettingCharge, setIsResettingCharge] = useState(false);

  // ✅ Heures pour tâches d'un seul jour
  const [startTime, setStartTime] = useState<string>(() => {
    // Si la tâche existe et a une distribution, utiliser ses heures
    if (tache?.distributions_charge && tache.distributions_charge.length > 0) {
      const firstDist = tache.distributions_charge[0];
      return firstDist?.heure_debut ? firstDist.heure_debut.substring(0, 5) : '08:00';
    }
    return '08:00';
  });
  const [endTime, setEndTime] = useState<string>(() => {
    if (tache?.distributions_charge && tache.distributions_charge.length > 0) {
      const firstDist = tache.distributions_charge[0];
      return firstDist?.heure_fin ? firstDist.heure_fin.substring(0, 5) : '17:00';
    }
    return '17:00';
  });

  // ✅ NOUVEAU: Distributions de charge pour tâches multi-jours
  const [distributionsCharge, setDistributionsCharge] = useState<DistributionChargeData[]>(
    tache?.distributions_charge?.map((d) => ({
      id: d.id, // ✅ CRITIQUE: Préserver l'ID pour les updates
      date: d.date,
      heure_debut: d.heure_debut ?? undefined, // normalize null -> undefined
      heure_fin: d.heure_fin ?? undefined, // normalize null -> undefined
      commentaire: d.commentaire,
      status: d.status, // ✅ NOUVEAU: Préserver le statut
      reference: d.reference, // ✅ NOUVEAU: Préserver la référence
    })) || [],
  );

  // State for ratios and charge preview
  const [ratios, setRatios] = useState<RatioProductivite[]>([]);
  const [loadingRatios, setLoadingRatios] = useState(false);

  // State for recurrence (only for creation mode)
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>({
    enabled: false,
    mode: 'frequency',
    conserver_equipes: true,
    conserver_objets: true,
  });

  // State for object selector
  const [selectedObjects, setSelectedObjects] = useState<InventoryObjectOption[]>(
    preSelectedObjects ||
      tache?.objets_detail?.map((o) => ({
        id: o.id,
        type: o.nom_type || '',
        nom: o.display || `Objet #${o.id}`,
        site: o.site_nom || '',
        soussite: o.sous_site_nom,
      })) ||
      [],
  );
  const [showObjectSelector, setShowObjectSelector] = useState(false);
  const [objectSearchQuery, setObjectSearchQuery] = useState('');
  const [availableObjects, setAvailableObjects] = useState<InventoryObjectOption[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);

  // State for filtered task types based on selected objects
  const [filteredTypesTaches, setFilteredTypesTaches] = useState<TypeTache[]>(typesTaches);
  const [loadingFilteredTypes, setLoadingFilteredTypes] = useState(false);
  const [incompatibleObjectsError, setIncompatibleObjectsError] = useState<string | null>(null);

  // Refs for datetime inputs (auto-close pickers) - reserved for future use

  // Site lock: when objects are selected or siteFilter is set, only allow objects from the same site
  const lockedSite = useMemo(() => {
    // Priority: siteFilter > selectedObjects
    if (siteFilter) {
      return { id: siteFilter.id, name: siteFilter.name };
    }
    if (selectedObjects.length > 0 && selectedObjects[0]?.site) {
      // Find site ID from available objects
      const firstObj = availableObjects.find((o) => o.site === selectedObjects[0]?.site);
      return { id: firstObj?.siteId ?? null, name: selectedObjects[0].site };
    }
    return null;
  }, [selectedObjects, siteFilter, availableObjects]);

  const filteredEquipes = useFilteredEquipes(equipes, lockedSite?.name);

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
        warnings.push('La date de début est dans le passé.');
      }

      if (formData.date_fin_planifiee) {
        if (isEndBeforeStartDay(formData.date_debut_planifiee, formData.date_fin_planifiee)) {
          warnings.push('La date de fin doit être postérieure à la date de début.');
        }
      }
    }

    setValidationWarnings(warnings);
  }, [formData.date_debut_planifiee, formData.date_fin_planifiee]);

  // ❌ SUPPRIMÉ: Auto-activation récurrence multi-jours
  // Remplacé par système de distribution de charge (DistributionChargeEditor)
  // Les tâches multi-jours utilisent maintenant distributions_charge au lieu de récurrence

  const chargePreview = useChargePreview(
    formData.id_type_tache || undefined,
    selectedObjects,
    ratios,
  );

  // ❌ SUPPRIMÉ: Auto-activation récurrence si charge > 10h
  // Remplacé par système de distribution de charge qui permet contrôle manuel précis
  // Les tâches avec charge élevée utilisent maintenant l'éditeur de distribution

  // Fetch ratios when task type changes (not on mount)
  // We need ratios specific to the selected task type for accurate charge calculation
  useEffect(() => {
    if (!formData.id_type_tache) {
      setRatios([]);
      return;
    }

    setLoadingRatios(true);
    // Fetch ratios for this specific task type to avoid pagination issues
    planningService
      .getRatios({ type_tache_id: formData.id_type_tache, actif: true })
      .then((loadedRatios) => {
        setRatios(loadedRatios);
      })
      .catch(() => showToast('Erreur lors du chargement des ratios', 'error'))
      .finally(() => setLoadingRatios(false));
  }, [formData.id_type_tache, showToast]);

  // ✅ SUPPRIMÉ: Auto-update task dates when distributions change
  // Les dates de début et fin de la tâche sont INDÉPENDANTES des distributions
  // Exemple: Une tâche peut être planifiée du 1er au 31 janvier avec des distributions
  // seulement sur certains jours (5, 10, 15, 20 janvier)

  // ✅ NOUVEAU: Réinitialiser les distributions quand les dates de la tâche changent
  // Si les distributions existantes sont TOUTES hors de la nouvelle plage de dates,
  // les régénérer automatiquement pour permettre une replanification propre
  useEffect(() => {
    // Seulement en mode édition
    if (!tache) return;
    if (!formData.date_debut_planifiee || !formData.date_fin_planifiee) return;

    const newStart = new Date(formData.date_debut_planifiee);
    const newEnd = new Date(formData.date_fin_planifiee);

    // Si pas de distributions existantes, pas besoin de vérifier
    if (distributionsCharge.length === 0) return;

    // Vérifier si TOUTES les distributions sont hors de la nouvelle plage
    const allOutOfRange = distributionsCharge.every((dist) => {
      const distDate = new Date(dist.date);
      return distDate < newStart || distDate > newEnd;
    });

    if (allOutOfRange) {
      // Régénérer une distribution pour la date de début avec les horaires existants
      const existingStartTime = distributionsCharge[0]?.heure_debut || startTime;
      const existingEndTime = distributionsCharge[0]?.heure_fin || endTime;

      // Si c'est une tâche d'un seul jour, créer une seule distribution
      if (formData.date_debut_planifiee === formData.date_fin_planifiee) {
        setDistributionsCharge([
          {
            date: formData.date_debut_planifiee,
            heure_debut: existingStartTime,
            heure_fin: existingEndTime,
            commentaire: '',
          },
        ]);
      } else {
        // Pour les tâches multi-jours, créer une distribution pour le premier jour
        // L'utilisateur pourra ajouter d'autres jours via l'interface
        setDistributionsCharge([
          {
            date: formData.date_debut_planifiee,
            heure_debut: existingStartTime,
            heure_fin: existingEndTime,
            commentaire: '',
          },
        ]);
      }
    }
  }, [formData.date_debut_planifiee, formData.date_fin_planifiee]);

  // Filter task types based on selected objects
  useEffect(() => {
    // If no objects selected, show all task types
    if (selectedObjects.length === 0) {
      setFilteredTypesTaches(typesTaches);
      setIncompatibleObjectsError(null);
      return;
    }

    // Get unique object types from selected objects
    const uniqueTypes = [...new Set(selectedObjects.map((obj) => obj.type).filter(Boolean))];

    setLoadingFilteredTypes(true);
    setIncompatibleObjectsError(null);

    planningService
      .getApplicableTypesTaches(uniqueTypes)
      .then((result) => {
        const types = result?.types_taches || [];
        setFilteredTypesTaches(types);

        // If no applicable task types, show error
        if (types.length === 0) {
          const typesList = uniqueTypes.join(', ');
          setIncompatibleObjectsError(
            `Aucun type de tâche n'est applicable aux types d'objets sélectionnés (${typesList}). ` +
              `Veuillez sélectionner des objets compatibles ou configurer les ratios de productivité.`,
          );
        }

        // If current selected task type is not in the filtered list, reset it
        if (
          formData.id_type_tache &&
          !result.types_taches.find((t) => t.id === formData.id_type_tache)
        ) {
          setFormData((prev) => ({ ...prev, id_type_tache: 0 }));
        }
      })
      .catch((_err) => {
        showToast('Erreur lors du chargement des types applicables', 'error');
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
          const objects = response.results.map((item) => {
            const objectId = item.id ?? item.properties?.id;
            return {
              id: objectId,
              type: item.properties.object_type,
              nom:
                item.properties.nom ||
                item.properties.famille ||
                `${item.properties.object_type} #${objectId}`,
              site: item.properties.site_nom,
              soussite: item.properties.sous_site_nom,
              superficie: item.properties.superficie_calculee, // ✅ Extraire la superficie
              etat: item.properties.etat, // ✅ Extraire l'état
              famille: item.properties.famille, // ✅ Extraire la famille
            };
          });

          setAvailableObjects(objects);
          // Ouvrir automatiquement le sélecteur d'objets
          setShowObjectSelector(true);
        })
        .catch(() => showToast('Erreur lors du chargement des objets', 'error'))
        .finally(() => setLoadingObjects(false));
    }
  }, [siteFilter]);

  // Fetch inventory objects when selector is opened manually (without siteFilter)
  useEffect(() => {
    if (showObjectSelector && availableObjects.length === 0 && !siteFilter) {
      setLoadingObjects(true);
      fetchInventory({ page_size: 200 })
        .then((response: InventoryResponse) => {
          const objects = response.results.map((item) => {
            const objectId = item.id ?? item.properties?.id;
            return {
              id: objectId,
              type: item.properties.object_type,
              nom:
                item.properties.nom ||
                item.properties.famille ||
                `${item.properties.object_type} #${objectId}`,
              site: item.properties.site_nom,
              soussite: item.properties.sous_site_nom,
              superficie: item.properties.superficie_calculee, // ✅ Extraire la superficie
              etat: item.properties.etat, // ✅ Extraire l'état
              famille: item.properties.famille, // ✅ Extraire la famille
            };
          });

          setAvailableObjects(objects);
        })
        .catch(() => showToast('Erreur lors du chargement des objets', 'error'))
        .finally(() => setLoadingObjects(false));
    }
  }, [showObjectSelector, siteFilter]);

  // Sync selectedObjects with formData.objets
  useEffect(() => {
    setFormData((prev) => ({ ...prev, objets: selectedObjects.map((o) => o.id) }));
  }, [selectedObjects]);

  // Filter available objects by search query AND site lock
  const filteredObjects = useMemo(() => {
    let filtered = availableObjects;

    // If a site is locked (objects already selected), filter by that site
    if (lockedSite) {
      filtered = filtered.filter((o) => o.site === lockedSite.name);
    }

    // Then apply search query filter
    if (objectSearchQuery.trim()) {
      const q = objectSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.nom.toLowerCase().includes(q) ||
          o.type.toLowerCase().includes(q) ||
          o.site.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [availableObjects, objectSearchQuery, lockedSite]);

  // ❌ SUPPRIMÉ: Limitation "même jour calendaire" (RÈGLE D'OR)
  // Les tâches peuvent maintenant s'étendre sur plusieurs jours via distributions_charge
  // La date de fin n'est plus automatiquement limitée à 17:00 du jour de début

  const toggleObjectSelection = (obj: InventoryObjectOption) => {
    setSelectedObjects((prev) => {
      const exists = prev.find((o) => o.id === obj.id);
      if (exists) {
        return prev.filter((o) => o.id !== obj.id);
      } else {
        return [...prev, obj];
      }
    });
  };

  const removeObject = (id: number) => {
    setSelectedObjects((prev) => prev.filter((o) => o.id !== id));
  };

  // Synchroniser le formulaire quand la tâche change (édition)
  useEffect(() => {
    if (tache) {
      // Initialize teams
      const equipesIds = (): number[] => {
        if (tache.equipes_detail && tache.equipes_detail.length > 0) {
          return tache.equipes_detail.map((e) => e.id);
        }
        if (tache.equipe_detail?.id) {
          return [tache.equipe_detail.id];
        }
        return [];
      };

      // Initialize selected objects
      // FIX: Map correctly using updated serializer fields
      const newSelectedObjects =
        tache.objets_detail?.map((o) => ({
          id: o.id,
          type: o.nom_type || '', // Now available from backend
          nom: o.display || `Objet #${o.id}`, // Now available from backend
          site: o.site_nom || '',
          soussite: o.sous_site_nom,
          superficie: o.superficie_calculee, // ✅ Extraire la superficie
          etat: o.etat, // ✅ Extraire l'état
          famille: o.famille, // ✅ Extraire la famille
        })) || [];

      setSelectedObjects(newSelectedObjects);

      setFormData({
        id_type_tache: tache.type_tache_detail ? tache.type_tache_detail.id : 0,
        equipes_ids: equipesIds(),
        date_debut_planifiee: formatDateLocal(new Date(tache.date_debut_planifiee)),
        date_fin_planifiee: formatDateLocal(new Date(tache.date_fin_planifiee)),
        priorite: tache.priorite,
        commentaires: tache.commentaires || '',
        charge_estimee_heures: tache.charge_estimee_heures,
        reclamation: tache.reclamation || null,
        objets: newSelectedObjects.map((o) => o.id), // Ensure sync immediately
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

    if (isMultiDay && distributionsCharge.length === 0) {
      setValidationError(
        'Pour une tâche multi-jours, veuillez sélectionner les jours de travail (via "Horaires de la journée" ou l\'éditeur de distribution).',
      );
      return;
    }

    // ❌ SUPPRIMÉ: Validation multi-jours qui forçait la récurrence
    // Les tâches multi-jours sont maintenant gérées nativement via distributions_charge

    // Préparer les données pour soumission
    let distributionsToSend = distributionsCharge;

    // ✅ Tâche d'un seul jour : créer/mettre à jour la distribution avec la date du formulaire
    // FIX: Même si des distributions existent, on les remplace avec la nouvelle date
    // pour permettre la replanification correcte des tâches expirées
    if (formData.date_debut_planifiee === formData.date_fin_planifiee) {
      if (startTime >= endTime) {
        setValidationError("L'heure de fin doit être postérieure à l'heure de début.");
        return;
      }
      // Créer une nouvelle distribution avec la date mise à jour
      // On ne garde pas l'ancien ID pour forcer la recréation avec la nouvelle date
      distributionsToSend = [
        {
          date: formData.date_debut_planifiee,
          heure_debut: startTime,
          heure_fin: endTime,
          commentaire: distributionsCharge[0]?.commentaire || '',
        },
      ];
    }

    // ✅ REPLANIFICATION: Si la tâche était ANNULEE ou REJETEE, forcer le statut à PLANIFIEE
    // (Plus de EXPIREE dans le nouveau système simplifié)
    const statutsAReplanifier = ['ANNULEE', 'REJETEE'];
    const doitReplanifier = tache && statutsAReplanifier.includes(tache.statut);

    const payload: any = {
      ...formData,
      // ✅ Distributions de charge (multi-jours ou jour unique avec heures)
      ...(distributionsToSend.length > 0 && {
        distributions_charge_data: distributionsToSend,
      }),
      // ✅ Configuration de récurrence (seulement pour création et si activée)
      ...(recurrenceConfig.enabled && {
        recurrence_config: recurrenceConfig,
      }),
      // ✅ Forcer le statut à PLANIFIEE pour réactiver les tâches annulées/expirées/rejetées
      ...(doitReplanifier && {
        statut: 'PLANIFIEE',
      }),
    };

    if (doitReplanifier) {
      // future: handle replanification logic
    }

    if (payload.recurrence_config) {
      // recurrence handled by parent via onSubmit
    }
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
        <ValidationWarningsAlert warnings={validationWarnings} />
        <IncompatibleObjectsError error={incompatibleObjectsError} />

        {/* Type de tâche avec création dynamique */}
        <PremiumSearchableSelect
          value={formData.id_type_tache || null}
          onChange={(id) => setFormData({ ...formData, id_type_tache: Number(id) })}
          options={filteredTypesTaches.map((t) => ({
            value: t.id,
            label: t.nom_tache,
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
              : selectedObjects.length > 0 &&
                  filteredTypesTaches.length > 0 &&
                  filteredTypesTaches.length < typesTaches.length
                ? `${filteredTypesTaches.length} types applicables sur ${typesTaches.length}`
                : selectedObjects.length > 0 &&
                    filteredTypesTaches.length > 0 &&
                    filteredTypesTaches.length < typesTaches.length
                  ? 'Seuls les types de tâches applicables aux objets sélectionnés sont affichés.'
                  : undefined
          }
        />

        {/* Équipes avec sélection multiple (US-PLAN-013) */}
        <PremiumMultiSelect
          values={formData.equipes_ids || []}
          onChange={(ids) => setFormData({ ...formData, equipes_ids: ids.map((id) => Number(id)) })}
          options={filteredEquipes.map((e) => ({
            value: e.id,
            label: e.nomEquipe,
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
          error={
            lockedSite && filteredEquipes.length === 0
              ? 'Vous pouvez créer la tâche sans équipe ou affecter une équipe à ce site depuis la page Équipes.'
              : undefined
          }
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

        <TaskTimeSection
          dateDebutPlanifiee={formData.date_debut_planifiee}
          dateFinPlanifiee={formData.date_fin_planifiee}
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          distributionsCharge={distributionsCharge}
          onDistributionsChange={setDistributionsCharge}
        />

        <PremiumSelect
          value={(formData.priorite || 3).toString()}
          onChange={(value) =>
            setFormData({ ...formData, priorite: Number(value) as PrioriteTache })
          }
          options={Object.entries(PRIORITE_LABELS).map(([value, label]) => ({
            value: value,
            label: label,
          }))}
          label="Priorité"
          icon={<Gauge className="w-4 h-4" />}
          variant="outlined"
          size="md"
        />

        <PremiumTextarea
          value={formData.commentaires || ''}
          onChange={(value) => setFormData({ ...formData, commentaires: value })}
          label="Commentaires"
          placeholder="Détails de la tâche..."
          rows={3}
          variant="outlined"
          size="md"
        />

        {tache && (
          <EstimatedChargeSection
            tache={tache}
            chargeManuelle={chargeManuelle}
            isResettingCharge={isResettingCharge}
            formData={formData}
            onChargeChange={(val) => setFormData({ ...formData, charge_estimee_heures: val })}
            onResetCharge={onResetCharge}
            onChargeManuelleChange={setChargeManuelle}
            onResettingChange={setIsResettingCharge}
          />
        )}

        <InventoryObjectSelector
          selectedObjects={selectedObjects}
          showSelector={showObjectSelector}
          onToggleSelector={() => setShowObjectSelector(!showObjectSelector)}
          lockedSite={lockedSite}
          siteFilter={siteFilter}
          filteredObjects={filteredObjects}
          loadingObjects={loadingObjects}
          searchQuery={objectSearchQuery}
          onSearchChange={setObjectSearchQuery}
          onToggleObject={toggleObjectSelection}
          onRemoveObject={removeObject}
          onClearObjects={() => setSelectedObjects([])}
        />

        {!tache && selectedObjects.length > 0 && formData.id_type_tache > 0 && (
          <ChargePreviewDisplay
            chargePreview={chargePreview}
            loadingRatios={loadingRatios}
            ratiosCount={ratios.length}
            variant="section"
          />
        )}

        {/* ============================================================================ */}
        {/* RÉCURRENCE                                                                  */}
        {/* ============================================================================ */}
        <div className="mt-6">
          <RecurrenceSelector
            dateDebut={formData.date_debut_planifiee}
            dateFin={formData.date_fin_planifiee}
            value={recurrenceConfig}
            onChange={setRecurrenceConfig}
            disabled={!!tache}
          />
        </div>
      </div>
    </FormModal>
  );
};

export default TaskFormModal;
