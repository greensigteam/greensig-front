import { useState, useMemo, useEffect, type FC } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  X,
  Search,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  TypeTache,
  TacheCreate,
  PrioriteTache,
  RatioProductivite,
  DistributionChargeData,
} from '../../types/planning';
import { EquipeList } from '../../types/users';
import { InventoryObjectOption } from './TaskFormModal';
import { DistributionChargeEditor } from './DistributionChargeEditor';
import { RecurrenceSelector, type RecurrenceConfig } from './RecurrenceSelector';
import { PremiumInput } from '../modals/PremiumFormComponents';
import { planningService } from '../../services/planningService';
import { useToast } from '../../contexts/ToastContext';
import { useChargePreview } from '../../hooks/useChargePreview';
import { useFilteredEquipes } from '../../hooks/useFilteredEquipes';
import StepIndicator, { type Step } from './StepIndicator';
import SummaryPanel from './SummaryPanel';
import ChargePreviewDisplay from './ChargePreviewDisplay';
import ObjectSelectionStep from './ObjectSelectionStep';

// ============================================================================
// TYPES
// ============================================================================

interface QuickTaskCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TacheCreate) => void;
  typesTaches: TypeTache[];
  equipes: EquipeList[];
  sites: Array<{ id: number | string; name: string }>;
  initialDate: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  onLoadObjects: (siteId: number) => Promise<InventoryObjectOption[]>;
  onCheckTaskTypeCompatibility: (typesTaches: string[]) => Promise<TypeTache[]>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const QuickTaskCreator: FC<QuickTaskCreatorProps> = ({
  isOpen,
  onClose,
  onSubmit,
  typesTaches,
  equipes,
  sites,
  initialDate,
  initialStartTime,
  initialEndTime,
  onLoadObjects,
  onCheckTaskTypeCompatibility: _onCheckTaskTypeCompatibility,
}) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>('type');
  const [completedSteps, setCompletedSteps] = useState<Step[]>([]);

  // Form data
  const [selectedType, setSelectedType] = useState<TypeTache | null>(null);
  const [selectedSite, setSelectedSite] = useState<{ id: number; name: string } | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<InventoryObjectOption[]>([]);
  const [selectedEquipes, setSelectedEquipes] = useState<number[]>([]);
  const [commentaires, setCommentaires] = useState('');
  const [priorite, setPriorite] = useState<PrioriteTache>(3);
  const [distributionsCharge, setDistributionsCharge] = useState<DistributionChargeData[]>([]);

  // Mode de planification: 'simple' ou 'multi-jours'
  const [modeDistribution, setModeDistribution] = useState<'simple' | 'multi-jours'>('simple');

  // ✅ Récurrence (pour créer plusieurs tâches automatiquement)
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>({
    enabled: false,
    mode: 'frequency',
    conserver_equipes: true,
    conserver_objets: true,
  });

  // ✅ PHASE 1: États pour planification intelligente
  const [ratios, setRatios] = useState<RatioProductivite[]>([]);
  const [loadingRatios, setLoadingRatios] = useState(false);

  // Loading states
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [availableObjects, setAvailableObjects] = useState<InventoryObjectOption[]>([]);
  const [filteredTypesTaches, setFilteredTypesTaches] = useState<TypeTache[]>(typesTaches);

  // Sync filteredTypesTaches when typesTaches prop changes (async loading)
  useEffect(() => {
    setFilteredTypesTaches(typesTaches);
  }, [typesTaches]);

  // Search queries
  const [typeSearchQuery, setTypeSearchQuery] = useState('');
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [objectSearchQuery, setObjectSearchQuery] = useState('');

  // Object filters
  const [objectTypeFilter, setObjectTypeFilter] = useState<string>('all');
  const [objectEtatFilter, setObjectEtatFilter] = useState<string>('all');

  const [startTime, setStartTime] = useState(() => {
    if (initialStartTime && initialStartTime !== '00:00') return initialStartTime;
    const hours = initialDate.getHours();
    const minutes = initialDate.getMinutes();
    if (hours > 0 || minutes > 0) return format(initialDate, 'HH:mm');
    return format(new Date(), 'HH:mm');
  });

  const [endTime, setEndTime] = useState(() => {
    if (initialEndTime && initialEndTime !== '00:00' && initialEndTime !== '01:00')
      return initialEndTime;
    const now = new Date();
    if (now.getHours() >= 16) return format(new Date(now.getTime() + 60 * 60 * 1000), 'HH:mm');
    return '17:00';
  });

  // ✅ PHASE 1: Charger les ratios de productivité quand le type de tâche change
  // On filtre par type de tâche pour éviter les problèmes de pagination (seulement 20 ratios par page)
  useEffect(() => {
    if (!selectedType) {
      setRatios([]);
      return;
    }

    setLoadingRatios(true);
    planningService
      .getRatios({ type_tache_id: selectedType.id, actif: true })
      .then((loadedRatios) => {
        setRatios(loadedRatios);
      })
      .catch(() => showToast('Erreur lors du chargement des ratios', 'error'))
      .finally(() => setLoadingRatios(false));
  }, [selectedType, showToast]);

  // Filter types by search
  const filteredTypes = useMemo(() => {
    if (!typeSearchQuery.trim()) return filteredTypesTaches;
    const q = typeSearchQuery.toLowerCase();
    return filteredTypesTaches.filter((t) => t.nom_tache.toLowerCase().includes(q));
  }, [filteredTypesTaches, typeSearchQuery]);

  // Filter sites by search
  const filteredSites = useMemo(() => {
    if (!siteSearchQuery.trim()) return sites;
    const q = siteSearchQuery.toLowerCase();
    return sites.filter((s) => s.name.toLowerCase().includes(q));
  }, [sites, siteSearchQuery]);

  // Filter objects by search and filters
  const filteredObjects = useMemo(() => {
    let filtered = availableObjects;

    // Apply type filter
    if (objectTypeFilter !== 'all') {
      filtered = filtered.filter((o) => o.type === objectTypeFilter);
    }

    // Apply état filter
    if (objectEtatFilter !== 'all') {
      filtered = filtered.filter((o) => o.etat === objectEtatFilter);
    }

    // Apply search query
    if (objectSearchQuery.trim()) {
      const q = objectSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.nom.toLowerCase().includes(q) ||
          o.type.toLowerCase().includes(q) ||
          (o.famille && o.famille.toLowerCase().includes(q)),
      );
    }

    return filtered;
  }, [availableObjects, objectSearchQuery, objectTypeFilter, objectEtatFilter]);

  // Get unique types and états from available objects
  const availableTypes = useMemo(() => {
    return [...new Set(availableObjects.map((o) => o.type))].sort();
  }, [availableObjects]);

  const availableEtats = useMemo(() => {
    return [...new Set(availableObjects.map((o) => o.etat).filter(Boolean))].sort();
  }, [availableObjects]);

  const filteredEquipes = useFilteredEquipes(equipes, selectedSite?.name);

  const chargePreview = useChargePreview(selectedType?.id, selectedObjects, ratios);

  const handleSelectType = (type: TypeTache) => {
    setSelectedType(type);
    setCompletedSteps((prev) => Array.from(new Set<Step>([...prev, 'type'])));
    setCurrentStep('site');
  };

  const handleSelectSite = async (site: { id: number | string; name: string }) => {
    setSelectedSite({ id: Number(site.id), name: site.name });
    setCompletedSteps((prev) => Array.from(new Set<Step>([...prev, 'site'])));
    setLoadingObjects(true);
    try {
      const objects = await onLoadObjects(Number(site.id));

      // Filter objects based on selected task type compatibility
      if (selectedType) {
        // Get compatible object types for the selected task type
        const { planningService } = await import('../../services/planningService');
        const compatibilityData = await planningService.getCompatibleObjectTypes(selectedType.id);
        const compatibleTypes = compatibilityData.types_objets_compatibles;

        // Filter objects to only show compatible ones
        const filteredObjects = objects.filter((obj) => compatibleTypes.includes(obj.type));

        setAvailableObjects(filteredObjects);

        // Warn user if no compatible objects found
        if (filteredObjects.length === 0 && objects.length > 0) {
          console.warn(
            `[QuickTaskCreator] Aucun objet compatible trouvé pour "${selectedType.nom_tache}" sur ce site.`,
          );
        }
      } else {
        // If no task type selected (shouldn't happen), show all objects
        setAvailableObjects(objects);
      }

      setCurrentStep('objects');
    } catch (err) {
      showToast('Erreur lors du chargement des objets', 'error');
      // Fallback: show all objects if compatibility check fails
      setAvailableObjects(await onLoadObjects(Number(site.id)));
      setCurrentStep('objects');
    } finally {
      setLoadingObjects(false);
    }
  };

  const handleContinueToDetails = () => {
    setCompletedSteps((prev) => Array.from(new Set<Step>([...prev, 'objects'])));
    setCurrentStep('details');
  };

  const handleSubmit = () => {
    if (!selectedType || !selectedSite) return;

    let taskData: TacheCreate;

    if (modeDistribution === 'multi-jours' && distributionsCharge.length > 0) {
      // Mode multi-jours: utiliser les dates réelles des distributions sélectionnées
      const sortedDistributions = [...distributionsCharge].sort((a, b) =>
        a.date.localeCompare(b.date),
      );

      // ✅ NOUVEAU: Utiliser la première et dernière distribution pour définir la plage de dates planifiée
      // Cela garantit que la date de fin planifiée correspond à la dernière distribution sélectionnée
      const dateDebut = sortedDistributions[0]?.date ?? format(initialDate, 'yyyy-MM-dd');
      const dateFin =
        sortedDistributions[sortedDistributions.length - 1]?.date ??
        format(initialDate, 'yyyy-MM-dd');

      taskData = {
        id_type_tache: selectedType.id,
        equipes_ids: selectedEquipes,
        date_debut_planifiee: dateDebut, // Format YYYY-MM-DD
        date_fin_planifiee: dateFin, // Format YYYY-MM-DD
        priorite,
        commentaires,
        objets: selectedObjects.map((o) => o.id),
        reclamation: null,
        charge_estimee_heures: chargePreview?.totalHeures || null,
        distributions_charge_data: sortedDistributions,
        // Recurrence config (if enabled)
        ...(recurrenceConfig.enabled && { recurrence_config: recurrenceConfig }),
      };
    } else {
      // Mode simple: utiliser les horaires
      const startDateTime = new Date(initialDate);
      const [startHour, startMin] = startTime.split(':').map(Number);
      startDateTime.setHours(startHour ?? 0, startMin ?? 0, 0, 0);

      const endDateTime = new Date(initialDate);
      const [endHour, endMin] = endTime.split(':').map(Number);
      endDateTime.setHours(endHour ?? 0, endMin ?? 0, 0, 0);

      taskData = {
        id_type_tache: selectedType.id,
        equipes_ids: selectedEquipes,
        date_debut_planifiee: format(initialDate, 'yyyy-MM-dd'), // Format YYYY-MM-DD
        date_fin_planifiee: format(initialDate, 'yyyy-MM-dd'), // Format YYYY-MM-DD
        priorite,
        commentaires,
        objets: selectedObjects.map((o) => o.id),
        reclamation: null,
        charge_estimee_heures: chargePreview?.totalHeures || null,
        // En mode simple, on peut créer une distribution pour ce jour
        distributions_charge_data: [
          {
            date: format(initialDate, 'yyyy-MM-dd'),
            heure_debut: startTime,
            heure_fin: endTime,
            commentaire: '',
          },
        ],
        // Recurrence config (if enabled)
        ...(recurrenceConfig.enabled && { recurrence_config: recurrenceConfig }),
      };
    }

    onSubmit(taskData);
    onClose();
  };

  const canContinueToDetails = selectedObjects.length > 0;

  // Time validation
  const timeError = useMemo(() => {
    if (!startTime || !endTime) return null;

    const [startHour = 0, startMin = 0] = startTime.split(':').map(Number);
    const [endHour = 0, endMin = 0] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      return "L'heure de fin doit être après l'heure de début";
    }

    return null;
  }, [startTime, endTime]);

  const canSubmit =
    selectedType &&
    selectedSite &&
    (modeDistribution === 'simple' ? !timeError : distributionsCharge.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white w-full h-full max-w-7xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Créer une tâche rapide
            </h2>
            <p className="text-xs text-gray-500">
              {format(initialDate, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* STEP 1: Type de tâche */}
            {currentStep === 'type' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Quel type de tâche souhaitez-vous créer ?
                  </h3>
                  <p className="text-sm text-gray-500">
                    Sélectionnez le type d'intervention à planifier
                  </p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={typeSearchQuery}
                    onChange={(e) => setTypeSearchQuery(e.target.value)}
                    placeholder="Rechercher un type de tâche..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    autoFocus
                  />
                </div>

                {/* Type Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {filteredTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleSelectType(type)}
                      className="group relative p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition-all text-left"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                          <Sparkles className="w-6 h-6 text-emerald-600" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{type.nom_tache}</h4>
                      {type.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{type.description}</p>
                      )}
                    </button>
                  ))}
                </div>

                {filteredTypes.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Aucun type de tâche trouvé</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Site */}
            {currentStep === 'site' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Sur quel site ?</h3>
                  <p className="text-sm text-gray-500">
                    Choisissez le site où la tâche sera effectuée
                  </p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={siteSearchQuery}
                    onChange={(e) => setSiteSearchQuery(e.target.value)}
                    placeholder="Rechercher un site..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    autoFocus
                  />
                </div>

                {/* Site List */}
                <div className="space-y-3">
                  {filteredSites.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => handleSelectSite(site)}
                      className="group w-full p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition-all text-left flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <MapPin className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{site.name}</h4>
                          <p className="text-sm text-gray-500">ID: {site.id}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                    </button>
                  ))}
                </div>

                {filteredSites.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Aucun site trouvé</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Objects */}
            {currentStep === 'objects' && (
              <ObjectSelectionStep
                loadingObjects={loadingObjects}
                filteredObjects={filteredObjects}
                availableObjects={availableObjects}
                availableTypes={availableTypes}
                availableEtats={availableEtats}
                selectedObjects={selectedObjects}
                selectedType={selectedType}
                objectSearchQuery={objectSearchQuery}
                objectTypeFilter={objectTypeFilter}
                objectEtatFilter={objectEtatFilter}
                onSearchChange={setObjectSearchQuery}
                onTypeFilterChange={setObjectTypeFilter}
                onEtatFilterChange={setObjectEtatFilter}
                onSelectionChange={setSelectedObjects}
              />
            )}

            {/* STEP 4: Details */}
            {currentStep === 'details' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Derniers détails</h3>
                  <p className="text-sm text-gray-500">Complétez les informations de la tâche</p>
                </div>

                {/* Date et Horaires / Distribution de charge */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-semibold text-gray-900">Planification</h4>
                    </div>
                    {/* Toggle mode */}
                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-emerald-200">
                      <button
                        type="button"
                        onClick={() => setModeDistribution('simple')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          modeDistribution === 'simple'
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-600 hover:text-emerald-600'
                        }`}
                      >
                        Un jour
                      </button>
                      <button
                        type="button"
                        onClick={() => setModeDistribution('multi-jours')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          modeDistribution === 'multi-jours'
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-600 hover:text-emerald-600'
                        }`}
                      >
                        Multi-jours
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-emerald-100">
                    {modeDistribution === 'simple' ? (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Date (lecture seule) */}
                          <PremiumInput
                            type="text"
                            value={format(initialDate, 'dd/MM/yyyy', { locale: fr })}
                            onChange={() => {}} // Read-only
                            label="Date"
                            icon={<Calendar className="w-4 h-4" />}
                            variant="outlined"
                            size="sm"
                            disabled={true}
                          />

                          {/* Heure début */}
                          <PremiumInput
                            type="time"
                            value={startTime}
                            onChange={(value) => setStartTime(value)}
                            label="Heure début"
                            icon={<Clock className="w-4 h-4" />}
                            variant="outlined"
                            size="sm"
                            required
                          />

                          {/* Heure fin */}
                          <PremiumInput
                            type="time"
                            value={endTime}
                            onChange={(value) => setEndTime(value)}
                            label="Heure fin"
                            icon={<Clock className="w-4 h-4" />}
                            variant="outlined"
                            size="sm"
                            required
                          />
                        </div>

                        {/* Validation Error */}
                        {timeError && (
                          <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs font-medium">{timeError}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Mode multi-jours: Distribution de charge */
                      <DistributionChargeEditor
                        dateDebut={initialDate}
                        dateFin={new Date(initialDate.getTime() + 30 * 24 * 60 * 60 * 1000)} // +30 jours par défaut
                        distributions={distributionsCharge}
                        onChange={setDistributionsCharge}
                        readonly={false}
                      />
                    )}
                  </div>
                </div>

                {/* Équipes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Équipes assignées (optionnel)
                    {selectedSite && filteredEquipes.length < equipes.length && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">
                        ({filteredEquipes.length} équipe{filteredEquipes.length > 1 ? 's' : ''} sur
                        ce site)
                      </span>
                    )}
                  </label>
                  {filteredEquipes.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      Aucune équipe n'est affectée au site "{selectedSite?.name}". Vous pouvez créer
                      la tâche sans équipe ou affecter une équipe à ce site depuis la page Équipes.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredEquipes.map((equipe) => {
                        const isSelected = selectedEquipes.includes(equipe.id);
                        // Afficher les sites couverts par l'équipe
                        const sitesCouverture = [];
                        if (equipe.sitePrincipalNom) sitesCouverture.push(equipe.sitePrincipalNom);
                        if (equipe.sitesSecondairesNoms && equipe.sitesSecondairesNoms.length > 0) {
                          sitesCouverture.push(...equipe.sitesSecondairesNoms);
                        }
                        if (sitesCouverture.length === 0 && equipe.siteNom) {
                          sitesCouverture.push(equipe.siteNom);
                        }
                        const sitesText =
                          sitesCouverture.length > 0
                            ? sitesCouverture.join(', ')
                            : 'Aucun site affecté';

                        return (
                          <button
                            key={equipe.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedEquipes((prev) => prev.filter((id) => id !== equipe.id));
                              } else {
                                setSelectedEquipes((prev) => [...prev, equipe.id]);
                              }
                            }}
                            className={`w-full p-3 border-2 rounded-lg transition-all text-left flex items-center justify-between ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Users
                                className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`font-medium ${isSelected ? 'text-emerald-900' : 'text-gray-700'}`}
                                >
                                  {equipe.nomEquipe}
                                </div>
                                <div
                                  className={`text-xs truncate ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`}
                                >
                                  {sitesText}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Priorité */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriorite(p as PrioriteTache)}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                          priorite === p
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        P{p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commentaires */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaires (optionnel)
                  </label>
                  <textarea
                    value={commentaires}
                    onChange={(e) => setCommentaires(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                    placeholder="Ajoutez des notes ou instructions..."
                  />
                </div>

                {/* Récurrence */}
                <div className="mt-4">
                  <RecurrenceSelector
                    dateDebut={format(initialDate, 'yyyy-MM-dd')}
                    dateFin={format(initialDate, 'yyyy-MM-dd')}
                    value={recurrenceConfig}
                    onChange={setRecurrenceConfig}
                  />
                </div>

                {selectedObjects.length > 0 && (
                  <ChargePreviewDisplay
                    chargePreview={chargePreview}
                    loadingRatios={loadingRatios}
                    ratiosCount={ratios.length}
                    variant="card"
                  />
                )}
              </div>
            )}
          </div>

          {/* Summary Panel */}
          <div className="w-80 bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
            <SummaryPanel
              selectedType={selectedType}
              selectedSite={selectedSite}
              selectedObjects={selectedObjects}
              selectedEquipes={selectedEquipes}
              equipes={equipes}
              date={initialDate}
              startTime={startTime}
              endTime={endTime}
              modeDistribution={modeDistribution}
              distributionsCharge={distributionsCharge}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-gray-200 bg-white">
          <button
            onClick={() => {
              const steps: Step[] = ['type', 'site', 'objects', 'details'];
              const currentIndex = steps.indexOf(currentStep);
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1]!);
              }
            }}
            disabled={currentStep === 'type'}
            className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            Retour
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>

            {currentStep === 'objects' ? (
              <button
                onClick={handleContinueToDetails}
                disabled={!canContinueToDetails}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : currentStep === 'details' ? (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <CheckCircle2 className="w-5 h-5" />
                Créer la tâche
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickTaskCreator;
