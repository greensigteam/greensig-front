import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  apiFetch: vi.fn(),
}));

import {
  fetchProduits,
  fetchProduitById,
  createProduit,
  updateProduit,
  deleteProduit,
  fetchProduitsActifs,
  fetchProduitsExpiresBientot,
  softDeleteProduit,
  reactivateProduit,
  fetchMatieresActives,
  createMatiereActive,
  updateMatiereActive,
  deleteMatiereActive,
  fetchDoses,
  createDose,
  updateDose,
  deleteDose,
  fetchConsommations,
  fetchConsommationsParTache,
  createConsommation,
  deleteConsommation,
  fetchPhotos,
  fetchPhotosParTache,
  fetchPhotosAvant,
  fetchPhotosApres,
  createPhoto,
  updatePhoto,
  deletePhoto,
  fetchFertilisants,
  fetchFertilisantById,
  createFertilisant,
  deleteFertilisant,
  fetchFertilisantsActifs,
  fetchFertilisantsParType,
  softDeleteFertilisant,
  reactivateFertilisant,
  fetchRavageursMaladies,
  fetchRavageurMaladieById,
  createRavageurMaladie,
  updateRavageurMaladie,
  deleteRavageurMaladie,
  fetchRavageursMaladiesActifs,
  fetchRavageursMaladiesParCategorie,
  softDeleteRavageurMaladie,
  reactivateRavageurMaladie,
} from '../suiviTachesApi';
import { apiFetch } from '../api';

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

const okJson = (data: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data),
});
const errJson = (status: number, body?: unknown) => ({
  ok: false,
  status,
  json: () => (body ? Promise.resolve(body) : Promise.reject(new Error('no json'))),
});

