import { useState, useMemo, useEffect, useRef, type FC } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    X, Search, ChevronRight, ChevronLeft, MapPin, TreePine, Users,
    CheckCircle2, Calendar, Clock, Sparkles, AlertCircle, Filter
} from 'lucide-react';
import { TypeTache, TacheCreate, PrioriteTache } from '../../types/planning';
import { EquipeList } from '../../types/users';
import { InventoryObjectOption } from './TaskFormModal';
import { RecurrenceSelector, type RecurrenceParams } from './RecurrenceSelector';
import { DataTable, Column } from '../DataTable';
import { StatusBadge } from '../StatusBadge';

// ============================================================================
// TYPES
// ============================================================================

interface QuickTaskCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TacheCreate) => void;
    typesTaches: TypeTache[];
    equipes: EquipeList[];
    sites: Array<{ id: number; name: string }>;
    initialDate: Date;
    initialStartTime?: string;
    initialEndTime?: string;
    onLoadObjects: (siteId: number) => Promise<InventoryObjectOption[]>;
    onCheckTaskTypeCompatibility: (typesTaches: string[]) => Promise<TypeTache[]>;
}

type Step = 'type' | 'site' | 'objects' | 'details';

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

const StepIndicator: FC<{ currentStep: Step; completedSteps: Step[] }> = ({ currentStep, completedSteps }) => {
    const steps = [
        { id: 'type' as Step, label: 'Type de tâche', icon: Sparkles },
        { id: 'site' as Step, label: 'Site', icon: MapPin },
        { id: 'objects' as Step, label: 'Objets', icon: TreePine },
        { id: 'details' as Step, label: 'Finalisation', icon: CheckCircle2 }
    ];

    const getStepIndex = (step: Step) => steps.findIndex(s => s.id === step);
    const currentIndex = getStepIndex(currentStep);

    return (
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex-shrink-0">
            {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = step.id === currentStep;
                const isUpcoming = index > currentIndex;
                const Icon = step.icon;

                return (
                    <div key={step.id} className="flex items-center flex-1">
                        <div className="flex items-center gap-2 flex-1">
                            <div className={`
                                relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300
                                ${isCompleted ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : ''}
                                ${isCurrent ? 'bg-white text-emerald-600 shadow-md ring-3 ring-emerald-100' : ''}
                                ${isUpcoming ? 'bg-gray-200 text-gray-400' : ''}
                            `}>
                                {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                    <Icon className="w-4 h-4" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-xs font-medium transition-colors ${isCurrent ? 'text-emerald-700' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {step.label}
                                </span>
                            </div>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 mx-3 transition-all duration-300 ${isCompleted ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ============================================================================
// SUMMARY PANEL COMPONENT
// ============================================================================

const SummaryPanel: FC<{
    selectedType: TypeTache | null;
    selectedSite: { id: number; name: string } | null;
    selectedObjects: InventoryObjectOption[];
    selectedEquipes: number[];
    equipes: EquipeList[];
    date: Date;
    startTime: string;
    endTime: string;
}> = ({ selectedType, selectedSite, selectedObjects, selectedEquipes, equipes, date, startTime, endTime }) => {
    const selectedEquipesData = equipes.filter(e => selectedEquipes.includes(e.id));

    return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Résumé de la tâche</h3>
            </div>

            {/* Date & Time */}
            <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quand</div>
                <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">
                        {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{startTime} → {endTime}</span>
                </div>
            </div>

            {/* Type de tâche */}
            {selectedType && (
                <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type de tâche</div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        <span className="text-sm font-medium text-emerald-700">{selectedType.nom_tache}</span>
                    </div>
                </div>
            )}

            {/* Site */}
            {selectedSite && (
                <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Site</div>
                    <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{selectedSite.name}</span>
                    </div>
                </div>
            )}

            {/* Objets */}
            {selectedObjects.length > 0 && (
                <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Objets ({selectedObjects.length})
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                        {selectedObjects.slice(0, 5).map(obj => (
                            <div key={obj.id} className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border border-gray-200">
                                <TreePine className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-700 truncate">{obj.nom}</span>
                            </div>
                        ))}
                        {selectedObjects.length > 5 && (
                            <div className="text-xs text-gray-500 italic">
                                +{selectedObjects.length - 5} autre(s)
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Équipes */}
            {selectedEquipesData.length > 0 && (
                <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Équipes ({selectedEquipesData.length})
                    </div>
                    <div className="space-y-1">
                        {selectedEquipesData.map(e => (
                            <div key={e.id} className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border border-gray-200">
                                <Users className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-700">{e.nomEquipe}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

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
    onCheckTaskTypeCompatibility
}) => {
    const [currentStep, setCurrentStep] = useState<Step>('type');
    const [completedSteps, setCompletedSteps] = useState<Step[]>([]);

    // Form data
    const [selectedType, setSelectedType] = useState<TypeTache | null>(null);
    const [selectedSite, setSelectedSite] = useState<{ id: number; name: string } | null>(null);
    const [selectedObjects, setSelectedObjects] = useState<InventoryObjectOption[]>([]);
    const [selectedEquipes, setSelectedEquipes] = useState<number[]>([]);
    const [commentaires, setCommentaires] = useState('');
    const [priorite, setPriorite] = useState<PrioriteTache>(3);
    const [recurrence, setRecurrence] = useState<RecurrenceParams | null>(null);

    // Loading states
    const [loadingObjects, setLoadingObjects] = useState(false);
    const [availableObjects, setAvailableObjects] = useState<InventoryObjectOption[]>([]);
    const [filteredTypesTaches, setFilteredTypesTaches] = useState<TypeTache[]>(typesTaches);

    // Search queries
    const [typeSearchQuery, setTypeSearchQuery] = useState('');
    const [siteSearchQuery, setSiteSearchQuery] = useState('');
    const [objectSearchQuery, setObjectSearchQuery] = useState('');

    // Object filters
    const [objectTypeFilter, setObjectTypeFilter] = useState<string>('all');
    const [objectEtatFilter, setObjectEtatFilter] = useState<string>('all');

    // Date/Time from slot selection (editable)
    const [startTime, setStartTime] = useState(initialStartTime || format(initialDate, 'HH:mm'));
    const [endTime, setEndTime] = useState(initialEndTime || format(new Date(initialDate.getTime() + 3600000), 'HH:mm'));

    // Refs for time inputs (auto-close pickers)
    const startTimeRef = useRef<HTMLInputElement>(null);
    const endTimeRef = useRef<HTMLInputElement>(null);

    // Debug: Log sites prop
    useEffect(() => {
        console.log('[QuickTaskCreator] Sites prop received:', sites);
        console.log('[QuickTaskCreator] Sites count:', sites.length);
    }, [sites]);

    // Filter types by search
    const filteredTypes = useMemo(() => {
        if (!typeSearchQuery.trim()) return filteredTypesTaches;
        const q = typeSearchQuery.toLowerCase();
        return filteredTypesTaches.filter(t => t.nom_tache.toLowerCase().includes(q));
    }, [filteredTypesTaches, typeSearchQuery]);

    // Filter sites by search
    const filteredSites = useMemo(() => {
        if (!siteSearchQuery.trim()) return sites;
        const q = siteSearchQuery.toLowerCase();
        return sites.filter(s => s.name.toLowerCase().includes(q));
    }, [sites, siteSearchQuery]);

    // Filter objects by search and filters
    const filteredObjects = useMemo(() => {
        let filtered = availableObjects;

        // Apply type filter
        if (objectTypeFilter !== 'all') {
            filtered = filtered.filter(o => o.type === objectTypeFilter);
        }

        // Apply état filter
        if (objectEtatFilter !== 'all') {
            filtered = filtered.filter(o => o.etat === objectEtatFilter);
        }

        // Apply search query
        if (objectSearchQuery.trim()) {
            const q = objectSearchQuery.toLowerCase();
            filtered = filtered.filter(o =>
                o.nom.toLowerCase().includes(q) ||
                o.type.toLowerCase().includes(q) ||
                (o.famille && o.famille.toLowerCase().includes(q))
            );
        }

        return filtered;
    }, [availableObjects, objectSearchQuery, objectTypeFilter, objectEtatFilter]);

    // Get unique types and états from available objects
    const availableTypes = useMemo(() => {
        return [...new Set(availableObjects.map(o => o.type))].sort();
    }, [availableObjects]);

    const availableEtats = useMemo(() => {
        return [...new Set(availableObjects.map(o => o.etat).filter(Boolean))].sort();
    }, [availableObjects]);

    const handleSelectType = (type: TypeTache) => {
        setSelectedType(type);
        setCompletedSteps(prev => [...new Set([...prev, 'type'])]);
        setCurrentStep('site');
    };

    const handleSelectSite = async (site: { id: number; name: string }) => {
        setSelectedSite(site);
        setCompletedSteps(prev => [...new Set([...prev, 'site'])]);
        setLoadingObjects(true);
        try {
            const objects = await onLoadObjects(site.id);

            // Filter objects based on selected task type compatibility
            if (selectedType) {
                // Get compatible object types for the selected task type
                const { planningService } = await import('../../services/planningService');
                const compatibilityData = await planningService.getCompatibleObjectTypes(selectedType.id);
                const compatibleTypes = compatibilityData.types_objets_compatibles;

                console.log(`[QuickTaskCreator] Type de tâche: ${selectedType.nom_tache}`);
                console.log(`[QuickTaskCreator] Types d'objets compatibles:`, compatibleTypes);
                console.log(`[QuickTaskCreator] Objets avant filtrage: ${objects.length}`);

                // Filter objects to only show compatible ones
                const filteredObjects = objects.filter(obj => compatibleTypes.includes(obj.type));

                console.log(`[QuickTaskCreator] Objets après filtrage: ${filteredObjects.length}`);

                setAvailableObjects(filteredObjects);

                // Warn user if no compatible objects found
                if (filteredObjects.length === 0 && objects.length > 0) {
                    console.warn(`[QuickTaskCreator] Aucun objet compatible trouvé pour "${selectedType.nom_tache}" sur ce site.`);
                }
            } else {
                // If no task type selected (shouldn't happen), show all objects
                setAvailableObjects(objects);
            }

            setCurrentStep('objects');
        } catch (err) {
            console.error('Erreur chargement objets:', err);
            // Fallback: show all objects if compatibility check fails
            setAvailableObjects(await onLoadObjects(site.id));
            setCurrentStep('objects');
        } finally {
            setLoadingObjects(false);
        }
    };

    const handleContinueToDetails = () => {
        setCompletedSteps(prev => [...new Set([...prev, 'objects'])]);
        setCurrentStep('details');
    };

    const handleSubmit = () => {
        if (!selectedType || !selectedSite) return;

        const startDateTime = new Date(initialDate);
        const [startHour, startMin] = startTime.split(':').map(Number);
        startDateTime.setHours(startHour, startMin, 0, 0);

        const endDateTime = new Date(initialDate);
        const [endHour, endMin] = endTime.split(':').map(Number);
        endDateTime.setHours(endHour, endMin, 0, 0);

        const taskData: TacheCreate = {
            id_type_tache: selectedType.id,
            equipes_ids: selectedEquipes,
            date_debut_planifiee: startDateTime.toISOString(),
            date_fin_planifiee: endDateTime.toISOString(),
            priorite,
            commentaires,
            parametres_recurrence: recurrence,
            objets: selectedObjects.map(o => o.id),
            id_client: null,
            reclamation: null,
            charge_estimee_heures: null
        };

        onSubmit(taskData);
        onClose();
    };

    const canContinueToDetails = selectedObjects.length > 0;

    // Time validation
    const timeError = useMemo(() => {
        if (!startTime || !endTime) return null;

        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes <= startMinutes) {
            return "L'heure de fin doit être après l'heure de début";
        }

        return null;
    }, [startTime, endTime]);

    const canSubmit = selectedType && selectedSite && !timeError;

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
                                    {filteredTypes.map(type => (
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
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                        Sur quel site ?
                                    </h3>
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
                                    {filteredSites.map(site => (
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
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                        Quels objets sont concernés ?
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Sélectionnez les objets sur lesquels la tâche sera effectuée
                                    </p>
                                </div>

                                {loadingObjects ? (
                                    <div className="text-center py-12">
                                        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-gray-500">Chargement des objets...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full">
                                        {/* Sticky Search & Filters - Ultra Compact */}
                                        <div className="sticky top-0 z-20 bg-white pb-2 space-y-2 border-b border-gray-200 shadow-sm">
                                            {/* Single Row: Search + Filters */}
                                            <div className="flex items-center gap-2">
                                                {/* Search Bar - Compact */}
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={objectSearchQuery}
                                                        onChange={(e) => setObjectSearchQuery(e.target.value)}
                                                        placeholder="Rechercher..."
                                                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm placeholder:text-gray-400"
                                                    />
                                                </div>

                                                {/* Type Filter - Compact */}
                                                <select
                                                    value={objectTypeFilter}
                                                    onChange={(e) => setObjectTypeFilter(e.target.value)}
                                                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-gray-700 min-w-[140px]"
                                                >
                                                    <option value="all">Tous types</option>
                                                    {availableTypes.map(type => {
                                                        const count = availableObjects.filter(o => o.type === type).length;
                                                        return (
                                                            <option key={type} value={type}>
                                                                {type} ({count})
                                                            </option>
                                                        );
                                                    })}
                                                </select>

                                                {/* État Filter - Compact */}
                                                <select
                                                    value={objectEtatFilter}
                                                    onChange={(e) => setObjectEtatFilter(e.target.value)}
                                                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-gray-700 min-w-[120px]"
                                                >
                                                    <option value="all">Tous états</option>
                                                    {availableEtats.map(etat => {
                                                        const count = availableObjects.filter(o => o.etat === etat).length;
                                                        return (
                                                            <option key={etat} value={etat}>
                                                                {etat} ({count})
                                                            </option>
                                                        );
                                                    })}
                                                </select>

                                                {/* Reset Button - Compact */}
                                                {(objectTypeFilter !== 'all' || objectEtatFilter !== 'all') && (
                                                    <button
                                                        onClick={() => {
                                                            setObjectTypeFilter('all');
                                                            setObjectEtatFilter('all');
                                                        }}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Réinitialiser les filtres"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Selected Count Badge - Inline */}
                                            {selectedObjects.length > 0 && (
                                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                        <span className="text-xs font-semibold text-emerald-900">
                                                            {selectedObjects.length} sélectionné{selectedObjects.length > 1 ? 's' : ''}
                                                        </span>
                                                        <span className="text-xs text-emerald-600">
                                                            ({[...new Set(selectedObjects.map(o => o.type))].join(', ')})
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedObjects([])}
                                                        className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                                                    >
                                                        Effacer
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Objects DataTable */}
                                        <div className="flex-1 overflow-hidden">
                                            {filteredObjects.length === 0 ? (
                                                <div className="text-center py-12">
                                                    <TreePine className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                    <p className="text-gray-500 font-medium mb-1">Aucun objet compatible trouvé</p>
                                                    {selectedType && (
                                                        <p className="text-sm text-gray-400">
                                                            Le type de tâche "{selectedType.nom_tache}" ne peut pas être appliqué aux objets de ce site
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="h-full border border-gray-200 rounded-lg overflow-hidden bg-white">
                                                    <DataTable
                                                        data={filteredObjects}
                                                        columns={[
                                                            {
                                                                key: 'nom',
                                                                label: 'Nom',
                                                                sortable: true,
                                                                render: (obj: InventoryObjectOption) => (
                                                                    <div className="flex items-center gap-2">
                                                                        <TreePine className="w-4 h-4 text-emerald-600" />
                                                                        <span className="font-medium text-gray-900">{obj.nom}</span>
                                                                    </div>
                                                                )
                                                            },
                                                            {
                                                                key: 'type',
                                                                label: 'Type',
                                                                sortable: true,
                                                                render: (obj: InventoryObjectOption) => (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                                        {obj.type}
                                                                    </span>
                                                                )
                                                            },
                                                            {
                                                                key: 'famille',
                                                                label: 'Famille',
                                                                sortable: true,
                                                                render: (obj: InventoryObjectOption) => (
                                                                    <span className="text-sm text-gray-600">{obj.famille || '-'}</span>
                                                                )
                                                            },
                                                            {
                                                                key: 'superficie',
                                                                label: 'Superficie',
                                                                sortable: true,
                                                                render: (obj: InventoryObjectOption) => (
                                                                    <span className="text-sm text-gray-600">
                                                                        {obj.superficie ? `${obj.superficie} m²` : '-'}
                                                                    </span>
                                                                )
                                                            },
                                                            {
                                                                key: 'etat',
                                                                label: 'État',
                                                                sortable: true,
                                                                render: (obj: InventoryObjectOption) => (
                                                                    obj.etat ? <StatusBadge status={obj.etat} /> : <span className="text-gray-400">-</span>
                                                                )
                                                            }
                                                        ]}
                                                        itemsPerPage={15}
                                                        selectable
                                                        selectedIds={new Set(selectedObjects.map(o => o.id))}
                                                        onSelectionChange={(newSelectedIds) => {
                                                            const newSelection = filteredObjects.filter(obj =>
                                                                newSelectedIds.has(obj.id)
                                                            );
                                                            // Merge with objects not in current filtered list
                                                            const objectsNotInFiltered = selectedObjects.filter(obj =>
                                                                !filteredObjects.some(fo => fo.id === obj.id)
                                                            );
                                                            setSelectedObjects([...objectsNotInFiltered, ...newSelection]);
                                                        }}
                                                        getItemId={(obj) => obj.id}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 4: Details */}
                        {currentStep === 'details' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                        Derniers détails
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Complétez les informations de la tâche
                                    </p>
                                </div>

                                {/* Date et Horaires */}
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar className="w-5 h-5 text-emerald-600" />
                                        <h4 className="font-semibold text-gray-900">Date et horaires</h4>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 border border-emerald-100">
                                        <div className="grid grid-cols-3 gap-4">
                                            {/* Date (lecture seule) */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                                    Date
                                                </label>
                                                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">
                                                    {format(initialDate, 'dd/MM/yyyy', { locale: fr })}
                                                </div>
                                            </div>

                                            {/* Heure début */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                                    Heure début
                                                </label>
                                                <input
                                                    ref={startTimeRef}
                                                    type="time"
                                                    value={startTime}
                                                    onChange={(e) => {
                                                        setStartTime(e.target.value);
                                                        // Auto-fermeture du picker après sélection
                                                        setTimeout(() => {
                                                            startTimeRef.current?.blur();
                                                        }, 100);
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-medium"
                                                />
                                            </div>

                                            {/* Heure fin */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                                    Heure fin
                                                </label>
                                                <input
                                                    ref={endTimeRef}
                                                    type="time"
                                                    value={endTime}
                                                    onChange={(e) => {
                                                        setEndTime(e.target.value);
                                                        // Auto-fermeture du picker après sélection
                                                        setTimeout(() => {
                                                            endTimeRef.current?.blur();
                                                        }, 100);
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-medium"
                                                />
                                            </div>
                                        </div>

                                        {/* Validation Error */}
                                        {timeError && (
                                            <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-xs font-medium">{timeError}</span>
                                            </div>
                                        )}

                                        {/* Info: Règle d'or */}
                                        <div className="mt-3 flex items-start gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <div className="text-xs">
                                                <p className="font-semibold">Règle d'or : 1 tâche = 1 jour</p>
                                                <p className="text-blue-600 mt-0.5">
                                                    Une tâche doit obligatoirement avoir lieu sur le même jour calendaire.
                                                    Pour planifier sur plusieurs jours, utilisez la récurrence ci-dessous.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Équipes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Équipes assignées (optionnel)
                                    </label>
                                    <div className="space-y-2">
                                        {equipes.map(equipe => {
                                            const isSelected = selectedEquipes.includes(equipe.id);
                                            return (
                                                <button
                                                    key={equipe.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedEquipes(prev => prev.filter(id => id !== equipe.id));
                                                        } else {
                                                            setSelectedEquipes(prev => [...prev, equipe.id]);
                                                        }
                                                    }}
                                                    className={`w-full p-3 border-2 rounded-lg transition-all text-left flex items-center justify-between ${
                                                        isSelected
                                                            ? 'border-emerald-500 bg-emerald-50'
                                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Users className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                                                        <span className={`font-medium ${isSelected ? 'text-emerald-900' : 'text-gray-700'}`}>
                                                            {equipe.nomEquipe}
                                                        </span>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Priorité */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Priorité
                                    </label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(p => (
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Récurrence
                                    </label>
                                    <RecurrenceSelector
                                        value={recurrence}
                                        onChange={setRecurrence}
                                        startDate={initialDate.toISOString()}
                                    />
                                </div>
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
                                setCurrentStep(steps[currentIndex - 1]);
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
