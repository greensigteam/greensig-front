import React, { useState } from 'react';
import { format } from 'date-fns';
import {
    Download,
    FileJson,
    FileSpreadsheet,
    Map,
    Package,
    Loader2,
    CheckCircle2,
    X,
    Info,
} from 'lucide-react';
import {
    exportGeoData,
    exportSelection,
    downloadBlob,
    getExportFileExtension,
    ExportFormat,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { OBJECT_TYPES } from '../../contexts/DrawingContext';

interface ExportPanelProps {
    isOpen: boolean;
    onClose: () => void;
    // Optional: pre-selected items for export
    selectedType?: string;
    selectedIds?: number[];
}

interface FormatOption {
    id: ExportFormat;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: 'data' | 'geo';
}

const FORMAT_OPTIONS: FormatOption[] = [
    {
        id: 'csv',
        name: 'CSV',
        description: 'Tableur (Excel, LibreOffice)',
        icon: <FileSpreadsheet className="w-5 h-5" />,
        category: 'data',
    },
    {
        id: 'xlsx',
        name: 'Excel',
        description: 'Microsoft Excel (.xlsx)',
        icon: <FileSpreadsheet className="w-5 h-5" />,
        category: 'data',
    },
    {
        id: 'geojson',
        name: 'GeoJSON',
        description: 'Format web standard',
        icon: <FileJson className="w-5 h-5" />,
        category: 'geo',
    },
    {
        id: 'kml',
        name: 'KML',
        description: 'Google Earth / Maps',
        icon: <Map className="w-5 h-5" />,
        category: 'geo',
    },
    {
        id: 'shapefile',
        name: 'Shapefile',
        description: 'SIG (QGIS, ArcGIS)',
        icon: <Package className="w-5 h-5" />,
        category: 'geo',
    },
];

// Map object type to API endpoint
const TYPE_TO_ENDPOINT: Record<string, string> = {
    'Arbre': 'arbres',
    'Palmier': 'palmiers',
    'Gazon': 'gazons',
    'Arbuste': 'arbustes',
    'Vivace': 'vivaces',
    'Cactus': 'cactus',
    'Graminee': 'graminees',
    'Puit': 'puits',
    'Pompe': 'pompes',
    'Vanne': 'vannes',
    'Clapet': 'clapets',
    'Ballon': 'ballons',
    'Canalisation': 'canalisations',
    'Aspersion': 'aspersions',
    'Goutte': 'gouttes',
};

export default function ExportPanel({
    isOpen,
    onClose,
    selectedType,
    selectedIds,
}: ExportPanelProps) {
    const { showToast } = useToast();

    const [objectType, setObjectType] = useState<string>(selectedType || '');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('geojson');
    const [exportAll, setExportAll] = useState(!selectedIds?.length);
    const [isExporting, setIsExporting] = useState(false);

    // Group formats by category
    const dataFormats = FORMAT_OPTIONS.filter(f => f.category === 'data');
    const geoFormats = FORMAT_OPTIONS.filter(f => f.category === 'geo');

    const handleExport = async () => {
        if (!objectType) {
            showToast('Veuillez sélectionner un type d\'objet', 'error');
            return;
        }

        const endpoint = TYPE_TO_ENDPOINT[objectType];
        if (!endpoint) {
            showToast('Type d\'objet non supporté', 'error');
            return;
        }

        setIsExporting(true);

        try {
            let blob: Blob;

            if (exportAll || !selectedIds?.length) {
                blob = await exportGeoData(endpoint, exportFormat);
            } else {
                blob = await exportSelection(objectType, selectedIds, exportFormat);
            }

            // Generate filename
            const timestamp = format(new Date(), 'yyyy-MM-dd');
            const extension = getExportFileExtension(exportFormat);
            const filename = `${endpoint}_${timestamp}${extension}`;

            // Download
            downloadBlob(blob, filename);

            showToast(`Export ${exportFormat.toUpperCase()} réussi`, 'success');
            onClose();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de l\'export', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Download className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Exporter des données
                            </h2>
                            <p className="text-sm text-gray-500">
                                Choisissez le format d'export
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Object Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type d'objet à exporter
                        </label>
                        <select
                            value={objectType}
                            onChange={(e) => setObjectType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Sélectionner un type...</option>
                            <optgroup label="Végétation">
                                {OBJECT_TYPES.filter(t => t.category === 'vegetation').map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.namePlural}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Hydraulique">
                                {OBJECT_TYPES.filter(t => t.category === 'hydraulique').map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.namePlural}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {/* Export Scope */}
                    {selectedIds && selectedIds.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Périmètre
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={exportAll}
                                        onChange={() => setExportAll(true)}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm text-gray-700">Tout exporter</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={!exportAll}
                                        onChange={() => setExportAll(false)}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Sélection ({selectedIds.length} objet{selectedIds.length > 1 ? 's' : ''})
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Format d'export
                        </label>

                        {/* Data Formats */}
                        <div className="mb-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                                Données tabulaires
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {dataFormats.map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => setExportFormat(option.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                                            exportFormat === option.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div
                                            className={`${
                                                exportFormat === option.id
                                                    ? 'text-blue-600'
                                                    : 'text-gray-400'
                                            }`}
                                        >
                                            {option.icon}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{option.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {option.description}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Geo Formats */}
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                                Données géographiques
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {geoFormats.map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => setExportFormat(option.id)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                                            exportFormat === option.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div
                                            className={`${
                                                exportFormat === option.id
                                                    ? 'text-blue-600'
                                                    : 'text-gray-400'
                                            }`}
                                        >
                                            {option.icon}
                                        </div>
                                        <div className="text-center">
                                            <div className="font-medium text-sm">{option.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {option.description}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                        <Info className="w-4 h-4 mt-0.5 text-gray-400" />
                        <p>
                            Les formats géographiques (GeoJSON, KML, Shapefile) incluent les
                            coordonnées et peuvent être ouverts dans des logiciels SIG.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={!objectType || isExporting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Export en cours...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Exporter en {exportFormat.toUpperCase()}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
