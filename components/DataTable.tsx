import React, { useState, useMemo, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Square, CheckSquare, MinusSquare } from 'lucide-react';

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

    // Custom key for rows (defaults to 'id')
    rowKey?: string | ((item: T) => string);

    // Selection props
    selectable?: boolean;
    selectedIds?: Set<string>;
    onSelectionChange?: (selectedIds: Set<string>) => void;
    getItemId?: (item: T) => string;
}

function DataTableInner<T extends Record<string, any>>({
    data,
    columns,
    onRowClick,
    itemsPerPage = 20,
    showExport = false,
    onExport,
    serverSide = false,
    totalItems = 0,
    currentPage: externalCurrentPage = 1,
    onPageChange,
    rowKey = 'id',
    selectable = false,
    selectedIds = new Set(),
    onSelectionChange,
    getItemId = (item) => String(item.id)
}: DataTableProps<T>) {
    const [localCurrentPage, setLocalCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Selection helpers
    const currentDataIds = useMemo(() => {
        return new Set(data.map(item => getItemId(item)));
    }, [data, getItemId]);

    const selectedInCurrentPage = useMemo(() => {
        return [...currentDataIds].filter(id => selectedIds.has(id)).length;
    }, [currentDataIds, selectedIds]);

    const isAllCurrentPageSelected = currentDataIds.size > 0 && selectedInCurrentPage === currentDataIds.size;
    const isSomeCurrentPageSelected = selectedInCurrentPage > 0 && selectedInCurrentPage < currentDataIds.size;

    const handleSelectAll = useCallback(() => {
        if (!onSelectionChange) return;

        const newSelected = new Set(selectedIds);
        if (isAllCurrentPageSelected) {
            // Deselect all in current page
            currentDataIds.forEach(id => newSelected.delete(id));
        } else {
            // Select all in current page
            currentDataIds.forEach(id => newSelected.add(id));
        }
        onSelectionChange(newSelected);
    }, [onSelectionChange, selectedIds, isAllCurrentPageSelected, currentDataIds]);

    const handleSelectItem = useCallback((itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSelectionChange) return;

        const newSelected = new Set(selectedIds);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        onSelectionChange(newSelected);
    }, [onSelectionChange, selectedIds]);

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

    const handleSort = useCallback((columnKey: string, sortable?: boolean) => {
        if (sortable === false) return;

        if (sortColumn === columnKey) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
    }, [sortColumn]);

    const goToPage = useCallback((page: number) => {
        const newPage = Math.max(1, Math.min(page, totalPages));
        if (serverSide && onPageChange) {
            onPageChange(newPage);
        } else {
            setLocalCurrentPage(newPage);
        }
    }, [totalPages, serverSide, onPageChange]);

    return (
        <div className="bg-white flex flex-col">
            {/* Header with Export */}
            {showExport && (
                <div className="p-3 md:p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0 gap-2">
                    <div className="text-xs md:text-sm text-gray-600">
                        {displayTotalItems} élément{displayTotalItems > 1 ? 's' : ''}
                    </div>
                    <button
                        onClick={onExport}
                        className="flex items-center gap-1.5 md:gap-2 px-3 py-2 md:py-1.5 text-xs md:text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors min-h-[44px] md:min-h-0"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exporter</span>
                    </button>
                </div>
            )}

            {/* Table with scroll area and sticky pagination */}
            <div className="relative border-b border-gray-200">
                <div className="max-h-[50vh] md:max-h-[500px] overflow-auto">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {selectable && (
                                        <th className="px-2 md:px-4 py-3 w-10 md:w-12">
                                            <button
                                                onClick={handleSelectAll}
                                                className="p-2 hover:bg-gray-200 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                title={isAllCurrentPageSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                                            >
                                                {isAllCurrentPageSelected ? (
                                                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                                                ) : isSomeCurrentPageSelected ? (
                                                    <MinusSquare className="w-5 h-5 text-emerald-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-400" />
                                                )}
                                            </button>
                                        </th>
                                    )}
                                    {columns.map((column) => (
                                        <th
                                            key={String(column.key)}
                                            onClick={() => handleSort(String(column.key), column.sortable)}
                                            className={`px-3 md:px-6 py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-1 md:gap-2">
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
                                        <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-8 text-center text-gray-500">
                                            Aucune donnée disponible
                                        </td>
                                    </tr>
                                ) : (
                                    currentData.map((item, index) => {
                                        const key = typeof rowKey === 'function'
                                            ? rowKey(item)
                                            : (item[rowKey] ? String(item[rowKey]) : `row-${index}`);
                                        const itemId = getItemId(item);
                                        const isSelected = selectedIds.has(itemId);

                                        return (
                                            <tr
                                                key={key}
                                                onClick={() => onRowClick?.(item)}
                                                className={`${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'} transition-colors`}
                                            >
                                                {selectable && (
                                                    <td className="px-2 md:px-4 py-2 md:py-4 w-10 md:w-12">
                                                        <button
                                                            onClick={(e) => handleSelectItem(itemId, e)}
                                                            className="p-2 hover:bg-gray-200 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                        >
                                                            {isSelected ? (
                                                                <CheckSquare className="w-5 h-5 text-emerald-600" />
                                                            ) : (
                                                                <Square className="w-5 h-5 text-gray-400" />
                                                            )}
                                                        </button>
                                                    </td>
                                                )}
                                                {columns.map((column) => (
                                                    <td key={String(column.key)} className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                                                        {column.render
                                                            ? column.render(item)
                                                            : String(item[column.key as keyof T] || '-')}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Sticky pagination inside scroll area */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-3 md:px-6 py-2 md:py-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-[10px] md:text-sm text-gray-600 whitespace-nowrap">
                                <span className="hidden sm:inline">Affichage </span>
                                {displayStartIndex + 1}-{displayEndIndex}
                                <span className="hidden sm:inline"> sur</span>
                                <span className="sm:hidden">/</span> {displayTotalItems}
                            </div>
                            <div className="flex items-center gap-1 md:gap-2">
                                {/* First page - hidden on mobile */}
                                <button
                                    onClick={() => goToPage(1)}
                                    disabled={currentPage === 1}
                                    className="hidden sm:flex p-2 md:p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 items-center justify-center"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 md:p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-2 md:px-3 py-1 text-xs md:text-sm whitespace-nowrap">
                                    <span className="hidden sm:inline">Page </span>{currentPage}<span className="hidden sm:inline"> sur</span><span className="sm:hidden">/</span>{totalPages > 0 ? totalPages : 1}
                                </span>
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-2 md:p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                {/* Last page - hidden on mobile */}
                                <button
                                    onClick={() => goToPage(totalPages)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="hidden sm:flex p-2 md:p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 items-center justify-center"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

// Wrapper pour supporter les generics avec memo
export const DataTable = memo(DataTableInner) as typeof DataTableInner;
