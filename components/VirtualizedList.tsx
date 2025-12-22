import React, { memo, useCallback, CSSProperties } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

export interface VirtualizedListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
    className?: string;
    overscanCount?: number;
}

function VirtualizedListInner<T>({
    items,
    itemHeight,
    renderItem,
    className = '',
    overscanCount = 5
}: VirtualizedListProps<T>) {
    const Row = useCallback(
        ({ index, style }: ListChildComponentProps) => {
            const item = items[index];
            return <>{renderItem(item, index, style)}</>;
        },
        [items, renderItem]
    );

    if (items.length === 0) {
        return (
            <div className={`flex items-center justify-center h-full text-gray-500 ${className}`}>
                Aucun élément à afficher
            </div>
        );
    }

    return (
        <div className={`h-full w-full ${className}`}>
            <AutoSizer>
                {({ height, width }) => (
                    <List
                        height={height}
                        width={width}
                        itemCount={items.length}
                        itemSize={itemHeight}
                        overscanCount={overscanCount}
                    >
                        {Row}
                    </List>
                )}
            </AutoSizer>
        </div>
    );
}

export const VirtualizedList = memo(VirtualizedListInner) as typeof VirtualizedListInner;

// Composant pour les tables virtualisées
export interface VirtualizedTableProps<T> {
    items: T[];
    columns: {
        key: string;
        label: string;
        width?: string;
        render?: (item: T) => React.ReactNode;
    }[];
    rowHeight?: number;
    onRowClick?: (item: T) => void;
    className?: string;
    headerClassName?: string;
}

function VirtualizedTableInner<T extends Record<string, any>>({
    items,
    columns,
    rowHeight = 48,
    onRowClick,
    className = '',
    headerClassName = ''
}: VirtualizedTableProps<T>) {
    const Row = useCallback(
        ({ index, style }: ListChildComponentProps) => {
            const item = items[index];
            return (
                <div
                    style={style}
                    className={`flex items-center border-b border-gray-200 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                        } ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    onClick={() => onRowClick?.(item)}
                >
                    {columns.map((col) => (
                        <div
                            key={col.key}
                            className="px-4 py-2 text-sm text-gray-900 truncate"
                            style={{ width: col.width || `${100 / columns.length}%` }}
                        >
                            {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                        </div>
                    ))}
                </div>
            );
        },
        [items, columns, onRowClick]
    );

    if (items.length === 0) {
        return (
            <div className={`${className}`}>
                <div className={`flex bg-gray-50 border-b border-gray-200 ${headerClassName}`}>
                    {columns.map((col) => (
                        <div
                            key={col.key}
                            className="px-4 py-3 text-xs font-medium text-gray-500 uppercase"
                            style={{ width: col.width || `${100 / columns.length}%` }}
                        >
                            {col.label}
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-center h-32 text-gray-500">
                    Aucune donnée disponible
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Header fixe */}
            <div className={`flex bg-gray-50 border-b border-gray-200 flex-shrink-0 ${headerClassName}`}>
                {columns.map((col) => (
                    <div
                        key={col.key}
                        className="px-4 py-3 text-xs font-medium text-gray-500 uppercase"
                        style={{ width: col.width || `${100 / columns.length}%` }}
                    >
                        {col.label}
                    </div>
                ))}
            </div>

            {/* Corps virtualisé */}
            <div className="flex-1 min-h-0">
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            height={height}
                            width={width}
                            itemCount={items.length}
                            itemSize={rowHeight}
                            overscanCount={5}
                        >
                            {Row}
                        </List>
                    )}
                </AutoSizer>
            </div>
        </div>
    );
}

export const VirtualizedTable = memo(VirtualizedTableInner) as typeof VirtualizedTableInner;
