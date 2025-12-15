import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { Plus, Users, Clock, X, Trash2, Edit, Search, Filter, UserPlus } from 'lucide-react';
import { planningService } from '../services/planningService';
import { fetchClients, fetchEquipes } from '../services/usersApi';
import {
    Tache, TacheCreate, TacheUpdate, TypeTache,
    STATUT_TACHE_LABELS, STATUT_TACHE_COLORS,
    PRIORITE_LABELS, PRIORITE_COLORS,
    PrioriteTache, FrequenceRecurrence
} from '../types/planning';
import { Client, EquipeList } from '../types/users';

// ============================================================================
// CONFIGURATION CALENDRIER
// ============================================================================

const locales = {
    'fr': fr,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// Custom Event Interface for RBC
interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource: Tache;
}

// ============================================================================
// CREATE/EDIT TASK MODAL
// ============================================================================

const TaskFormModal: React.FC<{
    tache?: Tache;
    clients: Client[];
    equipes: EquipeList[];
    typesTaches: TypeTache[];
    onClose: () => void;
    onSubmit: (data: TacheCreate) => void;
}> = ({ tache, clients, equipes, typesTaches, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<TacheCreate>({
        id_client: (tache?.client_detail && ((tache?.client_detail as any).utilisateur || tache?.client_detail?.utilisateur)) || null,
        id_type_tache: tache?.type_tache_detail.id || 0,
        id_equipe: tache?.equipe_detail?.id || null,
        date_debut_planifiee: tache?.date_debut_planifiee.slice(0, 16) || '',
        date_fin_planifiee: tache?.date_fin_planifiee.slice(0, 16) || '',
        priorite: tache?.priorite || 3,
        commentaires: tache?.commentaires || '',
        parametres_recurrence: tache?.parametres_recurrence || null
    });

    const [showRecurrence, setShowRecurrence] = useState(!!tache?.parametres_recurrence);

    // Synchroniser le formulaire quand la tâche change (édition)
    useEffect(() => {
        if (tache) {
            setFormData({
                id_client: tache.client_detail ? ((tache.client_detail as any).utilisateur || tache.client_detail.utilisateur) : null,
                id_type_tache: tache.type_tache_detail ? tache.type_tache_detail.id : 0,
                id_equipe: tache.equipe_detail?.id || null,
                date_debut_planifiee: tache.date_debut_planifiee.slice(0, 16),
                date_fin_planifiee: tache.date_fin_planifiee.slice(0, 16),
                priorite: tache.priorite,
                commentaires: tache.commentaires || '',
                parametres_recurrence: tache.parametres_recurrence || null
            });
            setShowRecurrence(!!tache.parametres_recurrence);
        }
    }, [tache]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {tache ? 'Modifier la tâche' : 'Nouvelle tâche'}
                        </h2>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Structure (Client)
                            </label>
                            <select
                                value={formData.id_client || 0}
                                onChange={(e) => setFormData({ ...formData, id_client: Number(e.target.value) || null })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value={0}>Sélectionner un client</option>
                                {clients.map((client) => (
                                    <option key={client.utilisateur} value={client.utilisateur}>
                                        {(client as any).nom_structure || client.nomStructure || 'Client sans nom'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type de tâche <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.id_type_tache}
                                onChange={(e) => setFormData({ ...formData, id_type_tache: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value={0}>Sélectionner un type</option>
                                {typesTaches.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.nom_tache}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Équipe
                            </label>
                            <select
                                value={formData.id_equipe || ''}
                                onChange={(e) => setFormData({ ...formData, id_equipe: e.target.value ? Number(e.target.value) : null })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="">Aucune équipe</option>
                                {equipes.map((equipe) => (
                                    <option key={equipe.id} value={equipe.id}>
                                        {equipe.nomEquipe}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date début <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="datetime-local"
                                    value={formData.date_debut_planifiee}
                                    onChange={(e) => setFormData({ ...formData, date_debut_planifiee: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date fin <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="datetime-local"
                                    value={formData.date_fin_planifiee}
                                    onChange={(e) => setFormData({ ...formData, date_fin_planifiee: e.target.value })}
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

                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Récurrence personnalisée
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRecurrence(!showRecurrence);
                                        if (showRecurrence) {
                                            setFormData({ ...formData, parametres_recurrence: null });
                                        } else {
                                            // Default init
                                            setFormData({
                                                ...formData,
                                                parametres_recurrence: {
                                                    frequence: 'weekly',
                                                    interval: 1,
                                                    nombre_occurrences: 4,
                                                    jours: []
                                                }
                                            });
                                        }
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showRecurrence ? 'bg-emerald-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showRecurrence ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {showRecurrence && formData.parametres_recurrence && (
                                <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    {/* Intervalle et Fréquence */}
                                    <div className="flex items-end gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Répéter tous les</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formData.parametres_recurrence.interval || 1}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        parametres_recurrence: {
                                                            ...formData.parametres_recurrence!,
                                                            interval: Number(e.target.value)
                                                        }
                                                    })}
                                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                                />
                                                <select
                                                    value={formData.parametres_recurrence.frequence}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        parametres_recurrence: {
                                                            ...formData.parametres_recurrence!,
                                                            frequence: e.target.value as FrequenceRecurrence
                                                        }
                                                    })}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                                >
                                                    <option value="daily">Jours</option>
                                                    <option value="weekly">Semaines</option>
                                                    <option value="monthly">Mois</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Jours de la semaine (si Hebdo) */}
                                    {formData.parametres_recurrence.frequence === 'weekly' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Jours concernés</label>
                                            <div className="flex justify-between gap-1">
                                                {[
                                                    { id: 'MO', label: 'L' },
                                                    { id: 'TU', label: 'M' },
                                                    { id: 'WE', label: 'M' },
                                                    { id: 'TH', label: 'J' },
                                                    { id: 'FR', label: 'V' },
                                                    { id: 'SA', label: 'S' },
                                                    { id: 'SU', label: 'D' }
                                                ].map((d) => {
                                                    const isSelected = formData.parametres_recurrence?.jours?.includes(d.id);
                                                    return (
                                                        <button
                                                            key={d.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const currentDays = formData.parametres_recurrence?.jours || [];
                                                                const newDays = isSelected
                                                                    ? currentDays.filter(day => day !== d.id)
                                                                    : [...currentDays, d.id];
                                                                setFormData({
                                                                    ...formData,
                                                                    parametres_recurrence: {
                                                                        ...formData.parametres_recurrence!,
                                                                        jours: newDays
                                                                    }
                                                                });
                                                            }}
                                                            className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${isSelected
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            {d.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Fin de récurrence */}
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200/50">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Se termine après</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    placeholder="Nb fois"
                                                    value={formData.parametres_recurrence.nombre_occurrences || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        parametres_recurrence: {
                                                            ...formData.parametres_recurrence!,
                                                            nombre_occurrences: e.target.value ? Number(e.target.value) : undefined,
                                                            date_fin: undefined
                                                        }
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none pr-12"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">fois</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Ou jusqu'au</label>
                                            <input
                                                type="date"
                                                value={formData.parametres_recurrence.date_fin?.split('T')[0] || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    parametres_recurrence: {
                                                        ...formData.parametres_recurrence!,
                                                        date_fin: e.target.value ? e.target.value : undefined,
                                                        nombre_occurrences: undefined
                                                    }
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic text-center">
                                        (Remplissez soit le nombre de fois, soit la date de fin)
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            {tache ? 'Modifier' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ============================================================================
// CUSTOM EVENT COMPONENT
// ============================================================================

const TaskEvent = ({ event }: { event: CalendarEvent }) => {
    const tache = event.resource;
    // Gestion robuste du nom structure (snake_case vs camelCase)
    const clientName = (tache.client_detail as any)?.nom_structure || tache.client_detail?.nomStructure || 'Aucun client';

    return (
        <div className="flex flex-col h-full justify-start leading-tight min-h-[24px]">
            <div className="font-semibold text-xs truncate">
                {tache.type_tache_detail.nom_tache}
            </div>
            <div className="text-[10px] truncate opacity-90 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-black/20 shrink-0" />
                {!tache.client_detail ? (
                    <span className="text-red-700 font-bold flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Aucun client
                    </span>
                ) : (
                    clientName
                )}
            </div>
            {tache.equipe_detail && (
                <div className="text-[9px] opacity-75 mt-0.5 truncate">
                    👥 {tache.equipe_detail.nomEquipe}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// MAIN PLANNING COMPONENT
// ============================================================================

const Planning: React.FC = () => {
    const [taches, setTaches] = useState<Tache[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedTache, setSelectedTache] = useState<Tache | null>(null);
    const [filterEquipe, setFilterEquipe] = useState<number | 'all'>('all');

    // Nouveaux filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClient, setFilterClient] = useState<number | 'all'>('all');
    const [filterStatut, setFilterStatut] = useState<string>('all');
    const [filterType, setFilterType] = useState<number | 'all'>('all');
    const [tacheToDelete, setTacheToDelete] = useState<number | null>(null);

    // Load initial data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [tachesData, clientsData, equipesData, typesData] = await Promise.all([
                planningService.getTaches(),
                fetchClients().then(data => data.results || data),
                fetchEquipes().then(data => data.results || data),
                planningService.getTypesTaches()
            ]);

            setTaches(tachesData.results || tachesData);
            setClients(Array.isArray(clientsData) ? clientsData : []);
            setEquipes(Array.isArray(equipesData) ? equipesData : []);
            setTypesTaches(typesData);
        } catch (err) {
            setError('Erreur lors du chargement des données');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTache = async (data: TacheCreate) => {
        if (!selectedTache) return;
        try {
            const updateData: TacheUpdate = {
                ...data,
                date_debut_planifiee: new Date(data.date_debut_planifiee).toISOString(),
                date_fin_planifiee: new Date(data.date_fin_planifiee).toISOString()
            };
            await planningService.updateTache(selectedTache.id, updateData);
            await loadData();
            setShowCreateForm(false);
            setSelectedTache(null);
        } catch (err) {
            alert('Erreur lors de la modification');
            console.error(err);
        }
    };

    const handleCreateTache = async (data: TacheCreate) => {
        try {
            const createData = {
                ...data,
                date_debut_planifiee: new Date(data.date_debut_planifiee).toISOString(),
                date_fin_planifiee: new Date(data.date_fin_planifiee).toISOString()
            };

            await planningService.createTache(createData);
            await loadData();
            setShowCreateForm(false);
        } catch (err) {
            alert('Erreur lors de la création de la tâche');
            console.error(err);
        }
    };

    const handleDeleteTache = (id: number) => {
        setTacheToDelete(id);
    };

    const confirmDelete = async () => {
        if (!tacheToDelete) return;
        try {
            await planningService.deleteTache(tacheToDelete);
            await loadData();
            setSelectedTache(null);
            setTacheToDelete(null);
        } catch (err) {
            alert('Erreur lors de la suppression');
            console.error(err);
        }
    };

    const filteredTaches = useMemo(() => {
        return taches.filter(t => {
            // 1. Filtre Equipe
            if (filterEquipe !== 'all' && t.equipe_detail?.id !== filterEquipe) return false;

            // 2. Filtre Client
            if (filterClient !== 'all' && (t.client_detail as any)?.utilisateur !== filterClient) return false;

            // 3. Filtre Statut
            if (filterStatut !== 'all' && t.statut !== filterStatut) return false;

            // 4. Filtre Type
            if (filterType !== 'all' && t.type_tache_detail.id !== filterType) return false;

            // 5. Recherche textuelle (Tâche, Client, Description)
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const clientName = ((t.client_detail as any)?.nom_structure || t.client_detail?.nomStructure || '').toLowerCase();
                const taskName = t.type_tache_detail.nom_tache.toLowerCase();
                const desc = (t.description_travaux || '').toLowerCase();

                return taskName.includes(term) || clientName.includes(term) || desc.includes(term);
            }

            return true;
        });
    }, [taches, filterEquipe, filterClient, filterStatut, filterType, searchTerm]);

    // Map tasks to RBC events
    const events: CalendarEvent[] = useMemo(() => {
        return filteredTaches.map(tache => ({
            id: tache.id,
            title: `${tache.type_tache_detail.nom_tache} - ${(tache.client_detail as any)?.nom_structure || tache.client_detail?.nomStructure || ''}`,
            start: new Date(tache.date_debut_planifiee),
            end: new Date(tache.date_fin_planifiee),
            resource: tache
        }));
    }, [filteredTaches]);

    // Custom coloring for events
    const eventPropGetter = (event: CalendarEvent) => {
        const tache = event.resource;

        // Si pas de client, style d'alerte (orange/rouge) comme dans la liste
        if (!tache.client_detail) {
            return {
                style: {
                    backgroundColor: '#FFF7ED', // orange-50
                    color: '#7C2D12',           // orange-900
                    borderLeft: '4px solid #F97316', // orange-500
                    borderColor: 'transparent transparent transparent #F97316'
                },
                className: `text-xs rounded shadow-sm opacity-95 hover:opacity-100 hover:shadow-md transition-all`
            };
        }

        const colors = STATUT_TACHE_COLORS[tache.statut] || { bg: 'bg-gray-100', text: 'text-gray-800' };

        let borderClass = 'border-l-4 border-gray-400';
        if (tache.statut === 'PLANIFIEE') borderClass = 'border-l-4 border-blue-500';
        if (tache.statut === 'EN_COURS') borderClass = 'border-l-4 border-orange-500';
        if (tache.statut === 'TERMINEE') borderClass = 'border-l-4 border-green-500';
        if (tache.statut === 'ANNULEE') borderClass = 'border-l-4 border-red-500';

        return {
            className: `${colors.bg} ${colors.text} text-xs ${borderClass} rounded shadow-sm opacity-95 hover:opacity-100 hover:shadow-md transition-all`
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Chargement...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
                    <p className="text-gray-500 mt-1">Gestion des tâches planifiées</p>
                </div>
                <button
                    onClick={() => { setSelectedTache(null); setShowCreateForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Nouvelle tâche
                </button>
            </div>

            {/* Filters & View Toggle */}
            <div className="mb-6 flex flex-col gap-4">
                {/* Ligne du haut : Recherche et Vue */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Rechercher une tâche, un client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg self-start">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${viewMode === 'calendar'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Calendrier
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${viewMode === 'list'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Liste
                        </button>
                    </div>
                </div>

                {/* Ligne du bas : Filtres déroulants */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Filtres ({filteredTaches.length}) :</span>
                    </div>

                    <select
                        value={filterClient}
                        onChange={(e) => setFilterClient(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                    >
                        <option value="all">Tous les clients</option>
                        {clients.map(c => (
                            <option key={c.utilisateur} value={c.utilisateur}>
                                {(c as any).nom_structure || c.nomStructure || 'Client sans nom'}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                    >
                        <option value="all">Tous les types</option>
                        {typesTaches.map(t => (
                            <option key={t.id} value={t.id}>{t.nom_tache}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatut}
                        onChange={(e) => setFilterStatut(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                    >
                        <option value="all">Tous les statuts</option>
                        {Object.entries(STATUT_TACHE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                    <select
                        value={filterEquipe}
                        onChange={(e) => setFilterEquipe(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                    >
                        <option value="all">Toutes les équipes</option>
                        {equipes.map((equipe) => (
                            <option key={equipe.id} value={equipe.id}>
                                {equipe.nomEquipe}
                            </option>
                        ))}
                    </select>
                </div>
            </div>


            {/* Content */}
            <div className="flex-1 overflow-hidden bg-white rounded-lg border border-gray-200">
                {viewMode === 'calendar' ? (
                    <div className="h-full p-4">
                        <BigCalendar
                            components={{
                                event: TaskEvent
                            }}
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            messages={{
                                next: "Suivant",
                                previous: "Précédent",
                                today: "Aujourd'hui",
                                month: "Mois",
                                week: "Semaine",
                                day: "Jour",
                                agenda: "Agenda",
                                date: "Date",
                                time: "Heure",
                                event: "Événement",
                                noEventsInRange: "Aucune tâche dans cette période.",
                            }}
                            culture='fr'
                            onSelectEvent={(event) => setSelectedTache(event.resource)}
                            eventPropGetter={eventPropGetter}
                            views={['month', 'week', 'day', 'agenda']}
                        />
                    </div>
                ) : (
                    <div className="p-4 space-y-3 overflow-y-auto h-full">
                        {filteredTaches.map((tache) => {
                            const statutColors = STATUT_TACHE_COLORS[tache.statut];
                            const prioriteColors = PRIORITE_COLORS[tache.priorite];

                            return (
                                <div
                                    key={tache.id}
                                    onClick={() => setSelectedTache(tache)}
                                    className={`p-4 border rounded-lg cursor-pointer transition-all ${!tache.client_detail
                                        ? 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                                        : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {tache.type_tache_detail.nom_tache}
                                            </h3>
                                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                                {((tache.client_detail as any)?.nom_structure || tache.client_detail?.nomStructure) ? (
                                                    ((tache.client_detail as any)?.nom_structure || tache.client_detail?.nomStructure)
                                                ) : (
                                                    <>
                                                        <span className="text-orange-600 italic">Aucun client assigné</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedTache(tache);
                                                                setShowCreateForm(true);
                                                            }}
                                                            className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors"
                                                            title="Attribuer un client"
                                                        >
                                                            <UserPlus className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors.bg} ${statutColors.text}`}>
                                                {STATUT_TACHE_LABELS[tache.statut]}
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${prioriteColors.bg} ${prioriteColors.text}`}>
                                                P{tache.priorite}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            {new Date(tache.date_debut_planifiee).toLocaleString('fr-FR')}
                                        </div>
                                        {tache.equipe_detail && (
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                {tache.equipe_detail.nomEquipe}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {
                showCreateForm && (
                    <TaskFormModal
                        tache={selectedTache || undefined}
                        clients={clients}
                        equipes={equipes}
                        typesTaches={typesTaches}
                        onClose={() => setShowCreateForm(false)}
                        onSubmit={selectedTache ? handleUpdateTache : handleCreateTache}
                    />
                )
            }

            {/* Detail Modal */}
            {
                selectedTache && !showCreateForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold">
                                    {selectedTache.type_tache_detail.nom_tache}
                                </h2>
                                <button
                                    onClick={() => setSelectedTache(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Client</span>
                                    <p className="text-gray-900">
                                        {(selectedTache.client_detail as any)?.nom_structure || selectedTache.client_detail?.nomStructure || 'Aucun client assigné'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Dates</span>
                                    <p className="text-gray-900">
                                        Du {new Date(selectedTache.date_debut_planifiee).toLocaleString('fr-FR')} <br />
                                        Au {new Date(selectedTache.date_fin_planifiee).toLocaleString('fr-FR')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Statut</span>
                                    <p className="text-gray-900">{STATUT_TACHE_LABELS[selectedTache.statut]}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Priorité</span>
                                    <p className="text-gray-900">{PRIORITE_LABELS[selectedTache.priorite]}</p>
                                </div>
                                {selectedTache.commentaires && (
                                    <div>
                                        <span className="text-sm font-medium text-gray-500">Commentaires</span>
                                        <p className="text-gray-900">{selectedTache.commentaires}</p>
                                    </div>
                                )}

                                {selectedTache.id_recurrence_parent && (
                                    <div className="mt-2 p-2 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100 flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        Cette tâche fait partie d'une série récurrente.
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Modifier
                                </button>
                                <button
                                    onClick={() => handleDeleteTache(selectedTache.id)}
                                    className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Supprimer
                                </button>
                                <button
                                    onClick={() => setSelectedTache(null)}
                                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {tacheToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmer la suppression</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setTacheToDelete(null)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Planning;
