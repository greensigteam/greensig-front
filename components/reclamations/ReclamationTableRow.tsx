import React from 'react';
import { ClipboardList, Edit2, Trash2, X, MoreVertical, Eye, EyeOff } from 'lucide-react';
import type { Reclamation } from '../../types/reclamations';

interface ReclamationTableRowProps {
  rec: Reclamation;
  currentUserId: number | undefined;
  isAdmin: boolean;
  isClient: boolean;
  isSupervisor: boolean;
  rowMenuOpen: number | null;
  onRowMenuToggle: (id: number | null) => void;
  onDetails: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onOpenTaskModal: (rec: Reclamation) => void;
  onToggleVisibility: (rec: Reclamation) => void;
}

const ReclamationTableRow: React.FC<ReclamationTableRowProps> = ({
  rec,
  currentUserId,
  isAdmin,
  isClient,
  isSupervisor,
  rowMenuOpen,
  onRowMenuToggle,
  onDetails,
  onEdit,
  onDelete,
  onOpenTaskModal,
  onToggleVisibility,
}) => {
  return (
    <tr
      onClick={() => onDetails(rec.id)}
      className="hover:bg-slate-50 transition-colors group cursor-pointer"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">{rec.numero_reclamation}</span>
          {rec.visible_client === false && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700"
              title="Réclamation interne (masquée au client)"
            >
              <EyeOff className="w-3 h-3" />
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
        {rec.type_reclamation_nom}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: (rec.urgence_couleur || '#ccc') + '20',
            color: rec.urgence_couleur || '#666',
          }}
        >
          {rec.urgence_niveau}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col min-w-[150px]">
          <span className="text-sm font-medium text-slate-800">{rec.site_nom}</span>
          {rec.zone_nom && <span className="text-xs text-slate-400">{rec.zone_nom}</span>}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
        {rec.createur_nom || <span className="text-slate-400 italic">Anonyme</span>}
      </td>
      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
        {new Date(rec.date_creation).toLocaleDateString('fr-FR')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    ${
                      rec.statut === 'NOUVELLE'
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : rec.statut === 'RESOLUE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : rec.statut === 'EN_COURS'
                            ? 'bg-orange-50 text-orange-700 border border-orange-100'
                            : rec.statut === 'EN_ATTENTE_VALIDATION_CLOTURE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : rec.statut === 'CLOTUREE'
                                ? 'bg-green-50 text-green-700 border border-green-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }
                `}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              rec.statut === 'NOUVELLE'
                ? 'bg-red-500'
                : rec.statut === 'RESOLUE'
                  ? 'bg-emerald-500'
                  : rec.statut === 'EN_COURS'
                    ? 'bg-orange-500'
                    : rec.statut === 'EN_ATTENTE_VALIDATION_CLOTURE'
                      ? 'bg-emerald-500'
                      : rec.statut === 'CLOTUREE'
                        ? 'bg-green-500'
                        : 'bg-slate-400'
            }`}
          />
          {rec.statut_display || rec.statut}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-end items-center gap-2" data-row-menu>
          {isSupervisor && rec.statut === 'NOUVELLE' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenTaskModal(rec);
              }}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 group/btn"
              title="Planifier une tâche"
            >
              <ClipboardList className="w-5 h-5 transition-transform group-hover/btn:scale-110" />
            </button>
          )}

          {(!isClient || rec.createur === currentUserId) && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRowMenuToggle(rowMenuOpen === rec.id ? null : rec.id);
                }}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  rowMenuOpen === rec.id
                    ? 'bg-slate-100 text-slate-800'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {rowMenuOpen === rec.id && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-[60] animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-black/5">
                  {rec.statut === 'REJETEE' && (
                    <div className="px-4 py-2.5 text-xs text-red-600 bg-red-50 border-b border-red-100">
                      <X className="w-3 h-3 inline mr-1" />
                      Réclamation rejetée (lecture seule)
                    </div>
                  )}

                  {!isClient && rec.statut !== 'CLOTUREE' && rec.statut !== 'REJETEE' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTaskModal(rec);
                        onRowMenuToggle(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <ClipboardList className="w-4 h-4 text-purple-500" />
                      Créer une tâche
                    </button>
                  )}

                  {rec.createur === currentUserId &&
                    rec.statut !== 'CLOTUREE' &&
                    rec.statut !== 'REJETEE' && (
                      <>
                        {!isClient && <div className="my-1 border-t border-slate-100" />}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(rec.id);
                            onRowMenuToggle(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-emerald-500" />
                          Modifier
                        </button>
                      </>
                    )}

                  {(isAdmin || isSupervisor) && !rec.createur_est_client && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVisibility(rec);
                          onRowMenuToggle(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        {rec.visible_client ? (
                          <EyeOff className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Eye className="w-4 h-4 text-blue-500" />
                        )}
                        {rec.visible_client ? 'Masquer au client' : 'Rendre visible'}
                      </button>
                    </>
                  )}

                  {isAdmin && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(rec.id);
                          onRowMenuToggle(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default ReclamationTableRow;
