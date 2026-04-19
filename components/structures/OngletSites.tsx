import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Package,
  Plus,
  X as XIcon,
  Search,
  Loader2,
  MapPin as MapPinIcon,
} from 'lucide-react';
import { fetchAllSites, SiteFrontend, updateSite } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import LoadingWrapper from '../LoadingWrapper';

interface OngletSitesProps {
  sites: SiteFrontend[];
  isLoading: boolean;
  structureId: number;
  onRefresh: () => void;
  showAssignModal: boolean;
  setShowAssignModal: (show: boolean) => void;
}

const OngletSites: React.FC<OngletSitesProps> = ({
  sites,
  isLoading,
  structureId,
  onRefresh,
  showAssignModal,
  setShowAssignModal,
}) => {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [allSites, setAllSites] = useState<SiteFrontend[]>([]);
  const [isLoadingAllSites, setIsLoadingAllSites] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (showAssignModal && allSites.length === 0) {
      loadAllSites();
    }
  }, [showAssignModal]);

  const loadAllSites = async () => {
    setIsLoadingAllSites(true);
    try {
      const data = await fetchAllSites();
      setAllSites(data);
    } catch {
      showToast('Erreur lors du chargement des sites', 'error');
    } finally {
      setIsLoadingAllSites(false);
    }
  };

  const unassignedSites = useMemo(() => {
    return allSites
      .filter((s) => !s.structure_client)
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.code_site?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
  }, [allSites, searchQuery]);

  const handleAssignSite = async (siteId: string) => {
    try {
      await updateSite(Number(siteId), { structure_client: structureId });
      showToast('Site assigne avec succes', 'success');
      onRefresh();
      loadAllSites();
    } catch {
      showToast("Erreur lors de l'assignation du site", 'error');
    }
  };

  const handleUnassignSite = async (siteId: string) => {
    try {
      await updateSite(Number(siteId), { structure_client: null });
      showToast('Site desassigne avec succes', 'success');
      onRefresh();
    } catch {
      showToast('Erreur lors de la desassignation du site', 'error');
    }
  };

  const filteredSites = useMemo(() => {
    if (statusFilter === 'all') return sites;
    if (statusFilter === 'active') return sites.filter((s) => s.actif !== false);
    return sites.filter((s) => s.actif === false);
  }, [sites, statusFilter]);

  if (isLoading) {
    return (
      <LoadingWrapper isLoading={true}>
        <div />
      </LoadingWrapper>
    );
  }

  const isContractExpired = (dateFin: string | null) => {
    if (!dateFin) return false;
    try {
      return new Date(dateFin) < new Date();
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {sites.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <MapPinIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Aucun site</h3>
          <p className="text-sm text-slate-500">
            Cette structure ne possède pas encore de sites. Utilisez le bouton "Assigner un site"
            ci-dessus.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white shadow-sm text-slate-800 font-medium'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Tous ({sites.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-white shadow-sm text-slate-800 font-medium'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Actifs ({sites.filter((s) => s.actif !== false).length})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  statusFilter === 'inactive'
                    ? 'bg-white shadow-sm text-slate-800 font-medium'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Inactifs ({sites.filter((s) => s.actif === false).length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSites.map((site) => (
              <div
                key={site.id}
                className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/sites/${site.id}`}
                        className="text-base font-bold text-slate-800 hover:text-emerald-600 block truncate transition-colors"
                      >
                        {site.name || 'Site sans nom'}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Code: {site.code_site || 'N/A'}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        site.actif !== false
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {site.actif !== false ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {site.adresse && (
                      <div className="flex items-start gap-2 text-slate-500">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="text-xs">{site.adresse}</span>
                      </div>
                    )}
                    {(site.superficie_calculee || site.superficie_totale) && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Package className="w-4 h-4" />
                        <span className="text-xs">
                          {(site.superficie_calculee || site.superficie_totale)!.toLocaleString(
                            'fr-FR',
                            { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                          )}{' '}
                          m²
                        </span>
                      </div>
                    )}
                  </div>

                  {(site.date_debut_contrat || site.date_fin_contrat) && (
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Contrat</span>
                        {site.date_fin_contrat && isContractExpired(site.date_fin_contrat) && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">
                            Expiré
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        {site.date_debut_contrat
                          ? new Date(site.date_debut_contrat).toLocaleDateString('fr-FR')
                          : '?'}{' '}
                        -
                        {site.date_fin_contrat
                          ? new Date(site.date_fin_contrat).toLocaleDateString('fr-FR')
                          : '?'}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleUnassignSite(site.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                    >
                      <XIcon className="w-4 h-4" />
                      Désassigner ce site
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Assigner des sites</h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSearchQuery('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un site..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingAllSites ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : unassignedSites.length === 0 ? (
                <div className="text-center py-12">
                  <MapPinIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">
                    {searchQuery
                      ? 'Aucun site trouvé pour cette recherche'
                      : 'Tous les sites sont déjà assignés'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unassignedSites.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => {
                        handleAssignSite(site.id);
                        setShowAssignModal(false);
                        setSearchQuery('');
                      }}
                      className="w-full p-4 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 group-hover:text-emerald-700">
                            {site.name || 'Site sans nom'}
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            {site.code_site && <span>Code: {site.code_site}</span>}
                            {site.adresse && <span className="ml-2">• {site.adresse}</span>}
                          </div>
                        </div>
                        <Plus className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OngletSites;
