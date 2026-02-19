import { apiFetch } from './apiFetch';
import { PaginatedResponse } from '../types/users';
import {
    Tache, TacheCreate, TacheUpdate,
    TypeTache, TypeTacheCreate, TypeTacheWithRatios,
    ParticipationCreate, ParticipationTache,
    RatioProductivite, RatioProductiviteCreate, UniteMesure,
    DistributionCharge, DistributionChargeEnriched, MotifDistribution,
    ReporterDistributionResponse, HistoriqueDistributionResponse,
    DistributionFilters, MotifAnnulationTache
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
        for (const [field, messages] of Object.entries(error)) {
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

export const planningService = {
    // --- TACHES ---

    /**
     * Récupère les tâches avec pagination et filtres optionnels.
     * Le backend filtre automatiquement selon les permissions de l'utilisateur.
     */
    async getTaches(params: {
        start_date?: string,
        end_date?: string,
        client_id?: number,
        structure_client_id?: number,
        equipe_id?: number,
        page?: number,
        has_reclamation?: boolean,
        objet_id?: number
    } = {}): Promise<PaginatedResponse<Tache>> {
        const query = new URLSearchParams();
        if (params.start_date) query.append('start_date', params.start_date);
        if (params.end_date) query.append('end_date', params.end_date);
        if (params.client_id) query.append('client_id', params.client_id.toString());
        if (params.structure_client_id) query.append('structure_client_id', params.structure_client_id.toString());
        if (params.equipe_id) query.append('equipe_id', params.equipe_id.toString());
        if (params.page) query.append('page', params.page.toString());
        if (params.has_reclamation) query.append('has_reclamation', 'true');
        if (params.objet_id) query.append('objet_id', params.objet_id.toString());

        const queryString = query.toString();
        const url = queryString ? `${BASE_URL}/taches/?${queryString}` : `${BASE_URL}/taches/`;
        const token = localStorage.getItem('token');
        console.log('[planningService] GET taches URL:', url);
        console.log('[planningService] Token present:', !!token, token ? `(${token.substring(0, 20)}...)` : '');

        try {
            console.log('[planningService] Calling apiFetch...');
            const response = await apiFetch(url);
            console.log('[planningService] apiFetch response:', response.status, response.ok);
            if (!response.ok) throw new Error('Erreur lors du chargement des tâches');
            const data = await response.json();
            console.log('[planningService] Taches loaded:', data.results?.length || 0);
            return data;
        } catch (error) {
            console.error('[planningService] ERROR in getTaches:', error);
            throw error;
        }
    },

    async getTache(id: number): Promise<Tache> {
        const response = await apiFetch(`${BASE_URL}/taches/${id}/`);
        if (!response.ok) throw new Error('Tâche non trouvée');
        return response.json();
    },

    async createTache(data: TacheCreate): Promise<Tache> {
        console.log('Creating task with data:', JSON.stringify(data, null, 2));

        // Les dates planifiées sont maintenant des dates simples (YYYY-MM-DD)
        const payload = {
            ...data
            // Pas de conversion nécessaire : date_debut_planifiee et date_fin_planifiee sont déjà au format YYYY-MM-DD
        };

        const response = await apiFetch(`${BASE_URL}/taches/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const error = await response.json();
            console.error('Task creation error response:', error);
            throw parseValidationError(error, 'Erreur lors de la création de la tâche');
        }
        return response.json();
    },

    async updateTache(id: number, data: TacheUpdate): Promise<Tache> {
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
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de la modification de la tâche');
        }
        return response.json();
    },

    async deleteTache(id: number): Promise<void> {
        const response = await apiFetch(`${BASE_URL}/taches/${id}/`, {
            method: 'DELETE'
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
        return Array.isArray(data) ? data : (data.results || []);
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
                types_taches: allTypes
            };
        }

        const typesParam = typesObjets.join(',');
        const response = await apiFetch(`${BASE_URL}/types-taches/applicables/?types_objets=${encodeURIComponent(typesParam)}`);

        if (!response.ok) throw new Error('Erreur chargement types tâches applicables');
        const data = await response.json();

        // Normalisation : si c'est un tableau, on l'encapsule dans le format attendu
        if (Array.isArray(data)) {
            return {
                types_objets_demandes: typesObjets,
                nombre_types_taches: data.length,
                types_taches: data
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
            body: JSON.stringify(data)
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
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de la modification du type de tâche');
        }
        return response.json();
    },

    async deleteTypeTache(id: number): Promise<void> {
        const response = await apiFetch(`${BASE_URL}/types-taches/${id}/`, {
            method: 'DELETE'
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
            apiFetch(`${BASE_URL}/types-taches/${id}/`).then(r => {
                if (!r.ok) throw new Error('Type de tâche non trouvé');
                return r.json();
            }),
            this.getRatios({ type_tache_id: id })
        ]);
        return { ...typeTache, ratios };
    },

    /**
     * Sauvegarde un type de tâche avec ses ratios de productivité.
     * Crée/met à jour/supprime les ratios selon la configuration fournie.
     */
    async saveTypeTacheWithRatios(
        typeTacheData: TypeTacheCreate,
        ratiosConfig: Array<{ type_objet: string; ratio: number; unite_mesure: UniteMesure; actif: boolean }>,
        typeTacheId?: number
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
            const existingRatio = existingRatios.find(r => r.type_objet === config.type_objet);

            if (existingRatio) {
                // Mettre à jour le ratio existant
                await this.updateRatio(existingRatio.id, {
                    ratio: config.ratio,
                    unite_mesure: config.unite_mesure,
                    actif: config.actif
                });
            } else if (config.actif) {
                // Créer un nouveau ratio seulement si actif
                await this.createRatio({
                    id_type_tache: typeTache.id,
                    type_objet: config.type_objet,
                    ratio: config.ratio,
                    unite_mesure: config.unite_mesure,
                    actif: true
                });
            }
        }

        // 4. Supprimer les ratios qui ne sont plus dans la config
        const configTypeObjets = new Set(ratiosConfig.filter(c => c.actif).map(c => c.type_objet));
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
            body: JSON.stringify(data)
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
        }
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
            body: JSON.stringify(updateData)
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
    async validerTache(tacheId: number, etat: 'VALIDEE' | 'REJETEE', commentaire?: string): Promise<{
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
            body: JSON.stringify({ etat, commentaire: commentaire || '' })
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de la validation');
        }
        return response.json();
    },

    // --- CHARGE ESTIMEE ---

    async resetCharge(tacheId: number): Promise<{ charge_estimee_heures: number | null; charge_manuelle: boolean }> {
        const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/reset_charge/`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Erreur lors du recalcul de la charge');
        return response.json();
    },

    // --- RATIOS DE PRODUCTIVITE ---

    async getRatios(params: { type_tache_id?: number; type_objet?: string; actif?: boolean } = {}): Promise<RatioProductivite[]> {
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

    async getRatiosPaginated(page: number = 1, params: { search?: string; type_tache_id?: number; type_objet?: string } = {}): Promise<{ results: RatioProductivite[]; count: number; next: string | null; previous: string | null }> {
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
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de la création du ratio');
        }
        return response.json();
    },

    async updateRatio(id: number, data: Partial<RatioProductiviteCreate>): Promise<RatioProductivite> {
        const response = await apiFetch(`${BASE_URL}/ratios-productivite/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Erreur modification ratio');
        return response.json();
    },

    async deleteRatio(id: number): Promise<void> {
        const response = await apiFetch(`${BASE_URL}/ratios-productivite/${id}/`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erreur suppression ratio');
    },

    // --- DISTRIBUTION DE CHARGE ---

    /**
     * Met à jour les distributions de charge pour une tâche.
     * Permet de définir les jours de travail sélectionnés depuis le modal.
     *
     * @param tacheId - ID de la tâche
     * @param distributions - Liste des distributions avec date, heure_debut, heure_fin
     * @returns Réponse avec les distributions créées
     */
    async updateDistributions(tacheId: number, distributions: Array<{
        date: string;
        heure_debut: string;
        heure_fin: string;
        commentaire?: string;
    }>): Promise<{
        message: string;
        distributions: any[];
        total_heures: number;
        nombre_jours: number;
    }> {
        const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/update_distributions/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ distributions })
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de la mise à jour des distributions');
        }

        return response.json();
    },

    /**
     * Met à jour une distribution spécifique (date et heures de travail).
     * @param tacheId - ID de la tâche (non utilisé dans l'URL mais conservé pour compatibilité)
     * @param distributionId - ID de la distribution à modifier
     * @param data - Données à mettre à jour
     * @returns Distribution mise à jour
     */
    async updateSingleDistribution(
        tacheId: number,
        distributionId: number,
        data: {
            date: string;
            heure_debut: string;
            heure_fin: string;
            commentaire?: string;
        }
    ): Promise<{
        message: string;
        distribution: any;
    }> {
        const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de la mise à jour de la distribution');
        }

        return response.json();
    },

    /**
     * Marque une distribution de charge comme réalisée.
     *
     * @param distributionId - ID de la distribution
     * @param heuresReelles - Heures réellement travaillées (optionnel)
     * @returns Distribution mise à jour
     */
    async marquerDistributionRealisee(distributionId: number, heuresReelles?: number): Promise<any> {
        const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/marquer-realisee/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ heures_reelles: heuresReelles })
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors du marquage de la distribution');
        }

        return response.json();
    },

    /**
     * Marque une distribution comme non réalisée.
     *
     * @param distributionId - ID de la distribution
     * @returns Distribution mise à jour
     */
    async marquerDistributionNonRealisee(distributionId: number): Promise<any> {
        const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/marquer-non-realisee/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors du marquage de la distribution comme non réalisée');
        }

        return response.json();
    },

    /**
     * Supprime une distribution.
     *
     * @param distributionId - ID de la distribution à supprimer
     * @returns Promise<void>
     */
    async deleteDistribution(distributionId: number): Promise<void> {
        const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de la suppression de la distribution');
        }
    },

    /**
     * Crée une nouvelle distribution.
     *
     * @param data - Données de la distribution à créer
     * @returns Distribution créée
     */
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
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de la création de la distribution');
        }

        return response.json();
    },

    // ============================================================================
    // ACTIONS DE STATUT DES DISTRIBUTIONS (Nouveau système 6 statuts)
    // ============================================================================

    /**
     * Récupère les distributions avec filtres avancés.
     *
     * Filtres disponibles :
     * - Statut: status, status__in, actif, termine (✅ SIMPLIFIÉ: Plus de en_retard)
     * - Date: date, date__gte, date__lte, date_debut, date_fin, aujourd_hui, semaine_courante
     * - Relations: tache, equipe, site, structure, type_tache
     * - Priorité: priorite, priorite__gte, urgent
     * - Reports: est_report, a_remplacement
     * - Texte: search
     * - Tri: ordering
     *
     * @param params - Filtres optionnels
     * @returns Liste des distributions
     */
    async getDistributions(params: DistributionFilters = {}): Promise<DistributionCharge[]> {
        const query = new URLSearchParams();

        // Filtres par tâche
        if (params.tache) query.append('tache', params.tache.toString());
        if (params.tache_reference) query.append('tache__reference', params.tache_reference);

        // Filtres par date (exact)
        if (params.date) query.append('date', params.date);

        // Filtres par date (période)
        if (params.date_debut) query.append('date__gte', params.date_debut);
        if (params.date_fin) query.append('date__lte', params.date_fin);

        // Filtres par date (relatifs)
        if (params.aujourd_hui) query.append('aujourd_hui', 'true');
        if (params.semaine_courante) query.append('semaine_courante', 'true');

        // Filtres par statut
        if (params.status) query.append('status', params.status);
        if (params.status_in && params.status_in.length > 0) {
            query.append('status__in', params.status_in.join(','));
        }

        // Raccourcis statut (✅ SIMPLIFIÉ: Plus de en_retard)
        if (params.actif !== undefined) query.append('actif', params.actif.toString());
        if (params.termine !== undefined) query.append('termine', params.termine.toString());

        // Filtres par équipe/site/structure
        if (params.equipe) query.append('equipe', params.equipe.toString());
        if (params.site) query.append('site', params.site.toString());
        if (params.site_nom) query.append('site__nom', params.site_nom);
        if (params.structure) query.append('structure', params.structure.toString());

        // Filtres par type de tâche
        if (params.type_tache) query.append('type_tache', params.type_tache.toString());
        if (params.type_tache_nom) query.append('type_tache__nom', params.type_tache_nom);

        // Filtres par priorité
        if (params.priorite) query.append('priorite', params.priorite.toString());
        if (params.priorite_min) query.append('priorite__gte', params.priorite_min.toString());
        if (params.urgent !== undefined) query.append('urgent', params.urgent.toString());

        // Filtres pour les reports
        if (params.est_report !== undefined) query.append('est_report', params.est_report.toString());
        if (params.a_remplacement !== undefined) query.append('a_remplacement', params.a_remplacement.toString());

        // Filtres par motif
        if (params.motif) query.append('motif', params.motif);

        // Recherche textuelle
        if (params.search) query.append('search', params.search);

        // Tri
        if (params.ordering) query.append('ordering', params.ordering);

        const queryString = query.toString();
        const url = queryString ? `${BASE_URL}/distributions/?${queryString}` : `${BASE_URL}/distributions/`;

        const response = await apiFetch(url);
        if (!response.ok) throw new Error('Erreur chargement distributions');

        const data = await response.json();
        return Array.isArray(data) ? data : (data.results || []);
    },

    /**
     * Récupère les distributions pour une date donnée avec les détails des tâches.
     * Endpoint optimisé pour la vue "Distributions par jour".
     *
     * @param date - Date au format YYYY-MM-DD
     * @returns Distributions enrichies avec infos tâches + statistiques
     */
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

    /**
     * Démarre une distribution (NON_REALISEE → EN_COURS).
     * ✅ SIMPLIFIÉ: Plus de EN_RETARD
     *
     * @param distributionId - ID de la distribution
     * @param data - Données optionnelles (heure réelle de début)
     * @returns Distribution mise à jour avec infos de synchronisation tâche
     */
    async demarrerDistribution(
        distributionId: number,
        data?: {
            heure_debut_reelle?: string;  // "HH:MM"
            date_debut_reelle?: string;   // "YYYY-MM-DD" - Date réelle de début de la tâche
        }
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
            body: JSON.stringify(data || {})
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors du démarrage de la distribution');
        }

        return response.json();
    },

    /**
     * Termine une distribution (EN_COURS → REALISEE).
     *
     * @param distributionId - ID de la distribution
     * @param data - Données optionnelles (heures réelles terrain)
     * @returns Distribution mise à jour avec infos de synchronisation tâche
     */
    async terminerDistribution(
        distributionId: number,
        data?: {
            heure_debut_reelle?: string;  // "HH:MM"
            heure_fin_reelle?: string;    // "HH:MM"
            heures_reelles?: number;      // Override manuel
            date_fin_reelle?: string;     // "YYYY-MM-DD" - Date réelle de fin de la tâche
        }
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
            body: JSON.stringify(data || {})
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de la terminaison de la distribution');
        }

        return response.json();
    },

    /**
     * Reporte une distribution à une nouvelle date.
     * Crée automatiquement une nouvelle distribution liée.
     *
     * @param distributionId - ID de la distribution à reporter
     * @param nouvelleDate - Nouvelle date (YYYY-MM-DD)
     * @param motif - Motif du report
     * @param commentaire - Commentaire optionnel
     * @returns Distribution originale + nouvelle distribution créée
     */
    async reporterDistribution(
        distributionId: number,
        nouvelleDate: string,
        motif: MotifDistribution,
        commentaire?: string
    ): Promise<ReporterDistributionResponse> {
        const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/reporter/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nouvelle_date: nouvelleDate,
                motif,
                commentaire: commentaire || ''
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors du report de la distribution');
        }

        return response.json();
    },

    /**
     * Annule une distribution.
     *
     * @param distributionId - ID de la distribution
     * @param motif - Motif de l'annulation
     * @param commentaire - Commentaire optionnel
     * @returns Distribution mise à jour avec infos de synchronisation tâche
     */
    async annulerDistribution(
        distributionId: number,
        motif: MotifDistribution,
        commentaire?: string
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
            body: JSON.stringify({ motif, commentaire: commentaire || '' })
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de l\'annulation de la distribution');
        }

        return response.json();
    },

    /**
     * Restaure une distribution annulée (ANNULEE → NON_REALISEE).
     *
     * @param distributionId - ID de la distribution
     * @returns Distribution mise à jour avec infos de synchronisation tâche
     */
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
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors de la restauration de la distribution');
        }

        return response.json();
    },

    /**
     * Récupère l'historique complet des reports pour une distribution.
     *
     * @param distributionId - ID de la distribution
     * @returns Chaîne complète des reports
     */
    async getHistoriqueDistribution(distributionId: number): Promise<HistoriqueDistributionResponse> {
        const response = await apiFetch(`${BASE_URL}/distributions/${distributionId}/historique/`);

        if (!response.ok) {
            const error = await response.json();
            throw parseValidationError(error, 'Erreur lors du chargement de l\'historique');
        }

        return response.json();
    },

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
    async dupliquerTache(tacheId: number, params: {
        decalage_jours: number;
        nombre_occurrences?: number;
        date_fin_recurrence?: string;
        conserver_equipes?: boolean;
        conserver_objets?: boolean;
    }): Promise<any> {
        console.log(`🔵 [planningService] dupliquerTache - tacheId: ${tacheId}, params:`, params);

        const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/dupliquer/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        console.log(`🔵 [planningService] dupliquerTache - response.ok: ${response.ok}, status: ${response.status}`);

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ [planningService] dupliquerTache - erreur:', error);
            throw new Error(error.error || error.detail || 'Erreur lors de la duplication de la tâche');
        }

        const result = await response.json();
        console.log('✅ [planningService] dupliquerTache - résultat:', result);
        return result;
    },

    /**
     * Duplique une tâche selon une fréquence prédéfinie.
     *
     * @param tacheId - ID de la tâche à dupliquer
     * @param params - Paramètres de récurrence
     * @returns Nouvelles tâches créées
     */
    async dupliquerTacheRecurrence(tacheId: number, params: {
        frequence: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
        nombre_occurrences?: number;
        date_fin_recurrence?: string;
        conserver_equipes?: boolean;
        conserver_objets?: boolean;
    }): Promise<any> {
        console.log(`🔵 [planningService] dupliquerTacheRecurrence - tacheId: ${tacheId}, params:`, params);

        const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/dupliquer-recurrence/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        console.log(`🔵 [planningService] dupliquerTacheRecurrence - response.ok: ${response.ok}, status: ${response.status}`);

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ [planningService] dupliquerTacheRecurrence - erreur:', error);
            throw new Error(error.error || error.detail || 'Erreur lors de la duplication récurrente');
        }

        const result = await response.json();
        console.log('✅ [planningService] dupliquerTacheRecurrence - résultat:', result);
        return result;
    },

    /**
     * Duplique une tâche à des dates spécifiques.
     *
     * @param tacheId - ID de la tâche à dupliquer
     * @param params - Paramètres de duplication avec dates
     * @returns Nouvelles tâches créées
     */
    async dupliquerTacheDates(tacheId: number, params: {
        dates_cibles: string[];
        conserver_equipes?: boolean;
        conserver_objets?: boolean;
    }): Promise<any> {
        console.log(`🔵 [planningService] dupliquerTacheDates - tacheId: ${tacheId}, params:`, params);

        const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/dupliquer-dates/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        console.log(`🔵 [planningService] dupliquerTacheDates - response.ok: ${response.ok}, status: ${response.status}`);

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ [planningService] dupliquerTacheDates - erreur:', error);
            throw new Error(error.error || error.detail || 'Erreur lors de la duplication aux dates spécifiées');
        }

        const result = await response.json();
        console.log('✅ [planningService] dupliquerTacheDates - résultat:', result);
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
            headers: { 'Content-Type': 'application/json' }
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
        if (params.sync) {
            query.append('sync', 'true');
        }

        const response = await apiFetch(`${BASE_URL}/export/pdf/?${query.toString()}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors du lancement de l\'export PDF');
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
            throw new Error(error.error || 'Erreur lors de la vérification du statut de l\'export');
        }

        return response.json();
    }
};
