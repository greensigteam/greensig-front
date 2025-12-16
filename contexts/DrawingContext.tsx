import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
    DrawingMode,
    EditingMode,
    DrawingState,
    GeoJSONGeometry,
    GeometryMetrics,
    ObjectTypeInfo,
    ObjectCategory
} from '../types';

// ==============================================================================
// OBJECT TYPES CONFIGURATION
// ==============================================================================

export const OBJECT_TYPES: ObjectTypeInfo[] = [
    // Vegetation - Points
    {
        id: 'Arbre',
        name: 'Arbre',
        namePlural: 'Arbres',
        category: 'vegetation',
        geometryType: 'Point',
        color: '#22c55e',
        icon: 'tree-deciduous',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text', placeholder: 'Ex: Olivier 001' },
            { name: 'famille', label: 'Famille', type: 'text', placeholder: 'Ex: Oleaceae' },
            { name: 'taille', label: 'Taille', type: 'select', options: ['petit', 'moyen', 'grand'] },
            { name: 'etat', label: 'État', type: 'select', options: ['bon', 'moyen', 'mauvais'] },
        ]
    },
    {
        id: 'Palmier',
        name: 'Palmier',
        namePlural: 'Palmiers',
        category: 'vegetation',
        geometryType: 'Point',
        color: '#84cc16',
        icon: 'tree-palm',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'famille', label: 'Famille', type: 'text' },
            { name: 'taille', label: 'Taille', type: 'select', options: ['petit', 'moyen', 'grand'] },
            { name: 'etat', label: 'État', type: 'select', options: ['bon', 'moyen', 'mauvais'] },
        ]
    },
    // Vegetation - Polygons
    {
        id: 'Gazon',
        name: 'Gazon',
        namePlural: 'Gazons',
        category: 'vegetation',
        geometryType: 'Polygon',
        color: '#4ade80',
        icon: 'grass',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'type_gazon', label: 'Type', type: 'select', options: ['anglais', 'rustique', 'sport'] },
            { name: 'etat', label: 'État', type: 'select', options: ['bon', 'moyen', 'mauvais'] },
        ]
    },
    {
        id: 'Arbuste',
        name: 'Arbuste',
        namePlural: 'Arbustes',
        category: 'vegetation',
        geometryType: 'Polygon',
        color: '#16a34a',
        icon: 'shrub',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'famille', label: 'Famille', type: 'text' },
            { name: 'etat', label: 'État', type: 'select', options: ['bon', 'moyen', 'mauvais'] },
        ]
    },
    {
        id: 'Vivace',
        name: 'Vivace',
        namePlural: 'Vivaces',
        category: 'vegetation',
        geometryType: 'Polygon',
        color: '#a855f7',
        icon: 'flower',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'famille', label: 'Famille', type: 'text' },
        ]
    },
    {
        id: 'Cactus',
        name: 'Cactus',
        namePlural: 'Cactus',
        category: 'vegetation',
        geometryType: 'Polygon',
        color: '#65a30d',
        icon: 'cactus',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'espece', label: 'Espèce', type: 'text' },
        ]
    },
    {
        id: 'Graminee',
        name: 'Graminée',
        namePlural: 'Graminées',
        category: 'vegetation',
        geometryType: 'Polygon',
        color: '#ca8a04',
        icon: 'wheat',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'famille', label: 'Famille', type: 'text' },
        ]
    },
    // Hydraulique - Points
    {
        id: 'Puit',
        name: 'Puit',
        namePlural: 'Puits',
        category: 'hydraulique',
        geometryType: 'Point',
        color: '#3b82f6',
        icon: 'droplet',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'profondeur', label: 'Profondeur (m)', type: 'number', min: 0, step: 0.1 },
            { name: 'debit', label: 'Débit (m³/h)', type: 'number', min: 0, step: 0.1 },
        ]
    },
    {
        id: 'Pompe',
        name: 'Pompe',
        namePlural: 'Pompes',
        category: 'hydraulique',
        geometryType: 'Point',
        color: '#0ea5e9',
        icon: 'pump',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'puissance', label: 'Puissance (kW)', type: 'number', min: 0, step: 0.1 },
            { name: 'debit', label: 'Débit (m³/h)', type: 'number', min: 0, step: 0.1 },
            { name: 'marque', label: 'Marque', type: 'text' },
        ]
    },
    {
        id: 'Vanne',
        name: 'Vanne',
        namePlural: 'Vannes',
        category: 'hydraulique',
        geometryType: 'Point',
        color: '#6366f1',
        icon: 'valve',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'diametre', label: 'Diamètre (mm)', type: 'number', min: 0 },
            { name: 'type_vanne', label: 'Type', type: 'select', options: ['manuelle', 'electrique', 'pneumatique'] },
        ]
    },
    {
        id: 'Clapet',
        name: 'Clapet',
        namePlural: 'Clapets',
        category: 'hydraulique',
        geometryType: 'Point',
        color: '#8b5cf6',
        icon: 'check-valve',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'diametre', label: 'Diamètre (mm)', type: 'number', min: 0 },
        ]
    },
    {
        id: 'Ballon',
        name: 'Ballon/Tank',
        namePlural: 'Ballons/Tanks',
        category: 'hydraulique',
        geometryType: 'Point',
        color: '#14b8a6',
        icon: 'tank',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'capacite', label: 'Capacité (L)', type: 'number', min: 0 },
            { name: 'materiau', label: 'Matériau', type: 'select', options: ['acier', 'plastique', 'beton'] },
        ]
    },
    // Hydraulique - Lines
    {
        id: 'Canalisation',
        name: 'Canalisation',
        namePlural: 'Canalisations',
        category: 'hydraulique',
        geometryType: 'LineString',
        color: '#2563eb',
        icon: 'pipe',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'diametre', label: 'Diamètre (mm)', type: 'number', min: 0 },
            { name: 'materiau', label: 'Matériau', type: 'select', options: ['PVC', 'PEHD', 'acier', 'fonte'] },
        ]
    },
    {
        id: 'Aspersion',
        name: 'Aspersion',
        namePlural: 'Aspersions',
        category: 'hydraulique',
        geometryType: 'LineString',
        color: '#06b6d4',
        icon: 'sprinkler',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'debit', label: 'Débit (L/h)', type: 'number', min: 0 },
            { name: 'pression', label: 'Pression (bar)', type: 'number', min: 0, step: 0.1 },
        ]
    },
    {
        id: 'Goutte',
        name: 'Goutte-à-goutte',
        namePlural: 'Goutte-à-goutte',
        category: 'hydraulique',
        geometryType: 'LineString',
        color: '#0891b2',
        icon: 'droplets',
        fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'debit_goutteur', label: 'Débit/goutteur (L/h)', type: 'number', min: 0, step: 0.1 },
            { name: 'espacement', label: 'Espacement (cm)', type: 'number', min: 0 },
        ]
    },
];

