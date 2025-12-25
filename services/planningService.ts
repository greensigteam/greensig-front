import { apiFetch } from './apiFetch';
import { PaginatedResponse } from '../types/users';
import {
    Tache, TacheCreate, TacheUpdate,
    TypeTache, ParticipationCreate, ParticipationTache,
    RatioProductivite, RatioProductiviteCreate
} from '../types/planning';

const BASE_URL = '/api/planification';

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
        equipe_id?: number,
        page?: number,
        has_reclamation?: boolean
    } = {}): Promise<PaginatedResponse<Tache>> {
        const query = new URLSearchParams();
        if (params.start_date) query.append('start_date', params.start_date);
        if (params.end_date) query.append('end_date', params.end_date);
        if (params.client_id) query.append('client_id', params.client_id.toString());
        if (params.equipe_id) query.append('equipe_id', params.equipe_id.toString());
        if (params.page) query.append('page', params.page.toString());
        if (params.has_reclamation) query.append('has_reclamation', 'true');

        const response = await apiFetch(`${BASE_URL}/taches/?${query.toString()}`);
        if (!response.ok) throw new Error('Erreur lors du chargement des tâches');
        return response.json();
    },

    async getTache(id: number): Promise<Tache> {
        const response = await apiFetch(`${BASE_URL}/taches/${id}/`);
        if (!response.ok) throw new Error('Tâche non trouvée');
        return response.json();
    },

    async createTache(data: TacheCreate): Promise<Tache> {
        console.log('Creating task with data:', JSON.stringify(data, null, 2));
        const response = await apiFetch(`${BASE_URL}/taches/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            console.error('Task creation error response:', error);
            throw new Error(error.detail || JSON.stringify(error) || 'Erreur lors de la création de la tâche');
        }
        return response.json();
    },

    async updateTache(id: number, data: TacheUpdate): Promise<Tache> {
        const response = await apiFetch(`${BASE_URL}/taches/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Erreur modification tâche');
        return response.json();
    },

    async deleteTache(id: number): Promise<void> {
        const response = await apiFetch(`${BASE_URL}/taches/${id}/`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erreur suppression tâche');
    },

    // --- TYPES DE TACHES ---

    async getTypesTaches(): Promise<TypeTache[]> {
        // Pagination est possible, mais souvent on veut une liste complète pour les selects.
        // Si l'API pagine, on devrait gérer ça. Pour l'instant supposons une liste simple ou paginée.
        // Le backend ViewSet est paginé par défaut. On va demander une grosse page si besoin.
        const response = await apiFetch(`${BASE_URL}/types-taches/?page_size=100`);
        if (!response.ok) throw new Error('Erreur chargement types tâches');

        const data = await response.json();
        // Gestion souple : si array direct ou si format paginé
        if (Array.isArray(data)) return data;
        return data.results || [];
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
        return response.json();
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

    async createTypeTache(data: { nom_tache: string; description?: string }): Promise<TypeTache> {
        const response = await apiFetch(`${BASE_URL}/types-taches/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.nom_tache?.[0] || error.detail || 'Erreur lors de la création du type de tâche');
        }
        return response.json();
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
     */
    async changeStatut(tacheId: number, nouveauStatut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | 'PLANIFIEE'): Promise<Tache> {
        const updateData: TacheUpdate = { statut: nouveauStatut };

        // Gestion automatique des dates réelles
        if (nouveauStatut === 'EN_COURS') {
            updateData.date_debut_reelle = new Date().toISOString();
        } else if (nouveauStatut === 'TERMINEE') {
            updateData.date_fin_reelle = new Date().toISOString();
        }

        const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erreur lors du changement de statut');
        }
        return response.json();
    },

    // --- VALIDATION ADMIN ---

    /**
     * Valide ou rejette une tâche terminée (ADMIN uniquement).
     */
    async validerTache(tacheId: number, etat: 'VALIDEE' | 'REJETEE', commentaire?: string): Promise<{ message: string; tache: Tache }> {
        const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/valider/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ etat, commentaire: commentaire || '' })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la validation');
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
            throw new Error(error.detail || error.non_field_errors?.[0] || 'Erreur lors de la création du ratio');
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
    }
};