describe('suiviTachesApi', () => {
  beforeEach(() => vi.clearAllMocks());

  // ---- Produits ----

  describe('produits', () => {
    it('fetchProduits with no params', async () => {
      mockApiFetch.mockResolvedValue(okJson({ results: [{ id: 1 }] }));
      const result = await fetchProduits();
      expect(result).toEqual([{ id: 1 }]);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/produits/');
    });

    it('fetchProduits builds query params', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchProduits({ actif: true, cible: 'GAZON', search: 'test' });
      const url = mockApiFetch.mock.calls[0]![0] as string;
      expect(url).toContain('actif=true');
      expect(url).toContain('cible=GAZON');
      expect(url).toContain('search=test');
    });

    it('fetchProduitById', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 5, nom: 'Produit A' }));
      const result = await fetchProduitById(5);
      expect(result).toEqual({ id: 5, nom: 'Produit A' });
    });

    it('createProduit sends POST', async () => {
      const payload = { nom: 'New' } as any;
      mockApiFetch.mockResolvedValue(okJson({ id: 1, ...payload }));
      await createProduit(payload);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });

    it('updateProduit sends PATCH', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await updateProduit(1, { nom: 'Updated' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('PATCH');
    });

    it('deleteProduit sends DELETE', async () => {
      mockApiFetch.mockResolvedValue({ ok: true, status: 204 });
      await deleteProduit(1);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('DELETE');
    });

    it('deleteProduit throws on error', async () => {
      mockApiFetch.mockResolvedValue({ ok: false, status: 500 });
      await expect(deleteProduit(1)).rejects.toThrow('Erreur lors de la suppression');
    });

    it('fetchProduitsActifs', async () => {
      mockApiFetch.mockResolvedValue(okJson([{ id: 1 }]));
      const result = await fetchProduitsActifs();
      expect(result).toEqual([{ id: 1 }]);
    });

    it('fetchProduitsExpiresBientot', async () => {
      mockApiFetch.mockResolvedValue(okJson({ results: [] }));
      const result = await fetchProduitsExpiresBientot();
      expect(result).toEqual([]);
    });

    it('softDeleteProduit sends POST', async () => {
      mockApiFetch.mockResolvedValue(okJson({ message: 'ok', produit: { id: 1 } }));
      const result = await softDeleteProduit(1);
      expect(result.message).toBe('ok');
    });

    it('reactivateProduit sends POST', async () => {
      mockApiFetch.mockResolvedValue(okJson({ message: 'ok', produit: { id: 1 } }));
      await reactivateProduit(1);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });
  });

  // ---- Matieres actives ----

  describe('matieres actives', () => {
    it('fetchMatieresActives without produitId', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchMatieresActives();
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/matieres-actives/');
      expect(mockApiFetch.mock.calls[0]![0] as string).not.toContain('?');
    });

    it('fetchMatieresActives with produitId', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchMatieresActives(3);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('produit=3');
    });

    it('createMatiereActive', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await createMatiereActive({ nom: 'test' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });

    it('updateMatiereActive', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await updateMatiereActive(1, { nom: 'x' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('PATCH');
    });

    it('deleteMatiereActive', async () => {
      mockApiFetch.mockResolvedValue({ ok: true, status: 204 });
      await deleteMatiereActive(1);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('DELETE');
    });
  });

  // ---- Doses ----

  describe('doses', () => {
    it('fetchDoses without produitId', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchDoses();
      expect(mockApiFetch.mock.calls[0]![0] as string).not.toContain('?');
    });

    it('fetchDoses with produitId', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchDoses(7);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('produit=7');
    });

    it('createDose', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await createDose({ produit: 1, dose: 5 } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });

    it('updateDose', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await updateDose(1, { dose: 10 } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('PATCH');
    });

    it('deleteDose throws on error', async () => {
      mockApiFetch.mockResolvedValue({ ok: false, status: 403 });
      await expect(deleteDose(1)).rejects.toThrow('Erreur lors de la suppression');
    });
  });

  // ---- Consommations ----

  describe('consommations', () => {
    it('fetchConsommations with params', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchConsommations({ tache: 1, produit: 2 });
      const url = mockApiFetch.mock.calls[0]![0] as string;
      expect(url).toContain('tache=1');
      expect(url).toContain('produit=2');
    });

    it('fetchConsommationsParTache', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchConsommationsParTache(42);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('tache_id=42');
    });

    it('createConsommation', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await createConsommation({ tache: 1, produit: 2 } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });

    it('deleteConsommation', async () => {
      mockApiFetch.mockResolvedValue({ ok: true, status: 204 });
      await deleteConsommation(5);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('DELETE');
    });
  });

  // ---- Photos ----

  describe('photos', () => {
    it('fetchPhotos with params', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchPhotos({ type_photo: 'AVANT', tache: 1 });
      const url = mockApiFetch.mock.calls[0]![0] as string;
      expect(url).toContain('type_photo=AVANT');
      expect(url).toContain('tache=1');
    });

    it('fetchPhotosParTache handles paginated response', async () => {
      mockApiFetch
        .mockResolvedValueOnce(
          okJson({ results: [{ id: 1 }], next: '/api/suivi-taches/photos/par_tache/?page=2' }),
        )
        .mockResolvedValueOnce(okJson({ results: [{ id: 2 }], next: null }));

      const result = await fetchPhotosParTache(1);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });

    it('fetchPhotosParTache handles non-paginated array', async () => {
      mockApiFetch.mockResolvedValue(okJson([{ id: 1 }, { id: 2 }]));
      const result = await fetchPhotosParTache(1);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('fetchPhotosAvant', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchPhotosAvant(10);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('tache_id=10');
    });

    it('fetchPhotosApres', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchPhotosApres(10);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('tache_id=10');
    });

    it('createPhoto sends FormData', async () => {
      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await createPhoto({ fichier: file, type_photo: 'AVANT', tache: 5 } as any);
      const [, opts] = mockApiFetch.mock.calls[0]!;
      expect(opts.method).toBe('POST');
      expect(opts.body).toBeInstanceOf(FormData);
    });

    it('updatePhoto sends PATCH with JSON', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await updatePhoto(1, { legende: 'New caption' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('PATCH');
    });

    it('deletePhoto throws on error', async () => {
      mockApiFetch.mockResolvedValue({ ok: false, status: 500 });
      await expect(deletePhoto(1)).rejects.toThrow('Erreur lors de la suppression');
    });
  });

  // ---- Fertilisants ----

  describe('fertilisants', () => {
    it('fetchFertilisants unwraps paginated', async () => {
      mockApiFetch.mockResolvedValue(okJson({ results: [{ id: 1 }] }));
      const result = await fetchFertilisants();
      expect(result).toEqual([{ id: 1 }]);
    });

    it('fetchFertilisants unwraps array', async () => {
      mockApiFetch.mockResolvedValue(okJson([{ id: 2 }]));
      const result = await fetchFertilisants();
      expect(result).toEqual([{ id: 2 }]);
    });

    it('fetchFertilisantById', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 3 }));
      const result = await fetchFertilisantById(3);
      expect(result).toEqual({ id: 3 });
    });

    it('createFertilisant', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await createFertilisant({ nom: 'F' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });

    it('deleteFertilisant', async () => {
      mockApiFetch.mockResolvedValue({ ok: true, status: 204 });
      await deleteFertilisant(1);
    });

    it('fetchFertilisantsActifs', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchFertilisantsActifs();
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/actifs/');
    });

    it('fetchFertilisantsParType', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchFertilisantsParType('ORGANIQUE' as any);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('type=ORGANIQUE');
    });

    it('softDeleteFertilisant', async () => {
      mockApiFetch.mockResolvedValue(okJson({ message: 'ok', fertilisant: { id: 1 } }));
      const result = await softDeleteFertilisant(1);
      expect(result.message).toBe('ok');
    });

    it('reactivateFertilisant', async () => {
      mockApiFetch.mockResolvedValue(okJson({ message: 'ok', fertilisant: { id: 1 } }));
      await reactivateFertilisant(1);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/reactivate/');
    });
  });

  // ---- Ravageurs & Maladies ----

  describe('ravageurs maladies', () => {
    it('fetchRavageursMaladies with params', async () => {
      mockApiFetch.mockResolvedValue(okJson({ results: [{ id: 1 }] }));
      await fetchRavageursMaladies({ categorie: 'INSECTE' as any, actif: true });
      const url = mockApiFetch.mock.calls[0]![0] as string;
      expect(url).toContain('categorie=INSECTE');
      expect(url).toContain('actif=true');
    });

    it('fetchRavageurMaladieById', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 5 }));
      const result = await fetchRavageurMaladieById(5);
      expect(result).toEqual({ id: 5 });
    });

    it('createRavageurMaladie', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await createRavageurMaladie({ nom: 'R' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });

    it('updateRavageurMaladie', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await updateRavageurMaladie(1, { nom: 'Updated' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('PATCH');
    });

    it('deleteRavageurMaladie', async () => {
      mockApiFetch.mockResolvedValue({ ok: true, status: 204 });
      await deleteRavageurMaladie(1);
    });

    it('fetchRavageursMaladiesActifs', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchRavageursMaladiesActifs();
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/actifs/');
    });

    it('fetchRavageursMaladiesParCategorie', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchRavageursMaladiesParCategorie('CHAMPIGNON' as any);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('categorie=CHAMPIGNON');
    });

    it('softDeleteRavageurMaladie', async () => {
      mockApiFetch.mockResolvedValue(okJson({ message: 'ok', ravageur_maladie: { id: 1 } }));
      await softDeleteRavageurMaladie(1);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/soft_delete/');
    });

    it('reactivateRavageurMaladie', async () => {
      mockApiFetch.mockResolvedValue(okJson({ message: 'ok', ravageur_maladie: { id: 1 } }));
      await reactivateRavageurMaladie(1);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/reactivate/');
    });
  });

  // ---- Error handling ----

  describe('handleResponse', () => {
    it('throws detail from error body', async () => {
      mockApiFetch.mockResolvedValue(errJson(400, { detail: 'Champ requis' }));
      await expect(fetchProduitById(1)).rejects.toThrow('Champ requis');
    });

    it('falls back to status code', async () => {
      mockApiFetch.mockResolvedValue(errJson(500, { other: 'err' }));
      await expect(fetchProduitById(1)).rejects.toThrow('Erreur 500');
    });

    it('falls back to Erreur réseau when json parse fails', async () => {
      mockApiFetch.mockResolvedValue(errJson(502));
      await expect(fetchProduitById(1)).rejects.toThrow('Erreur réseau');
    });
  });
});