// Helper to get object type by ID
export function getObjectTypeById(id: string): ObjectTypeInfo | undefined {
    return OBJECT_TYPES.find(t => t.id === id);
}

// Helper to get object types by category
export function getObjectTypesByCategory(category: ObjectCategory): ObjectTypeInfo[] {
    return OBJECT_TYPES.filter(t => t.category === category);
}

// Helper to get object types by geometry type
export function getObjectTypesByGeometry(geometryType: 'Point' | 'LineString' | 'Polygon'): ObjectTypeInfo[] {
    return OBJECT_TYPES.filter(t => t.geometryType === geometryType);
}

// ==============================================================================
// CONTEXT DEFINITION
// ==============================================================================

interface DrawingContextType extends DrawingState {
    // Mode setters
    setDrawingMode: (mode: DrawingMode) => void;
    setEditingMode: (mode: EditingMode) => void;
    setSelectedObjectType: (type: string | null) => void;

    // Geometry management
    setCurrentGeometry: (geometry: GeoJSONGeometry | null) => void;
    setCalculatedMetrics: (metrics: GeometryMetrics | null) => void;

    // Aliases for MapPage compatibility
    drawnGeometry: GeoJSONGeometry | null;
    clearDrawnGeometry: () => void;
    pendingObjectType: string | null;
    setPendingObjectType: (type: string | null) => void;

    // Actions
    startDrawing: (mode: DrawingMode, objectType?: string) => void;
    cancelDrawing: () => void;
    finishDrawing: () => void;

    // Undo/Redo
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
    addToHistory: (geometry: GeoJSONGeometry) => void;

    // Helpers
    getSelectedTypeInfo: () => ObjectTypeInfo | undefined;
}

const DrawingContext = createContext<DrawingContextType | undefined>(undefined);

export const useDrawing = () => {
    const context = useContext(DrawingContext);
    if (!context) {
        throw new Error('useDrawing must be used within DrawingProvider');
    }
    return context;
};

interface DrawingProviderProps {
    children: React.ReactNode;
}

