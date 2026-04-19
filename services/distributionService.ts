import { apiFetch } from './api';
import {
  DistributionCharge,
  DistributionChargeEnriched,
  MotifDistribution,
  ReporterDistributionResponse,
  HistoriqueDistributionResponse,
  DistributionFilters,
} from '../types/planning';

const BASE_URL = '/api/planification';

function parseValidationError(error: any, defaultMessage: string = 'Erreur de validation'): Error {
  if (error && typeof error === 'object' && error.message) {
    const structuredError: any = new Error(error.message);
    structuredError.errorCode = error.error;
    structuredError.detail = error.detail;
    structuredError.data = error;
    return structuredError;
  }

  if (error && typeof error === 'object' && !error.error && !error.detail) {
    const errorMessages: string[] = [];
    for (const [, messages] of Object.entries(error)) {
      if (Array.isArray(messages)) {
        errorMessages.push(...messages);
      } else if (typeof messages === 'string') {
        errorMessages.push(messages);
      }
    }

    if (errorMessages.length > 0) {
      const combinedMessage = errorMessages.join('\n');
      const validationError: any = new Error(combinedMessage);
      validationError.validationErrors = errorMessages;
      validationError.fieldErrors = error;
      return validationError;
    }
  }

  if (error && typeof error === 'string') {
    return new Error(error);
  }

  return new Error(defaultMessage);
}

