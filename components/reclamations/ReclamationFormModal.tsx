import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Circle,
  Pentagon,
  Target,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  FileText,
  AlertOctagon,
  Camera,
  EyeOff,
} from 'lucide-react';
import { TypeReclamation, Urgence, ReclamationCreate, Reclamation } from '../../types/reclamations';
import { GeoJSONGeometry } from '../../types';
import {
  createReclamation,
  uploadPhoto,
  detectSiteFromGeometry,
  DetectedSiteInfo,
} from '../../services/reclamationsApi';
import { PhotoUpload } from '../shared/PhotoUpload';
import { FormModal } from '../FormModal';
import { PremiumInput, PremiumSelect, PremiumTextarea } from '../modals/PremiumFormComponents';

interface ReclamationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reclamation: Reclamation) => void;
  geometry?: GeoJSONGeometry;
  types: TypeReclamation[];
  urgences: Urgence[];
  preSelectedSiteId?: number;
  preSelectedSiteName?: string;
  userRole?: string; // Pour afficher l'option visible_client (ADMIN/SUPERVISEUR uniquement)
}

export const ReclamationFormModal: React.FC<ReclamationFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  geometry,
  types,
  urgences,
  preSelectedSiteId,
  preSelectedSiteName,
  userRole,
}) => {
  // Déterminer si l'utilisateur peut créer des réclamations internes (masquées au client)
  const canCreateInternal = userRole === 'ADMIN' || userRole === 'SUPERVISEUR';
  const [formData, setFormData] = useState<Partial<ReclamationCreate>>({
    site: preSelectedSiteId,
    date_constatation: new Date().toISOString(), // Valeur par défaut: maintenant
    visible_client: true, // Visible au client par défaut
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État pour la détection du site
  const [detectedSite, setDetectedSite] = useState<DetectedSiteInfo | null>(null);
  const [isDetectingSite, setIsDetectingSite] = useState(false);
  const [siteDetectionError, setSiteDetectionError] = useState<string | null>(null);

  // Détecter le site quand le modal s'ouvre avec une géométrie
  useEffect(() => {
    const detectSite = async () => {
      if (!isOpen || !geometry) return;

      // Si on a déjà un site pré-sélectionné, pas besoin de détecter
      if (preSelectedSiteId) {
        setDetectedSite({
          site_id: preSelectedSiteId,
          site_nom: preSelectedSiteName || null,
          zone_id: null,
          zone_nom: null,
        });
        return;
      }

      const geom = geometry;
      if (!geom) return;

      setIsDetectingSite(true);
      setSiteDetectionError(null);

      try {
        const result = await detectSiteFromGeometry({
          type: geom.type,
          coordinates: geom.coordinates,
        });

        setDetectedSite(result);

        if (!result.site_id) {
          setSiteDetectionError(
            "La zone indiquée ne correspond à aucun site connu. Veuillez dessiner à l'intérieur d'un site.",
          );
        } else {
          // Mettre à jour le formData avec le site détecté
          setFormData((prev) => ({ ...prev, site: result.site_id! }));
        }
      } catch (err: any) {
        setSiteDetectionError('Erreur lors de la détection du site.');
      } finally {
        setIsDetectingSite(false);
      }
    };

    detectSite();
  }, [isOpen, geometry, preSelectedSiteId, preSelectedSiteName]);

  // Determine geometry type label
  const getGeometryLabel = () => {
    if (!geometry) return null;
    switch (geometry.type) {
      case 'Point':
        return { icon: Target, label: 'Point', color: 'blue' };
      case 'Polygon':
        // Check if it's a circle (approximated as polygon)
        const coords = geometry.coordinates as number[][][];
        if (coords[0] && coords[0].length >= 60) {
          return { icon: Circle, label: 'Cercle', color: 'purple' };
        }
        return { icon: Pentagon, label: 'Zone', color: 'emerald' };
      default:
        return { icon: MapPin, label: geometry.type, color: 'gray' };
    }
  };

  // Calculate area for polygons
  const calculateArea = (): string | null => {
    if (!geometry || geometry.type !== 'Polygon') return null;

    // Simple area calculation using shoelace formula
    const coords = geometry.coordinates as number[][][];
    if (!coords || !coords[0] || coords[0].length < 3) return null;

    const ring = coords[0];
    const firstPoint = ring[0];
    if (!firstPoint || firstPoint.length < 2) return null;

    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const p1 = ring[i];
      const p2 = ring[i + 1];
      if (p1 && p1.length >= 2 && p2 && p2.length >= 2) {
        area += (p1[0] ?? 0) * (p2[1] ?? 0);
        area -= (p2[0] ?? 0) * (p1[1] ?? 0);
      }
    }
    area = Math.abs(area / 2);

    // Convert from degrees^2 to approximate m^2 (rough estimate at ~45 lat)
    const metersPerDegree = 111320;
    const latitude = firstPoint[1] ?? 0;
    const areaM2 = area * metersPerDegree * metersPerDegree * Math.cos((latitude * Math.PI) / 180);

    if (areaM2 > 10000) {
      return `${(areaM2 / 10000).toFixed(2)} ha`;
    }
    return `${areaM2.toFixed(0)} m²`;
  };

  const geometryInfo = getGeometryLabel();
  const areaDisplay = calculateArea();

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
      // Build payload with geometry
      const payload: ReclamationCreate = {
        type_reclamation: formData.type_reclamation!,
        urgence: formData.urgence!,
        description: formData.description!,
        date_constatation: formData.date_constatation,
        site: formData.site,
        localisation: geometry, // Include drawn geometry
        visible_client: formData.visible_client ?? true, // Par défaut visible
        ...(formData.type_autre_description && {
          type_autre_description: formData.type_autre_description,
        }),
      };

      // Create reclamation
      const newReclamation = await createReclamation(payload);

      // Upload photos if any
      if (photos.length > 0) {
        const uploadPromises = photos.map((file) => {
          const fd = new FormData();
          fd.append('fichier', file);
          fd.append('type_photo', 'RECLAMATION');
          fd.append('reclamation', newReclamation.id.toString());
          fd.append('legende', 'Photo jointe');
          return uploadPhoto(fd);
        });
        await Promise.all(uploadPromises);
      }

      // Déclencher le rafraîchissement des réclamations sur la carte
      window.dispatchEvent(new Event('refresh-reclamations'));

      onSuccess(newReclamation);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la création.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Signaler une Réclamation"
      icon={<AlertTriangle className="w-5 h-5" />}
      size="lg"
      loading={isSubmitting}
      error={error}
      submitLabel={isSubmitting ? 'Création...' : 'Signaler'}
      submitVariant="danger"
      cancelLabel="Annuler"
      submitDisabled={isSubmitting || isDetectingSite || !!siteDetectionError}
    >
      {/* Geometry indicator */}
      {geometryInfo && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3 -mt-2 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <geometryInfo.icon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <span className="text-sm font-medium text-orange-800">
              Zone délimitée : {geometryInfo.label}
            </span>
            {areaDisplay && (
              <p className="text-xs text-orange-600">Surface approximative : {areaDisplay}</p>
            )}
          </div>
        </div>
      )}

      {/* Indicateur de site détecté */}
      {isDetectingSite ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
          <span className="text-sm text-slate-600">Détection du site en cours...</span>
        </div>
      ) : siteDetectionError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-red-800">Aucun site détecté</span>
            <p className="text-xs text-red-600 mt-0.5">{siteDetectionError}</p>
          </div>
        </div>
      ) : detectedSite?.site_id ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-emerald-800">
              Site: {detectedSite.site_nom}
            </span>
            {detectedSite.zone_nom && (
              <p className="text-xs text-emerald-600 mt-0.5">Zone: {detectedSite.zone_nom}</p>
            )}
          </div>
          <MapPin className="w-4 h-4 text-emerald-500" />
        </div>
      ) : null}

      <div className="space-y-4">
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
          options={[
            { value: '', label: 'Sélectionner un type...' },
            ...types.map((t) => ({
              value: t.id.toString(),
              label: t.nom_reclamation,
            })),
          ]}
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
              onChange={(value) => setFormData({ ...formData, type_autre_description: value })}
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

        {/* Photos */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2">
            <Camera className="w-4 h-4 text-slate-600" />
            <label className="text-sm font-semibold text-slate-800">
              Photos <span className="text-xs text-slate-500 font-normal">(optionnel)</span>
            </label>
          </div>
          <PhotoUpload photos={photos} onChange={setPhotos} />
        </div>

        {/* Option de visibilité client (admin/superviseur uniquement) */}
        {canCreateInternal && (
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
    </FormModal>
  );
};

export default ReclamationFormModal;