export const DrawingProvider: React.FC<DrawingProviderProps> = ({ children }) => {
    // State
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingMode, setDrawingModeState] = useState<DrawingMode>('none');
    const [editingMode, setEditingModeState] = useState<EditingMode>('none');
    const [selectedObjectType, setSelectedObjectTypeState] = useState<string | null>(null);
    const [currentGeometry, setCurrentGeometryState] = useState<GeoJSONGeometry | null>(null);
    const [calculatedMetrics, setCalculatedMetricsState] = useState<GeometryMetrics | null>(null);

    // History for undo/redo
    const historyRef = useRef<GeoJSONGeometry[]>([]);
    const historyIndexRef = useRef(-1);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Mode setters
    const setDrawingMode = useCallback((mode: DrawingMode) => {
        setDrawingModeState(mode);
        if (mode !== 'none') {
            setEditingModeState('none');
            setIsDrawing(true);
        } else {
            setIsDrawing(false);
        }
    }, []);

    const setEditingMode = useCallback((mode: EditingMode) => {
        setEditingModeState(mode);
        if (mode !== 'none') {
            setDrawingModeState('none');
        }
    }, []);

    const setSelectedObjectType = useCallback((type: string | null) => {
        setSelectedObjectTypeState(type);
    }, []);

    // Geometry management
    const setCurrentGeometry = useCallback((geometry: GeoJSONGeometry | null) => {
        setCurrentGeometryState(geometry);
    }, []);

    const setCalculatedMetrics = useCallback((metrics: GeometryMetrics | null) => {
        setCalculatedMetricsState(metrics);
    }, []);

    // Actions
    const startDrawing = useCallback((mode: DrawingMode, objectType?: string) => {
        setDrawingMode(mode);
        if (objectType) {
            setSelectedObjectType(objectType);
        }
        setCurrentGeometry(null);
        setCalculatedMetrics(null);
    }, [setDrawingMode, setSelectedObjectType, setCurrentGeometry, setCalculatedMetrics]);

    const cancelDrawing = useCallback(() => {
        setDrawingMode('none');
        setEditingMode('none');
        setCurrentGeometry(null);
        setCalculatedMetrics(null);
        // Don't reset selectedObjectType to allow quick re-drawing
    }, [setDrawingMode, setEditingMode, setCurrentGeometry, setCalculatedMetrics]);

    const finishDrawing = useCallback(() => {
        // Called when drawing is complete and object creation modal should open
        setDrawingMode('none');
        setIsDrawing(false);
        // Keep currentGeometry and selectedObjectType for the modal
    }, [setDrawingMode]);

    // Undo/Redo
    const addToHistory = useCallback((geometry: GeoJSONGeometry) => {
        const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
        newHistory.push(geometry);
        historyRef.current = newHistory;
        historyIndexRef.current = newHistory.length - 1;
        setCanUndo(true);
        setCanRedo(false);
    }, []);

    const undo = useCallback(() => {
        if (historyIndexRef.current > 0) {
            historyIndexRef.current--;
            const prevGeometry = historyRef.current[historyIndexRef.current];
            setCurrentGeometry(prevGeometry ?? null);
            setCanRedo(true);
            setCanUndo(historyIndexRef.current > 0);
        }
    }, [setCurrentGeometry]);

    const redo = useCallback(() => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current++;
            const nextGeometry = historyRef.current[historyIndexRef.current];
            setCurrentGeometry(nextGeometry ?? null);
            setCanUndo(true);
            setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        }
    }, [setCurrentGeometry]);

    // Helpers
    const getSelectedTypeInfo = useCallback(() => {
        if (!selectedObjectType) return undefined;
        return getObjectTypeById(selectedObjectType);
    }, [selectedObjectType]);

    // Alias for clearing geometry
    const clearDrawnGeometry = useCallback(() => {
        setCurrentGeometry(null);
        setCalculatedMetrics(null);
    }, [setCurrentGeometry, setCalculatedMetrics]);

    const value: DrawingContextType = {
        // State
        isDrawing,
        drawingMode,
        editingMode,
        selectedObjectType,
        currentGeometry,
        calculatedMetrics,

        // Mode setters
        setDrawingMode,
        setEditingMode,
        setSelectedObjectType,

        // Geometry management
        setCurrentGeometry,
        setCalculatedMetrics,

        // Aliases for MapPage compatibility
        drawnGeometry: currentGeometry,
        clearDrawnGeometry,
        pendingObjectType: selectedObjectType,
        setPendingObjectType: setSelectedObjectType,

        // Actions
        startDrawing,
        cancelDrawing,
        finishDrawing,

        // Undo/Redo
        canUndo,
        canRedo,
        undo,
        redo,
        addToHistory,

        // Helpers
        getSelectedTypeInfo,
    };

    return (
        <DrawingContext.Provider value={value}>
            {children}
        </DrawingContext.Provider>
    );
};

export default DrawingContext;
