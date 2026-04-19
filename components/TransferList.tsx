import { useState, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  X,
  Plus,
} from 'lucide-react';
import { PremiumInput } from './modals/PremiumFormComponents';

/**
 * TransferList - Composant de sélection multiple avec double liste
 * Pattern UX standard pour sélectionner des items parmi une large collection
 *
 * Features:
 * - Recherche intégrée dans la liste source
 * - Actions bulk (tout ajouter/retirer)
 * - Compteurs en temps réel
 * - Générique (fonctionne avec n'importe quel type d'objet)
 */

export interface TransferListProps<T> {
  // Données
  available: T[]; // Items disponibles
  selected: T[]; // Items sélectionnés
  onChange: (selected: T[]) => void; // Callback quand la sélection change

  // Configuration
  getItemId: (item: T) => string | number; // Fonction pour obtenir l'ID unique d'un item
  getItemLabel: (item: T) => string; // Fonction pour obtenir le label d'affichage
  getItemSubtitle?: (item: T) => string; // Fonction optionnelle pour obtenir un sous-titre

  // Labels
  availableLabel?: string;
  selectedLabel?: string;
  searchPlaceholder?: string;
  emptyAvailableMessage?: string;
  emptySelectedMessage?: string;

  // Actions
  onAddNew?: () => void; // Callback pour créer un nouvel élément

  // Style
  height?: string; // Hauteur des listes (default: '300px')
}

export function TransferList<T>({
  available,
  selected,
  onChange,
  getItemId,
  getItemLabel,
  getItemSubtitle,
  availableLabel = 'Disponibles',
  selectedLabel = 'Sélectionnés',
  searchPlaceholder = 'Rechercher...',
  emptyAvailableMessage = 'Aucun élément disponible',
  emptySelectedMessage = 'Aucun élément sélectionné',
  onAddNew,
  height = '300px',
}: TransferListProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredAvailable, setHoveredAvailable] = useState<string | number | null>(null);
  const [hoveredSelected, setHoveredSelected] = useState<string | number | null>(null);

  // Filtrer les items disponibles (exclure ceux déjà sélectionnés)
  const availableItems = useMemo(() => {
    const selectedIds = new Set(selected.map(getItemId));
    return available.filter((item) => !selectedIds.has(getItemId(item)));
  }, [available, selected, getItemId]);

  // Appliquer la recherche sur les items disponibles
  const filteredAvailable = useMemo(() => {
    if (!searchQuery.trim()) return availableItems;

    const query = searchQuery.toLowerCase();
    return availableItems.filter((item) => {
      const label = getItemLabel(item).toLowerCase();
      const subtitle = getItemSubtitle?.(item)?.toLowerCase() || '';
      return label.includes(query) || subtitle.includes(query);
    });
  }, [availableItems, searchQuery, getItemLabel, getItemSubtitle]);

  // Actions
  const addItem = (item: T) => {
    onChange([...selected, item]);
  };

  const removeItem = (item: T) => {
    onChange(selected.filter((s) => getItemId(s) !== getItemId(item)));
  };

  const addAll = () => {
    onChange([...selected, ...filteredAvailable]);
  };

  const removeAll = () => {
    onChange([]);
  };

  return (
    <div className="flex gap-3">
      {/* Liste Disponibles */}
      <div className="flex-1 flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white">
        {/* Header */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{availableLabel}</span>
            <div className="flex items-center gap-2">
              {onAddNew && (
                <button
                  type="button"
                  onClick={onAddNew}
                  className="p-1 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                  title="Créer un nouveau"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <span className="text-xs text-gray-500">
                {filteredAvailable.length} / {availableItems.length}
              </span>
            </div>
          </div>
          {/* Recherche */}
          <div className="relative">
            <PremiumInput
              type="text"
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              placeholder={searchPlaceholder}
              icon={<Search className="w-4 h-4" />}
              variant="outlined"
              size="sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                title="Effacer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        <div className="overflow-y-auto" style={{ height, maxHeight: height }}>
          {filteredAvailable.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
              {searchQuery ? 'Aucun résultat' : emptyAvailableMessage}
            </div>
          ) : (
            <div className="p-0.5">
              {filteredAvailable.map((item) => {
                const id = getItemId(item);
                const isHovered = hoveredAvailable === id;

                return (
                  <button
                    key={id}
                    onClick={() => addItem(item)}
                    onMouseEnter={() => setHoveredAvailable(id)}
                    onMouseLeave={() => setHoveredAvailable(null)}
                    className={`w-full text-left px-2 py-1 rounded transition-colors ${
                      isHovered
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {getItemLabel(item)}
                        </div>
                        {getItemSubtitle && (
                          <div className="text-[10px] text-gray-500 truncate leading-tight">
                            {getItemSubtitle(item)}
                          </div>
                        )}
                      </div>
                      {isHovered && (
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Boutons centraux */}
      <div className="flex flex-col justify-center gap-2">
        <button
          onClick={addAll}
          disabled={filteredAvailable.length === 0}
          className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Tout ajouter"
        >
          <ChevronsRight className="w-5 h-5" />
        </button>
        <button
          onClick={removeAll}
          disabled={selected.length === 0}
          className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Tout retirer"
        >
          <ChevronsLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Liste Sélectionnés */}
      <div className="flex-1 flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white">
        {/* Header */}
        <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">{selectedLabel}</span>
            <span className="text-xs text-emerald-600 font-semibold">{selected.length}</span>
          </div>
        </div>

        {/* Liste */}
        <div className="overflow-y-auto" style={{ height, maxHeight: height }}>
          {selected.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
              {emptySelectedMessage}
            </div>
          ) : (
            <div className="p-0.5">
              {selected.map((item) => {
                const id = getItemId(item);
                const isHovered = hoveredSelected === id;

                return (
                  <button
                    key={id}
                    onClick={() => removeItem(item)}
                    onMouseEnter={() => setHoveredSelected(id)}
                    onMouseLeave={() => setHoveredSelected(null)}
                    className={`w-full text-left px-2 py-1 rounded transition-colors ${
                      isHovered
                        ? 'bg-red-50 border border-red-200'
                        : 'hover:bg-emerald-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      {isHovered && (
                        <ChevronLeft className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {getItemLabel(item)}
                        </div>
                        {getItemSubtitle && (
                          <div className="text-[10px] text-gray-500 truncate leading-tight">
                            {getItemSubtitle(item)}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransferList;
