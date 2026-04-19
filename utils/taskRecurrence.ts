import { planningService } from '../services/planningService';
import type { TacheCreate } from '../types/planning';

interface RecurrenceResult {
  nombre_taches_creees: number;
}

export async function createTaskWithRecurrence(
  data: TacheCreate,
  payloadOverrides?: Partial<TacheCreate>,
): Promise<{ createdTask: any; recurrenceResult: RecurrenceResult | null }> {
  const payload = payloadOverrides ? { ...data, ...payloadOverrides } : data;
  const createdTask = await planningService.createTache(payload);

  const recurrenceConfig = data.recurrence_config;
  if (!recurrenceConfig?.enabled || !createdTask.id) {
    return { createdTask, recurrenceResult: null };
  }

  let recurrenceResult: RecurrenceResult | undefined;

  if (recurrenceConfig.mode === 'frequency') {
    recurrenceResult = await planningService.dupliquerTacheRecurrence(createdTask.id, {
      frequence: recurrenceConfig.frequency!,
      nombre_occurrences: recurrenceConfig.nombre_occurrences,
      date_fin_recurrence: recurrenceConfig.date_fin_recurrence,
      conserver_equipes: recurrenceConfig.conserver_equipes,
      conserver_objets: recurrenceConfig.conserver_objets,
    });
  } else if (recurrenceConfig.mode === 'custom') {
    recurrenceResult = await planningService.dupliquerTache(createdTask.id, {
      decalage_jours: recurrenceConfig.decalage_jours!,
      nombre_occurrences: recurrenceConfig.nombre_occurrences,
      date_fin_recurrence: recurrenceConfig.date_fin_recurrence,
      conserver_equipes: recurrenceConfig.conserver_equipes,
      conserver_objets: recurrenceConfig.conserver_objets,
    });
  } else if (recurrenceConfig.mode === 'dates') {
    recurrenceResult = await planningService.dupliquerTacheDates(createdTask.id, {
      dates_cibles: recurrenceConfig.dates_cibles!,
      conserver_equipes: recurrenceConfig.conserver_equipes,
      conserver_objets: recurrenceConfig.conserver_objets,
    });
  }

  return { createdTask, recurrenceResult: recurrenceResult ?? null };
}

export function formatRecurrenceToast(
  recurrenceResult: RecurrenceResult | null,
  prefix?: string,
): string {
  if (!recurrenceResult) {
    return prefix ? `${prefix} Tâche créée avec succès` : 'Tâche créée avec succès';
  }
  const totalCreated = 1 + recurrenceResult.nombre_taches_creees;
  const s = totalCreated > 1 ? 's' : '';
  const base = `${totalCreated} tâche${s} créée${s} avec succès (1 tâche de base + ${recurrenceResult.nombre_taches_creees} occurrence${recurrenceResult.nombre_taches_creees > 1 ? 's' : ''})`;
  return prefix ? `${prefix} ${base}` : base;
}
