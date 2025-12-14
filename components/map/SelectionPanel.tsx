import React from 'react';
import { X, Trash2, MapPin } from 'lucide-react';
import { useSelection } from '../../contexts/SelectionContext';

interface SelectionPanelProps {
    onCreateIntervention?: () => void;
    isSidebarCollapsed?: boolean;
}

export const SelectionPanel: React.FC<SelectionPanelProps> = ({
    onCreateIntervention,
    isSidebarCollapsed = true
}) => {
    const { selectedObjects, clearSelection, removeFromSelection, isSelectionMode, setSelectionMode } = useSelection();

    if (!isSelectionMode || selectedObjects.length === 0) {
        return null;
    }

    return (
        <div
            className="absolute bottom-[230px] w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/40 ring-1 ring-black/5 z-50 max-h-96 flex flex-col transition-all duration-300 pointer-events-auto"
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
                        {selectedObjects.length} objet{selectedObjects.length > 1 ? 's' : ''} sélectionné{selectedObjects.length > 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={clearSelection}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Vider la sélection"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setSelectionMode(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="Fermer et quitter le mode sélection"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Selected Objects List */}
            <div className="flex-1 overflow-y-auto p-2">
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

            {/* Actions */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
                {onCreateIntervention && (
                    <button
                        onClick={onCreateIntervention}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                        <MapPin className="w-4 h-4" />
                        Créer intervention groupée
                    </button>
                )}
                <button
                    onClick={clearSelection}
                    className="w-full bg-white hover:bg-red-50 text-red-600 py-2 px-4 rounded-lg font-medium text-sm transition-colors border border-red-200 flex items-center justify-center gap-2"
                >
                    <Trash2 className="w-3 h-3" />
                    Effacer la sélection
                </button>
            </div>
        </div>
    );
};