export const distributionService = {
  async updateDistributions(
    tacheId: number,
    distributions: Array<{
      date: string;
      heure_debut: string;
      heure_fin: string;
      commentaire?: string;
    }>,
  ): Promise<{
    message: string;
    distributions: any[];
    total_heures: number;
    nombre_jours: number;
  }> {
    const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/update_distributions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distributions }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la mise à jour des distributions');
    }

    return response.json();
  },

  async updateSingleDistribution(
    _tacheId: number,
    distributionId: number,
    data: {
      date: string;
      heure_debut: string;
      heure_fin: string;
      commentaire?: string;
    },
  ): Promise<{
    message: string;
    distribution: any;
  }> {
    const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la mise à jour de la distribution');
    }

    return response.json();
  },

  async marquerDistributionRealisee(distributionId: number, heuresReelles?: number): Promise<any> {
    const response = await apiFetch(
      `${BASE_URL}/distributions/${distributionId}/marquer-realisee/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heures_reelles: heuresReelles }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors du marquage de la distribution');
    }

    return response.json();
  },

  async marquerDistributionNonRealisee(distributionId: number): Promise<any> {
    const response = await apiFetch(
      `${BASE_URL}/distributions/${distributionId}/marquer-non-realisee/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(
        error,
        'Erreur lors du marquage de la distribution comme non réalisée',
      );
    }

    return response.json();
  },

  async deleteDistribution(distributionId: number): Promise<void> {
    const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la suppression de la distribution');
    }
  },

  async createDistribution(data: {
    tache: number;
    date: string;
    heure_debut: string;
    heure_fin: string;
    commentaire?: string;
  }): Promise<any> {
    const response = await apiFetch(`${BASE_URL}/distributions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la création de la distribution');
    }

    return response.json();
  },

  async getDistributions(params: DistributionFilters = {}): Promise<DistributionCharge[]> {
    const query = new URLSearchParams();

    if (params.tache) query.append('tache', params.tache.toString());
    if (params.tache_reference) query.append('tache__reference', params.tache_reference);
    if (params.date) query.append('date', params.date);
    if (params.date_debut) query.append('date__gte', params.date_debut);
    if (params.date_fin) query.append('date__lte', params.date_fin);
    if (params.aujourd_hui) query.append('aujourd_hui', 'true');
    if (params.semaine_courante) query.append('semaine_courante', 'true');
    if (params.status) query.append('status', params.status);
    if (params.status_in && params.status_in.length > 0) {
      query.append('status__in', params.status_in.join(','));
    }
    if (params.actif !== undefined) query.append('actif', params.actif.toString());
    if (params.termine !== undefined) query.append('termine', params.termine.toString());
    if (params.equipe) query.append('equipe', params.equipe.toString());
    if (params.site) query.append('site', params.site.toString());
    if (params.site_nom) query.append('site__nom', params.site_nom);
    if (params.structure) query.append('structure', params.structure.toString());
    if (params.type_tache) query.append('type_tache', params.type_tache.toString());
    if (params.type_tache_nom) query.append('type_tache__nom', params.type_tache_nom);
    if (params.priorite) query.append('priorite', params.priorite.toString());
    if (params.priorite_min) query.append('priorite__gte', params.priorite_min.toString());
    if (params.urgent !== undefined) query.append('urgent', params.urgent.toString());
    if (params.est_report !== undefined) query.append('est_report', params.est_report.toString());
    if (params.a_remplacement !== undefined)
      query.append('a_remplacement', params.a_remplacement.toString());
    if (params.motif) query.append('motif', params.motif);
    if (params.search) query.append('search', params.search);
    if (params.ordering) query.append('ordering', params.ordering);

    const queryString = query.toString();
    const url = queryString
      ? `${BASE_URL}/distributions/?${queryString}`
      : `${BASE_URL}/distributions/`;

    const response = await apiFetch(url);
    if (!response.ok) throw new Error('Erreur chargement distributions');

    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  },

  async getDistributionsParJour(date: string): Promise<{
    date: string;
    distributions: DistributionChargeEnriched[];
    statistiques: {
      total: number;
      par_statut: Record<string, number>;
      heures_planifiees_total: number;
    };
  }> {
    const response = await apiFetch(`${BASE_URL}/distributions/par-jour/?date=${date}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur chargement distributions du jour');
    }

    return response.json();
  },

  async demarrerDistribution(
    distributionId: number,
    data?: {
      heure_debut_reelle?: string;
      date_debut_reelle?: string;
    },
  ): Promise<{
    message: string;
    distribution: DistributionCharge;
    ancien_statut: string;
    nouveau_statut: string;
    tache_synchronisee: boolean;
    tache_nouveau_statut: string | null;
  }> {
    const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/demarrer/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors du démarrage de la distribution');
    }

    return response.json();
  },

  async terminerDistribution(
    distributionId: number,
    data?: {
      heure_debut_reelle?: string;
      heure_fin_reelle?: string;
      heures_reelles?: number;
      date_fin_reelle?: string;
    },
  ): Promise<{
    message: string;
    distribution: DistributionCharge;
    ancien_statut: string;
    nouveau_statut: string;
    tache_synchronisee: boolean;
    tache_nouveau_statut: string | null;
  }> {
    const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/terminer/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la terminaison de la distribution');
    }

    return response.json();
  },

  async reporterDistribution(
    distributionId: number,
    nouvelleDate: string,
    motif: MotifDistribution,
    commentaire?: string,
  ): Promise<ReporterDistributionResponse> {
    const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/reporter/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nouvelle_date: nouvelleDate,
        motif,
        commentaire: commentaire || '',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors du report de la distribution');
    }

    return response.json();
  },

  async annulerDistribution(
    distributionId: number,
    motif: MotifDistribution,
    commentaire?: string,
  ): Promise<{
    message: string;
    distribution: DistributionCharge;
    ancien_statut: string;
    nouveau_statut: string;
    motif: string;
    tache_synchronisee: boolean;
    tache_nouveau_statut: string | null;
  }> {
    const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/annuler/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motif, commentaire: commentaire || '' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, "Erreur lors de l'annulation de la distribution");
    }

    return response.json();
  },

  async restaurerDistribution(distributionId: number): Promise<{
    message: string;
    distribution: DistributionCharge;
    ancien_statut: string;
    nouveau_statut: string;
    tache_synchronisee: boolean;
    tache_nouveau_statut: string | null;
  }> {
    const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/restaurer/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la restauration de la distribution');
    }

    return response.json();
  },

  async getHistoriqueDistribution(distributionId: number): Promise<HistoriqueDistributionResponse> {
    const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/historique/`);

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, "Erreur lors du chargement de l'historique");
    }

    return response.json();
  },
};
