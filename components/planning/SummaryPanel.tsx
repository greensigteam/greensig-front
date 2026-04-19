import type { FC } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Sparkles, MapPin, TreePine, Users, Calendar, Clock } from 'lucide-react';
import type { TypeTache, DistributionChargeData } from '../../types/planning';
import type { EquipeList } from '../../types/users';
import type { InventoryObjectOption } from './TaskFormModal';

interface SummaryPanelProps {
  selectedType: TypeTache | null;
  selectedSite: { id: number; name: string } | null;
  selectedObjects: InventoryObjectOption[];
  selectedEquipes: number[];
  equipes: EquipeList[];
  date: Date;
  startTime: string;
  endTime: string;
  modeDistribution: 'simple' | 'multi-jours';
  distributionsCharge: DistributionChargeData[];
}

const SummaryPanel: FC<SummaryPanelProps> = ({
  selectedType,
  selectedSite,
  selectedObjects,
  selectedEquipes,
  equipes,
  date,
  startTime,
  endTime,
  modeDistribution,
  distributionsCharge,
}) => {
  const selectedEquipesData = equipes.filter((e) => selectedEquipes.includes(e.id));

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="font-semibold text-gray-900">Résumé de la tâche</h3>
      </div>

      {/* Date & Time */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quand</div>
        {modeDistribution === 'simple' ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900">
                {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {startTime} → {endTime}
              </span>
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900">
                {distributionsCharge.length} jour{distributionsCharge.length > 1 ? 's' : ''} de
                travail
              </span>
            </div>
            {distributionsCharge.length > 0 && (
              <div className="text-xs text-gray-500 ml-6">
                Du{' '}
                {format(
                  new Date(
                    [...distributionsCharge].sort((a, b) => a.date.localeCompare(b.date))[0]!.date,
                  ),
                  'dd/MM/yyyy',
                  { locale: fr },
                )}{' '}
                au{' '}
                {format(
                  new Date(
                    [...distributionsCharge].sort((a, b) => a.date.localeCompare(b.date))[
                      distributionsCharge.length - 1
                    ]!.date,
                  ),
                  'dd/MM/yyyy',
                  { locale: fr },
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Type de tâche */}
      {selectedType && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Type de tâche
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-emerald-700">{selectedType.nom_tache}</span>
          </div>
        </div>
      )}

      {/* Site */}
      {selectedSite && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Site</div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">{selectedSite.name}</span>
          </div>
        </div>
      )}

      {/* Objets */}
      {selectedObjects.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Objets ({selectedObjects.length})
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedObjects.slice(0, 5).map((obj) => (
              <div
                key={obj.id}
                className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border border-gray-200"
              >
                <TreePine className="w-3 h-3 text-gray-400" />
                <span className="text-gray-700 truncate">{obj.nom}</span>
              </div>
            ))}
            {selectedObjects.length > 5 && (
              <div className="text-xs text-gray-500 italic">
                +{selectedObjects.length - 5} autre(s)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Équipes */}
      {selectedEquipesData.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Équipes ({selectedEquipesData.length})
          </div>
          <div className="space-y-1">
            {selectedEquipesData.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border border-gray-200"
              >
                <Users className="w-3 h-3 text-gray-400" />
                <span className="text-gray-700">{e.nomEquipe}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryPanel;
