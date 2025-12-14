import React, { useState } from 'react';
import { Calendar, Plus, Users, Clock, MapPin } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import {
    MOCK_INTERVENTIONS,
    MOCK_SITES,
    MOCK_TEAMS,
    Intervention,
    getSiteById,
    getTeamById
} from '../services/mockData';

// User 3.3.5: Calendar View Component
const CalendarView: React.FC<{
    interventions: Intervention[];
    onInterventionClick: (intervention: Intervention) => void;
}> = ({ interventions, onInterventionClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Get days in month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

    // Get interventions for a specific day
    const getInterventionsForDay = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return interventions.filter(int => int.scheduledDate === dateStr);
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                    {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                        ←
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                        Aujourd'hui
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                        →
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                    </div>
                ))}

                {/* Empty cells before first day */}
                {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square border border-gray-100 bg-gray-50" />
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const dayInterventions = getInterventionsForDay(day);
                    const isToday = new Date().getDate() === day &&
                        new Date().getMonth() === currentDate.getMonth() &&
                        new Date().getFullYear() === currentDate.getFullYear();

                    return (
                        <div
                            key={day}
                            className={`aspect-square border border-gray-200 p-1 hover:bg-gray-50 cursor-pointer ${isToday ? 'bg-emerald-50 border-emerald-600' : ''
                                }`}
                        >
                            <div className={`text-xs font-medium ${isToday ? 'text-emerald-600' : 'text-gray-700'}`}>
                                {day}
                            </div>
                            <div className="space-y-0.5 mt-1">
                                {dayInterventions.slice(0, 2).map((int) => (
                                    <div
                                        key={int.id}
                                        onClick={() => onInterventionClick(int)}
                                        className={`text-[10px] px-1 py-0.5 rounded truncate ${int.status === 'planifiee' ? 'bg-blue-100 text-blue-700' :
                                                int.status === 'en_cours' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-green-100 text-green-700'
                                            }`}
                                    >
                                        {int.title.substring(0, 15)}...
                                    </div>
                                ))}
                                {dayInterventions.length > 2 && (
                                    <div className="text-[10px] text-gray-500">
                                        +{dayInterventions.length - 2}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// User 3.3.1: Create Task Form
const CreateTaskModal: React.FC<{
    onClose: () => void;
    onCreate: (task: Partial<Intervention>) => void;
}> = ({ onClose, onCreate }) => {
    const [formData, setFormData] = useState({
        title: '',
        type: 'tonte' as Intervention['type'],
        siteId: '',
        zone: '',
        scheduledDate: '',
        scheduledTime: '',
        duration: 120,
        teamId: '',
        description: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900">Nouvelle tâche</h2>
                        <p className="text-sm text-gray-500 mt-1">User 3.3.1: Créer une intervention</p>
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Titre <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Ex: Tonte pelouse Villa Al Amal"
                            />
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="tonte">Tonte</option>
                                <option value="taille">Taille</option>
                                <option value="arrosage">Arrosage</option>
                                <option value="traitement">Traitement</option>
                                <option value="plantation">Plantation</option>
                                <option value="entretien">Entretien</option>
                            </select>
                        </div>

                        {/* Site & Zone */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Site <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.siteId}
                                    onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">Sélectionner</option>
                                    {MOCK_SITES.map((site) => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Zone</label>
                                <input
                                    type="text"
                                    value={formData.zone}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="Ex: Jardin principal"
                                />
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="date"
                                    value={formData.scheduledDate}
                                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                                <input
                                    type="time"
                                    value={formData.scheduledTime}
                                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Duration & Team */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Durée (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    min="15"
                                    step="15"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Équipe <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.teamId}
                                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">Sélectionner</option>
                                    {MOCK_TEAMS.map((team) => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Détails de l'intervention..."
                            />
                        </div>
                    </div>

                    {/* Footer */}
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
                            Créer la tâche
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main Planning Component
const Planning: React.FC = () => {
    const [interventions, setInterventions] = useState(MOCK_INTERVENTIONS);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [filterTeam, setFilterTeam] = useState<string>('all');

    // User 3.3.7: Filter by team
    const filteredInterventions = interventions.filter((int) =>
        filterTeam === 'all' || int.teamId === filterTeam
    );

    // User 3.3.1: Create new task
    const handleCreateTask = (data: Partial<Intervention>) => {
        const newIntervention: Intervention = {
            id: `int-${Date.now()}`,
            title: data.title!,
            type: data.type!,
            siteId: data.siteId!,
            zone: data.zone || '',
            status: 'planifiee',
            priority: 'moyenne',
            scheduledDate: data.scheduledDate!,
            scheduledTime: data.scheduledTime,
            duration: data.duration || 120,
            teamId: data.teamId!,
            assignedTo: [],
            description: data.description || '',
            coordinates: { lat: 0, lng: 0 },
            photosBefore: [],
            photosAfter: []
        };
        setInterventions([...interventions, newIntervention]);
    };

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
                    <p className="text-gray-500 mt-1">Gestion des interventions planifiées</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Nouvelle tâche
                </button>
            </div>

            {/* Filters & View Toggle */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3">
                {/* View Mode */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'calendar'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Calendrier
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'list'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Liste
                    </button>
                </div>

                {/* Team Filter */}
                <select
                    value={filterTeam}
                    onChange={(e) => setFilterTeam(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                    <option value="all">Toutes les équipes</option>
                    {MOCK_TEAMS.map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                </select>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'calendar' ? (
                    <CalendarView
                        interventions={filteredInterventions}
                        onInterventionClick={setSelectedIntervention}
                    />
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 overflow-y-auto h-full">
                        {filteredInterventions.map((int) => (
                            <div
                                key={int.id}
                                onClick={() => setSelectedIntervention(int)}
                                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-gray-900">{int.title}</h3>
                                    <StatusBadge status={int.status} type="intervention" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(int.scheduledDate).toLocaleDateString('fr-FR')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {int.scheduledTime || '--:--'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        {getSiteById(int.siteId)?.name}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        {getTeamById(int.teamId)?.name}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Task Modal */}
            {showCreateForm && (
                <CreateTaskModal
                    onClose={() => setShowCreateForm(false)}
                    onCreate={handleCreateTask}
                />
            )}

            {/* Intervention Detail Modal (reuse from Interventions page) */}
            {selectedIntervention && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
                        <h2 className="text-2xl font-bold mb-4">{selectedIntervention.title}</h2>
                        <p className="text-gray-600 mb-4">{selectedIntervention.description}</p>
                        <button
                            onClick={() => setSelectedIntervention(null)}
                            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
