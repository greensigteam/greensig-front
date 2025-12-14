import React, { createContext, useContext, useState, useCallback } from 'react';
import { MapObjectDetail } from '../types';

interface SelectionContextType {
    selectedObjects: MapObjectDetail[];
    isSelectionMode: boolean;
    setSelectionMode: (active: boolean) => void;
    toggleSelectionMode: () => void;
    addToSelection: (object: MapObjectDetail) => void;
    removeFromSelection: (objectId: string) => void;
    toggleObjectSelection: (object: MapObjectDetail) => void;
    clearSelection: () => void;
    isSelected: (objectId: string) => boolean;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const useSelection = () => {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error('useSelection must be used within SelectionProvider');
    }
    return context;
};

interface SelectionProviderProps {
    children: React.ReactNode;
    maxSelections?: number;
}

export const SelectionProvider: React.FC<SelectionProviderProps> = ({
    children,
    maxSelections = 100
}) => {
    const [selectedObjects, setSelectedObjects] = useState<MapObjectDetail[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const setSelectionMode = useCallback((active: boolean) => {
        setIsSelectionMode(active);
        // Clear selection when exiting selection mode
        if (!active) {
            setSelectedObjects([]);
        }
    }, []);

    const toggleSelectionMode = useCallback(() => {
        setSelectionMode(!isSelectionMode);
    }, [isSelectionMode, setSelectionMode]);

    const addToSelection = useCallback((object: MapObjectDetail) => {
        setSelectedObjects(prev => {
            // Check if already selected
            if (prev.some(obj => obj.id === object.id)) {
                return prev;
            }
            // Check max limit
            if (prev.length >= maxSelections) {
                console.warn(`Maximum selection limit of ${maxSelections} reached`);
                return prev;
            }
            return [...prev, object];
        });
    }, [maxSelections]);

    const removeFromSelection = useCallback((objectId: string) => {
        setSelectedObjects(prev => prev.filter(obj => obj.id !== objectId));
    }, []);

    const toggleObjectSelection = useCallback((object: MapObjectDetail) => {
        setSelectedObjects(prev => {
            const isCurrentlySelected = prev.some(obj => obj.id === object.id);
            if (isCurrentlySelected) {
                return prev.filter(obj => obj.id !== object.id);
            } else {
                if (prev.length >= maxSelections) {
                    console.warn(`Maximum selection limit of ${maxSelections} reached`);
                    return prev;
                }
                return [...prev, object];
            }
        });
    }, [maxSelections]);

    const clearSelection = useCallback(() => {
        setSelectedObjects([]);
    }, []);

    const isSelected = useCallback((objectId: string) => {
        return selectedObjects.some(obj => obj.id === objectId);
    }, [selectedObjects]);

    const value: SelectionContextType = {
        selectedObjects,
        isSelectionMode,
        setSelectionMode,
        toggleSelectionMode,
        addToSelection,
        removeFromSelection,
        toggleObjectSelection,
        clearSelection,
        isSelected,
    };

    return (
        <SelectionContext.Provider value={value}>
            {children}
        </SelectionContext.Provider>
    );
};

export default SelectionContext;
