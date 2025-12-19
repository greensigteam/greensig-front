import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, Navigation, Calendar as CalendarIcon, ClipboardList, AlertCircle } from 'lucide-react';
import type { MapObjectDetail } from '../../types';

interface MapObjectDetailCardProps {
  selectedObject: MapObjectDetail | null;
  onClose?: () => void;
  onViewCentreGest?: () => void;
  onCreateTask?: () => void;
  onCreateReclamation?: () => void;
  userRole?: string;
}

/**
 * Object Detail Card component
 *
 * Features:
 * - Displays selected object properties
 * - Color-coded header based on type
 * - Action buttons (details, itinerary, create intervention)
 * - Auto-positioned (top-right)
 */
export const MapObjectDetailCard: React.FC<MapObjectDetailCardProps> = ({
  selectedObject,
  onClose,
  onCreateTask,
  onCreateReclamation,
  userRole
}) => {
  const navigate = useNavigate();

  if (!selectedObject) return null;

  const canCreateTask = userRole !== 'CHEF_EQUIPE' && userRole !== 'CLIENT';
  const isSite = selectedObject.type === 'Site' || selectedObject.type === 'site';

  const handleViewDetails = () => {
    if (!selectedObject) return;

    // Special handling for Site details
    if (isSite) {
      navigate(`/sites/${selectedObject.id}`);
      return;
    }

    // Convert type to lowercase for URL (e.g., "Arbre" -> "arbre")
    const typeForUrl = selectedObject.type.toLowerCase();
    const objectId = selectedObject.id;

    // Navigate to inventory detail page
    navigate(`/inventory/${typeForUrl}/${objectId}`);
  };

  // Translate attribute keys to French
  const translateAttributeLabel = (key: string): string => {
    const translations: Record<string, string> = {
      // Common fields
      'etat': 'État',
      'nom': 'Nom',
      'site_nom': 'Site',
      'sous_site_nom': 'Sous-site',
      'observation': 'Observation',
      'last_intervention_date': 'Dernière intervention',

      // Vegetation
      'famille': 'Famille',
      'taille': 'Taille',
      'symbole': 'Symbole',
      'densite': 'Densité',
      'area_sqm': 'Surface (m²)',
      'superficie_calculee': 'Superficie (m²)',

      // Hydraulic
      'profondeur': 'Profondeur (m)',
      'diametre': 'Diamètre (mm)',
      'niveau_statique': 'Niveau statique (m)',
      'niveau_dynamique': 'Niveau dynamique (m)',
      'type': 'Type',
      'marque': 'Marque',
      'puissance': 'Puissance (kW)',
      'debit': 'Débit (m³/h)',
      'materiau': 'Matériau',
      'pression': 'Pression (bar)',
      'volume': 'Volume (L)',

      // Site fields
      'Code': 'Code',
      'Adresse': 'Adresse',
      'Surface totale': 'Surface totale',
      'Date début contrat': 'Début contrat',
      'Date fin contrat': 'Fin contrat',
      'Actif': 'Actif'
    };

    return translations[key] || key;
  };

  return (
    <div className="absolute top-20 right-4 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 animate-slide-in pointer-events-auto ring-1 ring-black/5 z-50 overflow-hidden">
      <div
        className={`h-28 relative p-4 flex flex-col justify-end ${selectedObject.type !== 'Site'
          ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
          : ''
          }`}
        style={
          selectedObject.type === 'Site'
            ? { backgroundColor: selectedObject.attributes?.Couleur as string || '#3b82f6' }
            : {}
        }
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mb-1 ${selectedObject.type === 'Site' ? 'text-blue-100 bg-black/20' : 'text-emerald-100 bg-black/20'
          }`}>
          {selectedObject.type}
        </span>
        <h3 className="text-lg font-bold text-white leading-tight">{selectedObject.title}</h3>
        {selectedObject.attributes?.['Catégorie'] && selectedObject.type === 'Site' && (
          <span className="text-xs text-white/80 mt-1">{selectedObject.attributes['Catégorie']}</span>
        )}
      </div>
      <div className="p-4 space-y-4">
        <p className="text-sm text-slate-500 font-medium">{selectedObject.subtitle}</p>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(selectedObject.attributes).map(([key, value]) => {
            // Ignorer les champs géométriques, objets complexes, IDs et champs techniques
            if (
              key === 'centroid' ||
              key === 'center' ||
              key === 'geometry' ||
              key === 'id' ||
              key === 'site' ||
              key === 'sous_site' ||
              typeof value === 'object'
            ) {
              return null;
            }

            // Pour les sites, ignorer Description (déjà affiché) et Couleur
            if (selectedObject.type === 'Site' && (key === 'Description' || key === 'Couleur')) {
              return null;
            }

            // Traitement spécial pour Google Maps
            if (key === 'Google Maps' && typeof value === 'string' && value.startsWith('http')) {
              return (
                <div key={key} className="col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="text-[10px] text-blue-400 uppercase font-bold mb-1">{key}</div>
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2 hover:underline"
                  >
                    <Navigation className="w-4 h-4" />
                    Ouvrir dans Google Maps
                  </a>
                </div>
              );
            }

            // Format value based on type
            let displayValue: string;
            if (key === 'superficie_calculee') {
              // Format area with French locale and thousands separator
              const numValue = typeof value === 'number' ? value : parseFloat(String(value));
              displayValue = !isNaN(numValue)
                ? `${numValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`
                : String(value);
            } else if (key === 'last_intervention_date' && typeof value === 'string') {
              // Format date
              displayValue = new Date(value).toLocaleDateString('fr-FR');
            } else {
              displayValue = String(value);
            }

            return (
              <div key={key} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase font-bold">{translateAttributeLabel(key)}</div>
                <div className="text-sm font-semibold text-slate-700 truncate" title={displayValue}>{displayValue}</div>
              </div>
            );
          })}
        </div>

        {selectedObject.lastIntervention && (
          <div className="flex items-center gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
            <CalendarIcon className="w-4 h-4 text-emerald-500" />
            <span>Dernière intervention : <b>{selectedObject.lastIntervention}</b></span>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          {isSite ? (
            <>
              <button
                onClick={handleViewDetails}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <Eye className="w-3 h-3" /> Voir détails
              </button>
              <button
                onClick={onCreateReclamation}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <AlertCircle className="w-3 h-3" /> Réclamation
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleViewDetails}
                className={`flex-1 ${canCreateTask
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 w-full'
                  } text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1`}
              >
                <Eye className="w-3 h-3" /> Voir détails
              </button>
              {canCreateTask && (
                <button
                  onClick={onCreateTask}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <ClipboardList className="w-3 h-3" /> Créer une Tâche
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
