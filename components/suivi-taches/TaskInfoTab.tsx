import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Package,
  Calendar,
  Users,
  Camera,
  AlertCircle,
  Plus,
  X,
  Loader2,
  Building2,
} from 'lucide-react';
import { Tache, StatusDistribution } from '../../types/planning';
import { PhotoList } from '../../types/suiviTaches';
import { EquipeList } from '../../types/users';
import { getEquipeName } from '../../utils/equipeHelpers';
import DistributionsList from './DistributionsList';

const getFullImageUrl = (url: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const backendUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? '';
  return `${backendUrl}${url}`;
};

export interface TaskInfoTabProps {
  tache: Tache;
  photos: PhotoList[];
  isClientView: boolean;
  availableEquipes: EquipeList[];
  assigningEquipe: boolean;
  onToggleDistribution: (distributionId: number, currentStatus: StatusDistribution) => void;
  onEditDistribution: (distributionId: number) => void;
  onDeleteDistribution: (distributionId: number) => void;
  onAddDistributions: () => void;
  onDemarrerDistribution?: (distributionId: number) => void;
  onTerminerDistribution?: (distributionId: number) => void;
  onReporterDistribution?: (distributionId: number) => void;
  onAnnulerDistribution?: (distributionId: number) => void;
  onRestaurerDistribution?: (distributionId: number) => void;
  onHistoriqueDistribution?: (distributionId: number) => void;
  onGoToDistribution?: (date: string) => void;
  onShowPhotos: () => void;
  onAssignEquipe: (equipeId: number) => void;
  onRemoveEquipe: (equipeId: number) => void;
}

const TaskInfoTab: React.FC<TaskInfoTabProps> = ({
  tache,
  photos,
  isClientView,
  availableEquipes,
  assigningEquipe,
  onToggleDistribution,
  onEditDistribution,
  onDeleteDistribution,
  onAddDistributions,
  onDemarrerDistribution,
  onTerminerDistribution,
  onReporterDistribution,
  onAnnulerDistribution,
  onRestaurerDistribution,
  onHistoriqueDistribution,
  onGoToDistribution,
  onShowPhotos,
  onAssignEquipe,
  onRemoveEquipe,
}) => {
  const [showEquipeDropdown, setShowEquipeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEquipeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      {/* Localisation */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors hover:border-slate-200 transition-colors">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          Localisation
        </h3>

        {tache.structure_client_detail && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-800">
              {tache.structure_client_detail.nom}
            </span>
          </div>
        )}

        {tache.objets_detail && tache.objets_detail.length > 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
            <span className="font-medium text-slate-800">
              {tache.objets_detail[0]?.site_nom || `Site #${tache.objets_detail[0]?.site}`}
            </span>
            <span className="text-slate-500 text-xs">
              ({tache.objets_detail.length} objet{tache.objets_detail.length > 1 ? 's' : ''})
            </span>
          </div>
        ) : tache.site_nom ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
            <span className="font-medium text-slate-800">{tache.site_nom}</span>
            <span className="text-slate-500 text-xs">(via réclamation)</span>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">Aucun objet d'inventaire associé</p>
        )}
      </div>

      {/* Objets concernés */}
      {tache.objets_detail && tache.objets_detail.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Objets concernés
            </span>
            <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
              {tache.objets_detail.length}
            </span>
          </h3>
          <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
            {tache.objets_detail.map((obj, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-slate-200"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {obj.display || obj.nom_type || `Objet #${obj.id}`}
                  </p>
                  <p className="text-xs text-slate-500">ID: {obj.id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Planning
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-500">Début prévu</span>
            <p className="font-medium text-slate-800">
              {new Date(tache.date_debut_planifiee).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Fin prévue</span>
            <p className="font-medium text-slate-800">
              {new Date(tache.date_fin_planifiee).toLocaleDateString('fr-FR')}
            </p>
          </div>
          {tache.date_debut_reelle && (
            <div>
              <span className="text-emerald-600">Début réel</span>
              <p className="font-medium text-slate-800">
                {new Date(tache.date_debut_reelle).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}
          {tache.date_fin_reelle && (
            <div>
              <span className="text-blue-600">Fin réelle</span>
              <p className="font-medium text-slate-800">
                {new Date(tache.date_fin_reelle).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Distribution de charge */}
      <DistributionsList
        tache={tache}
        isClientView={isClientView}
        onToggleDistribution={onToggleDistribution}
        onEditDistribution={onEditDistribution}
        onDeleteDistribution={onDeleteDistribution}
        onAddDistributions={onAddDistributions}
        onDemarrer={onDemarrerDistribution}
        onTerminer={onTerminerDistribution}
        onReporter={onReporterDistribution}
        onAnnuler={onAnnulerDistribution}
        onRestaurer={onRestaurerDistribution}
        onHistorique={onHistoriqueDistribution}
        onGoToDistribution={onGoToDistribution}
      />

      {/* Équipes assignées */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Équipes assignées
          </h3>
          {!isClientView && availableEquipes.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowEquipeDropdown(!showEquipeDropdown)}
                disabled={assigningEquipe}
                className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                title="Assigner une équipe"
              >
                {assigningEquipe ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>

              {showEquipeDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1 max-h-48 overflow-y-auto">
                  {availableEquipes.map((equipe) => (
                    <button
                      key={equipe.id}
                      onClick={() => {
                        onAssignEquipe(equipe.id);
                        setShowEquipeDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Users className="w-3 h-3 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {equipe.nomEquipe}
                        </p>
                        {equipe.sitePrincipalNom && (
                          <p className="text-xs text-slate-500 truncate">
                            {equipe.sitePrincipalNom}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {tache.equipes_detail && tache.equipes_detail.length > 0 ? (
          <div className="space-y-2">
            {tache.equipes_detail.map((equipe: any) => (
              <div
                key={equipe.id}
                className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 group"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{getEquipeName(equipe)}</p>
                  {equipe.site_nom && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {equipe.site_nom}
                    </p>
                  )}
                </div>
                {!isClientView && (
                  <button
                    onClick={() => onRemoveEquipe(equipe.id)}
                    disabled={assigningEquipe}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                    title="Retirer cette équipe"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : tache.equipe_detail ? (
          <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 group">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-800 flex-1">
              {getEquipeName(tache.equipe_detail, '')}
            </p>
            {!isClientView && (
              <button
                onClick={() => tache.equipe_detail && onRemoveEquipe(tache.equipe_detail.id)}
                disabled={assigningEquipe}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                title="Retirer cette équipe"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">Aucune équipe assignée</p>
        )}
      </div>

      {/* Description */}
      {tache.description_travaux && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
          <p className="text-sm text-slate-600">{tache.description_travaux}</p>
        </div>
      )}

      {/* Réclamation liée */}
      {tache.reclamation_numero && (
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-orange-800 text-sm">Lié à une réclamation</h4>
            <p className="text-sm text-orange-700">#{tache.reclamation_numero}</p>
          </div>
        </div>
      )}

      {/* Photos preview */}
      {photos.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" />
            Photos ({photos.length})
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {photos.slice(0, 4).map((photo) => (
              <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-slate-200">
                <img
                  src={getFullImageUrl(photo.url_fichier)}
                  alt={photo.legende || 'Photo'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          {photos.length > 4 && (
            <button
              onClick={onShowPhotos}
              className="mt-2 text-sm text-emerald-600 hover:underline"
            >
              Voir toutes les photos
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskInfoTab;
