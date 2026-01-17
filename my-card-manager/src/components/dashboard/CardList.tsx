import { BusinessCard } from '../../types/models';
import { Mail, Building2, MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { tagService } from '../../services/db/tagService';
import { Tag } from '../../types/models';
import { StarRating } from '../common/StarRating';

interface CardListProps {
    cards: BusinessCard[];
}

export const CardList = ({ cards }: CardListProps) => {
    // We need to fetch tags for each card to display them.
    // Ideally, tags should be joined in the query or fetched in batch.
    // For now, we'll fetch them individually or use a cached approach if available.
    // Let's do a simple fetch per card for the MVP list view, or better, 
    // update the specialized hook or component to handle this.

    // To minimize complexity, let's just create a sub-component row that handles its own tag fetching?
    // Or better, fetch all tags and match manually if dataset is small.
    // Let's go with the Row component approach for cleanliness.

    return (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                名前 / 会社
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                役職 / 部署
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                連絡先
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                タグ
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                優先度
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">詳細</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {cards.map((card) => (
                            <CardRow key={card.id} card={card} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const CardRow = ({ card }: { card: BusinessCard }) => {
    const [tags, setTags] = useState<Tag[]>([]);

    useEffect(() => {
        tagService.getTagsForCard(card.id).then(setTags);
    }, [card.id]);

    // Use specific store for image just like Grid? 
    // Or just fetch image? 
    // cardService.getImages(card.id) might be heavy for a list.
    // Ideally we have a thumbnail URL or similar. 
    // For now, let's skip the image in list view or fetch just the first one if really needed.
    // User asked for "Simple List View", maybe text only is cleaner or just a small avatar.
    // Let's skip image for performance in list view for now, or add a placeholder.

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                        {card.personName.charAt(0)}
                    </div>
                    <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {card.personName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <Building2 className="w-3 h-3 mr-1" />
                            {card.companyName}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">{card.position}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{card.department}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white flex items-center">
                    <Mail className="w-3 h-3 mr-1 text-gray-400" />
                    {card.email || '-'}
                </div>
                {card.address && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                        <span className="truncate max-w-[150px]" title={card.address}>{card.address}</span>
                    </div>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-wrap gap-1">
                    {tags.length > 0 ? (
                        tags.map(tag => (
                            <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {tag.name}
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-400 text-xs">-</span>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <StarRating value={card.priority} readonly size="sm" />
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link to={`/cards/${card.id}`} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300">
                    <ArrowRight className="w-5 h-5" />
                </Link>
            </td>
        </tr>
    );
};
