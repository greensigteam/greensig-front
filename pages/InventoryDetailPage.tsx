import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchInventoryItem, ApiError } from '../services/api';
import { InventoryItem } from '../services/mockData'; // Use the correct type definition
import { OLMap } from '../components/OLMap';
import { StatusBadge } from '../components/StatusBadge';
import { EditObjectModal } from '../components/EditObjectModal';
import { MAP_LAYERS } from '../constants';
import {
  ChevronLeft,
  MapPin,
  Image as ImageIcon,
  Info,
  Wrench,
  Edit,
  Calendar
} from 'lucide-react';

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-2"></div>
      <p className="text-gray-600">Chargement des détails...</p>
    </div>
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
      <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
      <p className="text-red-600">{message}</p>
    </div>
  </div>
);

const InventoryDetailPage: React.FC = () => {
  const { objectType, objectId } = useParams<{ objectType: string; objectId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!objectType || !objectId) {
      setError("Type d'objet ou ID manquant dans l'URL.");
      setIsLoading(false);
      return;
    }

    const loadItem = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchInventoryItem(objectType, objectId);

        // Backend returns GeoJSON format, need to extract coordinates
        let coordinates = { lat: 0, lng: 0 };
        if (data.geometry && data.geometry.coordinates) {
          if (data.geometry.type === 'Point') {
            // Point: [lng, lat]
            coordinates = {
              lng: data.geometry.coordinates[0],
              lat: data.geometry.coordinates[1]
            };
          } else if (data.geometry.type === 'Polygon') {
            // Polygon: [[[lng, lat], ...]], take first point
            const firstPoint = data.geometry.coordinates[0]?.[0];
            if (firstPoint) {
              coordinates = {
                lng: firstPoint[0],
                lat: firstPoint[1]
              };
            }
          } else if (data.geometry.type === 'LineString') {
            // LineString: [[lng, lat], ...], take first point
            const firstPoint = data.geometry.coordinates[0];
            if (firstPoint) {
              coordinates = {
                lng: firstPoint[0],
                lat: firstPoint[1]
              };
            }
          }
        }

        // Extract properties from GeoJSON or flat structure
        const props = data.properties || data;

        // Store the COMPLETE data object including GeoJSON properties
        // This allows getRelevantFields to access ALL backend attributes
        const itemWithAllData = {
          ...data,
          id: (data.id || props.id || objectId).toString(),
          name: props.nom || props.marque || `${objectType} ${data.id || objectId}`,
          type: objectType,
          state: props.etat || 'bon',
          coordinates,
          photos: props.photos || [],
        };
        setItem(itemWithAllData as any);

      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erreur de chargement des données.');
      } finally {
        setIsLoading(false);
      }
    };

    loadItem();
  }, [objectType, objectId, refreshKey]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (!item) return <ErrorDisplay message="Objet non trouvé." />;

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/inventory" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="capitalize">{item.type}</span>
              <span>•</span>
              <StatusBadge status={item.state} type="state" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <Calendar className="w-4 h-4" />
            Planifier
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 overflow-y-auto">
        {/* Left Column - Details */}
        <div className="md:col-span-2 bg-gray-50 p-6 rounded-lg border">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Info className="w-5 h-5 text-emerald-600" />Informations Générales</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            {getRelevantFields(item, objectType).map((field) => (
              <div key={field.label} className="col-span-1">
                <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                <dd className="mt-1 text-gray-900">{field.value || 'N/A'}</dd>
              </div>
            ))}
          </dl>

          <h2 className="text-lg font-semibold text-gray-800 mt-8 mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-emerald-600" />Historique des Interventions</h2>
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
            <p>L'historique des interventions sera affiché ici.</p>
          </div>
        </div>

        {/* Right Column - Map and Photos */}
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" />Localisation</h2>
            <div className="h-64 rounded-lg cursor-pointer" title="Cliquer pour voir sur la grande carte">
              <OLMap
                isMiniMap={true}
                activeLayer={MAP_LAYERS.SATELLITE}
                targetLocation={{ coordinates: item.coordinates, zoom: 18 }}
                highlightedGeometry={(item as any).geometry} // Pass full geometry for highlighting
                searchResult={{
                  name: item.name,
                  coordinates: item.coordinates,
                  description: '',
                  zoom: 18
                }}
                onObjectClick={() => {
                  // Navigate to main Map page with object coordinates
                  navigate('/map', {
                    state: {
                      targetLocation: {
                        coordinates: item.coordinates,
                        zoom: 18
                      }
                    }
                  });
                }}
              />
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-600" />Photos</h2>
            {item.photos && item.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {item.photos.map((photo, index) => (
                  <img key={index} src={photo} alt={`${item.name} ${index + 1}`} className="w-full h-32 object-cover rounded-md" />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Aucune photo</div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      <EditObjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        objectType={objectType}
        objectId={objectId}
        currentData={item}
        onSuccess={() => {
          // Trigger reload by incrementing refreshKey
          setRefreshKey(prev => prev + 1);
        }}
      />
    </div>
  );
};

// Helper function to get relevant fields based on object type
// Based on actual Django model fields from backend/api/models.py
// Shows ALL available attributes for each type
function getRelevantFields(item: InventoryItem, objectType: string): Array<{ label: string; value: string | number | undefined }> {
  const fields: Array<{ label: string; value: string | number | undefined }> = [];

  // Extract properties from API response (GeoJSON format)
  const data = item as any;
  const props = data.properties || data;

  // Common fields from Objet base class
  if (props.nom || item.name) {
    fields.push({ label: 'Nom', value: props.nom || item.name });
  }

  // Site name (not ID!)
  if (props.site_nom) {
    fields.push({ label: 'Site', value: props.site_nom });
  }

  // Sous-site name (if exists)
  if (props.sous_site_nom) {
    fields.push({ label: 'Sous-site', value: props.sous_site_nom });
  }

  // État (from Objet base class)
  if (props.etat || item.state) {
    fields.push({ label: 'État', value: props.etat || item.state });
  }

  const type = objectType.toLowerCase();

  // ========== VEGETATION ==========

  // Arbre: nom, famille, observation, last_intervention_date, taille, symbole
  if (type === 'arbre') {
    if (props.famille) fields.push({ label: 'Famille', value: props.famille });
    if (props.taille) fields.push({ label: 'Taille', value: props.taille });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
  }

  // Palmier: nom, famille, observation, last_intervention_date, taille, symbole
  if (type === 'palmier') {
    if (props.famille) fields.push({ label: 'Famille', value: props.famille });
    if (props.taille) fields.push({ label: 'Taille', value: props.taille });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
  }

  // Gazon: nom, famille, observation, last_intervention_date, area_sqm
  if (type === 'gazon') {
    if (props.famille) fields.push({ label: 'Famille', value: props.famille });
    if (props.area_sqm) fields.push({ label: 'Surface (m²)', value: props.area_sqm });
    if (props.superficie_calculee) {
      fields.push({
        label: 'Superficie calculée (m²)',
        value: Number(props.superficie_calculee).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      });
    }
  }

  // Arbuste: nom, famille, observation, last_intervention_date, densite, symbole
  if (type === 'arbuste') {
    if (props.famille) fields.push({ label: 'Famille', value: props.famille });
    if (props.densite) fields.push({ label: 'Densité', value: props.densite });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
    if (props.superficie_calculee) {
      fields.push({
        label: 'Superficie calculée (m²)',
        value: Number(props.superficie_calculee).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      });
    }
  }

  // Vivace: nom, famille, observation, last_intervention_date, densite
  if (type === 'vivace') {
    if (props.famille) fields.push({ label: 'Famille', value: props.famille });
    if (props.densite) fields.push({ label: 'Densité', value: props.densite });
    if (props.superficie_calculee) {
      fields.push({
        label: 'Superficie calculée (m²)',
        value: Number(props.superficie_calculee).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      });
    }
  }

  // Cactus: nom, famille, observation, last_intervention_date, densite
  if (type === 'cactus') {
    if (props.famille) fields.push({ label: 'Famille', value: props.famille });
    if (props.densite) fields.push({ label: 'Densité', value: props.densite });
    if (props.superficie_calculee) {
      fields.push({
        label: 'Superficie calculée (m²)',
        value: Number(props.superficie_calculee).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      });
    }
  }

  // Graminee: nom, famille, observation, last_intervention_date, densite, symbole
  if (type === 'graminee') {
    if (props.famille) fields.push({ label: 'Famille', value: props.famille });
    if (props.densite) fields.push({ label: 'Densité', value: props.densite });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
    if (props.superficie_calculee) {
      fields.push({
        label: 'Superficie calculée (m²)',
        value: Number(props.superficie_calculee).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      });
    }
  }

  // ========== HYDRAULIQUE ==========

  // Puit: nom, observation, last_intervention_date, profondeur, diametre, niveau_statique, niveau_dynamique, symbole
  if (type === 'puit') {
    if (props.profondeur) fields.push({ label: 'Profondeur (m)', value: props.profondeur });
    if (props.diametre) fields.push({ label: 'Diamètre (mm)', value: props.diametre });
    if (props.niveau_statique) fields.push({ label: 'Niveau statique (m)', value: props.niveau_statique });
    if (props.niveau_dynamique) fields.push({ label: 'Niveau dynamique (m)', value: props.niveau_dynamique });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
  }

  // Pompe: nom, observation, last_intervention_date, type, diametre, puissance, debit, symbole
  if (type === 'pompe') {
    if (props.type) fields.push({ label: 'Type', value: props.type });
    if (props.diametre) fields.push({ label: 'Diamètre (mm)', value: props.diametre });
    if (props.puissance) fields.push({ label: 'Puissance (kW)', value: props.puissance });
    if (props.debit) fields.push({ label: 'Débit (L/h)', value: props.debit });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
  }

  // Vanne: marque, type, diametre, materiau, pression, symbole, observation
  if (type === 'vanne') {
    if (props.marque) fields.push({ label: 'Marque', value: props.marque });
    if (props.type) fields.push({ label: 'Type', value: props.type });
    if (props.diametre) fields.push({ label: 'Diamètre (mm)', value: props.diametre });
    if (props.materiau) fields.push({ label: 'Matériau', value: props.materiau });
    if (props.pression) fields.push({ label: 'Pression (bar)', value: props.pression });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
  }

  // Clapet: marque, type, diametre, materiau, pression, symbole, observation
  if (type === 'clapet') {
    if (props.marque) fields.push({ label: 'Marque', value: props.marque });
    if (props.type) fields.push({ label: 'Type', value: props.type });
    if (props.diametre) fields.push({ label: 'Diamètre (mm)', value: props.diametre });
    if (props.materiau) fields.push({ label: 'Matériau', value: props.materiau });
    if (props.pression) fields.push({ label: 'Pression (bar)', value: props.pression });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
  }

  // Canalisation: marque, type, diametre, materiau, pression, symbole, observation
  if (type === 'canalisation') {
    if (props.marque) fields.push({ label: 'Marque', value: props.marque });
    if (props.type) fields.push({ label: 'Type', value: props.type });
    if (props.diametre) fields.push({ label: 'Diamètre (mm)', value: props.diametre });
    if (props.materiau) fields.push({ label: 'Matériau', value: props.materiau });
    if (props.pression) fields.push({ label: 'Pression (bar)', value: props.pression });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
  }

  // Aspersion: marque, type, diametre, materiau, pression, symbole, observation
  if (type === 'aspersion') {
    if (props.marque) fields.push({ label: 'Marque', value: props.marque });
    if (props.type) fields.push({ label: 'Type', value: props.type });
    if (props.diametre) fields.push({ label: 'Diamètre (mm)', value: props.diametre });
    if (props.materiau) fields.push({ label: 'Matériau', value: props.materiau });
    if (props.pression) fields.push({ label: 'Pression (bar)', value: props.pression });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
  }

  // Goutte: type, diametre, materiau, pression, symbole, observation (NO marque!)
  if (type === 'goutte') {
    if (props.type) fields.push({ label: 'Type', value: props.type });
    if (props.diametre) fields.push({ label: 'Diamètre (mm)', value: props.diametre });
    if (props.materiau) fields.push({ label: 'Matériau', value: props.materiau });
    if (props.pression) fields.push({ label: 'Pression (bar)', value: props.pression });
    if (props.symbole) fields.push({ label: 'Symbole', value: props.symbole });
  }

  // Ballon: marque, pression, volume, materiau, observation
  if (type === 'ballon') {
    if (props.marque) fields.push({ label: 'Marque', value: props.marque });
    if (props.volume) fields.push({ label: 'Volume (L)', value: props.volume });
    if (props.pression) fields.push({ label: 'Pression (bar)', value: props.pression });
    if (props.materiau) fields.push({ label: 'Matériau', value: props.materiau });
  }

  // ========== COMMON FIELDS (appear on all or most types) ==========

  // Last intervention date
  if (props.last_intervention_date) {
    fields.push({
      label: 'Dernière intervention',
      value: new Date(props.last_intervention_date).toLocaleDateString('fr-FR')
    });
  }

  // Observation (exists on most types)
  if (props.observation) {
    fields.push({ label: 'Observation', value: props.observation });
  }

  // Coordinates
  if (item.coordinates) {
    fields.push({
      label: 'Coordonnées',
      value: `${item.coordinates.lat.toFixed(6)}, ${item.coordinates.lng.toFixed(6)}`
    });
  }

  return fields;
}

export default InventoryDetailPage;