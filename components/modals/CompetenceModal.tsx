import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Competence, CategorieCompetence, CATEGORIE_COMPETENCE_LABELS } from '../../types/users';
import { createCompetence, updateCompetence } from '../../services/usersApi';

interface CompetenceModalProps {
  initial?: Competence | null;
  onClose: () => void;
  onSaved: () => void;
}

const CompetenceModal: React.FC<CompetenceModalProps> = ({ initial = null, onClose, onSaved }) => {
  const [form, setForm] = useState<{
    nomCompetence: string;
    categorie: CategorieCompetence;
    description: string;
    ordreAffichage: number;
  }>({
    nomCompetence: initial?.nomCompetence || '',
    categorie: (initial?.categorie as CategorieCompetence) || 'TECHNIQUE',
    description: initial?.description || '',
    ordreAffichage: initial?.ordreAffichage || 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.nomCompetence.trim()) return setError('Le nom est requis');
    if (!form.categorie) return setError('La categorie est requise');

    setLoading(true);
    try {
      if (initial && initial.id) {
        await updateCompetence(initial.id, form);
      } else {
        await createCompetence(form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Erreur competence:', err);
      setError(err?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{initial ? 'Editer competence' : 'Nouvelle competence'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {error && <div className="p-2 bg-red-50 text-red-700 rounded">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
              <input
                value={form.nomCompetence}
                onChange={(e) => setForm({ ...form, nomCompetence: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categorie</label>
              <select
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value as CategorieCompetence })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {Object.entries(CATEGORIE_COMPETENCE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordre</label>
              <input
                type="number"
                value={form.ordreAffichage}
                onChange={(e) => setForm({ ...form, ordreAffichage: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg">{loading ? 'En cours...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompetenceModal;
