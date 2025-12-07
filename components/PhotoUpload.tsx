import React, { useRef, useState } from 'react';
import { Camera, X, Upload } from 'lucide-react';

export interface PhotoUploadProps {
    photos: string[];
    onPhotosChange: (photos: string[]) => void;
    maxPhotos?: number;
    label?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
    photos,
    onPhotosChange,
    maxPhotos = 5,
    label = 'Photos'
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);

        try {
            const newPhotos: string[] = [];

            for (let i = 0; i < files.length && photos.length + newPhotos.length < maxPhotos; i++) {
                const file = files[i];

                // Convert to base64 for mock storage
                const reader = new FileReader();
                const photoUrl = await new Promise<string>((resolve) => {
                    reader.onload = (e) => {
                        resolve(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                });

                newPhotos.push(photoUrl);
            }

            onPhotosChange([...photos, ...newPhotos]);
        } catch (error) {
            console.error('Error uploading photos:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemovePhoto = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        onPhotosChange(newPhotos);
    };

    const canAddMore = photos.length < maxPhotos;

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
                {label} {photos.length > 0 && `(${photos.length}/${maxPhotos})`}
            </label>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square">
                        <img
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border border-gray-200"
                        />
                        <button
                            onClick={() => handleRemovePhoto(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {/* Add Photo Button */}
                {canAddMore && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        ) : (
                            <>
                                <Camera className="w-8 h-8 text-gray-400" />
                                <span className="text-xs text-gray-500">Ajouter</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Info Text */}
            <p className="text-xs text-gray-500">
                {canAddMore
                    ? `Vous pouvez ajouter jusqu'à ${maxPhotos - photos.length} photo${maxPhotos - photos.length > 1 ? 's' : ''} supplémentaire${maxPhotos - photos.length > 1 ? 's' : ''}`
                    : `Limite de ${maxPhotos} photos atteinte`}
            </p>
        </div>
    );
};
