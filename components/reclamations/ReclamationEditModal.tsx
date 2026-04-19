import React, { useState, useEffect } from 'react';
import { X, MapPin, FileText, AlertOctagon, Calendar, Camera, EyeOff } from 'lucide-react';
import { TypeReclamation, Urgence, ReclamationCreate, Reclamation } from '../../types/reclamations';
import {
  createReclamation,
  updateReclamation,
  uploadPhoto,
  fetchReclamationById,
} from '../../services/reclamationsApi';
import { PhotoUpload } from '../shared/PhotoUpload';
import { PremiumInput, PremiumSelect, PremiumTextarea } from '../modals/PremiumFormComponents';

interface ExistingPhoto {
  id?: number;
  url_fichier: string;
  legende?: string;
}

interface ReclamationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reclamation?: Reclamation) => void;
  types: TypeReclamation[];
  urgences: Urgence[];
  /** ID de la réclamation à éditer (null = mode création) */
  editingId?: number | null;
  /** Données initiales pour pré-remplir le formulaire */
  initialData?: Partial<ReclamationCreate & { visible_client?: boolean }>;
  /** Photos existantes (mode édition) */
  existingPhotos?: ExistingPhoto[];
  /** Nom du site pré-sélectionné (affichage) */
  preSelectedSiteName?: string | null;
  /** Permet d'afficher l'option visible_client (admin/superviseur) */
  canSetVisibility?: boolean;
}

