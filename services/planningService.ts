import { apiFetch } from './api';
import { distributionService } from './distributionService';
import { PaginatedResponse } from '../types/users';
import {
  Tache,
  TacheCreate,
  TacheUpdate,
  TypeTache,
  TypeTacheCreate,
  TypeTacheWithRatios,
  ParticipationCreate,
  ParticipationTache,
  RatioProductivite,
  RatioProductiviteCreate,
  UniteMesure,
  MotifAnnulationTache,
} from '../types/planning';

const BASE_URL = '/api/planification';

/**
 * Parse les erreurs de validation DRF et crée un objet d'erreur structuré
 * @param error - L'erreur retournée par l'API
 * @param defaultMessage - Message par défaut si aucune erreur spécifique n'est trouvée
 * @returns Error avec propriétés validationErrors et fieldErrors
 */
function parseValidationError(error: any, defaultMessage: string = 'Erreur de validation'): Error {
  // Cas spécial: erreur structurée avec message (ex: protected_foreign_key)
  if (error && typeof error === 'object' && error.message) {
    const structuredError: any = new Error(error.message);
    structuredError.errorCode = error.error;
    structuredError.detail = error.detail;
    structuredError.data = error;
    return structuredError;
  }

  // Si c'est une erreur de validation DRF (format: { field: [errors] })
  if (error && typeof error === 'object' && !error.error && !error.detail) {
    // Collecter tous les messages d'erreur
    const errorMessages: string[] = [];
    for (const [, messages] of Object.entries(error)) {
      if (Array.isArray(messages)) {
        errorMessages.push(...messages);
      } else if (typeof messages === 'string') {
        errorMessages.push(messages);
      }
    }

    // Créer une erreur structurée avec tous les messages
    if (errorMessages.length > 0) {
      const validationError: any = new Error(errorMessages[0]);
      validationError.validationErrors = errorMessages;
      validationError.fieldErrors = error;
      return validationError;
    }
  }

  // Sinon, erreur standard
  return new Error(error.error || error.detail || defaultMessage);
}

/**
 * Garantit que `date_debut_planifiee <= date_fin_planifiee` avant POST/PATCH.
 * Le backend rejette déjà cette incohérence (400), mais côté client on échoue
 * plus tôt avec un message lisible au lieu d'un round-trip réseau.
 */
function assertPlanifieeDatesOrdered(debut?: string | null, fin?: string | null): void {
  if (!debut || !fin) return;
  if (debut > fin) {
    const err: any = new Error(
      'La date de début planifiée doit être antérieure ou égale à la date de fin.',
    );
    err.fieldErrors = {
      date_debut_planifiee: ['La date de début doit être antérieure ou égale à la date de fin.'],
      date_fin_planifiee: ['La date de fin doit être postérieure ou égale à la date de début.'],
    };
    throw err;
  }
}

