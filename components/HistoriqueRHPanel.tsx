import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Award,
  Clock,
  Filter,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  User,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import {
  HistoriqueRH,
  HistoriqueRHFilters,
  HistoriqueEquipeOperateur,
  Absence,
  CompetenceOperateur,
  OperateurList,
  EquipeList,
  TYPE_ABSENCE_LABELS,
  TYPE_ABSENCE_COLORS,
  STATUT_ABSENCE_LABELS,
  STATUT_ABSENCE_COLORS,
  NIVEAU_COMPETENCE_LABELS,
  NIVEAU_COMPETENCE_COLORS,
  getBadgeColors
} from '../types/users';
import { fetchHistoriqueRH } from '../services/usersApi';

interface HistoriqueRHPanelProps {
  operateurs: OperateurList[];
  equipes: EquipeList[];
  chefsPotentiels?: OperateurList[];
  searchQuery?: string;
}

type EventType = 'equipe' | 'absence' | 'competence';

interface TimelineEvent {
  id: string;
  type: EventType;
  date: string;
  title: string;
  description: string;
  operateur?: string;
  equipe?: string;
  data: HistoriqueEquipeOperateur | Absence | CompetenceOperateur;
}

const HistoriqueRHPanel: React.FC<HistoriqueRHPanelProps> = ({ operateurs, equipes, chefsPotentiels = [], searchQuery = '' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historique, setHistorique] = useState<HistoriqueRH>({});
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  // Combiner operateurs et chefs d'equipe (sans doublons)
  const allPersonnel = React.useMemo(() => {
    const map = new Map<number, OperateurList>();
    operateurs.forEach(op => map.set(op.id, op));
    chefsPotentiels.forEach(chef => {
      if (!map.has(chef.id)) {
        map.set(chef.id, chef);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [operateurs, chefsPotentiels]);

  // Filtres
  const [filters, setFilters] = useState<HistoriqueRHFilters>({
    operateurId: undefined,
    equipeId: undefined,
    dateDebut: undefined,
    dateFin: undefined,
    type: 'all'
  });

  // Charger les données
  const loadHistorique = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistoriqueRH(filters);
      setHistorique(data);
      buildTimeline(data);
    } catch (err: any) {
      console.error('Erreur chargement historique:', err);
      setError('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  // Construire la timeline à partir des données
  const buildTimeline = (data: HistoriqueRH) => {
    const allEvents: TimelineEvent[] = [];

    // Événements équipes
    if (data.equipes) {
      data.equipes.forEach((h) => {
        allEvents.push({
          id: `equipe-${h.id}`,
          type: 'equipe',
          date: h.dateDebut,
          title: h.dateFin ? 'Changement d\'équipe' : 'Affectation équipe',
          description: h.dateFin
            ? `Quitte l'équipe ${h.equipeNom}`
            : `Rejoint l'équipe ${h.equipeNom} (${h.roleDansEquipe})`,
          operateur: h.operateurNom,
          equipe: h.equipeNom,
          data: h
        });
        if (h.dateFin) {
          allEvents.push({
            id: `equipe-fin-${h.id}`,
            type: 'equipe',
            date: h.dateFin,
            title: 'Fin d\'affectation',
            description: `Quitte l'équipe ${h.equipeNom}`,
            operateur: h.operateurNom,
            equipe: h.equipeNom,
            data: h
          });
        }
      });
    }

    // Événements absences
    if (data.absences) {
      data.absences.forEach((a) => {
        allEvents.push({
          id: `absence-${a.id}`,
          type: 'absence',
          date: a.dateDebut,
          title: `Absence: ${TYPE_ABSENCE_LABELS[a.typeAbsence]}`,
          description: `${a.operateurNom} - Du ${formatDate(a.dateDebut)} au ${formatDate(a.dateFin)} (${a.dureeJours} jours)`,
          operateur: a.operateurNom,
          data: a
        });
      });
    }

    // Événements compétences
    if (data.competences) {
      data.competences.forEach((c) => {
        if (c.dateAcquisition) {
          allEvents.push({
            id: `competence-${c.id}`,
            type: 'competence',
            date: c.dateAcquisition,
            title: 'Acquisition compétence',
            description: `${c.operateurNom} - ${c.competenceDetail?.nomCompetence || 'Compétence'}: ${NIVEAU_COMPETENCE_LABELS[c.niveau]}`,
            operateur: c.operateurNom,
            data: c
          });
        }
      });
    }

    // Trier par date décroissante
    allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEvents(allEvents);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Charger au montage et quand les filtres changent
  useEffect(() => {
    loadHistorique();
  }, []);

  const handleApplyFilters = () => {
    loadHistorique();
  };

  const handleResetFilters = () => {
    setFilters({
      operateurId: undefined,
      equipeId: undefined,
      dateDebut: undefined,
      dateFin: undefined,
      type: 'all'
    });
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'equipe':
        return <Users className="w-4 h-4" />;
      case 'absence':
        return <Calendar className="w-4 h-4" />;
      case 'competence':
        return <Award className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: EventType) => {
    switch (type) {
      case 'equipe':
        return 'bg-blue-500';
      case 'absence':
        return 'bg-orange-500';
      case 'competence':
        return 'bg-green-500';
    }
  };

  const getEventBgColor = (type: EventType) => {
    switch (type) {
      case 'equipe':
        return 'bg-blue-50 border-blue-200';
      case 'absence':
        return 'bg-orange-50 border-orange-200';
      case 'competence':
        return 'bg-green-50 border-green-200';
    }
  };

  // Filtrage par recherche
  const filteredEvents = React.useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event => {
      const matchTitle = event.title.toLowerCase().includes(query);
      const matchDescription = event.description.toLowerCase().includes(query);
      const matchOperateur = event.operateur?.toLowerCase().includes(query);
      const matchEquipe = event.equipe?.toLowerCase().includes(query);
      return matchTitle || matchDescription || matchOperateur || matchEquipe;
    });
  }, [events, searchQuery]);

  // Statistiques
  const stats = {
    equipes: historique.equipes?.length || 0,
    absences: historique.absences?.length || 0,
    competences: historique.competences?.length || 0,
    total: filteredEvents.length
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Historique RH
          </h2>
          <span className="text-sm text-gray-500">
            {stats.total} evenement{stats.total > 1 ? 's' : ''}
            {searchQuery && <span className="text-emerald-600 ml-1">(recherche active)</span>}
          </span>
          {searchQuery && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
              <Search className="w-3 h-3" />
              "{searchQuery}"
            </span>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filtres
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filtres compacts */}
      {showFilters && (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filters.operateurId || ''}
              onChange={(e) => setFilters({ ...filters, operateurId: e.target.value ? Number(e.target.value) : undefined })}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="">Tous personnel</option>
              {allPersonnel.filter(p => p.actif).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName} {person.estChefEquipe ? '(Chef)' : ''}
                </option>
              ))}
            </select>
            <select
              value={filters.equipeId || ''}
              onChange={(e) => setFilters({ ...filters, equipeId: e.target.value ? Number(e.target.value) : undefined })}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="">Toutes equipes</option>
              {equipes.filter(e => e.actif).map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.nomEquipe}</option>
              ))}
            </select>
            <select
              value={filters.type || 'all'}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as HistoriqueRHFilters['type'] })}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="all">Tous types</option>
              <option value="equipes">Equipes</option>
              <option value="absences">Absences</option>
              <option value="competences">Competences</option>
            </select>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Du</span>
              <input
                type="date"
                value={filters.dateDebut || ''}
                onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value || undefined })}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Au</span>
              <input
                type="date"
                value={filters.dateFin || ''}
                onChange={(e) => setFilters({ ...filters, dateFin: e.target.value || undefined })}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              />
            </div>
            <button
              onClick={handleApplyFilters}
              className="px-2 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition-colors flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              Filtrer
            </button>
            {(filters.operateurId || filters.equipeId || filters.type !== 'all' || filters.dateDebut || filters.dateFin) && (
              <button
                onClick={handleResetFilters}
                className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Effacer
              </button>
            )}
            {/* Stats inline */}
            <div className="flex items-center gap-3 ml-auto text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>{stats.equipes}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span>{stats.absences}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>{stats.competences}</span>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal - Timeline */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500">
            <AlertCircle className="w-12 h-12 mb-2" />
            <p>{error}</p>
            <button
              onClick={loadHistorique}
              className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Reessayer
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Clock className="w-12 h-12 mb-2" />
            <p>Aucun evenement trouve</p>
            <p className="text-sm">{searchQuery ? 'Modifiez votre recherche' : 'Modifiez les filtres'} pour voir plus de resultats</p>
          </div>
        ) : (
          <div className="relative">
            {/* Ligne verticale de la timeline */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            {/* Événements */}
            <div className="space-y-4">
              {filteredEvents.map((event, index) => (
                <div key={event.id} className="relative pl-10">
                  {/* Point sur la timeline */}
                  <div className={`absolute left-2 w-5 h-5 rounded-full ${getEventColor(event.type)} flex items-center justify-center text-white`}>
                    {getEventIcon(event.type)}
                  </div>

                  {/* Carte de l'événement */}
                  <div className={`p-3 rounded-lg border ${getEventBgColor(event.type)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{event.description}</p>
                        {event.operateur && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            {event.operateur}
                          </div>
                        )}
                        {event.equipe && event.type === 'equipe' && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                            <Briefcase className="w-3 h-3" />
                            {event.equipe}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {formatDate(event.date)}
                      </span>
                    </div>

                    {/* Détails spécifiques par type */}
                    {event.type === 'absence' && (
                      <div className="mt-2 flex gap-2">
                        {(() => {
                          const absence = event.data as Absence;
                          const typeColors = getBadgeColors(TYPE_ABSENCE_COLORS, absence.typeAbsence);
                          const statutColors = getBadgeColors(STATUT_ABSENCE_COLORS, absence.statut);
                          return (
                            <>
                              <span className={`px-2 py-0.5 rounded text-xs ${typeColors.bg} ${typeColors.text}`}>
                                {TYPE_ABSENCE_LABELS[absence.typeAbsence]}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${statutColors.bg} ${statutColors.text}`}>
                                {STATUT_ABSENCE_LABELS[absence.statut]}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {event.type === 'competence' && (
                      <div className="mt-2">
                        {(() => {
                          const comp = event.data as CompetenceOperateur;
                          const niveauColors = getBadgeColors(NIVEAU_COMPETENCE_COLORS, comp.niveau);
                          return (
                            <span className={`px-2 py-0.5 rounded text-xs ${niveauColors.bg} ${niveauColors.text}`}>
                              {NIVEAU_COMPETENCE_LABELS[comp.niveau]}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoriqueRHPanel;