export const ReclamationEditModal: React.FC<ReclamationEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  types,
  urgences,
  editingId = null,
  initialData,
  existingPhotos: initialExistingPhotos = [],
  preSelectedSiteName = null,
  canSetVisibility = false,
}) => {
  const [formData, setFormData] = useState<
    Partial<ReclamationCreate & { visible_client?: boolean }>
  >({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>(initialExistingPhotos);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les données quand le modal s'ouvre
  useEffect(() => {
    if (!isOpen) return;

    // Reset state
    setPhotos([]);
    setError(null);

    // Vérifier si initialData contient des données réelles (pas juste un objet vide)
    const hasInitialData = initialData && Object.keys(initialData).length > 0;

    if (editingId && !hasInitialData) {
      // Mode édition sans données initiales - charger depuis l'API
      loadReclamationData(editingId);
    } else if (hasInitialData) {
      // Données initiales fournies (création ou édition)
      const dateConstatation = initialData.date_constatation
        ? initialData.date_constatation.split('T')[0]
        : new Date().toISOString().split('T')[0];
      setFormData({
        ...initialData,
        date_constatation: dateConstatation,
        visible_client: initialData.visible_client ?? true,
      });
      setExistingPhotos(initialExistingPhotos);
    } else {
      // Mode création - valeurs par défaut
      setFormData({
        date_constatation: new Date().toISOString().split('T')[0],
        visible_client: true,
      });
      setExistingPhotos([]);
    }
  }, [isOpen, editingId, initialData]);

  const loadReclamationData = async (id: number) => {
    setIsLoading(true);
    try {
      const fullRec = await fetchReclamationById(id);
      const dateConstatation = fullRec.date_constatation
        ? fullRec.date_constatation.split('T')[0]
        : '';
      setFormData({
        type_reclamation: fullRec.type_reclamation,
        urgence: fullRec.urgence,
        description: fullRec.description,
        type_autre_description: fullRec.type_autre_description || undefined,
        zone: fullRec.zone,
        date_constatation: dateConstatation,
        visible_client: fullRec.visible_client ?? true,
      });
      setExistingPhotos(fullRec.photos || []);
    } catch (err) {
      setError('Impossible de charger les données de la réclamation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (
      !formData.type_reclamation ||
      !formData.urgence ||
      !formData.description ||
      !formData.date_constatation
    ) {
      setError('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }

    // Validation: type_autre_description obligatoire si type = "Autre"
    const selectedType = types.find((t) => t.id === formData.type_reclamation);
    if (
      selectedType?.code_reclamation === 'AUTRE-DIVERS' &&
      !formData.type_autre_description?.trim()
    ) {
      setError('Veuillez préciser le type de réclamation');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        date_constatation: formData.date_constatation || new Date().toISOString(),
      };

      let targetId = editingId;
      let resultReclamation: Reclamation | undefined;

      if (editingId) {
        await updateReclamation(editingId, payload);
        resultReclamation = await fetchReclamationById(editingId);
      } else {
        const newRec = await createReclamation(payload as ReclamationCreate);
        targetId = newRec.id;
        resultReclamation = newRec;
      }

      // Upload des nouvelles photos
      if (photos.length > 0 && targetId) {
        const uploadPromises = photos.map((file) => {
          const fd = new FormData();
          fd.append('fichier', file);
          fd.append('type_photo', 'RECLAMATION');
          fd.append('reclamation', String(targetId));
          fd.append('legende', 'Photo jointe');
          return uploadPhoto(fd);
        });
        await Promise.all(uploadPromises);
      }

      onSuccess(resultReclamation);
      handleClose();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setPhotos([]);
    setExistingPhotos([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">
            {editingId ? 'Modifier la Réclamation' : 'Nouvelle Réclamation'}
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-red-500 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Chargement...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Pre-selected site indicator */}
              {preSelectedSiteName && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Site: <strong>{preSelectedSiteName}</strong>
                  </span>
                </div>
              )}

              {/* Type de réclamation */}
              <PremiumSelect
                value={formData.type_reclamation?.toString() || ''}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    type_reclamation: Number(value),
                    type_autre_description: undefined,
                  })
                }
                options={types.map((t) => ({
                  value: t.id.toString(),
                  label: t.nom_reclamation,
                }))}
                label="Type de réclamation"
                placeholder="Sélectionner un type..."
                icon={<FileText className="w-4 h-4" />}
                required
                variant="outlined"
                size="md"
              />

              {/* Champ conditionnel si "Autre" est sélectionné */}
              {formData.type_reclamation &&
                types.find((t) => t.id === formData.type_reclamation)?.code_reclamation ===
                  'AUTRE-DIVERS' && (
                  <PremiumInput
                    value={formData.type_autre_description || ''}
                    onChange={(value) =>
                      setFormData({ ...formData, type_autre_description: value })
                    }
                    label="Précisez votre réclamation"
                    placeholder="Ex: Problème d'éclairage, Nuisance sonore..."
                    icon={<FileText className="w-4 h-4" />}
                    required
                    variant="outlined"
                    size="md"
                  />
                )}

              {/* Urgence */}
              <PremiumSelect
                value={formData.urgence?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, urgence: Number(value) })}
                options={urgences.map((u) => ({
                  value: u.id.toString(),
                  label: u.niveau_urgence,
                }))}
                label="Urgence"
                placeholder="Sélectionner un niveau d'urgence..."
                icon={<AlertOctagon className="w-4 h-4" />}
                required
                variant="outlined"
                size="md"
              />

              {/* Description */}
              <PremiumTextarea
                value={formData.description || ''}
                onChange={(value) => setFormData({ ...formData, description: value })}
                label="Description"
                placeholder="Décrivez le problème rencontré..."
                rows={4}
                required
                variant="outlined"
                size="md"
              />

              {/* Date de constatation */}
              <PremiumInput
                type="date"
                value={formData.date_constatation || ''}
                onChange={(value) => {
                  setFormData({
                    ...formData,
                    date_constatation: value || undefined,
                  });
                }}
                label="Date de constatation"
                icon={<Calendar className="w-4 h-4" />}
                hint="Date où le problème a été constaté"
                required
                variant="outlined"
                size="md"
              />

              {/* Section Photos Existantes (Edition) */}
              {existingPhotos.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                    Photos existantes
                  </label>
                  <div className="flex gap-2 overflow-x-auto">
                    {existingPhotos.map((p, i) => (
                      <div key={p.id || i} className="relative group shrink-0">
                        <img
                          src={p.url_fichier}
                          alt={p.legende || 'Photo'}
                          className="h-20 w-20 object-cover rounded-md border border-slate-200"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nouvelles photos */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2">
                  <Camera className="w-4 h-4 text-slate-600" />
                  <label className="text-sm font-semibold text-slate-800">
                    {editingId ? 'Ajouter des photos' : 'Photos'}{' '}
                    <span className="text-xs text-slate-500 font-normal">(optionnel)</span>
                  </label>
                </div>
                <PhotoUpload photos={photos} onChange={setPhotos} />
              </div>

              {/* Option de visibilité client (admin/superviseur uniquement) */}
              {canSetVisibility && (
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.visible_client === false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          visible_client: !e.target.checked,
                        })
                      }
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                          Réclamation interne (masquée au client)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cocher cette case pour créer une réclamation visible uniquement par
                        l'administration
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : editingId ? (
                  'Enregistrer'
                ) : (
                  'Créer'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReclamationEditModal;
