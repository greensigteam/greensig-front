import React, { useState, useEffect } from 'react';
import { Package, Leaf, Bug, Check, Beaker } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';

// Types
import {
  ProduitList,
  ProduitDetail,
  ProduitCreate,
  FertilisantList,
  FertilisantDetail,
  FertilisantCreate,
  RavageurMaladieList,
  RavageurMaladieDetail,
  RavageurMaladieCreate,
  TypeProduitUnifie,
  TYPE_PRODUIT_UNIFIE_LABELS,
  TYPE_PRODUIT_UNIFIE_COLORS,
  TYPE_FERTILISANT_LABELS,
  FORMAT_FERTILISANT_LABELS,
  CATEGORIE_RAVAGEUR_MALADIE_LABELS,
} from '../types/suiviTaches';

// API
import {
  fetchProduits,
  fetchProduitById,
  createProduit,
  updateProduit,
  softDeleteProduit,
  reactivateProduit,
  fetchFertilisants,
  fetchFertilisantById,
  createFertilisant,
  updateFertilisant,
  softDeleteFertilisant,
  reactivateFertilisant,
  fetchRavageursMaladies,
  fetchRavageurMaladieById,
  createRavageurMaladie,
  updateRavageurMaladie,
  softDeleteRavageurMaladie,
  reactivateRavageurMaladie,
} from '../services/suiviTachesApi';

