import { useState, useCallback, useRef } from 'react';

/**
 * Generic action interface for undo/redo stack
 */
export interface UndoableAction<T = any> {
    id: string;
    type: string;
    timestamp: number;
    data: T;
    // Function to apply this action (redo)
    apply: () => void | Promise<void>;
    // Function to reverse this action (undo)
    reverse: () => void | Promise<void>;
    // Optional description for UI
    description?: string;
}

interface UseUndoRedoOptions {
    maxHistorySize?: number;
    onUndo?: (action: UndoableAction) => void;
    onRedo?: (action: UndoableAction) => void;
    onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

interface UseUndoRedoReturn<T> {
    // State
    canUndo: boolean;
    canRedo: boolean;
    undoStack: UndoableAction<T>[];
    redoStack: UndoableAction<T>[];

    // Actions
    addAction: (action: Omit<UndoableAction<T>, 'id' | 'timestamp'>) => void;
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    clear: () => void;

    // Batch operations
    startBatch: () => void;
    endBatch: (description?: string) => void;

    // Helpers
    getLastAction: () => UndoableAction<T> | null;
    getHistory: () => UndoableAction<T>[];
}

/**
 * Hook for managing undo/redo functionality
 * Supports both synchronous and asynchronous actions
 */
export function useUndoRedo<T = any>(
    options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
    const {
        maxHistorySize = 50,
        onUndo,
        onRedo,
        onHistoryChange,
    } = options;

    const [undoStack, setUndoStack] = useState<UndoableAction<T>[]>([]);
    const [redoStack, setRedoStack] = useState<UndoableAction<T>[]>([]);

    // Batch operation refs
    const isBatchingRef = useRef(false);
    const batchActionsRef = useRef<UndoableAction<T>[]>([]);

    // Generate unique ID
    const generateId = useCallback(() => {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Notify history change
    const notifyChange = useCallback((undo: UndoableAction<T>[], redo: UndoableAction<T>[]) => {
        onHistoryChange?.(undo.length > 0, redo.length > 0);
    }, [onHistoryChange]);

    // Add action to history
    const addAction = useCallback((
        actionData: Omit<UndoableAction<T>, 'id' | 'timestamp'>
    ) => {
        const action: UndoableAction<T> = {
            ...actionData,
            id: generateId(),
            timestamp: Date.now(),
        };

        if (isBatchingRef.current) {
            // Add to batch
            batchActionsRef.current.push(action);
        } else {
            // Add directly to stack
            setUndoStack(prev => {
                const newStack = [...prev, action];
                // Limit stack size
                if (newStack.length > maxHistorySize) {
                    newStack.shift();
                }
                notifyChange(newStack, []);
                return newStack;
            });
            // Clear redo stack on new action
            setRedoStack([]);
        }
    }, [generateId, maxHistorySize, notifyChange]);

    // Undo last action
    const undo = useCallback(async () => {
        if (undoStack.length === 0) return;

        const action = undoStack[undoStack.length - 1];

        try {
            await action.reverse();

            setUndoStack(prev => {
                const newStack = prev.slice(0, -1);
                notifyChange(newStack, [...redoStack, action]);
                return newStack;
            });

            setRedoStack(prev => [...prev, action]);

            onUndo?.(action);
        } catch (error) {
            console.error('Error during undo:', error);
            throw error;
        }
    }, [undoStack, redoStack, onUndo, notifyChange]);

    // Redo last undone action
    const redo = useCallback(async () => {
        if (redoStack.length === 0) return;

        const action = redoStack[redoStack.length - 1];

        try {
            await action.apply();

            setRedoStack(prev => {
                const newStack = prev.slice(0, -1);
                notifyChange([...undoStack, action], newStack);
                return newStack;
            });

            setUndoStack(prev => [...prev, action]);

            onRedo?.(action);
        } catch (error) {
            console.error('Error during redo:', error);
            throw error;
        }
    }, [redoStack, undoStack, onRedo, notifyChange]);

    // Clear all history
    const clear = useCallback(() => {
        setUndoStack([]);
        setRedoStack([]);
        notifyChange([], []);
    }, [notifyChange]);

    // Start batch operation
    const startBatch = useCallback(() => {
        isBatchingRef.current = true;
        batchActionsRef.current = [];
    }, []);

    // End batch operation and commit as single action
    const endBatch = useCallback((description?: string) => {
        if (!isBatchingRef.current) return;

        isBatchingRef.current = false;
        const batchedActions = [...batchActionsRef.current];
        batchActionsRef.current = [];

        if (batchedActions.length === 0) return;

        // Create compound action
        const batchAction: UndoableAction<T> = {
            id: generateId(),
            type: 'batch',
            timestamp: Date.now(),
            data: batchedActions as any,
            description: description || `Batch of ${batchedActions.length} actions`,
            apply: async () => {
                for (const action of batchedActions) {
                    await action.apply();
                }
            },
            reverse: async () => {
                // Reverse in opposite order
                for (let i = batchedActions.length - 1; i >= 0; i--) {
                    await batchedActions[i].reverse();
                }
            },
        };

        setUndoStack(prev => {
            const newStack = [...prev, batchAction];
            if (newStack.length > maxHistorySize) {
                newStack.shift();
            }
            notifyChange(newStack, []);
            return newStack;
        });
        setRedoStack([]);
    }, [generateId, maxHistorySize, notifyChange]);

    // Get last action
    const getLastAction = useCallback((): UndoableAction<T> | null => {
        return undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
    }, [undoStack]);

    // Get full history
    const getHistory = useCallback((): UndoableAction<T>[] => {
        return [...undoStack];
    }, [undoStack]);

    return {
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        undoStack,
        redoStack,
        addAction,
        undo,
        redo,
        clear,
        startBatch,
        endBatch,
        getLastAction,
        getHistory,
    };
}

/**
 * Specialized hook for geometry editing undo/redo
 */
export interface GeometryAction {
    featureId: string;
    previousGeometry: any;
    newGeometry: any;
    objectType?: string;
}

export function useGeometryUndoRedo(options?: UseUndoRedoOptions) {
    return useUndoRedo<GeometryAction>(options);
}
