import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { planningService } from '../services/planningService';
import { fetchEquipes } from '../services/usersApi';
import { createTaskWithRecurrence, formatRecurrenceToast } from '../utils/taskRecurrence';
import type { TypeTache, TacheCreate } from '../types/planning';
import type { EquipeList } from '../types/users';
import type { MapObjectDetail } from '../types';
import type { InventoryObjectOption } from '../components/planning/TaskFormModal';

export function useMapTaskManagement() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskModalInitialValues, setTaskModalInitialValues] = useState<Partial<TacheCreate>>({});
  const [taskPreSelectedObjects, setTaskPreSelectedObjects] = useState<InventoryObjectOption[]>([]);
  const [taskSiteFilter, setTaskSiteFilter] = useState<{ id: number; name: string } | undefined>(
    undefined,
  );
  const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
  const [equipes, setEquipes] = useState<EquipeList[]>([]);

  const loadTaskData = async () => {
    try {
      const [types, teamData] = await Promise.all([
        planningService.getTypesTaches(),
        fetchEquipes(),
      ]);
      setTypesTaches(types);
      const teams = Array.isArray(teamData) ? teamData : (teamData.results ?? []);
      setEquipes(teams);
    } catch (_err: any) {
      showToast('Erreur lors du chargement des données de planification', 'error');
    }
  };

  const handleCreateTask = async (object?: MapObjectDetail) => {
    if (typesTaches.length === 0) {
      await loadTaskData();
    }

    const initialValues: Partial<TacheCreate> = {};
    const preSelected: InventoryObjectOption[] = [];

    if (object) {
      const objId = Number(object.id);

      if (object.type === 'Reclamation') {
        if (!isNaN(objId)) {
          initialValues.reclamation = objId;
          const numeroReclamation = object.attributes?.numero_reclamation || object.title;
          initialValues.commentaires = `Tâche liée à la réclamation ${numeroReclamation}`;

          const siteId = object.attributes?.site;
          const siteNom = object.attributes?.site_nom;

          if (siteId) {
            setTaskSiteFilter({
              id: Number(siteId),
              name: siteNom || `Site #${siteId}`,
            });
          } else {
            setTaskSiteFilter(undefined);
          }
        }
      } else if (!isNaN(objId)) {
        setTaskSiteFilter(undefined);

        const superficieStr =
          object.attributes?.['superficie_calculee'] ||
          object.attributes?.['Surface (m²)'] ||
          object.attributes?.['area_sqm'];
        const superficie = superficieStr ? parseFloat(superficieStr) : undefined;

        preSelected.push({
          id: objId,
          type: object.type,
          nom: object.title,
          site: object.subtitle || '',
          soussite: object.attributes?.['Sous-site'],
          superficie: !isNaN(superficie as number) ? superficie : undefined,
        });
      }
    } else {
      setTaskSiteFilter(undefined);
    }

    setTaskPreSelectedObjects(preSelected);
    setTaskModalInitialValues(initialValues);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (data: TacheCreate) => {
    setIsSubmittingTask(true);
    try {
      const { recurrenceResult } = await createTaskWithRecurrence(data);
      showToast(formatRecurrenceToast(recurrenceResult), 'success');
      setIsTaskModalOpen(false);
      navigate('/planning');
    } catch (err: any) {
      if (err.message?.includes('occurrences')) {
        showToast(err.message, 'error');
      } else {
        showToast(err.message || 'Erreur lors de la création de la tâche', 'error');
      }
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return {
    isTaskModalOpen,
    setIsTaskModalOpen,
    isSubmittingTask,
    taskModalInitialValues,
    setTaskModalInitialValues,
    taskPreSelectedObjects,
    setTaskPreSelectedObjects,
    taskSiteFilter,
    typesTaches,
    equipes,
    loadTaskData,
    handleCreateTask,
    handleTaskSubmit,
  };
}
