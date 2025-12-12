import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download } from 'lucide-react';

export interface Column<T> {
    key: keyof T | string;
    label: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
}

export interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    itemsPerPage?: number;
    showExport?: boolean;
    onExport?: () => void;
    keyField?: keyof T;  // Champ a utiliser comme cle unique (defaut: 'id')
}

export function DataTable<T extends Record<string, any>>({
    data,
    columns,
    onRowClick,
    itemsPerPage = 20,
    showExport = false,
    onExport,
    keyField
}: DataTableProps<T>) {
    // Determiner la cle a utiliser pour les lignes
    const getRowKey = (item: T, index: number): string => {
        if (keyField && item[keyField] !== undefined) {
            return String(item[keyField]);
        }
        // Fallback: chercher id, utilisateur, ou utiliser l'index
        if (item.id !== undefined) return String(item.id);
        if (item.utilisateur !== undefined) return String(item.utilisateur);
        return String(index);
    };
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Sorting
    const sortedData = useMemo(() => {
        if (!sortColumn) return data;

        return [...data].sort((a, b) => {
            const aValue = a[sortColumn as keyof T];
            const bValue = b[sortColumn as keyof T];

            if (aValue === bValue) return 0;

            const comparison = aValue < bValue ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [data, sortColumn, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = sortedData.slice(startIndex, endIndex);

    const handleSort = (columnKey: string, sortable?: boolean) => {
        if (sortable === false) return;

        if (sortColumn === columnKey) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
    };

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    return (
        <div className="bg-white rounded-lg shadow h-full flex flex-col">
            {/* Header with Export */}
            {showExport && (
                <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <div className="text-sm text-gray-600">
                        {sortedData.length} élément{sortedData.length > 1 ? 's' : ''}
                    </div>
                    <button
                        onClick={onExport}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exporter
                    </button>
                </div>
            )}

            {/* Table with scroll area - scroll horizontal et vertical */}
            <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full min-w-max">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    onClick={() => handleSort(String(column.key), column.sortable)}
                                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 ${column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.label}
                                        {column.sortable !== false && sortColumn === column.key && (
                                            <span className="text-emerald-600">
                                                {sortDirection === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                                    Aucune donnée disponible
                                </td>
                            </tr>
                        ) : (
                            currentData.map((item, index) => (
                                <tr
                                    key={getRowKey(item, startIndex + index)}
                                    onClick={() => onRowClick?.(item)}
                                    className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                                >
                                    {columns.map((column) => (
                                        <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {column.render
                                                ? column.render(item)
                                                : String(item[column.key as keyof T] || '-')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination - toujours visible en bas */}
            {totalPages > 0 && (
                <div className="bg-white border-t border-gray-200 px-6 py-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Affichage {sortedData.length > 0 ? startIndex + 1 : 0} à {Math.min(endIndex, sortedData.length)} sur {sortedData.length}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => goToPage(1)}
                                disabled={currentPage === 1}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Premiere page"
                            >
                                <ChevronsLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Page precedente"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 text-sm font-medium">
                                Page {currentPage} sur {totalPages}
                            </span>
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Page suivante"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => goToPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Derniere page"
                            >
                                <ChevronsRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
