import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, Navigation, Calendar as CalendarIcon, ClipboardList, AlertTriangle } from 'lucide-react';

import type { MapObjectDetail } from '../../types';
import { RECLAMATION_STATUS_COLORS } from '../../constants';

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

  const canCreateTask = userRole !== 'SUPERVISEUR' && userRole !== 'CLIENT';
  const isSite = selectedObject.type === 'Site' || selectedObject.type === 'site';
  const isReclamation = selectedObject.type === 'Reclamation';

  const handleViewDetails = () => {
    if (!selectedObject) return;

    // Special handling for Site details
    if (isSite) {
      navigate(`/sites/${selectedObject.id}`);
      return;
    }

    // Special handling for Reclamation details
    if (isReclamation) {
      navigate('/reclamations', {
        state: {
          openReclamationId: selectedObject.id
        }
      });
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
      'Actif': 'Actif',

      // Reclamation fields
      'numero_reclamation': 'N° Réclamation',
      'statut': 'Statut',
      'statut_display': 'Statut',
      'urgence': 'Urgence',
      'type_reclamation': 'Type',
      'description': 'Description',
      // 'site_nom' déjà défini plus haut
      'zone_nom': 'Zone',
      'date_creation': 'Date création',
      'couleur_statut': 'Couleur'
    };

    return translations[key] || key;
  };

  // Déterminer le style du header selon le type
  const getHeaderStyle = () => {
    if (isSite) {
      return { backgroundColor: selectedObject.attributes?.Couleur as string || '#3b82f6' };
    }
    if (isReclamation) {
      const statut = selectedObject.attributes?.statut as string;
      const color = RECLAMATION_STATUS_COLORS[statut] || '#f97316';
      return { background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` };
    }
    return {};
  };

  const getHeaderClass = () => {
    if (isSite) return '';
    if (isReclamation) return '';
    return 'bg-gradient-to-br from-emerald-600 to-teal-700';
  };

  const getBadgeClass = () => {
    if (isSite) return 'text-blue-100 bg-black/20';
    if (isReclamation) return 'text-orange-100 bg-black/20';
    return 'text-emerald-100 bg-black/20';
  };

  return (
    <div className="absolute top-20 right-4 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 animate-slide-in pointer-events-auto ring-1 ring-black/5 z-50 overflow-hidden">
      <div
        className={`h-28 relative p-4 flex flex-col justify-end ${getHeaderClass()}`}
        style={getHeaderStyle()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        {isReclamation && (
          <AlertTriangle className="absolute top-3 left-4 w-5 h-5 text-white/80" />
        )}
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mb-1 ${getBadgeClass()}`}>
          {isReclamation ? 'Réclamation' : selectedObject.type}
        </span>
        <h3 className="text-lg font-bold text-white leading-tight">{selectedObject.title}</h3>
        {selectedObject.attributes?.['Catégorie'] && selectedObject.type === 'Site' && (
          <span className="text-xs text-white/80 mt-1">{selectedObject.attributes['Catégorie']}</span>
        )}
        {isReclamation && selectedObject.attributes?.statut_display && (
          <span className="text-xs text-white/90 mt-1 font-medium">
            Statut: {selectedObject.attributes.statut_display}
          </span>
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

            // Pour les réclamations, ignorer les champs techniques et ceux déjà affichés
            if (isReclamation && (
              key === 'couleur_statut' ||
              key === 'statut' ||
              key === 'statut_display' ||
              key === 'object_type'
            )) {
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
          {isReclamation ? (
            // Boutons pour les réclamations
            <>
              <button
                onClick={handleViewDetails}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <Eye className="w-3 h-3" /> Voir détails
              </button>
              {canCreateTask && onCreateTask && selectedObject.attributes?.statut !== 'CLOTUREE' && (
                <button
                  onClick={onCreateTask}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <ClipboardList className="w-3 h-3" /> Créer Tâche
                </button>
              )}
            </>
          ) : isSite ? (
            <>
              <button
                onClick={handleViewDetails}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 w-full"
              >
                <Eye className="w-3 h-3" /> Voir détails
              </button>
              {onCreateReclamation && (
                <button
                  onClick={onCreateReclamation}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3" /> Signaler
                </button>
              )}
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
