import React, { useState, useEffect, useMemo } from 'react';
import { X, Trash2, MapPin, MousePointer2, Move, Pencil, AlertTriangle, Square, SquareDashedMousePointer, Ban } from 'lucide-react';
import { useSelection } from '../../contexts/SelectionContext';
import { useDrawing } from '../../contexts/DrawingContext';
import { EditingMode } from '../../types';
import { planningService } from '../../services/planningService';

interface SelectionPanelProps {
    onCreateIntervention?: () => void;
    onDeleteObjects?: () => void;
    isSidebarCollapsed?: boolean;
    userRole?: string;
}

export const SelectionPanel: React.FC<SelectionPanelProps> = ({
    onCreateIntervention,
    onDeleteObjects,
    isSidebarCollapsed = true,
    userRole
}) => {
    const { selectedObjects, clearSelection, removeFromSelection, isSelectionMode, setSelectionMode, isBoxSelectionMode, setBoxSelectionMode } = useSelection();
    const { editingMode, setEditingMode } = useDrawing();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // State for task type compatibility check
    const [isCompatible, setIsCompatible] = useState(true);
    const [compatibilityLoading, setCompatibilityLoading] = useState(false);
    const [applicableTasksCount, setApplicableTasksCount] = useState<number | null>(null);

    // Get unique object types from selection
    const uniqueObjectTypes = useMemo(() => {
        return [...new Set(selectedObjects.map(obj => obj.type))];
    }, [selectedObjects]);

    // Check compatibility when selected objects change
    useEffect(() => {
        if (selectedObjects.length === 0) {
            setIsCompatible(true);
            setApplicableTasksCount(null);
            return;
        }

        // If only one type, always compatible
        if (uniqueObjectTypes.length <= 1) {
            setIsCompatible(true);
            setApplicableTasksCount(null);
            return;
        }

        // Check if there are applicable task types for all selected object types
        setCompatibilityLoading(true);
        planningService.getApplicableTypesTaches(uniqueObjectTypes)
            .then(result => {
                setIsCompatible(result.types_taches.length > 0);
                setApplicableTasksCount(result.types_taches.length);
            })
            .catch(err => {
                console.error('Erreur vérification compatibilité:', err);
                // On error, assume compatible to not block the user
                setIsCompatible(true);
            })
            .finally(() => setCompatibilityLoading(false));
    }, [selectedObjects, uniqueObjectTypes]);

    // Toggle box selection mode
    const handleBoxSelectionToggle = () => {
        // Disable editing mode when enabling box selection
        if (!isBoxSelectionMode) {
            setEditingMode('none');
        }
        setBoxSelectionMode(!isBoxSelectionMode);
    };

    // Handle editing mode toggle
    const handleEditingMode = (mode: EditingMode) => {
        // Disable box selection when entering editing mode
        if (isBoxSelectionMode) {
            setBoxSelectionMode(false);
        }
        if (editingMode === mode) {
            setEditingMode('none');
        } else {
            setEditingMode(mode);
        }
    };

    // Handle delete action
    const handleDelete = () => {
        if (onDeleteObjects) {
            onDeleteObjects();
        }
        setShowDeleteConfirm(false);
    };

    if (!isSelectionMode) {
        return null;
    }

    return (
        <div
            className="absolute bottom-[230px] w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/40 ring-1 ring-black/5 z-50 max-h-[500px] flex flex-col transition-all duration-300 pointer-events-auto"
            style={{ left: isSidebarCollapsed ? '88px' : '276px' }}
        >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-yellow-50/80">
                <div>
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-yellow-600" />
                        Sélection active
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                        {selectedObjects.length > 0
                            ? `${selectedObjects.length} objet${selectedObjects.length > 1 ? 's' : ''} sélectionné${selectedObjects.length > 1 ? 's' : ''}`
                            : 'Cliquez sur les objets ou utilisez la sélection rectangle'
                        }
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {selectedObjects.length > 0 && (
                        <button
                            onClick={clearSelection}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Vider la sélection"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setSelectionMode(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="Fermer et quitter le mode sélection"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Box Selection Tool */}
            <div className="p-3 border-b border-slate-100 bg-indigo-50/50">
                <button
                    onClick={handleBoxSelectionToggle}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${isBoxSelectionMode
                        ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                        : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200'
                        }`}
                    title="Dessinez un rectangle pour sélectionner plusieurs objets"
                >
                    <SquareDashedMousePointer className="w-4 h-4" />
                    {isBoxSelectionMode ? 'Sélection rectangle active...' : 'Sélection par rectangle'}
                </button>
                {isBoxSelectionMode && (
                    <p className="text-xs text-indigo-600 mt-2 text-center animate-pulse">
                        Faites glisser sur la carte pour sélectionner
                    </p>
                )}
            </div>

            {/* Selected Objects List */}
            {selectedObjects.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-2 max-h-40">
                    {selectedObjects.map((obj, index) => (
                        <div
                            key={obj.id}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg mb-1 group"
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-xs font-mono text-slate-400 w-6 flex-shrink-0">
                                    {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-slate-700 truncate">
                                        {obj.title}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {obj.type}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => removeFromSelection(obj.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all ml-2 flex-shrink-0"
                                title="Retirer de la sélection"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-4 text-center text-slate-500 text-sm">
                    <Square className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Aucun objet sélectionné
                </div>
            )}

            {/*
             * DÉSACTIVÉ par demande du Product Owner (20/12/2024)
             * Outils de modification de géométrie retirés temporairement.
             * Pour réactiver : décommenter le bloc ci-dessous.
             *
            {selectedObjects.length > 0 && userRole !== 'CHEF_EQUIPE' && userRole !== 'CLIENT' && (
                <div className="p-3 border-t border-slate-100 bg-blue-50/50">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Pencil className="w-3 h-3" />
                        Modifier la géométrie
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleEditingMode('modify')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${editingMode === 'modify'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white hover:bg-blue-50 text-slate-600 border border-slate-200'
                                }`}
                            title="Modifier les sommets des objets sélectionnés"
                        >
                            <MousePointer2 className="w-4 h-4" />
                            <span>Sommets</span>
                        </button>
                        <button
                            onClick={() => handleEditingMode('move')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${editingMode === 'move'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white hover:bg-blue-50 text-slate-600 border border-slate-200'
                                }`}
                            title="Déplacer les objets sélectionnés"
                        >
                            <Move className="w-4 h-4" />
                            <span>Déplacer</span>
                        </button>
                    </div>
                    {editingMode !== 'none' && (
                        <p className="text-xs text-blue-600 mt-2 text-center">
                            {editingMode === 'modify'
                                ? 'Cliquez et faites glisser les sommets pour modifier'
                                : 'Cliquez et faites glisser pour déplacer'}
                        </p>
                    )}
                </div>
            )}
            */}

            {/* Actions */}
            {selectedObjects.length > 0 && userRole !== 'CHEF_EQUIPE' && userRole !== 'CLIENT' && (
                <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
                    {/* Incompatibility Warning */}
                    {!isCompatible && !compatibilityLoading && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-2">
                            <div className="flex items-start gap-2">
                                <Ban className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-red-700">
                                        Types incompatibles
                                    </p>
                                    <p className="text-xs text-red-600 mt-0.5">
                                        Les types sélectionnés ({uniqueObjectTypes.join(', ')}) n'ont aucune tâche en commun.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Compatibility info when multiple types are compatible */}
                    {isCompatible && applicableTasksCount !== null && uniqueObjectTypes.length > 1 && !compatibilityLoading && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2">
                            <p className="text-xs text-emerald-700 text-center">
                                ✓ {applicableTasksCount} type{applicableTasksCount > 1 ? 's' : ''} de tâche{applicableTasksCount > 1 ? 's' : ''} applicable{applicableTasksCount > 1 ? 's' : ''} aux {uniqueObjectTypes.length} types sélectionnés
                            </p>
                        </div>
                    )}

                    {onCreateIntervention && (
                        <button
                            onClick={onCreateIntervention}
                            disabled={!isCompatible || compatibilityLoading}
                            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 ${
                                !isCompatible || compatibilityLoading
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                        >
                            {compatibilityLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    Vérification...
                                </>
                            ) : (
                                <>
                                    <MapPin className="w-4 h-4" />
                                    Créer une tâche
                                </>
                            )}
                        </button>
                    )}

                    {/*
                     * DÉSACTIVÉ par demande du Product Owner (20/12/2024)
                     * Bouton de suppression retiré temporairement.
                     * Pour réactiver : décommenter le bloc ci-dessous.
                     *
                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full bg-white hover:bg-red-50 text-red-600 py-2 px-4 rounded-lg font-medium text-sm transition-colors border border-red-200 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Supprimer ({selectedObjects.length})
                        </button>
                    ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-red-700 mb-2">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm font-medium">Confirmer la suppression ?</span>
                            </div>
                            <p className="text-xs text-red-600 mb-3">
                                {selectedObjects.length} objet{selectedObjects.length > 1 ? 's seront supprimés' : ' sera supprimé'}. Cette action est irréversible.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 bg-white hover:bg-slate-50 text-slate-600 py-1.5 px-3 rounded-md text-xs font-medium border border-slate-200"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded-md text-xs font-medium"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    )}
                    */}
                </div>
            )}
        </div>
    );
};
