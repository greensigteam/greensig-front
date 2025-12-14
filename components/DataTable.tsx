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
    // Server-side pagination
    serverSide?: boolean;
    totalItems?: number;
    currentPage?: number;
    onPageChange?: (page: number) => void;
}

export function DataTable<T extends { id: string }>({
    data,
    columns,
    onRowClick,
    itemsPerPage = 20,
    showExport = false,
    onExport,
    serverSide = false,
    totalItems = 0,
    currentPage: externalCurrentPage = 1,
    onPageChange
}: DataTableProps<T>) {
    const [localCurrentPage, setLocalCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Use external or local state
    const currentPage = serverSide ? externalCurrentPage : localCurrentPage;

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
    const totalPages = serverSide
        ? Math.ceil(totalItems / itemsPerPage)
        : Math.ceil(sortedData.length / itemsPerPage);

    const startIndex = (currentPage - 1) * itemsPerPage;

    const currentData = serverSide
        ? sortedData // Show all data (it's already the current page)
        : sortedData.slice(startIndex, startIndex + itemsPerPage);

    // Pagination variables for display
    const displayTotalItems = serverSide ? totalItems : sortedData.length;
    const displayStartIndex = (currentPage - 1) * itemsPerPage;
    const displayEndIndex = Math.min(displayStartIndex + itemsPerPage, displayTotalItems);

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
        const newPage = Math.max(1, Math.min(page, totalPages));
        if (serverSide && onPageChange) {
            onPageChange(newPage);
        } else {
            setLocalCurrentPage(newPage);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Header with Export */}
            {showExport && (
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        {displayTotalItems} élément{displayTotalItems > 1 ? 's' : ''}
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

            {/* Table with scroll area and sticky pagination */}
            <div className="relative border-b border-gray-200">
                <div className="max-h-[500px] overflow-auto">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {columns.map((column) => (
                                        <th
                                            key={String(column.key)}
                                            onClick={() => handleSort(String(column.key), column.sortable)}
                                            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
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
                                    currentData.map((item) => (
                                        <tr
                                            key={item.id}
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

                    {/* Sticky pagination inside scroll area */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">Affichage {displayStartIndex + 1} à {displayEndIndex} sur {displayTotalItems}</div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-3 py-1 text-sm">Page {currentPage} sur {totalPages > 0 ? totalPages : 1}</span>
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => goToPage(totalPages)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
