import React, { useState, useCallback } from 'react';
import {
    X,
    Upload,
    FileJson,
    Map,
    CheckCircle2,
    AlertTriangle,
    ChevronRight,
    ChevronLeft,
    Loader2,
} from 'lucide-react';
import {
    importPreview,
    importValidate,
    importExecute,
    ImportPreviewResponse,
    ImportValidationResponse,
    ImportExecuteResponse,
    ImportFeature,
    AttributeMapping,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import ImportPreview from './ImportPreview';
import AttributeMapper from './AttributeMapper';
import ValidationResults from './ValidationResults';

type WizardStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'complete';

interface ImportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (result: ImportExecuteResponse) => void;
}

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
    { id: 'upload', label: 'Fichier', icon: <Upload className="w-4 h-4" /> },
    { id: 'preview', label: 'Apercu', icon: <Map className="w-4 h-4" /> },
    { id: 'mapping', label: 'Mapping', icon: <FileJson className="w-4 h-4" /> },
    { id: 'validation', label: 'Validation', icon: <CheckCircle2 className="w-4 h-4" /> },
];

const ACCEPTED_FORMATS = {
    'application/json': ['.json', '.geojson'],
    'application/geo+json': ['.geojson'],
    'application/vnd.google-earth.kml+xml': ['.kml'],
    'application/vnd.google-earth.kmz': ['.kmz'],
    'application/zip': ['.zip'],
    'application/x-zip-compressed': ['.zip'],
};

