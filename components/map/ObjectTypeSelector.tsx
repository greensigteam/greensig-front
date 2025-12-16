import React from 'react';
import { X, TreeDeciduous, Droplet, Sprout, Flower2 } from 'lucide-react';
import { ObjectTypeInfo } from '../../types';
import { getObjectTypesByGeometry, getObjectTypesByCategory } from '../../contexts/DrawingContext';

interface ObjectTypeSelectorProps {
    geometryType: 'Point' | 'LineString' | 'Polygon';
    onSelect: (typeId: string) => void;
    onClose: () => void;
}

// Icon mapping for object types
const getIconForType = (typeId: string): React.ReactNode => {
    const iconClass = 'w-5 h-5';

    switch (typeId) {
        case 'Arbre':
        case 'Palmier':
            return <TreeDeciduous className={iconClass} />;
        case 'Gazon':
        case 'Graminee':
            return <Sprout className={iconClass} />;
        case 'Arbuste':
        case 'Vivace':
        case 'Cactus':
            return <Flower2 className={iconClass} />;
        case 'Puit':
        case 'Pompe':
        case 'Vanne':
        case 'Clapet':
        case 'Ballon':
        case 'Canalisation':
        case 'Aspersion':
        case 'Goutte':
            return <Droplet className={iconClass} />;
        default:
            return <div className={`${iconClass} bg-gray-300 rounded-full`} />;
    }
};

export default function ObjectTypeSelector({
    geometryType,
    onSelect,
    onClose,
}: ObjectTypeSelectorProps) {
    const compatibleTypes = getObjectTypesByGeometry(geometryType);

    // Group by category
    const vegetationTypes = compatibleTypes.filter(t => t.category === 'vegetation');
    const hydrauliqueTypes = compatibleTypes.filter(t => t.category === 'hydraulique');

    const renderTypeButton = (type: ObjectTypeInfo) => (
        <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${type.color}20` }}
            >
                <div style={{ color: type.color }}>
                    {getIconForType(type.id)}
                </div>
            </div>
            <div>
                <div className="font-medium text-sm">{type.name}</div>
                <div className="text-xs text-gray-500">
                    {type.geometryType === 'Point' ? 'Point' :
                     type.geometryType === 'LineString' ? 'Ligne' : 'Surface'}
                </div>
            </div>
        </button>
    );

    return (
        <div className="absolute inset-0 bg-white rounded-lg shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">
                    Choisir le type d'objet
                </h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Vegetation */}
                {vegetationTypes.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <TreeDeciduous className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Végétation
                            </span>
                        </div>
                        <div className="space-y-1">
                            {vegetationTypes.map(renderTypeButton)}
                        </div>
                    </div>
                )}

                {/* Hydraulique */}
                {hydrauliqueTypes.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <Droplet className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Hydraulique
                            </span>
                        </div>
                        <div className="space-y-1">
                            {hydrauliqueTypes.map(renderTypeButton)}
                        </div>
                    </div>
                )}

                {/* No compatible types */}
                {compatibleTypes.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                        <p>Aucun type compatible avec cette géométrie</p>
                    </div>
                )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
                Sélectionnez le type d'objet à créer
            </div>
        </div>
    );
}
