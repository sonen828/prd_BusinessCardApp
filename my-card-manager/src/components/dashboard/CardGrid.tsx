import { useNavigate } from 'react-router-dom';
import { BusinessCard } from '../../types/models';
import { Building2, Mail, Phone, Calendar } from 'lucide-react';
import { db } from '../../services/db'; // Import db to access images (simplified) or pass images as prop
import { useEffect, useState } from 'react';
import { StarRating } from '../common/StarRating';
import { useProfileStore } from '../../stores/profileStore';

interface CardGridProps {
    cards: BusinessCard[];
}

export const CardGrid = ({ cards }: CardGridProps) => {
    const navigate = useNavigate();
    const { getProfileName } = useProfileStore();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cards.map((card) => (
                <CardGridItem
                    key={card.id}
                    card={card}
                    profileName={getProfileName(card.profileId)}
                    onClick={() => navigate(`/cards/${card.id}`)}
                />
            ))}
        </div>
    );
};

const CardGridItem = ({
    card,
    profileName,
    onClick
}: {
    card: BusinessCard;
    profileName: string;
    onClick: () => void;
}) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);

    // Fetch implementation simplifies fetching the first image for thumbnail
    // Ideally this should be handled by a hook or optimized store query
    useEffect(() => {
        const fetchImage = async () => {
            const img = await db.businessCardImages.where('cardId').equals(card.id).first();
            if (img) {
                setImageSrc(URL.createObjectURL(img.imageData));
            }
        };
        fetchImage();
    }, [card.id]);

    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col"
        >
            <div className="h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden relative">
                {imageSrc ? (
                    <img src={imageSrc} alt="Business Card" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-gray-400">No Image</span>
                )}
                {card.priority === 5 && (
                    <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                        高
                    </span>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                        {card.personName}
                    </h3>
                    <div className="flex items-center space-x-2">
                        <p className="text-sm text-primary-600 font-medium truncate">
                            {card.title || card.position || '役職なし'}
                        </p>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border dark:border-gray-600 truncate max-w-[100px]" title={`自分の所属: ${profileName}`}>
                            {profileName}
                        </span>
                    </div>
                </div>

                <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400 flex-1">
                    <div className="flex items-center">
                        <Building2 className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{card.companyName}</span>
                    </div>
                    {card.email && (
                        <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{card.email}</span>
                        </div>
                    )}
                    {card.phone && (
                        <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{card.phone}</span>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-400">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>
                            {card.exchangeDate
                                ? new Date(card.exchangeDate).toLocaleDateString()
                                : '日付未設定'}
                        </span>
                    </div>
                    <StarRating value={card.priority} readonly size="sm" />
                </div>
            </div>
        </div>
    );
};
