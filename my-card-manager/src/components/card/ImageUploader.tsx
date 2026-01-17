import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploaderProps {
    onImageSelect: (file: File) => void;
    onClear: () => void;
    imagePreview: string | null;
}

export const ImageUploader = ({ onImageSelect, onClear, imagePreview }: ImageUploaderProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onImageSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onImageSelect(e.target.files[0]);
        }
    };

    return (
        <div className="w-full">
            {imagePreview ? (
                <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-64 object-contain bg-gray-100 rounded-lg dark:bg-gray-700" />
                    <button
                        type="button"
                        onClick={onClear}
                        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg h-64 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                            : 'border-gray-300 hover:border-primary-500 dark:border-gray-600'
                        }`}
                >
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        名刺画像をアップロード<br />
                        <span className="text-xs">(ドラッグ＆ドロップ または クリック)</span>
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            )}
        </div>
    );
};
