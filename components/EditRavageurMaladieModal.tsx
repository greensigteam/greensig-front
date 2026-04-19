import React, { useState, useEffect } from 'react';
import { Bug, Power, AlertTriangle, Target } from 'lucide-react';
import {
  RavageurMaladieDetail,
  RavageurMaladieCreate,
  CategorieRavageurMaladie,
  CATEGORIE_RAVAGEUR_MALADIE_LABELS,
  ProduitList,
} from '../types/suiviTaches';
import { useToast } from '../contexts/ToastContext';
import FormModal, { FormSection, FormGrid } from './FormModal';
import { PremiumInput, PremiumTextarea, PremiumSelect } from './modals/PremiumFormComponents';

interface EditRavageurMaladieModalProps {
  isOpen: boolean;
  ravageurMaladie: RavageurMaladieDetail;
  onClose: () => void;
  onSubmit: (data: Partial<RavageurMaladieCreate>) => Promise<void>;
  produits: ProduitList[];
}

const EditRavageurMaladieModal: React.FC<EditRavageurMaladieModalProps> = ({
  isOpen,
  ravageurMaladie,
  onClose,
  onSubmit,
  produits,
}) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<RavageurMaladieCreate>({
    nom: '',
    categorie: 'RAVAGEUR',
    symptomes: '',
    partie_atteinte: '',
    produits_recommandes: [],
    actif: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ravageurMaladie) {
      setFormData({
        nom: ravageurMaladie.nom,
        categorie: ravageurMaladie.categorie,
        symptomes: ravageurMaladie.symptomes,
        partie_atteinte: ravageurMaladie.partie_atteinte,
        produits_recommandes: ravageurMaladie.produits_recommandes?.map((p) => p.id) || [],
        actif: ravageurMaladie.actif,
      });
    }
  }, [ravageurMaladie]);

  const handleChange = (field: keyof RavageurMaladieCreate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductToggle = (productId: number) => {
    const current = formData.produits_recommandes || [];
    if (current.includes(productId)) {
      handleChange(
        'produits_recommandes',
        current.filter((id) => id !== productId),
      );
    } else {
      handleChange('produits_recommandes', [...current, productId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nom.trim()) {
      setError('Le nom est obligatoire');
      return;
    }
    if (!formData.symptomes.trim()) {
      setError('Les symptomes sont obligatoires');
      return;
    }
    if (!formData.partie_atteinte.trim()) {
      setError('La partie atteinte est obligatoire');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la mise a jour';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const categorieOptions = Object.entries(CATEGORIE_RAVAGEUR_MALADIE_LABELS).map(
    ([value, label]) => ({
      value,
      label,
    }),
  );

  const partiesOptions = [
    { value: 'Feuilles', label: 'Feuilles' },
    { value: 'Tiges', label: 'Tiges' },
    { value: 'Racines', label: 'Racines' },
    { value: 'Fleurs', label: 'Fleurs' },
    { value: 'Fruits', label: 'Fruits' },
    { value: 'Ecorce', label: 'Ecorce' },
    { value: 'Feuilles, Tiges', label: 'Feuilles et Tiges' },
    { value: 'Plante entiere', label: 'Plante entiere' },
  ];

  const produitsActifs = produits.filter((p) => p.actif);

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Modifier le ravageur / maladie"
      subtitle={ravageurMaladie.nom}
      icon={<Bug className="w-5 h-5 text-red-600" />}
      size="xl"
      loading={loading}
      error={error}
      submitLabel="Enregistrer"
      cancelLabel="Annuler"
      useGradientHeader={true}
    >
      <FormSection
        title="Identification"
        description="Informations de base sur le ravageur ou la maladie"
      >
        <FormGrid columns={2}>
          <PremiumInput
            type="text"
            value={formData.nom}
            onChange={(value) => handleChange('nom', value)}
            label="Nom"
            placeholder="Ex: Cochenille farineuse"
            icon={<Bug className="w-4 h-4" />}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />

          <PremiumSelect
            value={formData.categorie}
            onChange={(value) => handleChange('categorie', value as CategorieRavageurMaladie)}
            label="Categorie"
            options={categorieOptions}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Diagnostic" description="Symptomes et parties affectees">
        <FormGrid columns={1}>
          <PremiumTextarea
            value={formData.symptomes}
            onChange={(value) => handleChange('symptomes', value)}
            label="Symptomes"
            placeholder="Decrivez les symptomes observables..."
            icon={<AlertTriangle className="w-4 h-4" />}
            rows={4}
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>

        <FormGrid columns={1}>
          <PremiumSelect
            value={formData.partie_atteinte}
            onChange={(value) => handleChange('partie_atteinte', value)}
            label="Partie atteinte"
            options={partiesOptions}
            placeholder="Selectionnez la partie affectee"
            disabled={loading}
            required
            variant="outlined"
            size="md"
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Produits recommandes"
        description="Selectionnez les produits phytosanitaires pour traiter ce ravageur/maladie"
      >
        {produitsActifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
            {produitsActifs.map((produit) => {
              const isSelected = formData.produits_recommandes?.includes(produit.id);
              return (
                <button
                  key={produit.id}
                  type="button"
                  onClick={() => handleProductToggle(produit.id)}
                  disabled={loading}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-sm truncate">{produit.nom_produit}</span>
                  </div>
                  {produit.cible && (
                    <p className="text-xs text-gray-500 mt-1 ml-6 truncate">{produit.cible}</p>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Aucun produit phytosanitaire disponible</p>
          </div>
        )}
        {formData.produits_recommandes && formData.produits_recommandes.length > 0 && (
          <p className="text-sm text-emerald-600 mt-2">
            {formData.produits_recommandes.length} produit(s) selectionne(s)
          </p>
        )}
      </FormSection>

      <FormSection title="Statut" description="Disponibilite dans le systeme">
        <div
          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
            formData.actif
              ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
          onClick={() => !loading && handleChange('actif', !formData.actif)}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                formData.actif ? 'bg-emerald-100' : 'bg-slate-200'
              }`}
            >
              <Power
                className={`w-6 h-6 ${formData.actif ? 'text-emerald-600' : 'text-slate-400'}`}
              />
            </div>
            <div>
              <p
                className={`font-semibold ${formData.actif ? 'text-emerald-900' : 'text-slate-700'}`}
              >
                {formData.actif ? 'Actif' : 'Inactif'}
              </p>
              <p className="text-sm text-slate-500">
                {formData.actif
                  ? 'Visible dans les listes et recherches'
                  : 'Masque et non disponible'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!loading) handleChange('actif', !formData.actif);
            }}
            disabled={loading}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              formData.actif
                ? 'bg-emerald-500 focus:ring-emerald-500'
                : 'bg-slate-300 focus:ring-slate-500'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                formData.actif ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </FormSection>
    </FormModal>
  );
};

export default EditRavageurMaladieModal;
