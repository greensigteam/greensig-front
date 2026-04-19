import { useCallback } from 'react';
import { exportInventoryExcel, exportInventoryPDF, downloadBlob } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const VEGETATION_TYPES = ['Arbre', 'Palmier', 'Gazon', 'Arbuste', 'Vivace', 'Cactus', 'Graminee'];
const HYDROLOGY_TYPES = [
  'Puit',
  'Pompe',
  'Vanne',
  'Clapet',
  'Canalisation',
  'Aspersion',
  'Goutte',
  'Ballon',
];

interface UseInventoryExportOptions {
  mainTab: 'tous' | 'vegetation' | 'hydraulique';
  filters: { type: string; site: string; state: string; family: string };
  searchQuery: string;
  selectedItemsCache: Map<string, { id: string }>;
}

function getTypesToExport(mainTab: string, filterType: string): string[] {
  if (filterType !== 'all') return [filterType];
  if (mainTab === 'vegetation') return VEGETATION_TYPES;
  if (mainTab === 'hydraulique') return HYDROLOGY_TYPES;
  return [...VEGETATION_TYPES, ...HYDROLOGY_TYPES];
}

export function useInventoryExport({
  mainTab,
  filters,
  searchQuery,
  selectedItemsCache,
}: UseInventoryExportOptions) {
  const { showToast } = useToast();

  const handleExportExcel = useCallback(async () => {
    try {
      if (selectedItemsCache.size > 0) {
        const ids = Array.from(selectedItemsCache.keys()).map(Number);
        const blob = await exportInventoryExcel({ ids });
        const filename = `inventaire_selection_${new Date().toISOString().split('T')[0]}.xlsx`;
        downloadBlob(blob, filename);
        showToast(`Export Excel — ${ids.length} élément(s) sélectionné(s)`, 'success');
        return;
      }

      const typesToExport = getTypesToExport(mainTab, filters.type);
      const blob = await exportInventoryExcel({
        types: typesToExport,
        site: filters.site,
        etat: filters.state,
        famille: filters.family,
        search: searchQuery,
      });

      const filename = `inventaire_${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadBlob(blob, filename);
      showToast('Export Excel réussi', 'success');
    } catch (error: any) {
      if (error?.status === 404) {
        showToast('Aucune donnée à exporter', 'info');
      } else {
        showToast("Erreur lors de l'export Excel", 'error');
      }
    }
  }, [mainTab, filters, searchQuery, selectedItemsCache, showToast]);

  const handlePrint = useCallback(async () => {
    try {
      if (selectedItemsCache.size > 0) {
        const ids = Array.from(selectedItemsCache.keys()).map(Number);
        const blob = await exportInventoryPDF({ ids });
        const filename = `inventaire_selection_${new Date().toISOString().split('T')[0]}.pdf`;
        downloadBlob(blob, filename);
        showToast(`Export PDF — ${ids.length} élément(s) sélectionné(s)`, 'success');
        return;
      }

      const typesToExport = getTypesToExport(mainTab, filters.type);
      const blob = await exportInventoryPDF({
        types: typesToExport,
        site: filters.site,
        etat: filters.state,
        famille: filters.family,
        search: searchQuery,
      });

      const filename = `inventaire_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);
      showToast('Export PDF réussi', 'success');
    } catch (error: any) {
      if (error?.status === 404) {
        showToast('Aucune donnée à exporter', 'info');
      } else {
        showToast("Erreur lors de l'export PDF", 'error');
      }
    }
  }, [mainTab, filters, searchQuery, selectedItemsCache, showToast]);

  return { handleExportExcel, handlePrint };
}
