import { apiFetch } from './api';
import type { KPIData, KPIHistoriqueData } from '../types/kpi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchKPIs(mois?: string, siteId?: number | null): Promise<KPIData> {
  const params = new URLSearchParams();
  if (mois) params.set('mois', mois);
  if (siteId) params.set('site_id', String(siteId));

  const qs = params.toString();
  const url = `${API_BASE_URL}/kpis/${qs ? `?${qs}` : ''}`;
  const response = await apiFetch(url);

  if (!response.ok) {
    throw new Error(`Erreur ${response.status} lors du chargement des KPIs`);
  }

  return response.json();
}

export async function fetchKPIHistorique(
  siteId?: number | null,
  nbMois?: number,
): Promise<KPIHistoriqueData> {
  const params = new URLSearchParams();
  if (siteId) params.set('site_id', String(siteId));
  if (nbMois) params.set('nb_mois', String(nbMois));

  const qs = params.toString();
  const url = `${API_BASE_URL}/kpis/historique/${qs ? `?${qs}` : ''}`;
  const response = await apiFetch(url);

  if (!response.ok) {
    throw new Error(`Erreur ${response.status} lors du chargement de l'historique KPI`);
  }

  return response.json();
}
