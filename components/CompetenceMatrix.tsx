import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface CompetenceMatrixProps {
  operateurs: OperateurList[];
  competences: Competence[];
  onRefresh: () => void;
  itemsPerPage?: number;
}

const NIVEAU_OPTIONS: NiveauCompetence[] = ['NON', 'DEBUTANT', 'INTERMEDIAIRE', 'EXPERT'];

const CompetenceMatrix: React.FC<CompetenceMatrixProps> = ({
  operateurs,
  competences,
  onRefresh,
  itemsPerPage
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
      const active = operateurs.filter(o => o.actif);
      const start = (currentPage - 1) * itemsPerPageLocal;
      const ops = active.slice(start, start + itemsPerPageLocal);
      const results = await Promise.all(
        ops.map(op => fetchOperateurById(op.utilisateur).catch(() => null))
      );
      results.forEach((detail, index) => {
        const op = ops[index];
        if (detail && op) {
          details.set(op.utilisateur, detail);
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

  const activeOperateurs = operateurs.filter(o => o.actif);
  const totalPages = Math.max(1, Math.ceil(activeOperateurs.length / itemsPerPageLocal));
  const startIndex = (currentPage - 1) * itemsPerPageLocal;
  const endIndex = startIndex + itemsPerPageLocal;
  const visibleOperateurs = activeOperateurs.slice(startIndex, endIndex);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);
  // Utiliser useMemo pour recalculer le tri quand les compétences changent
  const sortedCompetences = useMemo(
    () => [...competences].sort((a, b) => (a.ordreAffichage || 0) - (b.ordreAffichage || 0)),
    [competences]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (activeOperateurs.length === 0 || sortedCompetences.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        {activeOperateurs.length === 0
          ? 'Aucun operateur actif trouve'
          : 'Aucune competence definie'}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
        <div>
          <h3 className="font-semibold text-gray-900">Matrice des competences</h3>
          <p className="text-sm text-gray-500">
            {activeOperateurs.length} opérateur{activeOperateurs.length > 1 ? 's' : ''} × {sortedCompetences.length} compétence{sortedCompetences.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onRefresh();
              loadOperateursDetails();
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-shrink-0 flex-wrap">
        <span className="text-xs text-gray-500 font-medium mr-2">Légende :</span>
        {NIVEAU_OPTIONS.map(niveau => {
          const colors = getBadgeColors(NIVEAU_COMPETENCE_COLORS, niveau);
          return (
            <span
              key={niveau}
              className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text} mr-1`}
            >
              {NIVEAU_COMPETENCE_LABELS[niveau]}
            </span>
          );
        })}
      </div>

      {/* Matrix table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-auto">
          <table className="w-full border-collapse min-w-max">
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-900 bg-gray-50 sticky left-0 z-20 min-w-[180px]">
                  Opérateur
                </th>
                {sortedCompetences.map(comp => (
                  <th
                    key={comp.id}
                    className="border border-gray-200 px-2 py-2 text-center text-xs font-medium text-gray-700 bg-gray-50 min-w-[120px]"
                    title={comp.description || comp.nomCompetence}
                  >
                    <div className="truncate max-w-[120px]">{comp.nomCompetence}</div>
                    <div className="text-[10px] text-gray-400 font-normal truncate">
                      {comp.categorieDisplay || comp.categorie}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleOperateurs.map(op => (
                <tr key={op.utilisateur} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="font-medium text-gray-900 text-sm">{op.fullName}</div>
                    <div className="text-xs text-gray-500">{op.numeroImmatriculation}</div>
                  </td>
                  {sortedCompetences.map(comp => {
                    const currentNiveau = getOperateurNiveau(op.utilisateur, comp.id);
                    const key = `${op.utilisateur}-${comp.id}`;
                    const isUpdating = updating === key;

                    return (
                      <td
                        key={comp.id}
                        className="border border-gray-200 px-1 py-1 text-center"
                      >
                        {isUpdating ? (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                          </div>
                        ) : (
                          <select
                            value={currentNiveau || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleNiveauChange(
                                  op.utilisateur,
                                  comp.id,
                                  e.target.value as NiveauCompetence
                                );
                              }
                            }}
                            className={`w-full px-1 py-1 text-xs rounded border-0 cursor-pointer focus:ring-2 focus:ring-emerald-500 ${currentNiveau
                              ? `${getBadgeColors(NIVEAU_COMPETENCE_COLORS, currentNiveau).bg} ${getBadgeColors(NIVEAU_COMPETENCE_COLORS, currentNiveau).text}`
                              : 'bg-gray-100 text-gray-400'
                              }`}
                          >
                            <option value="">--</option>
                            {NIVEAU_OPTIONS.map(niveau => (
                              <option key={niveau} value={niveau}>
                                {NIVEAU_COMPETENCE_LABELS[niveau]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
