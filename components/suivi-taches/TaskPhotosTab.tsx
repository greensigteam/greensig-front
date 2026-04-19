import React, { useState } from 'react';
import { Camera, Loader2, FileImage, Eye, Trash2, ShieldCheck } from 'lucide-react';
import { Tache } from '../../types/planning';
import { PhotoList } from '../../types/suiviTaches';

// Helper pour construire l'URL complète des images
const getFullImageUrl = (url: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // ?? '' au lieu de || 'http://localhost:8000' : VITE_API_BASE_URL=/api donne ""
  // (falsy) en prod, ce qui causait un fallback vers localhost:8000 inaccessible depuis mobile
  const backendUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? '';
  return `${backendUrl}${url}`;
};

interface TaskPhotosTabProps {
  tache: Tache;
  photos: PhotoList[];
  loading: boolean;
  uploading: boolean;
  isClientView: boolean;
  onUpload: (files: FileList, photoType: 'AVANT' | 'APRES') => void;
  onDelete: (photoId: number) => void;
}

export const TaskPhotosTab: React.FC<TaskPhotosTabProps> = ({
  tache,
  photos,
  loading,
  uploading,
  isClientView,
  onUpload,
  onDelete,
}) => {
  const [selectedPhotoType, setSelectedPhotoType] = useState<'AVANT' | 'APRES'>('AVANT');
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);

  const isValidated =
    tache.statut === 'TERMINEE' &&
    (tache.etat_validation === 'VALIDEE' || tache.etat_validation === 'REJETEE');
  const canModify = !isClientView && !isValidated;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files, selectedPhotoType);
      e.target.value = '';
    }
  };

  const handleDeleteClick = async (photoId: number) => {
    try {
      await onDelete(photoId);
      setDeletingPhotoId(null);
    } catch {
      // Error handled in parent
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {canModify && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSelectedPhotoType('AVANT')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPhotoType === 'AVANT'
                  ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Avant
            </button>
            <button
              onClick={() => setSelectedPhotoType('APRES')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPhotoType === 'APRES'
                  ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Après
            </button>
          </div>
          <input
            type="file"
            id="photo-upload"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <label
            htmlFor="photo-upload"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            ) : (
              <>
                <Camera className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-600">Cliquez pour ajouter des photos</span>
              </>
            )}
          </label>
        </div>
      )}

      {/* Read-only message for validated tasks */}
      {!isClientView && isValidated && (
        <div
          className={`rounded-xl p-4 border flex items-start gap-3 ${
            tache.etat_validation === 'VALIDEE'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <ShieldCheck
            className={`w-5 h-5 mt-0.5 shrink-0 ${
              tache.etat_validation === 'VALIDEE' ? 'text-emerald-600' : 'text-red-600'
            }`}
          />
          <div>
            <h4
              className={`font-semibold text-sm ${
                tache.etat_validation === 'VALIDEE' ? 'text-emerald-800' : 'text-red-800'
              }`}
            >
              Tâche {tache.etat_validation === 'VALIDEE' ? 'validée' : 'rejetée'} - Lecture seule
            </h4>
            <p
              className={`text-sm mt-1 ${
                tache.etat_validation === 'VALIDEE' ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              Cette tâche est terminée et{' '}
              {tache.etat_validation === 'VALIDEE' ? 'validée' : 'rejetée'}. Les photos ne peuvent
              plus être modifiées.
            </p>
          </div>
        </div>
      )}

      {/* Photos Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <FileImage className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune photo</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
            >
              <img
                src={getFullImageUrl(photo.url_fichier)}
                alt={photo.legende || 'Photo'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a
                  href={getFullImageUrl(photo.url_fichier)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white"
                >
                  <Eye className="w-5 h-5" />
                </a>
                {canModify && (
                  <button
                    onClick={() => setDeletingPhotoId(photo.id)}
                    className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <span
                className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full ${
                  photo.type_photo === 'AVANT'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {photo.type_photo_display}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingPhotoId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Supprimer la photo ?</h3>
            <p className="text-sm text-slate-600 mb-4">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingPhotoId(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteClick(deletingPhotoId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskPhotosTab;