// Modals
import CreateProduitModal from '../components/CreateProduitModal';
import ProduitDetailModal from '../components/ProduitDetailModal';
import EditProduitModal from '../components/EditProduitModal';
import CreateFertilisantModal from '../components/CreateFertilisantModal';
import FertilisantDetailModal from '../components/FertilisantDetailModal';
import EditFertilisantModal from '../components/EditFertilisantModal';
import CreateRavageurMaladieModal from '../components/CreateRavageurMaladieModal';
import RavageurMaladieDetailModal from '../components/RavageurMaladieDetailModal';
import EditRavageurMaladieModal from '../components/EditRavageurMaladieModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import {
  StatCard,
  ActionDropdown,
  CreateMenu,
  type UnifiedProduct,
} from '../components/produits/ProduitsSubComponents';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Produits: React.FC = () => {
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();
  const { showToast } = useToast();

  // Loading state
  const [loading, setLoading] = useState(true);

  // Data
  const [produits, setProduits] = useState<ProduitList[]>([]);
  const [fertilisants, setFertilisants] = useState<FertilisantList[]>([]);
  const [ravageursMaladies, setRavageursMaladies] = useState<RavageurMaladieList[]>([]);

  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeProduitUnifie | null>(null);
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);

  // Modals - Create
  const [showCreateProduit, setShowCreateProduit] = useState(false);
  const [showCreateFertilisant, setShowCreateFertilisant] = useState(false);
  const [showCreateRavageurMaladie, setShowCreateRavageurMaladie] = useState(false);

  // Modals - Detail
  const [selectedProduit, setSelectedProduit] = useState<ProduitDetail | null>(null);
  const [selectedFertilisant, setSelectedFertilisant] = useState<FertilisantDetail | null>(null);
  const [selectedRavageurMaladie, setSelectedRavageurMaladie] =
    useState<RavageurMaladieDetail | null>(null);

  // Modals - Edit
  const [editingProduit, setEditingProduit] = useState<ProduitDetail | null>(null);
  const [editingFertilisant, setEditingFertilisant] = useState<FertilisantDetail | null>(null);
  const [editingRavageurMaladie, setEditingRavageurMaladie] =
    useState<RavageurMaladieDetail | null>(null);

  // Modal - Confirm toggle
  const [toggleItem, setToggleItem] = useState<UnifiedProduct | null>(null);

  // Stats
  const stats = {
    total: produits.length + fertilisants.length + ravageursMaladies.length,
    phytosanitaires: produits.length,
    fertilisants: fertilisants.length,
    ravageursMaladies: ravageursMaladies.length,
    actifs:
      produits.filter((p) => p.actif).length +
      fertilisants.filter((f) => f.actif).length +
      ravageursMaladies.filter((r) => r.actif).length,
  };

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Set search placeholder
  useEffect(() => {
    setPlaceholder('Rechercher un produit (nom, cible, symptômes)...');
    return () => {
      setPlaceholder('Rechercher...');
      setSearchQuery('');
    };
  }, [setPlaceholder, setSearchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [produitsRes, fertilisantsRes, ravageursRes] = await Promise.all([
        fetchProduits(),
        fetchFertilisants(),
        fetchRavageursMaladies(),
      ]);
      setProduits(produitsRes);
      setFertilisants(fertilisantsRes);
      setRavageursMaladies(ravageursRes);
    } catch (error) {
      showToast('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Convert to unified format
  const getUnifiedProducts = (): UnifiedProduct[] => {
    const unified: UnifiedProduct[] = [];

    // Produits phytosanitaires
    produits.forEach((p) => {
      unified.push({
        id: p.id,
        type: 'PHYTOSANITAIRE',
        nom: p.nom_produit,
        details: p.cible || p.numero_homologation || '-',
        actif: p.actif,
        dateCreation: '', // Not available in list
        original: p,
      });
    });

    // Fertilisants
    fertilisants.forEach((f) => {
      unified.push({
        id: f.id,
        type: 'FERTILISANT',
        nom: f.nom,
        details: `${TYPE_FERTILISANT_LABELS[f.type_fertilisant]} - ${FORMAT_FERTILISANT_LABELS[f.format_fertilisant]}`,
        actif: f.actif,
        dateCreation: f.date_creation,
        original: f,
      });
    });

    // Ravageurs/Maladies
    ravageursMaladies.forEach((r) => {
      unified.push({
        id: r.id,
        type: 'RAVAGEUR_MALADIE',
        nom: r.nom,
        details: `${CATEGORIE_RAVAGEUR_MALADIE_LABELS[r.categorie]} - ${r.partie_atteinte}`,
        actif: r.actif,
        dateCreation: r.date_creation,
        original: r,
      });
    });

    return unified;
  };

  // Filter unified products
  const filteredProducts = getUnifiedProducts().filter((item) => {
    // Filter by type
    if (typeFilter && item.type !== typeFilter) return false;

    // Filter by status
    if (statusFilter !== null && item.actif !== statusFilter) return false;

    // Filter by search
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesNom = item.nom.toLowerCase().includes(search);
      const matchesDetails = item.details.toLowerCase().includes(search);

      // Additional search for ravageurs/maladies (symptomes)
      if (item.type === 'RAVAGEUR_MALADIE') {
        const original = item.original as RavageurMaladieList;
        const matchesSymptomes = original.symptomes.toLowerCase().includes(search);
        return matchesNom || matchesDetails || matchesSymptomes;
      }

      return matchesNom || matchesDetails;
    }

    return true;
  });

  // Handlers
  const handleCreateSelect = (type: TypeProduitUnifie) => {
    switch (type) {
      case 'PHYTOSANITAIRE':
        setShowCreateProduit(true);
        break;
      case 'FERTILISANT':
        setShowCreateFertilisant(true);
        break;
      case 'RAVAGEUR_MALADIE':
        setShowCreateRavageurMaladie(true);
        break;
    }
  };

  const handleView = async (item: UnifiedProduct) => {
    try {
      switch (item.type) {
        case 'PHYTOSANITAIRE':
          const produit = await fetchProduitById(item.id);
          setSelectedProduit(produit);
          break;
        case 'FERTILISANT':
          const fertilisant = await fetchFertilisantById(item.id);
          setSelectedFertilisant(fertilisant);
          break;
        case 'RAVAGEUR_MALADIE':
          const ravageur = await fetchRavageurMaladieById(item.id);
          setSelectedRavageurMaladie(ravageur);
          break;
      }
    } catch (error) {
      showToast('Erreur lors du chargement des détails', 'error');
    }
  };

  const handleEdit = async (item: UnifiedProduct) => {
    try {
      switch (item.type) {
        case 'PHYTOSANITAIRE':
          const produit = await fetchProduitById(item.id);
          setEditingProduit(produit);
          break;
        case 'FERTILISANT':
          const fertilisant = await fetchFertilisantById(item.id);
          setEditingFertilisant(fertilisant);
          break;
        case 'RAVAGEUR_MALADIE':
          const ravageur = await fetchRavageurMaladieById(item.id);
          setEditingRavageurMaladie(ravageur);
          break;
      }
    } catch (error) {
      showToast('Erreur lors du chargement pour édition', 'error');
    }
  };

  const handleToggleActive = async () => {
    if (!toggleItem) return;

    try {
      const action = toggleItem.actif ? 'désactivé' : 'réactivé';
      switch (toggleItem.type) {
        case 'PHYTOSANITAIRE':
          if (toggleItem.actif) {
            await softDeleteProduit(toggleItem.id);
          } else {
            await reactivateProduit(toggleItem.id);
          }
          break;
        case 'FERTILISANT':
          if (toggleItem.actif) {
            await softDeleteFertilisant(toggleItem.id);
          } else {
            await reactivateFertilisant(toggleItem.id);
          }
          break;
        case 'RAVAGEUR_MALADIE':
          if (toggleItem.actif) {
            await softDeleteRavageurMaladie(toggleItem.id);
          } else {
            await reactivateRavageurMaladie(toggleItem.id);
          }
          break;
      }
      showToast(`${TYPE_PRODUIT_UNIFIE_LABELS[toggleItem.type]} ${action} avec succès`, 'success');
      loadData();
    } catch (error) {
      showToast('Erreur lors du changement de statut', 'error');
    } finally {
      setToggleItem(null);
    }
  };

  // Create handlers
  const handleCreateProduit = async (data: ProduitCreate) => {
    await createProduit(data);
    loadData();
  };

  const handleCreateFertilisant = async (data: FertilisantCreate) => {
    await createFertilisant(data);
    showToast('Fertilisant créé avec succès', 'success');
    loadData();
  };

  const handleCreateRavageurMaladie = async (data: RavageurMaladieCreate) => {
    await createRavageurMaladie(data);
    showToast('Ravageur/Maladie créé avec succès', 'success');
    loadData();
  };

  // Update handlers
  const handleUpdateProduit = async (id: number, data: Partial<ProduitCreate>) => {
    await updateProduit(id, data);
    showToast('Produit mis à jour avec succès', 'success');
    loadData();
  };

  const handleUpdateFertilisant = async (id: number, data: Partial<FertilisantCreate>) => {
    await updateFertilisant(id, data);
    showToast('Fertilisant mis à jour avec succès', 'success');
    loadData();
  };

  const handleUpdateRavageurMaladie = async (id: number, data: Partial<RavageurMaladieCreate>) => {
    await updateRavageurMaladie(id, data);
    showToast('Ravageur/Maladie mis à jour avec succès', 'success');
    loadData();
  };

  // Table columns
  const columns = [
    {
      key: 'nom',
      label: 'Nom',
      render: (item: UnifiedProduct) => {
        const typeColors = TYPE_PRODUIT_UNIFIE_COLORS[item.type];
        const icon =
          item.type === 'PHYTOSANITAIRE' ? (
            <Beaker className="w-4 h-4 text-cyan-600" />
          ) : item.type === 'FERTILISANT' ? (
            <Leaf className="w-4 h-4 text-green-600" />
          ) : (
            <Bug className="w-4 h-4 text-red-600" />
          );

        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${typeColors.bg}`}
            >
              {icon}
            </div>
            <span className="font-medium text-gray-900">{item.nom}</span>
          </div>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (item: UnifiedProduct) => {
        const typeColors = TYPE_PRODUIT_UNIFIE_COLORS[item.type];
        return (
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeColors.bg} ${typeColors.text}`}
          >
            {TYPE_PRODUIT_UNIFIE_LABELS[item.type]}
          </span>
        );
      },
    },
    {
      key: 'details',
      label: 'Détails',
      render: (item: UnifiedProduct) => (
        <span className="text-gray-600 text-sm">{item.details}</span>
      ),
    },
    {
      key: 'actif',
      label: 'Statut',
      render: (item: UnifiedProduct) => (
        <StatusBadge
          variant="boolean"
          value={item.actif}
          labels={{ true: 'Actif', false: 'Inactif' }}
        />
      ),
      sortable: false,
    },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50">
        <LoadingScreen isLoading={true} loop={true} minDuration={0} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 flex-shrink-0">
        <StatCard
          icon={<Package className="w-5 h-5 text-gray-600" />}
          label="Total"
          value={stats.total}
          color="bg-gray-100"
        />
        <StatCard
          icon={<Check className="w-5 h-5 text-green-600" />}
          label="Actifs"
          value={stats.actifs}
          color="bg-green-100"
        />
        <StatCard
          icon={<Beaker className="w-5 h-5 text-cyan-600" />}
          label="Phytosanitaires"
          value={stats.phytosanitaires}
          color="bg-cyan-100"
        />
        <StatCard
          icon={<Leaf className="w-5 h-5 text-green-600" />}
          label="Fertilisants"
          value={stats.fertilisants}
          color="bg-green-100"
        />
        <StatCard
          icon={<Bug className="w-5 h-5 text-red-600" />}
          label="Ravageurs/Maladies"
          value={stats.ravageursMaladies}
          color="bg-red-100"
        />
      </div>

      {/* Filters Bar */}
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Type :</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setTypeFilter(null)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  !typeFilter
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setTypeFilter('PHYTOSANITAIRE')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  typeFilter === 'PHYTOSANITAIRE'
                    ? 'bg-white text-cyan-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Beaker className="w-3.5 h-3.5" />
                Phyto
              </button>
              <button
                onClick={() => setTypeFilter('FERTILISANT')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  typeFilter === 'FERTILISANT'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Leaf className="w-3.5 h-3.5" />
                Fertilisant
              </button>
              <button
                onClick={() => setTypeFilter('RAVAGEUR_MALADIE')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  typeFilter === 'RAVAGEUR_MALADIE'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                Ravageur
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Statut :</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setStatusFilter(null)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  statusFilter === null
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  statusFilter === true
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Actifs
              </button>
              <button
                onClick={() => setStatusFilter(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  statusFilter === false
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Inactifs
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{filteredProducts.length}</span> élément
            {filteredProducts.length > 1 ? 's' : ''}
            {(searchQuery || typeFilter || statusFilter !== null) && (
              <span className="text-emerald-600 ml-1">(filtrés)</span>
            )}
          </div>
          <CreateMenu onSelect={handleCreateSelect} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-lg border border-gray-200">
        <DataTable
          data={filteredProducts}
          columns={[
            ...columns,
            {
              key: 'actions',
              label: 'Actions',
              render: (item: UnifiedProduct) => (
                <ActionDropdown
                  item={item}
                  onView={() => handleView(item)}
                  onEdit={() => handleEdit(item)}
                  onToggleActive={() => setToggleItem(item)}
                />
              ),
              sortable: false,
            },
          ]}
          itemsPerPage={15}
          onRowClick={handleView}
          rowKey={(item: UnifiedProduct) => `${item.type}-${item.id}`}
        />
      </div>

      {/* Create Modals */}
      <CreateProduitModal
        isOpen={showCreateProduit}
        onClose={() => setShowCreateProduit(false)}
        onSubmit={handleCreateProduit}
      />

      {showCreateFertilisant && (
        <CreateFertilisantModal
          isOpen={showCreateFertilisant}
          onClose={() => setShowCreateFertilisant(false)}
          onSubmit={handleCreateFertilisant}
        />
      )}

      {showCreateRavageurMaladie && (
        <CreateRavageurMaladieModal
          isOpen={showCreateRavageurMaladie}
          onClose={() => setShowCreateRavageurMaladie(false)}
          onSubmit={handleCreateRavageurMaladie}
          produits={produits}
        />
      )}

      {/* Detail Modals */}
      <ProduitDetailModal
        isOpen={!!selectedProduit}
        produit={selectedProduit}
        onClose={() => setSelectedProduit(null)}
      />

      {selectedFertilisant && (
        <FertilisantDetailModal
          isOpen={!!selectedFertilisant}
          fertilisant={selectedFertilisant}
          onClose={() => setSelectedFertilisant(null)}
        />
      )}

      {selectedRavageurMaladie && (
        <RavageurMaladieDetailModal
          isOpen={!!selectedRavageurMaladie}
          ravageurMaladie={selectedRavageurMaladie}
          onClose={() => setSelectedRavageurMaladie(null)}
        />
      )}

      {/* Edit Modals */}
      {editingProduit && (
        <EditProduitModal
          isOpen={!!editingProduit}
          produit={editingProduit}
          onClose={() => setEditingProduit(null)}
          onSubmit={(_id, data) => handleUpdateProduit(editingProduit.id, data)}
        />
      )}

      {editingFertilisant && (
        <EditFertilisantModal
          isOpen={!!editingFertilisant}
          fertilisant={editingFertilisant}
          onClose={() => setEditingFertilisant(null)}
          onSubmit={(data) => handleUpdateFertilisant(editingFertilisant.id, data)}
        />
      )}

      {editingRavageurMaladie && (
        <EditRavageurMaladieModal
          isOpen={!!editingRavageurMaladie}
          ravageurMaladie={editingRavageurMaladie}
          onClose={() => setEditingRavageurMaladie(null)}
          onSubmit={(data) => handleUpdateRavageurMaladie(editingRavageurMaladie.id, data)}
          produits={produits}
        />
      )}

      {/* Confirm Toggle Modal */}
      {toggleItem && (
        <ConfirmDeleteModal
          title={toggleItem.actif ? 'Désactiver cet élément ?' : 'Réactiver cet élément ?'}
          message={
            toggleItem.actif
              ? `Êtes-vous sûr de vouloir désactiver "${toggleItem.nom}" ? Il ne sera plus visible dans les listes actives.`
              : `Êtes-vous sûr de vouloir réactiver "${toggleItem.nom}" ?`
          }
          onConfirm={handleToggleActive}
          onCancel={() => setToggleItem(null)}
          confirmText={toggleItem.actif ? 'Désactiver' : 'Réactiver'}
          cancelText="Annuler"
        />
      )}
    </div>
  );
};

export default Produits;
