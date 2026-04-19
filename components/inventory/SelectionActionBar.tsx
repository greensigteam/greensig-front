import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ClipboardList, Trash2, Ban, Map as MapIconAlias } from 'lucide-react';

interface SelectedItemData {
  id: string;
  type: string;
  name: string;
  siteId: string;
  zone?: string;
  code?: string;
  state: string;
  coordinates?: { lat: number; lng: number };
}

interface SelectionActionBarProps {
  selectedItemsCache: Map<string, SelectedItemData>;
  isTaskCompatible: boolean;
  compatibilityLoading: boolean;
  applicableTasksCount: number | null;
  modalLoading: boolean;
  canCreateTask: boolean;
  isAdmin: boolean;
  onClearSelection: () => void;
  onOpenTaskModal: () => void;
  onBulkDelete: () => void;
}

export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selectedItemsCache,
  isTaskCompatible,
  compatibilityLoading,
  applicableTasksCount,
  modalLoading,
  canCreateTask,
  isAdmin,
  onClearSelection,
  onOpenTaskModal,
  onBulkDelete,
}) => {
  const navigate = useNavigate();

  if (selectedItemsCache.size === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[95vw] no-print">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 px-4 py-3 flex items-center gap-4">
        {/* Selection count */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-emerald-100 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full text-sm">
            {selectedItemsCache.size}
          </span>
          <span className="text-slate-600 text-sm whitespace-nowrap">
            sélectionné{selectedItemsCache.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-1">
            {[...new Set(Array.from(selectedItemsCache.values()).map((item) => item.type))].map(
              (type) => (
                <span
                  key={type}
                  className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded capitalize"
                >
                  {type}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 flex-shrink-0"></div>

        {canCreateTask && !isTaskCompatible && !compatibilityLoading && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
            <Ban className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs text-red-700 whitespace-nowrap">Types incompatibles</span>
          </div>
        )}

        {canCreateTask &&
          isTaskCompatible &&
          applicableTasksCount !== null &&
          !compatibilityLoading && (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg flex-shrink-0">
              <span className="text-xs text-emerald-700 whitespace-nowrap">
                {applicableTasksCount} tâche{applicableTasksCount > 1 ? 's' : ''}
              </span>
            </div>
          )}

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onClearSelection}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Effacer la sélection"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const cachedItems = Array.from(selectedItemsCache.values());
              const objectsForMap = cachedItems.map((item) => ({
                id: item.id,
                type: item.type,
                title: item.name,
                subtitle: item.siteId,
                coordinates: item.coordinates,
                attributes: {
                  code: item.code,
                  state: item.state,
                  zone: item.zone,
                },
              }));
              navigate('/map', {
                state: {
                  highlightFromInventory: true,
                  selectedObjects: objectsForMap,
                },
              });
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium shadow-sm whitespace-nowrap"
          >
            <MapIconAlias className="w-4 h-4" />
            Carte
          </button>

          {canCreateTask && (
            <button
              onClick={onOpenTaskModal}
              disabled={!isTaskCompatible || compatibilityLoading || modalLoading}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium shadow-sm whitespace-nowrap ${
                !isTaskCompatible || compatibilityLoading || modalLoading
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {compatibilityLoading || modalLoading ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ClipboardList className="w-4 h-4" />
                  Tâche
                </>
              )}
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onBulkDelete}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium shadow-sm whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
