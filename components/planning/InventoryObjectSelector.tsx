import { type FC } from 'react';
import { X, Search, ChevronDown, TreePine, MapPin } from 'lucide-react';
import type { InventoryObjectOption } from './TaskFormModal';

interface InventoryObjectSelectorProps {
  selectedObjects: InventoryObjectOption[];
  showSelector: boolean;
  onToggleSelector: () => void;
  lockedSite: { id: number | null; name: string } | null;
  siteFilter?: { id: number; name: string };
  filteredObjects: InventoryObjectOption[];
  loadingObjects: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleObject: (obj: InventoryObjectOption) => void;
  onRemoveObject: (id: number) => void;
  onClearObjects: () => void;
}

const InventoryObjectSelector: FC<InventoryObjectSelectorProps> = ({
  selectedObjects,
  showSelector,
  onToggleSelector,
  lockedSite,
  siteFilter,
  filteredObjects,
  loadingObjects,
  searchQuery,
  onSearchChange,
  onToggleObject,
  onRemoveObject,
  onClearObjects,
}) => (
  <div className="border-t pt-4">
    <div className="flex items-center justify-between mb-3">
      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
        <TreePine className="w-4 h-4" />
        Objets concernés
        {selectedObjects.length > 0 && (
          <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
            {selectedObjects.length}
          </span>
        )}
      </label>
      <button
        type="button"
        onClick={onToggleSelector}
        className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
      >
        {showSelector ? 'Masquer' : 'Sélectionner'}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showSelector ? 'rotate-180' : ''}`}
        />
      </button>
    </div>

    {lockedSite && (
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <MapPin className="w-4 h-4" />
          <span>
            Site : <strong>{lockedSite.name}</strong>
          </span>
          <span className="text-blue-500 text-xs">
            (seuls les objets et équipes de ce site sont affichés)
          </span>
        </div>
        {!siteFilter && selectedObjects.length > 0 && (
          <button
            type="button"
            onClick={onClearObjects}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Changer de site
          </button>
        )}
      </div>
    )}

    {selectedObjects.length > 0 && (
      <div className="flex flex-wrap gap-2 mb-3">
        {selectedObjects.map((obj) => (
          <span
            key={obj.id}
            className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full border border-emerald-200"
          >
            <span className="font-medium">{obj.nom}</span>
            {obj.superficie && (
              <span className="text-emerald-600 font-semibold">
                • {obj.superficie.toFixed(0)}m²
              </span>
            )}
            <span className="text-emerald-500">#{obj.id}</span>
            <button
              type="button"
              onClick={() => onRemoveObject(obj.id)}
              className="ml-1 hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    )}

    {showSelector && (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par nom, type ou site..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1">
          {loadingObjects ? (
            <div className="text-center py-4 text-slate-500 text-sm">Chargement...</div>
          ) : filteredObjects.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-sm">
              {searchQuery
                ? 'Aucun résultat pour cette recherche'
                : lockedSite
                  ? `Aucun autre objet disponible sur le site "${lockedSite.name}"`
                  : 'Aucun objet disponible'}
            </div>
          ) : (
            filteredObjects.slice(0, 50).map((obj) => {
              const isSelected = selectedObjects.some((o) => o.id === obj.id);
              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => onToggleObject(obj)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-white hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{obj.nom}</span>
                      <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                        {obj.type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {obj.site}
                      {obj.soussite && ` → ${obj.soussite}`}
                    </div>
                  </div>
                  {isSelected && <span className="ml-2 text-emerald-600">✓</span>}
                </button>
              );
            })
          )}
          {filteredObjects.length > 50 && (
            <div className="text-center py-2 text-xs text-slate-400">
              +{filteredObjects.length - 50} autres résultats...
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

export default InventoryObjectSelector;
