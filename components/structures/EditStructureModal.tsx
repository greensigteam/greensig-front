import React, { useState, useRef } from 'react';
import { X as XIcon, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { updateStructure } from '../../services/usersApi';
import type { StructureClientDetail } from '../../types/users';
import { useToast } from '../../contexts/ToastContext';

interface EditStructureModalProps {
  structure: StructureClientDetail;
  onClose: () => void;
  onSaved: () => void;
}

const EditStructureModal: React.FC<EditStructureModalProps> = ({ structure, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitialLogoMode = (): 'upload' | 'url' => {
    if (structure.logoUrl) return 'url';
    return 'upload';
  };

  const [logoMode, setLogoMode] = useState<'upload' | 'url'>(getInitialLogoMode());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState(structure.logoUrl || '');
  const [logoPreview, setLogoPreview] = useState<string | null>(structure.logoDisplay || null);

  const [formData, setFormData] = useState({
    nom: structure.nom,
    adresse: structure.adresse || '',
    telephone: structure.telephone || '',
    contactPrincipal: structure.contactPrincipal || '',
    emailFacturation: structure.emailFacturation || '',
    actif: structure.actif,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      showToast('Le nom de la structure est requis', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {
        nom: formData.nom,
        adresse: formData.adresse,
        telephone: formData.telephone,
        contactPrincipal: formData.contactPrincipal,
        emailFacturation: formData.emailFacturation,
        actif: formData.actif,
      };

      if (logoMode === 'upload' && logoFile) {
        updateData.logo = logoFile;
        updateData.logoUrl = null;
      } else if (logoMode === 'url') {
        updateData.logo = null;
        updateData.logoUrl = logoUrl || null;
      }

      await updateStructure(structure.id, updateData);
      showToast('Structure mise à jour', 'success');
      onSaved();
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Modifier la structure</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom de la structure *
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
            <textarea
              value={formData.adresse}
              onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact principal
              </label>
              <input
                type="text"
                value={formData.contactPrincipal}
                onChange={(e) => setFormData({ ...formData, contactPrincipal: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email de facturation
            </label>
            <input
              type="email"
              value={formData.emailFacturation}
              onChange={(e) => setFormData({ ...formData, emailFacturation: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setLogoMode('upload')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logoMode === 'upload'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => setLogoMode('url')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logoMode === 'url'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                URL
              </button>
            </div>

            {logoMode === 'upload' ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                {logoPreview && (
                  <div className="relative inline-block">
                    <img
                      src={logoPreview}
                      alt="Preview"
                      className="h-20 w-auto object-contain rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setLogoPreview(e.target.value || null);
                  }}
                  placeholder="https://exemple.com/logo.png"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                />
                {logoUrl && (
                  <div className="relative inline-block">
                    <img
                      src={logoUrl}
                      alt="Preview"
                      className="h-20 w-auto object-contain rounded-lg border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <input
              type="checkbox"
              id="actif-edit"
              checked={formData.actif}
              onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
            />
            <label htmlFor="actif-edit" className="text-sm text-slate-700 font-medium">
              Structure active
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStructureModal;
