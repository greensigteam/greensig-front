import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, Link as LinkIcon } from 'lucide-react';
import type {
  StructureClient,
  StructureClientCreate,
  StructureClientUpdate,
} from '../../types/users';
import { updateStructure, createStructure } from '../../services/usersApi';
import { useToast } from '../../contexts/ToastContext';

interface StructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  structure?: StructureClient | null;
}

const StructureModal: React.FC<StructureModalProps> = ({ isOpen, onClose, onSave, structure }) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<StructureClientCreate>({
    nom: '',
    adresse: '',
    telephone: '',
    contactPrincipal: '',
    emailFacturation: '',
    logoUrl: '',
  });

  useEffect(() => {
    if (structure) {
      setFormData({
        nom: structure.nom,
        adresse: structure.adresse || '',
        telephone: structure.telephone || '',
        contactPrincipal: structure.contactPrincipal || '',
        emailFacturation: structure.emailFacturation || '',
        logoUrl: structure.logoUrl || '',
      });
      if (structure.logoDisplay) {
        setLogoPreview(structure.logoDisplay);
        setLogoMode(structure.logo ? 'upload' : 'url');
      } else {
        setLogoPreview(null);
        setLogoMode('upload');
      }
      setLogoFile(null);
    } else {
      setFormData({
        nom: '',
        adresse: '',
        telephone: '',
        contactPrincipal: '',
        emailFacturation: '',
        logoUrl: '',
      });
      setLogoFile(null);
      setLogoPreview(null);
      setLogoMode('upload');
    }
  }, [structure, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setFormData({ ...formData, logoUrl: '' });
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
      const dataToSend: StructureClientCreate = {
        ...formData,
        logo: logoFile || undefined,
      };

      if (structure) {
        await updateStructure(structure.id, dataToSend as StructureClientUpdate);
        showToast('Structure mise a jour', 'success');
      } else {
        await createStructure(dataToSend);
        showToast('Structure creee', 'success');
      }
      onSave();
      onClose();
    } catch (error: any) {
      showToast(error.message || "Erreur lors de l'enregistrement", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {structure ? 'Modifier la structure' : 'Nouvelle structure client'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la structure *
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Nom de l'organisation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <textarea
              value={formData.adresse}
              onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={2}
              placeholder="Adresse complete"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
              <input
                type="tel"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="+212 6 00 00 00 00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact principal
              </label>
              <input
                type="text"
                value={formData.contactPrincipal}
                onChange={(e) => setFormData({ ...formData, contactPrincipal: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Nom du contact"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de facturation
            </label>
            <input
              type="email"
              value={formData.emailFacturation}
              onChange={(e) => setFormData({ ...formData, emailFacturation: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="facturation@exemple.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>

            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setLogoMode('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  logoMode === 'upload'
                    ? 'bg-emerald-100 text-emerald-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Uploader
              </button>
              <button
                type="button"
                onClick={() => setLogoMode('url')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  logoMode === 'url'
                    ? 'bg-emerald-100 text-emerald-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                URL externe
              </button>
            </div>

            {logoMode === 'upload' ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
                >
                  {logoPreview ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-700">
                          {logoFile?.name || 'Logo actuel'}
                        </p>
                        <p className="text-xs text-gray-500">Cliquez pour changer</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Cliquez pour selectionner une image</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF jusqu'a 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={formData.logoUrl || ''}
                onChange={(e) => {
                  setFormData({ ...formData, logoUrl: e.target.value });
                  setLogoFile(null);
                  setLogoPreview(e.target.value || null);
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="https://exemple.com/logo.png"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {structure ? 'Mettre a jour' : 'Creer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StructureModal;
