// services/reportsApi.ts
// API pour les rapports de site

import { apiFetch } from './apiFetch';
import type { MonthlyReportData, MonthlyReportOptions } from '../types/reports';

const API_BASE = '/api';

/**
 * Récupère les données pour le rapport de site
 * @param options - Options du rapport (siteId obligatoire, dateDebut, dateFin)
 */
export async function fetchMonthlyReport(options: MonthlyReportOptions): Promise<MonthlyReportData> {
  const params = new URLSearchParams();

  params.append('site_id', options.siteId.toString());
  params.append('date_debut', options.dateDebut);
  params.append('date_fin', options.dateFin);

  const response = await apiFetch(`${API_BASE}/monthly-report/?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur lors de la récupération du rapport' }));
    throw new Error(error.error || error.message || error.detail || 'Erreur inconnue');
  }

  return response.json();
}