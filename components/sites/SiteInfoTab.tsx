import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Info, Calendar, Ruler, Hash, Users, Plus } from 'lucide-react';
import { OLMap } from '../OLMap';
import { MAP_LAYERS } from '../../constants';
import type { SiteFrontend } from '../../services/api';
import type { Utilisateur } from '../../types/users';

interface SiteInfoTabProps {
  site: SiteFrontend;
  currentUser: Utilisateur | undefined;
  onAssignClient: () => void;
  onAssignSuperviseur: () => void;
}

const SiteInfoTab: FC<SiteInfoTabProps> = ({
  site,
  currentUser,
  onAssignClient,
  onAssignSuperviseur,
}) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {/* Left Column - Details */}
      <div className="md:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Info className="w-5 h-5 text-emerald-600" />
            Informations Générales
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                <Users className="w-4 h-4" /> Client Propriétaire
              </dt>
              <dd className="flex items-center gap-2">
                <div className="flex-1 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm font-bold text-slate-800">
                  {(() => {
                    if (
                      currentUser &&
                      currentUser.roles?.includes('CLIENT') &&
                      currentUser.client_structure_id &&
                      currentUser.client_structure_id === site.structure_client
                    ) {
                      return 'Vous-même';
                    }
                    return site.structure_client_nom || 'Non assigné';
                  })()}
                </div>
                {currentUser?.roles?.includes('ADMIN') && (
                  <button
                    onClick={onAssignClient}
                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex-shrink-0"
                    title="Assigner un client"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </dd>
            </div>

            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                <Users className="w-4 h-4" /> Superviseur Affecté
              </dt>
              <dd className="flex items-center gap-2">
                <div className="flex-1 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm font-bold text-slate-800">
                  {site.superviseur_nom || 'Non assigné'}
                </div>
                {currentUser?.roles?.includes('ADMIN') && (
                  <button
                    onClick={onAssignSuperviseur}
                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex-shrink-0"
                    title="Assigner un superviseur"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </dd>
            </div>

            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                <Hash className="w-4 h-4" /> Code Site
              </dt>
              <dd className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm font-bold text-slate-800 font-mono">
                {site.code_site || 'N/A'}
              </dd>
            </div>

            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                <MapPin className="w-4 h-4" /> Adresse
              </dt>
              <dd className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm font-bold text-slate-800">
                {site.adresse || 'N/A'}
              </dd>
            </div>

            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                <Ruler className="w-4 h-4" /> Superficie Totale
              </dt>
              <dd className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm font-bold text-slate-800">
                {site.superficie_totale
                  ? `${site.superficie_totale.toLocaleString('fr-FR')} m²`
                  : 'Non définie'}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Contrat
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-slate-500 mb-1">Date de début</dt>
              <dd className="text-base text-slate-800">
                {site.date_debut_contrat
                  ? new Date(site.date_debut_contrat).toLocaleDateString('fr-FR')
                  : 'Non définie'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500 mb-1">Date de fin</dt>
              <dd className="text-base text-slate-800">
                {site.date_fin_contrat
                  ? new Date(site.date_fin_contrat).toLocaleDateString('fr-FR')
                  : 'Non définie'}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Map */}
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm h-full flex flex-col">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Localisation
          </h2>
          <div className="flex-1 min-h-[300px] rounded-lg overflow-hidden border border-slate-100">
            <OLMap
              isMiniMap={true}
              activeLayer={MAP_LAYERS.SATELLITE}
              targetLocation={{ coordinates: site.coordinates, zoom: 16 }}
              highlightedGeometry={site.geometry}
              searchResult={{
                name: site.name,
                coordinates: site.coordinates,
                description: site.description,
                zoom: 16,
              }}
              onObjectClick={() => {
                navigate('/map', {
                  state: {
                    targetLocation: {
                      coordinates: site.coordinates,
                      zoom: 17,
                    },
                  },
                });
              }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Cliquez pour voir sur la carte principale
          </p>
        </div>
      </div>
    </div>
  );
};

export default SiteInfoTab;
