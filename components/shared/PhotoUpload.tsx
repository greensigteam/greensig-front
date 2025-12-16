import React, { useRef } from 'react';
import { Camera, X, Upload } from 'lucide-react';

interface PhotoUploadProps {
    photos: File[];
    onChange: (photos: File[]) => void;
    maxPhotos?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ photos, onChange, maxPhotos = 5 }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const validFiles = newFiles.filter(file => file.type.startsWith('image/'));

            const remainingSlots = maxPhotos - photos.length;
            const filesToAdd = validFiles.slice(0, remainingSlots);

            if (filesToAdd.length > 0) {
                onChange([...photos, ...filesToAdd]);
            }
        }
    };

    const removePhoto = (index: number) => {
        const newPhotos = [...photos];
        newPhotos.splice(index, 1);
        onChange(newPhotos);
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-4">
                {photos.map((photo, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                        <img
                            src={URL.createObjectURL(photo)}
                            alt={`Preview ${index}`}
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}

                {photos.length < maxPhotos && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition-colors bg-gray-50"
                    >
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-xs">Ajouter</span>
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
            <p className="text-xs text-gray-500">
                {photos.length} / {maxPhotos} photos. Formats acceptés : JPG, PNG.
            </p>
        </div>
    );
};