export default function ImportWizard({ isOpen, onClose, onSuccess }: ImportWizardProps) {
    const { showToast } = useToast();

    // Wizard state
    const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
    const [isLoading, setIsLoading] = useState(false);

    // Data state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
    const [selectedFeatures, setSelectedFeatures] = useState<ImportFeature[]>([]);
    const [targetType, setTargetType] = useState<string>('');
    const [siteId, setSiteId] = useState<number | null>(null);
    const [autoDetectSite, setAutoDetectSite] = useState<boolean>(false);
    const [attributeMapping, setAttributeMapping] = useState<AttributeMapping>({});
    const [validationResult, setValidationResult] = useState<ImportValidationResponse | null>(null);
    const [executeResult, setExecuteResult] = useState<ImportExecuteResponse | null>(null);

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);

    // Reset wizard
    const resetWizard = useCallback(() => {
        setCurrentStep('upload');
        setSelectedFile(null);
        setPreviewData(null);
        setSelectedFeatures([]);
        setTargetType('');
        setSiteId(null);
        setAutoDetectSite(false);
        setAttributeMapping({});
        setValidationResult(null);
        setExecuteResult(null);
    }, []);

    // Handle close
    const handleClose = () => {
        resetWizard();
        onClose();
    };

    // File selection
    const handleFileSelect = useCallback((file: File) => {
        setSelectedFile(file);
    }, []);

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [handleFileSelect]);

    // File input change
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [handleFileSelect]);

    // Step navigation
    const goToNextStep = async () => {
        switch (currentStep) {
            case 'upload':
                await handleUploadStep();
                break;
            case 'preview':
                setCurrentStep('mapping');
                break;
            case 'mapping':
                await handleValidationStep();
                break;
            case 'validation':
                await handleExecuteStep();
                break;
        }
    };

    const goToPreviousStep = () => {
        switch (currentStep) {
            case 'preview':
                setCurrentStep('upload');
                break;
            case 'mapping':
                setCurrentStep('preview');
                break;
            case 'validation':
                setCurrentStep('mapping');
                break;
        }
    };

    // Upload step - preview file
    const handleUploadStep = async () => {
        if (!selectedFile) {
            showToast('Veuillez sélectionner un fichier', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const result = await importPreview(selectedFile, 'auto');
            setPreviewData(result);
            setSelectedFeatures(result.features);

            // Auto-suggest mapping if available
            if (result.suggested_mapping) {
                setAttributeMapping(result.suggested_mapping);
            }

            setCurrentStep('preview');
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la lecture du fichier', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Validation step
    const handleValidationStep = async () => {
        // Site is not required for Site objects
        const requiresSite = targetType !== 'Site';
        // Site selection is valid if: autoDetectSite is enabled OR a specific siteId is selected
        const hasSiteConfig = autoDetectSite || !!siteId;

        if (!targetType || (requiresSite && !hasSiteConfig)) {
            showToast(requiresSite ? 'Veuillez sélectionner un site ou activer la détection automatique' : 'Veuillez sélectionner un type d\'objet', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const result = await importValidate(
                selectedFeatures,
                targetType,
                attributeMapping,
                requiresSite ? siteId : null,
                requiresSite ? autoDetectSite : false
            );
            setValidationResult(result);
            setCurrentStep('validation');
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la validation', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Execute step - import data
    const handleExecuteStep = async () => {
        const requiresSite = targetType !== 'Site';
        const hasSiteConfig = autoDetectSite || !!siteId;
        if (!targetType || (requiresSite && !hasSiteConfig)) return;

        setIsLoading(true);
        try {
            const result = await importExecute(
                selectedFeatures,
                targetType,
                attributeMapping,
                requiresSite ? siteId : null,
                undefined, // sousSiteId
                requiresSite ? autoDetectSite : false
            );
            setExecuteResult(result);
            setCurrentStep('complete');

            if (result.summary.created > 0) {
                showToast(
                    `${result.summary.created} objet(s) importé(s) avec succès`,
                    'success'
                );
                onSuccess?.(result);
            }
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de l\'import', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Get step index
    const getStepIndex = (step: WizardStep): number => {
        return STEPS.findIndex(s => s.id === step);
    };

    // Check if can proceed
    const canProceed = (): boolean => {
        switch (currentStep) {
            case 'upload':
                return !!selectedFile;
            case 'preview':
                return selectedFeatures.length > 0;
            case 'mapping':
                // Site is not required for Site objects
                const requiresSite = targetType !== 'Site';
                // Site config is valid if autoDetect is enabled OR a specific site is selected
                const hasSiteConfig = autoDetectSite || !!siteId;
                return !!targetType && (!requiresSite || hasSiteConfig);
            case 'validation':
                return validationResult !== null && validationResult.valid_count > 0;
            default:
                return false;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Importer des données géographiques
                        </h2>
                        <p className="text-sm text-gray-500">
                            GeoJSON, KML, KMZ ou Shapefile (ZIP)
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => {
                            const isActive = step.id === currentStep;
                            const isComplete = getStepIndex(currentStep) > index ||
                                currentStep === 'complete';

                            return (
                                <React.Fragment key={step.id}>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                                isComplete
                                                    ? 'bg-green-600 text-white'
                                                    : isActive
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-500'
                                            }`}
                                        >
                                            {isComplete ? (
                                                <CheckCircle2 className="w-4 h-4" />
                                            ) : (
                                                step.icon
                                            )}
                                        </div>
                                        <span
                                            className={`text-sm font-medium ${
                                                isActive ? 'text-blue-600' : 'text-gray-500'
                                            }`}
                                        >
                                            {step.label}
                                        </span>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-4 ${
                                                getStepIndex(currentStep) > index
                                                    ? 'bg-green-600'
                                                    : 'bg-gray-200'
                                            }`}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Upload Step */}
                    {currentStep === 'upload' && (
                        <div className="space-y-6">
                            {/* Drop Zone */}
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                    isDragging
                                        ? 'border-blue-500 bg-blue-50'
                                        : selectedFile
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-300 hover:border-gray-400'
                                }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    accept=".json,.geojson,.kml,.kmz,.zip"
                                    onChange={handleFileInputChange}
                                />

                                {selectedFile ? (
                                    <div className="space-y-2">
                                        <FileJson className="w-12 h-12 mx-auto text-green-600" />
                                        <p className="font-medium text-gray-900">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {(selectedFile.size / 1024).toFixed(1)} Ko
                                        </p>
                                        <button
                                            onClick={() => setSelectedFile(null)}
                                            className="text-sm text-red-600 hover:underline"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Upload className="w-12 h-12 mx-auto text-gray-400" />
                                        <p className="font-medium text-gray-900">
                                            Glissez-déposez votre fichier ici
                                        </p>
                                        <p className="text-sm text-gray-500">ou</p>
                                        <label
                                            htmlFor="file-upload"
                                            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                                        >
                                            Parcourir
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Supported Formats */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">
                                    Formats supportés
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span>GeoJSON (.json, .geojson)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span>KML (.kml)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span>KMZ (.kmz)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span>Shapefile (.zip)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview Step */}
                    {currentStep === 'preview' && previewData && (
                        <ImportPreview
                            data={previewData}
                            selectedFeatures={selectedFeatures}
                            onFeaturesChange={setSelectedFeatures}
                        />
                    )}

                    {/* Mapping Step */}
                    {currentStep === 'mapping' && previewData && (
                        <AttributeMapper
                            sourceProperties={previewData.sample_properties}
                            geometryTypes={previewData.geometry_types}
                            mapping={attributeMapping}
                            onMappingChange={setAttributeMapping}
                            targetType={targetType}
                            onTargetTypeChange={setTargetType}
                            siteId={siteId}
                            onSiteIdChange={setSiteId}
                            autoDetectSite={autoDetectSite}
                            onAutoDetectSiteChange={setAutoDetectSite}
                        />
                    )}

                    {/* Validation Step */}
                    {currentStep === 'validation' && validationResult && (
                        <ValidationResults
                            result={validationResult}
                            onRetry={() => setCurrentStep('mapping')}
                        />
                    )}

                    {/* Complete Step */}
                    {currentStep === 'complete' && executeResult && (
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Import terminé !
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {executeResult.summary.created} objet(s) créé(s) sur{' '}
                                {executeResult.summary.total}
                            </p>
                            {executeResult.summary.failed > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left max-w-md mx-auto">
                                    <div className="flex items-center gap-2 text-yellow-800 mb-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        <span className="font-medium">
                                            {executeResult.summary.failed} erreur(s)
                                        </span>
                                    </div>
                                    <ul className="text-sm text-yellow-700 space-y-1">
                                        {executeResult.errors.slice(0, 5).map((err, i) => (
                                            <li key={i}>
                                                Feature {err.index}: {err.error}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                    <button
                        onClick={goToPreviousStep}
                        disabled={currentStep === 'upload' || currentStep === 'complete'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Précédent
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {currentStep === 'complete' ? 'Fermer' : 'Annuler'}
                        </button>

                        {currentStep !== 'complete' && (
                            <button
                                onClick={goToNextStep}
                                disabled={!canProceed() || isLoading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Chargement...
                                    </>
                                ) : currentStep === 'validation' ? (
                                    <>
                                        Importer
                                        <CheckCircle2 className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        Suivant
                                        <ChevronRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