export const planningService = {
  // --- TACHES ---

  /**
   * Récupère les tâches avec pagination et filtres optionnels.
   * Le backend filtre automatiquement selon les permissions de l'utilisateur.
   */
  async getTaches(
    params: {
      start_date?: string;
      end_date?: string;
      client_id?: number;
      structure_client_id?: number;
      equipe_id?: number;
      page?: number;
      has_reclamation?: boolean;
      objet_id?: number;
    } = {},
  ): Promise<PaginatedResponse<Tache>> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.client_id) query.append('client_id', params.client_id.toString());
    if (params.structure_client_id)
      query.append('structure_client_id', params.structure_client_id.toString());
    if (params.equipe_id) query.append('equipe_id', params.equipe_id.toString());
    if (params.page) query.append('page', params.page.toString());
    if (params.has_reclamation) query.append('has_reclamation', 'true');
    if (params.objet_id) query.append('objet_id', params.objet_id.toString());

    const queryString = query.toString();
    const url = queryString ? `${BASE_URL}/taches/?${queryString}` : `${BASE_URL}/taches/`;
    const response = await apiFetch(url);
    if (!response.ok) throw new Error('Erreur lors du chargement des tâches');
    const data = await response.json();
    return data;
  },

  async getTache(id: number): Promise<Tache> {
    const response = await apiFetch(`${BASE_URL}/taches/${id}/`);
    if (!response.ok) throw new Error('Tâche non trouvée');
    return response.json();
  },

  async createTache(data: TacheCreate): Promise<Tache> {
    assertPlanifieeDatesOrdered(data.date_debut_planifiee, data.date_fin_planifiee);

    // Les dates planifiées sont maintenant des dates simples (YYYY-MM-DD)
    const payload = {
      ...data,
      // Pas de conversion nécessaire : date_debut_planifiee et date_fin_planifiee sont déjà au format YYYY-MM-DD
    };

    const response = await apiFetch(`${BASE_URL}/taches/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la création de la tâche');
    }
    return response.json();
  },

  async updateTache(id: number, data: TacheUpdate): Promise<Tache> {
    assertPlanifieeDatesOrdered(data.date_debut_planifiee, data.date_fin_planifiee);

    // Toutes les dates sont maintenant des dates simples (YYYY-MM-DD)
    const payload = { ...data };

    // Dates planifiées : déjà au format YYYY-MM-DD, pas de conversion nécessaire

    // Dates réelles : extraire uniquement la date (YYYY-MM-DD) si format datetime présent
    if (data.date_debut_reelle) {
      payload.date_debut_reelle = data.date_debut_reelle.split('T')[0];
    }
    if (data.date_fin_reelle) {
      payload.date_fin_reelle = data.date_fin_reelle.split('T')[0];
    }

    const response = await apiFetch(`${BASE_URL}/taches/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la modification de la tâche');
    }
    return response.json();
  },

  async deleteTache(id: number): Promise<void> {
    const response = await apiFetch(`${BASE_URL}/taches/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Tâche introuvable. Elle a peut-être déjà été supprimée.');
      }
      let message = 'Erreur lors de la suppression de la tâche';
      try {
        const error = await response.json();
        message = error.message || error.detail || error.error || message;
      } catch {
        // ignore parse error
      }
      throw new Error(message);
    }
  },

  // --- TYPES DE TACHES ---

  async getTypesTaches(): Promise<TypeTache[]> {
    const response = await apiFetch(`${BASE_URL}/types-taches/`);
    if (!response.ok) throw new Error('Erreur chargement types tâches');
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  },

  /**
   * Récupère les types de tâches applicables à une liste de types d'objets.
   * Un type de tâche est applicable si un RatioProductivite existe pour TOUS les types fournis.
   *
   * @param typesObjets - Liste des types d'objets (ex: ['Arbre', 'Gazon', 'Palmier'])
   * @returns Liste des types de tâches applicables
   */
  async getApplicableTypesTaches(typesObjets: string[]): Promise<{
    types_objets_demandes: string[];
    nombre_types_taches: number;
    types_taches: TypeTache[];
  }> {
    if (!typesObjets || typesObjets.length === 0) {
      // Si aucun type fourni, retourner tous les types
      const allTypes = await this.getTypesTaches();
      return {
        types_objets_demandes: [],
        nombre_types_taches: allTypes.length,
        types_taches: allTypes,
      };
    }

    const typesParam = typesObjets.join(',');
    const response = await apiFetch(
      `${BASE_URL}/types-taches/applicables/?types_objets=${encodeURIComponent(typesParam)}`,
    );

    if (!response.ok) throw new Error('Erreur chargement types tâches applicables');
    const data = await response.json();

    // Normalisation : si c'est un tableau, on l'encapsule dans le format attendu
    if (Array.isArray(data)) {
      return {
        types_objets_demandes: typesObjets,
        nombre_types_taches: data.length,
        types_taches: data,
      };
    }

    return data;
  },

  /**
   * Récupère les types d'objets compatibles avec un type de tâche.
   * Un type d'objet est compatible s'il existe un RatioProductivite actif.
   *
   * @param typeTacheId - ID du type de tâche
   * @returns Liste des types d'objets compatibles
   */
  async getCompatibleObjectTypes(typeTacheId: number): Promise<{
    type_tache_id: number;
    type_tache_nom: string;
    nombre_types_objets: number;
    types_objets_compatibles: string[];
  }> {
    const response = await apiFetch(`${BASE_URL}/types-taches/${typeTacheId}/objets_compatibles/`);

    if (!response.ok) throw new Error('Erreur chargement types objets compatibles');
    return response.json();
  },

  async createTypeTache(data: TypeTacheCreate): Promise<TypeTache> {
    const response = await apiFetch(`${BASE_URL}/types-taches/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la création du type de tâche');
    }
    return response.json();
  },

  async updateTypeTache(id: number, data: Partial<TypeTacheCreate>): Promise<TypeTache> {
    const response = await apiFetch(`${BASE_URL}/types-taches/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la modification du type de tâche');
    }
    return response.json();
  },

  async deleteTypeTache(id: number): Promise<void> {
    const response = await apiFetch(`${BASE_URL}/types-taches/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la suppression du type de tâche');
    }
  },

  /**
   * Récupère un type de tâche avec tous ses ratios de productivité associés
   */
  async getTypeTacheWithRatios(id: number): Promise<TypeTacheWithRatios> {
    const [typeTache, ratios] = await Promise.all([
      apiFetch(`${BASE_URL}/types-taches/${id}/`).then((r) => {
        if (!r.ok) throw new Error('Type de tâche non trouvé');
        return r.json();
      }),
      this.getRatios({ type_tache_id: id }),
    ]);
    return { ...typeTache, ratios };
  },

  /**
   * Sauvegarde un type de tâche avec ses ratios de productivité.
   * Crée/met à jour/supprime les ratios selon la configuration fournie.
   */
  async saveTypeTacheWithRatios(
    typeTacheData: TypeTacheCreate,
    ratiosConfig: Array<{
      type_objet: string;
      ratio: number;
      unite_mesure: UniteMesure;
      actif: boolean;
    }>,
    typeTacheId?: number,
  ): Promise<TypeTache> {
    // 1. Créer ou mettre à jour le TypeTache
    let typeTache: TypeTache;
    if (typeTacheId) {
      typeTache = await this.updateTypeTache(typeTacheId, typeTacheData);
    } else {
      typeTache = await this.createTypeTache(typeTacheData);
    }

    // 2. Récupérer les ratios existants pour ce type de tâche
    const existingRatios = await this.getRatios({ type_tache_id: typeTache.id });

    // 3. Traiter chaque configuration de ratio
    for (const config of ratiosConfig) {
      const existingRatio = existingRatios.find((r) => r.type_objet === config.type_objet);

      if (existingRatio) {
        // Mettre à jour le ratio existant
        await this.updateRatio(existingRatio.id, {
          ratio: config.ratio,
          unite_mesure: config.unite_mesure,
          actif: config.actif,
        });
      } else if (config.actif) {
        // Créer un nouveau ratio seulement si actif
        await this.createRatio({
          id_type_tache: typeTache.id,
          type_objet: config.type_objet,
          ratio: config.ratio,
          unite_mesure: config.unite_mesure,
          actif: true,
        });
      }
    }

    // 4. Supprimer les ratios qui ne sont plus dans la config
    const configTypeObjets = new Set(ratiosConfig.filter((c) => c.actif).map((c) => c.type_objet));
    for (const existingRatio of existingRatios) {
      if (!configTypeObjets.has(existingRatio.type_objet)) {
        await this.deleteRatio(existingRatio.id);
      }
    }

    return typeTache;
  },

  // --- PARTICIPATION ---

  async addParticipation(tacheId: number, data: ParticipationCreate): Promise<ParticipationTache> {
    const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/add_participation/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Erreur ajout participation');
    return response.json();
  },

  // --- CHANGEMENT DE STATUT ---

  /**
   * Change le statut d'une tâche avec gestion automatique des dates réelles.
   * - Démarrer (EN_COURS): définit date_debut_reelle à maintenant
   * - Terminer (TERMINEE): définit date_fin_reelle à maintenant
   * - Annuler (ANNULEE): requiert motif_annulation obligatoire
   */
  async changeStatut(
    tacheId: number,
    nouveauStatut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | 'PLANIFIEE',
    options?: {
      motif_annulation?: MotifAnnulationTache;
      commentaire_annulation?: string;
    },
  ): Promise<Tache> {
    const updateData: TacheUpdate = { statut: nouveauStatut };

    // Gestion automatique des dates réelles (format YYYY-MM-DD uniquement)
    if (nouveauStatut === 'EN_COURS') {
      updateData.date_debut_reelle = new Date().toISOString().split('T')[0];
    } else if (nouveauStatut === 'TERMINEE') {
      updateData.date_fin_reelle = new Date().toISOString().split('T')[0];
    } else if (nouveauStatut === 'ANNULEE') {
      // Justification obligatoire pour l'annulation
      if (options?.motif_annulation) {
        updateData.motif_annulation = options.motif_annulation;
      }
      if (options?.commentaire_annulation) {
        updateData.commentaire_annulation = options.commentaire_annulation;
      }
    }

    const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors du changement de statut');
    }
    return response.json();
  },

  // --- VALIDATION ADMIN ---

  /**
   * Valide ou rejette une tâche terminée (ADMIN uniquement).
   */
  async validerTache(
    tacheId: number,
    etat: 'VALIDEE' | 'REJETEE',
    commentaire?: string,
  ): Promise<{
    message: string;
    tache: Tache;
    proposition_cloture_possible?: boolean;
    reclamation_id?: number;
    reclamation_numero?: string;
    nombre_taches_validees?: number;
  }> {
    const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/valider/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etat, commentaire: commentaire || '' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la validation');
    }
    return response.json();
  },

  // --- CHARGE ESTIMEE ---

  async resetCharge(
    tacheId: number,
  ): Promise<{ charge_estimee_heures: number | null; charge_manuelle: boolean }> {
    const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/reset_charge/`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Erreur lors du recalcul de la charge');
    return response.json();
  },

  // --- RATIOS DE PRODUCTIVITE ---

  async getRatios(
    params: { type_tache_id?: number; type_objet?: string; actif?: boolean } = {},
  ): Promise<RatioProductivite[]> {
    const query = new URLSearchParams();
    if (params.type_tache_id) query.append('type_tache_id', params.type_tache_id.toString());
    if (params.type_objet) query.append('type_objet', params.type_objet);
    if (params.actif !== undefined) query.append('actif', params.actif.toString());

    const response = await apiFetch(`${BASE_URL}/ratios-productivite/?${query.toString()}`);
    if (!response.ok) throw new Error('Erreur chargement ratios');

    const data = await response.json();
    if (Array.isArray(data)) return data;
    return data.results || [];
  },

  async getRatiosPaginated(
    page: number = 1,
    params: { search?: string; type_tache_id?: number; type_objet?: string } = {},
  ): Promise<{
    results: RatioProductivite[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const query = new URLSearchParams();
    query.append('page', page.toString());
    if (params.search) query.append('search', params.search);
    if (params.type_tache_id) query.append('type_tache_id', params.type_tache_id.toString());
    if (params.type_objet) query.append('type_objet', params.type_objet);

    const response = await apiFetch(`${BASE_URL}/ratios-productivite/?${query.toString()}`);
    if (!response.ok) throw new Error('Erreur chargement ratios');
    return response.json();
  },

  async getRatio(id: number): Promise<RatioProductivite> {
    const response = await apiFetch(`${BASE_URL}/ratios-productivite/${id}/`);
    if (!response.ok) throw new Error('Ratio non trouvé');
    return response.json();
  },

  async createRatio(data: RatioProductiviteCreate): Promise<RatioProductivite> {
    const response = await apiFetch(`${BASE_URL}/ratios-productivite/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw parseValidationError(error, 'Erreur lors de la création du ratio');
    }
    return response.json();
  },

  async updateRatio(
    id: number,
    data: Partial<RatioProductiviteCreate>,
  ): Promise<RatioProductivite> {
    const response = await apiFetch(`${BASE_URL}/ratios-productivite/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Erreur modification ratio');
    return response.json();
  },

  async deleteRatio(id: number): Promise<void> {
    const response = await apiFetch(`${BASE_URL}/ratios-productivite/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Erreur suppression ratio');
  },

  // --- DISTRIBUTION DE CHARGE ---

  // Distribution methods delegated to distributionService
  ...distributionService,

  // ============================================================================
  // RÉCURRENCE - Duplication de tâches avec leurs distributions
  // ============================================================================

  /**
   * Duplique une tâche avec un décalage personnalisé en jours.
   *
   * @param tacheId - ID de la tâche à dupliquer
   * @param params - Paramètres de duplication
   * @returns Nouvelles tâches créées
   */
  async dupliquerTache(
    tacheId: number,
    params: {
      decalage_jours: number;
      nombre_occurrences?: number;
      date_fin_recurrence?: string;
      conserver_equipes?: boolean;
      conserver_objets?: boolean;
    },
  ): Promise<any> {
    const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/dupliquer/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.detail || 'Erreur lors de la duplication de la tâche');
    }

    const result = await response.json();
    return result;
  },

  /**
   * Duplique une tâche selon une fréquence prédéfinie.
   *
   * @param tacheId - ID de la tâche à dupliquer
   * @param params - Paramètres de récurrence
   * @returns Nouvelles tâches créées
   */
  async dupliquerTacheRecurrence(
    tacheId: number,
    params: {
      frequence: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      nombre_occurrences?: number;
      date_fin_recurrence?: string;
      conserver_equipes?: boolean;
      conserver_objets?: boolean;
    },
  ): Promise<any> {
    const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/dupliquer-recurrence/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.detail || 'Erreur lors de la duplication récurrente');
    }

    const result = await response.json();
    return result;
  },

  /**
   * Duplique une tâche à des dates spécifiques.
   *
   * @param tacheId - ID de la tâche à dupliquer
   * @param params - Paramètres de duplication avec dates
   * @returns Nouvelles tâches créées
   */
  async dupliquerTacheDates(
    tacheId: number,
    params: {
      dates_cibles: string[];
      conserver_equipes?: boolean;
      conserver_objets?: boolean;
    },
  ): Promise<any> {
    const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/dupliquer-dates/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error || error.detail || 'Erreur lors de la duplication aux dates spécifiées',
      );
    }

    const result = await response.json();
    return result;
  },

  // --- GESTION DES RETARDS ET EXPIRATIONS (DÉSACTIVÉ) ---

  /**
   * ✅ SIMPLIFIÉ: Cette fonction n'est plus utilisée car le système de EN_RETARD/EXPIREE a été supprimé.
   * Les tâches restent PLANIFIEE jusqu'à démarrage explicite.
   *
   * @deprecated Plus de calcul automatique de retard/expiration
   * @returns Résultat avec le nombre de tâches mises à jour (toujours 0)
   */
  async refreshTaskStatuses(): Promise<{
    message: string;
    late_count: number;
    late_ids: number[];
    expired_count: number;
    expired_ids: number[];
    total_updated: number;
  }> {
    const response = await apiFetch(`${BASE_URL}/taches/refresh-task-statuses/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors du rafraîchissement des statuts');
    }

    return response.json();
  },

  // ============================================================================
  // EXPORT PDF DU PLANNING
  // ============================================================================

  /**
   * Lance l'export PDF du planning pour une période donnée.
   * L'export est généré de manière asynchrone via Celery.
   *
   * @param params - Paramètres de l'export
   * @param sync - Mode synchrone (fallback si Celery non disponible)
   * @returns {task_id, status} pour le polling ou résultat direct en mode sync
   */
  async exportPDF(params: {
    startDate: string;
    endDate: string;
    structureClientId?: number;
    equipeId?: number;
    siteId?: number;
    statuts?: string[];
    tacheIds?: number[];
    sync?: boolean;
  }): Promise<{
    task_id: string;
    status: string;
    message?: string;
    ready?: boolean;
    result?: {
      download_url: string;
      filename: string;
      record_count: number;
    };
  }> {
    const query = new URLSearchParams();
    query.append('start_date', params.startDate);
    query.append('end_date', params.endDate);

    if (params.structureClientId) {
      query.append('structure_client_id', params.structureClientId.toString());
    }
    if (params.equipeId) {
      query.append('equipe_id', params.equipeId.toString());
    }
    if (params.siteId) {
      query.append('site_id', params.siteId.toString());
    }
    if (params.statuts && params.statuts.length > 0) {
      query.append('statuts', params.statuts.join(','));
    }
    if (params.tacheIds && params.tacheIds.length > 0) {
      query.append('tache_ids', params.tacheIds.join(','));
    }
    if (params.sync) {
      query.append('sync', 'true');
    }

    const response = await apiFetch(`${BASE_URL}/export/pdf/?${query.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors du lancement de l'export PDF");
    }

    return response.json();
  },

  /**
   * Vérifie le statut d'un export PDF en cours.
   *
   * @param taskId - ID de la tâche Celery
   * @returns Statut de l'export avec URL de téléchargement si terminé
   */
  async getExportStatus(taskId: string): Promise<{
    task_id: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILURE' | 'STARTED';
    ready: boolean;
    result?: {
      download_url: string;
      filename: string;
      record_count: number;
    };
    error?: string;
  }> {
    const response = await apiFetch(`${BASE_URL}/export/status/${taskId}/`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la vérification du statut de l'export");
    }

    return response.json();
  },
};
