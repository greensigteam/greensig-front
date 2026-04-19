import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { planningService } from '../services/planningService';
import { fetchEquipes } from '../services/usersApi';
import { createTaskWithRecurrence, formatRecurrenceToast } from '../utils/taskRecurrence';
import type { TypeTache, TacheCreate } from '../types/planning';
import type { EquipeList } from '../types/users';

interface SelectedItemData {
  id: string;
  type: string;
}

interface UseInventoryTaskSubmitOptions {
  selectedItemsCache: Map<string, SelectedItemData>;
  onClearSelection: () => void;
}

export function useInventoryTaskSubmit({
  selectedItemsCache,
  onClearSelection,
}: UseInventoryTaskSubmitOptions) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalEquipes, setModalEquipes] = useState<EquipeList[]>([]);
  const [modalTypesTaches, setModalTypesTaches] = useState<TypeTache[]>([]);

  const handleOpenTaskModal = useCallback(async () => {
    setModalLoading(true);
    try {
      const uniqueTypes = [
        ...new Set(
          Array.from(selectedItemsCache.values()).map(
            (item) => item.type.charAt(0).toUpperCase() + item.type.slice(1),
          ),
        ),
      ];

      const [equipesData, typesTachesResult] = await Promise.all([
        fetchEquipes(),
        planningService.getApplicableTypesTaches(uniqueTypes),
      ]);

      setModalEquipes(equipesData.results || []);
      setModalTypesTaches(typesTachesResult.types_taches);
      setShowTaskModal(true);
    } catch (_error) {
      showToast('Erreur lors du chargement des données', 'error');
    } finally {
      setModalLoading(false);
    }
  }, [selectedItemsCache, showToast]);

  const handleTaskSubmit = useCallback(
    async (data: TacheCreate) => {
      setIsSubmitting(true);
      try {
        const { recurrenceResult } = await createTaskWithRecurrence(data);
        showToast(formatRecurrenceToast(recurrenceResult), 'success');
        onClearSelection();
        setShowTaskModal(false);
        navigate('/planning');
      } catch (err: any) {
        if (err.message?.includes('occurrences')) {
          showToast(err.message, 'error');
        } else {
          showToast('Erreur lors de la création de la tâche', 'error');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigate, showToast, onClearSelection],
  );

  return {
    showTaskModal,
    setShowTaskModal,
    modalLoading,
    isSubmitting,
    modalEquipes,
    modalTypesTaches,
    handleOpenTaskModal,
    handleTaskSubmit,
  };
}
