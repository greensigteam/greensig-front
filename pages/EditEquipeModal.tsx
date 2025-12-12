import React, { useState } from 'react';
import { EquipeList, EquipeUpdate } from '../types/users';
import { updateEquipe } from '../services/usersApi';

interface EditEquipeModalProps {
  equipe: EquipeList;
  onClose: () => void;
  onSaved: () => void;
}

const EditEquipeModal: React.FC<EditEquipeModalProps> = ({ equipe, onClose, onSaved }) => {
  const [form, setForm] = useState<EquipeUpdate>({
    nomEquipe: equipe.nomEquipe,
    chefEquipe: equipe.chefEquipe,
    specialite: equipe.specialite,
    actif: equipe.actif,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | boolean = value;
    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    }
    setForm(f => ({
      ...f,
      [name]: newValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateEquipe(equipe.id, form);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-4">
        <h2 className="text-lg font-bold">Modifier l'équipe</h2>
        <label className="flex flex-col gap-1">
          <span>Nom</span>
          <input name="nomEquipe" value={form.nomEquipe || ''} onChange={handleChange} className="border rounded px-2 py-1" required />
        </label>
        <label className="flex flex-col gap-1">
          <span>Spécialité</span>
          <input name="specialite" value={form.specialite || ''} onChange={handleChange} className="border rounded px-2 py-1" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="actif" checked={!!form.actif} onChange={handleChange} />
          <span>Active</span>
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2 justify-end">
          <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={onClose} disabled={loading}>Annuler</button>
          <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded" disabled={loading}>Enregistrer</button>
        </div>
      </form>
    </div>
  );
};

export default EditEquipeModal;