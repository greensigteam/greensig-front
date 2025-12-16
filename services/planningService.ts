import { apiFetch } from './apiFetch';
import { PaginatedResponse } from '../types/users';
import {
    Tache, TacheCreate, TacheUpdate,
    TypeTache, ParticipationCreate, ParticipationTache
} from '../types/planning';

const BASE_URL = '/api/planification';

export const planningService = {
    // --- TACHES ---

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
        const response = await apiFetch(`${BASE_URL}/taches/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erreur lors de la création de la tâche');
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

    // --- PARTICIPATION ---

    async addParticipation(tacheId: number, data: ParticipationCreate): Promise<ParticipationTache> {
        const response = await apiFetch(`${BASE_URL}/taches/${tacheId}/add_participation/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Erreur ajout participation');
        return response.json();
    }
};
