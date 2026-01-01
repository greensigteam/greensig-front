import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  TrendingUp, X, Ban, Star, CheckCircle
} from 'lucide-react';
import {
  Competence,
  OperateurList,
  OperateurDetail,
  NiveauCompetence,
  NIVEAU_COMPETENCE_LABELS,
  NIVEAU_COMPETENCE_COLORS,
  getBadgeColors
} from '../types/users';
import {
  fetchOperateurById,
  affecterCompetence
} from '../services/usersApi';

export type ViewMode = 'table' | 'cards';

interface CompetenceMatrixProps {
  operateurs: OperateurList[];
  competences: Competence[];
  searchQuery?: string;
  itemsPerPage?: number;
  viewMode: ViewMode;
  isEditMode: boolean;
  niveauFilter: NiveauCompetence | '';
  categorieFilter: string;
  onViewModeChange: (mode: ViewMode) => void;
  onEditModeChange: (enabled: boolean) => void;
  onNiveauFilterChange: (niveau: NiveauCompetence | '') => void;
  onCategorieFilterChange: (categorie: string) => void;
}

const NIVEAU_OPTIONS: NiveauCompetence[] = ['NON', 'DEBUTANT', 'INTERMEDIAIRE', 'EXPERT'];

const CompetenceMatrix: React.FC<CompetenceMatrixProps> = ({
  operateurs,
  competences,
  searchQuery = '',
  itemsPerPage,
  viewMode,
  isEditMode,
  niveauFilter,
  categorieFilter,
  onViewModeChange,
  onEditModeChange,
  onNiveauFilterChange,
  onCategorieFilterChange
}) => {
  const [operateursDetails, setOperateursDetails] = useState<Map<number, OperateurDetail>>(new Map());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPageLocal = itemsPerPage || 20;

  useEffect(() => {
    loadOperateursDetails();
  }, [operateurs, currentPage, itemsPerPageLocal]);

  const loadOperateursDetails = async () => {
    setLoading(true);
    try {
      const details = new Map<number, OperateurDetail>();
      // Load details for operators visible on the current page (pagination)
      const active = operateurs.filter(o => o.actif !== false);
      const start = (currentPage - 1) * itemsPerPageLocal;
      const ops = active.slice(start, start + itemsPerPageLocal);
      const results = await Promise.all(
        ops.map(op => fetchOperateurById(op.id).catch(() => null))
      );
      results.forEach((detail, index) => {
        const op = ops[index];
        if (detail && op) {
          details.set(op.id, detail);
        }
      });
      setOperateursDetails(details);
    } catch (err) {
      console.error('Erreur chargement details operateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOperateurNiveau = (operateurId: number, competenceId: number): NiveauCompetence | null => {
    const detail = operateursDetails.get(operateurId);
    if (!detail) return null;
    const comp = detail.competencesDetail?.find(c => c.competence === competenceId);
    return comp?.niveau || null;
  };

  const handleNiveauChange = async (
    operateurId: number,
    competenceId: number,
    niveau: NiveauCompetence
  ) => {
    const key = `${operateurId}-${competenceId}`;
    setUpdating(key);
    try {
      await affecterCompetence(operateurId, { competenceId, niveau });
      // Refresh the operator's details
      const updatedDetail = await fetchOperateurById(operateurId);
      setOperateursDetails(prev => {
        const newMap = new Map(prev);
        newMap.set(operateurId, updatedDetail);
        return newMap;
      });
    } catch (err) {
      console.error('Erreur mise a jour competence:', err);
    } finally {
      setUpdating(null);
    }
  };

  // Calculate statistics for an operator
  const getOperateurStats = (operateurId: number) => {
    const detail = operateursDetails.get(operateurId);
    if (!detail) return { NON: 0, DEBUTANT: 0, INTERMEDIAIRE: 0, EXPERT: 0, total: 0 };

    const stats = { NON: 0, DEBUTANT: 0, INTERMEDIAIRE: 0, EXPERT: 0, total: competences.length };
    competences.forEach(comp => {
      const compDetail = detail.competencesDetail?.find(c => c.competence === comp.id);
      const niveau = compDetail?.niveau || 'NON';
      stats[niveau]++;
    });
    return stats;
  };

  // Filter operateurs
  const filteredOperateursIds = useMemo(() => {
    let filtered = operateurs.filter(o => o.actif !== false);

    // Search filter (from header)
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.fullName?.toLowerCase().includes(search) ||
        o.numeroImmatriculation?.toLowerCase().includes(search)
      );
    }

    // Niveau filter
    if (niveauFilter) {
      filtered = filtered.filter(o => {
        const detail = operateursDetails.get(o.id);
        if (!detail) return false;
        return detail.competencesDetail?.some(c => c.niveau === niveauFilter);
      });
    }

    return filtered.map(o => o.id);
  }, [operateurs, searchQuery, niveauFilter, operateursDetails]);

  // Filter competences
  const filteredCompetences = useMemo(() => {
    let filtered = [...competences].sort((a, b) => (a.ordreAffichage || 0) - (b.ordreAffichage || 0));

    if (categorieFilter) {
      filtered = filtered.filter(c =>
        (c.categorieDisplay || c.categorie) === categorieFilter
      );
    }

    return filtered;
  }, [competences, categorieFilter]);

  const activeOperateurs = operateurs.filter(o => o.actif !== false && filteredOperateursIds.includes(o.id));
  const totalPages = Math.max(1, Math.ceil(activeOperateurs.length / itemsPerPageLocal));
  const startIndex = (currentPage - 1) * itemsPerPageLocal;
  const endIndex = startIndex + itemsPerPageLocal;
  const visibleOperateurs = activeOperateurs.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (activeOperateurs.length === 0 || filteredCompetences.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        {activeOperateurs.length === 0
          ? 'Aucun operateur actif trouve'
          : 'Aucune competence definie'}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden shadow-sm">

      {/* Modern Legend with Icons (only for table view) */}
      {viewMode === 'table' && (
        <div className="px-4 py-2.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3 flex-shrink-0 flex-wrap shadow-sm">
          <span className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Niveaux :</span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-300 shadow-sm">
            <Ban className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Non maitrise</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-blue-200 shadow-sm">
            <Star className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">Débutant</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-yellow-200 shadow-sm">
            <TrendingUp className="w-3.5 h-3.5 text-yellow-600" />
            <span className="text-xs font-medium text-gray-700">Intermédiaire</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-green-200 shadow-sm">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-medium text-gray-700">Expert</span>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {/* Cards View */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleOperateurs.map(op => {
              const stats = getOperateurStats(op.id);
              const expertCount = stats.EXPERT;
              const intermediateCount = stats.INTERMEDIAIRE;
              const debutantCount = stats.DEBUTANT;
              const totalAcquis = expertCount + intermediateCount + debutantCount;
              const progressPercent = (totalAcquis / stats.total) * 100;

              return (
                <div
                  key={op.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-emerald-900 p-4 text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{op.fullName}</h4>
                        <p className="text-sm text-emerald-50 mt-1">{op.numeroImmatriculation}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-bold">{Math.round(progressPercent)}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-white h-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-red-100 rounded-lg p-2">
                        <div className="text-2xl font-bold text-red-700">{stats.NON}</div>
                        <div className="text-xs text-red-600 mt-1">Aucune</div>
                      </div>
                      <div className="bg-orange-100 rounded-lg p-2">
                        <div className="text-2xl font-bold text-orange-700">{stats.DEBUTANT}</div>
                        <div className="text-xs text-orange-600 mt-1">Débutant</div>
                      </div>
                      <div className="bg-blue-100 rounded-lg p-2">
                        <div className="text-2xl font-bold text-blue-700">{stats.INTERMEDIAIRE}</div>
                        <div className="text-xs text-blue-600 mt-1">Intermédiaire</div>
                      </div>
                      <div className="bg-emerald-100 rounded-lg p-2">
                        <div className="text-2xl font-bold text-emerald-700">{stats.EXPERT}</div>
                        <div className="text-xs text-emerald-600 mt-1">Expert</div>
                      </div>
                    </div>
                  </div>

                  {/* Competences List (Top 6) */}
                  <div className="p-4 space-y-2 max-h-[280px] overflow-y-auto">
                    {filteredCompetences.slice(0, 6).map(comp => {
                      const currentNiveau = getOperateurNiveau(op.id, comp.id);
                      const key = `${op.id}-${comp.id}`;
                      const isUpdating = updating === key;

                      return (
                        <div key={comp.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{comp.nomCompetence}</div>
                            <div className="text-xs text-gray-500">{comp.categorieDisplay || comp.categorie}</div>
                          </div>

                          {isUpdating ? (
                            <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                          ) : isEditMode ? (
                            // Edit Mode: Select dropdown
                            <select
                              value={currentNiveau || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleNiveauChange(op.id, comp.id, e.target.value as NiveauCompetence);
                                }
                              }}
                              className={`px-2 py-1 text-xs rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-emerald-500 font-medium min-w-[100px] ${
                                currentNiveau
                                  ? `${getBadgeColors(NIVEAU_COMPETENCE_COLORS, currentNiveau).bg} ${getBadgeColors(NIVEAU_COMPETENCE_COLORS, currentNiveau).text}`
                                  : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              <option value="">--</option>
                              {NIVEAU_OPTIONS.map(niveau => (
                                <option key={niveau} value={niveau}>
                                  {NIVEAU_COMPETENCE_LABELS[niveau]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            // Consultation Mode: Badge
                            <span
                              className={`px-2 py-1 text-xs rounded-lg font-medium min-w-[100px] text-center ${
                                currentNiveau
                                  ? `${getBadgeColors(NIVEAU_COMPETENCE_COLORS, currentNiveau).bg} ${getBadgeColors(NIVEAU_COMPETENCE_COLORS, currentNiveau).text}`
                                  : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {currentNiveau ? NIVEAU_COMPETENCE_LABELS[currentNiveau] : 'Non défini'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {filteredCompetences.length > 6 && (
                      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-200">
                        + {filteredCompetences.length - 6} autres compétences
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View - Modern Design */}
        {viewMode === 'table' && (
          <div className="overflow-auto rounded-lg border border-gray-200">
            <table className="w-full border-collapse min-w-max">
              <thead className="sticky top-0 bg-gradient-to-b from-gray-100 to-gray-50 z-10 shadow-sm">
                <tr>
                  <th className="border-r border-gray-300 px-4 py-3 text-left text-sm font-bold text-gray-800 sticky left-0 z-20 min-w-[200px] bg-gradient-to-b from-gray-100 to-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
                      Opérateur
                    </div>
                  </th>
                  {filteredCompetences.map(comp => (
                    <th
                      key={comp.id}
                      className="border-l border-gray-200 px-3 py-3 text-center text-xs font-semibold text-gray-700 min-w-[140px] hover:bg-gray-200 transition-colors"
                      title={comp.description || comp.nomCompetence}
                    >
                      <div className="truncate max-w-[140px] font-bold text-gray-800">{comp.nomCompetence}</div>
                      <div className="text-[10px] text-gray-500 font-medium truncate mt-1 uppercase tracking-wide">
                        {comp.categorieDisplay || comp.categorie}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleOperateurs.map((op, idx) => (
                  <tr key={op.id} className={`transition-all duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-emerald-50 hover:shadow-md`}>
                    <td className="border-r border-gray-300 px-4 py-3 sticky left-0 z-10 bg-inherit">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {op.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{op.fullName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px] font-mono">
                              {op.numeroImmatriculation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {filteredCompetences.map(comp => {
                      const currentNiveau = getOperateurNiveau(op.id, comp.id);
                      const key = `${op.id}-${comp.id}`;
                      const isUpdating = updating === key;

                      return (
                        <td
                          key={comp.id}
                          className="border-l border-gray-200 px-2 py-2 text-center transition-colors"
                        >
                          {isUpdating ? (
                            <div className="flex items-center justify-center py-1">
                              <div className="w-5 h-5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                            </div>
                          ) : isEditMode ? (
                            // Edit Mode: Modern Select dropdown
                            <select
                              value={currentNiveau || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleNiveauChange(
                                    op.id,
                                    comp.id,
                                    e.target.value as NiveauCompetence
                                  );
                                }
                              }}
                              className={`w-full px-2 py-1.5 text-xs rounded-lg border-2 cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium shadow-sm ${currentNiveau
                                ? `${getBadgeColors(NIVEAU_COMPETENCE_COLORS, currentNiveau).bg} ${getBadgeColors(NIVEAU_COMPETENCE_COLORS, currentNiveau).text} border-${currentNiveau === 'NON' ? 'gray' : currentNiveau === 'DEBUTANT' ? 'blue' : currentNiveau === 'INTERMEDIAIRE' ? 'yellow' : 'green'}-300`
                                : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                                }`}
                            >
                              <option value="">--</option>
                              {NIVEAU_OPTIONS.map(niveau => (
                                <option key={niveau} value={niveau}>
                                  {NIVEAU_COMPETENCE_LABELS[niveau]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            // Consultation Mode: Modern Badge with icon
                            <div className="flex items-center justify-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold shadow-sm border-2 transition-all ${
                                  currentNiveau === 'NON'
                                    ? 'bg-gray-100 text-gray-600 border-gray-300'
                                    : currentNiveau === 'DEBUTANT'
                                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                                    : currentNiveau === 'INTERMEDIAIRE'
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                    : currentNiveau === 'EXPERT'
                                    ? 'bg-green-100 text-green-700 border-green-300'
                                    : 'bg-white text-gray-400 border-gray-300'
                                }`}
                              >
                                {currentNiveau === 'NON' && <Ban className="w-3 h-3" />}
                                {currentNiveau === 'DEBUTANT' && <Star className="w-3 h-3" />}
                                {currentNiveau === 'INTERMEDIAIRE' && <TrendingUp className="w-3 h-3" />}
                                {currentNiveau === 'EXPERT' && <CheckCircle className="w-3 h-3" />}
                                <span>{currentNiveau ? NIVEAU_COMPETENCE_LABELS[currentNiveau] : '--'}</span>
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {activeOperateurs.length > itemsPerPageLocal && (
          <div className="px-4 py-2 border-t border-gray-200 bg-white text-sm flex items-center justify-between">
            <div className="text-gray-600">Affichage {startIndex + 1} - {Math.min(endIndex, activeOperateurs.length)} sur {activeOperateurs.length} opérateurs</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                title="Première page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                title="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm font-medium">Page {currentPage} sur {totalPages}</span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                title="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                title="Dernière page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetenceMatrix;
