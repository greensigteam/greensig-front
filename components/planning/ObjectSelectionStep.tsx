import { type FC } from 'react';
import { Search, X, TreePine, CheckCircle2 } from 'lucide-react';
import { DataTable } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import type { InventoryObjectOption } from './TaskFormModal';
import type { TypeTache } from '../../types/planning';

interface ObjectSelectionStepProps {
  loadingObjects: boolean;
  filteredObjects: InventoryObjectOption[];
  availableObjects: InventoryObjectOption[];
  availableTypes: (string | undefined)[];
  availableEtats: (string | undefined)[];
  selectedObjects: InventoryObjectOption[];
  selectedType: TypeTache | null | undefined;
  objectSearchQuery: string;
  objectTypeFilter: string;
  objectEtatFilter: string;
  onSearchChange: (query: string) => void;
  onTypeFilterChange: (type: string) => void;
  onEtatFilterChange: (etat: string) => void;
  onSelectionChange: (objects: InventoryObjectOption[]) => void;
}

const ObjectSelectionStep: FC<ObjectSelectionStepProps> = ({
  loadingObjects,
  filteredObjects,
  availableObjects,
  availableTypes,
  availableEtats,
  selectedObjects,
  selectedType,
  objectSearchQuery,
  objectTypeFilter,
  objectEtatFilter,
  onSearchChange,
  onTypeFilterChange,
  onEtatFilterChange,
  onSelectionChange,
}) => (
  <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Quels objets sont concernés ?</h3>
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
        <div className="sticky top-0 z-20 bg-white pb-2 space-y-2 border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={objectSearchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm placeholder:text-gray-400"
              />
            </div>

            <select
              value={objectTypeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-gray-700 min-w-[140px]"
            >
              <option value="all">Tous types</option>
              {availableTypes.map((type) => {
                const count = availableObjects.filter((o) => o.type === type).length;
                return (
                  <option key={type} value={type}>
                    {type} ({count})
                  </option>
                );
              })}
            </select>

            <select
              value={objectEtatFilter}
              onChange={(e) => onEtatFilterChange(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-gray-700 min-w-[120px]"
            >
              <option value="all">Tous états</option>
              {availableEtats.map((etat) => {
                const count = availableObjects.filter((o) => o.etat === etat).length;
                return (
                  <option key={etat} value={etat}>
                    {etat} ({count})
                  </option>
                );
              })}
            </select>

            {(objectTypeFilter !== 'all' || objectEtatFilter !== 'all') && (
              <button
                onClick={() => {
                  onTypeFilterChange('all');
                  onEtatFilterChange('all');
                }}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Réinitialiser les filtres"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {selectedObjects.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-900">
                  {selectedObjects.length} sélectionné{selectedObjects.length > 1 ? 's' : ''}
                </span>
                <span className="text-xs text-emerald-600">
                  ({[...new Set(selectedObjects.map((o) => o.type))].join(', ')})
                </span>
              </div>
              <button
                onClick={() => onSelectionChange([])}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
              >
                Effacer
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {filteredObjects.length === 0 ? (
            <div className="text-center py-12">
              <TreePine className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium mb-1">Aucun objet compatible trouvé</p>
              {selectedType && (
                <p className="text-sm text-gray-400">
                  Le type de tâche "{selectedType.nom_tache}" ne peut pas être appliqué aux objets
                  de ce site
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
                    ),
                  },
                  {
                    key: 'type',
                    label: 'Type',
                    sortable: true,
                    render: (obj: InventoryObjectOption) => (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        {obj.type}
                      </span>
                    ),
                  },
                  {
                    key: 'famille',
                    label: 'Famille',
                    sortable: true,
                    render: (obj: InventoryObjectOption) => (
                      <span className="text-sm text-gray-600">{obj.famille || '-'}</span>
                    ),
                  },
                  {
                    key: 'superficie',
                    label: 'Superficie',
                    sortable: true,
                    render: (obj: InventoryObjectOption) => (
                      <span className="text-sm text-gray-600">
                        {obj.superficie ? `${obj.superficie} m²` : '-'}
                      </span>
                    ),
                  },
                  {
                    key: 'etat',
                    label: 'État',
                    sortable: true,
                    render: (obj: InventoryObjectOption) =>
                      obj.etat ? (
                        <StatusBadge status={obj.etat} />
                      ) : (
                        <span className="text-gray-400">-</span>
                      ),
                  },
                ]}
                itemsPerPage={15}
                selectable
                selectedIds={new Set(selectedObjects.map((o) => String(o.id)))}
                onSelectionChange={(newSelectedIds) => {
                  const newSelection = filteredObjects.filter((obj) =>
                    newSelectedIds.has(String(obj.id)),
                  );
                  const objectsNotInFiltered = selectedObjects.filter(
                    (obj) => !filteredObjects.some((fo) => fo.id === obj.id),
                  );
                  onSelectionChange([...objectsNotInFiltered, ...newSelection]);
                }}
                getItemId={(obj) => String(obj.id)}
              />
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

export default ObjectSelectionStep;
