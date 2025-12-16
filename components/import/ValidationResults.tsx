import { useState } from 'react';
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Info,
} from 'lucide-react';
import { ImportValidationResponse } from '../../services/api';

interface ValidationResultsProps {
    result: ImportValidationResponse;
    onRetry: () => void;
}

export default function ValidationResults({ result, onRetry }: ValidationResultsProps) {
    const [showErrors, setShowErrors] = useState(true);
    const [showWarnings, setShowWarnings] = useState(true);
    const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set());

    const toggleFeature = (index: number) => {
        const newExpanded = new Set(expandedFeatures);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedFeatures(newExpanded);
    };

    const validPercent = Math.round((result.valid_count / (result.valid_count + result.invalid_count)) * 100);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-2" />
                    <div className="text-2xl font-bold text-green-700">
                        {result.valid_count}
                    </div>
                    <div className="text-sm text-green-600">Valides</div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                    <div className="text-2xl font-bold text-red-700">
                        {result.invalid_count}
                    </div>
                    <div className="text-sm text-red-600">Invalides</div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
                    <div className="text-2xl font-bold text-yellow-700">
                        {result.warnings.length}
                    </div>
                    <div className="text-sm text-yellow-600">Avertissements</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div>
                <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="text-gray-600">Taux de validité</span>
                    <span className="font-medium">{validPercent}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${
                            validPercent === 100
                                ? 'bg-green-500'
                                : validPercent >= 80
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                        }`}
                        style={{ width: `${validPercent}%` }}
                    />
                </div>
            </div>

            {/* Errors Section */}
            {result.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setShowErrors(!showErrors)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="font-medium text-red-800">
                                Erreurs ({result.errors.length})
                            </span>
                        </div>
                        {showErrors ? (
                            <ChevronUp className="w-5 h-5 text-red-600" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-red-600" />
                        )}
                    </button>

                    {showErrors && (
                        <div className="divide-y divide-red-100">
                            {result.errors.map((error, i) => (
                                <div key={i} className="px-4 py-2 text-sm">
                                    <span className="font-medium text-red-700">
                                        Feature #{error.index + 1}:
                                    </span>{' '}
                                    <span className="text-red-600">{error.message}</span>
                                    <span className="text-red-400 text-xs ml-2">
                                        [{error.code}]
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Warnings Section */}
            {result.warnings.length > 0 && (
                <div className="border border-yellow-200 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setShowWarnings(!showWarnings)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <span className="font-medium text-yellow-800">
                                Avertissements ({result.warnings.length})
                            </span>
                        </div>
                        {showWarnings ? (
                            <ChevronUp className="w-5 h-5 text-yellow-600" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-yellow-600" />
                        )}
                    </button>

                    {showWarnings && (
                        <div className="divide-y divide-yellow-100">
                            {result.warnings.map((warning, i) => (
                                <div key={i} className="px-4 py-2 text-sm">
                                    <span className="font-medium text-yellow-700">
                                        Feature #{warning.index + 1}:
                                    </span>{' '}
                                    <span className="text-yellow-600">{warning.message}</span>
                                    <span className="text-yellow-400 text-xs ml-2">
                                        [{warning.code}]
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Features Preview */}
            <div>
                <h4 className="font-medium text-gray-900 mb-2">
                    Apercu des objets à créer
                </h4>
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {result.features.slice(0, 20).map((feature) => (
                        <div key={feature.index}>
                            <div
                                className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                                    !feature.is_valid ? 'bg-red-50' : ''
                                }`}
                                onClick={() => toggleFeature(feature.index)}
                            >
                                {feature.is_valid ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <div className="flex-1">
                                    <span className="font-medium">
                                        Feature #{feature.index + 1}
                                    </span>
                                    <span className="text-gray-500 text-sm ml-2">
                                        ({feature.geometry_type})
                                    </span>
                                </div>
                                {expandedFeatures.has(feature.index) ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                            </div>

                            {expandedFeatures.has(feature.index) && (
                                <div className="px-11 pb-3">
                                    <div className="bg-gray-50 rounded p-2 text-sm">
                                        <div className="font-medium text-gray-600 mb-1">
                                            Propriétés mappées:
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                            {Object.entries(feature.mapped_properties).map(
                                                ([key, value]) => (
                                                    <div key={key}>
                                                        <span className="text-gray-500">{key}:</span>{' '}
                                                        <span className="text-gray-900">
                                                            {value !== null && value !== undefined
                                                                ? String(value)
                                                                : '-'}
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {result.features.length > 20 && (
                        <div className="px-4 py-2 text-sm text-gray-500 text-center">
                            ... et {result.features.length - 20} autre(s)
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            {result.invalid_count > 0 && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm text-blue-800">
                            {result.invalid_count} objet(s) ne seront pas importés en raison d'erreurs.
                            Vous pouvez modifier le mapping et réessayer.
                        </p>
                    </div>
                    <button
                        onClick={onRetry}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Modifier
                    </button>
                </div>
            )}

            {/* Success Message */}
            {result.valid_count > 0 && result.invalid_count === 0 && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800">
                        Tous les objets sont valides et prêts à être importés !
                    </p>
                </div>
            )}
        </div>
    );
}
