import { BusinessCard } from '../../types/models';
import { Building2, ArrowRight, Tags, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { tagService } from '../../services/db/tagService';
import { Tag } from '../../types/models';
import { StarRating } from '../common/StarRating';
import { useProfileStore } from '../../stores/profileStore';
import { BulkTagModal } from './BulkTagModal';
import { useCardStore } from '../../stores/cardStore';

interface CardListProps {
    cards: BusinessCard[];
}

export const CardList = ({ cards }: CardListProps) => {
    const { getProfileName } = useProfileStore();
    const { deleteCard, loadCards } = useCardStore();
    const { profiles } = useProfileStore();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showBulkTagModal, setShowBulkTagModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const toggleSelectAll = () => {
        if (selectedIds.length === cards.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(cards.map(c => c.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`${selectedIds.length}件の名刺を削除してもよろしいですか？`)) {
            for (const id of selectedIds) {
                await deleteCard(id);
            }
            setSelectedIds([]);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden flex flex-col">
            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-primary-50 dark:bg-primary-900/20 px-6 py-3 border-b border-primary-100 dark:border-primary-900/30 flex justify-between items-center animate-in slide-in-from-top duration-200">
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                        {selectedIds.length} 件選択中
                    </span>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowBulkTagModal(true)}
                            className="inline-flex items-center px-3 py-1.5 border border-primary-300 dark:border-primary-700 rounded-md text-xs font-medium text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                        >
                            <Tags className="w-3.5 h-3.5 mr-1.5" />
                            タグを付ける
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-900/50 rounded-md text-xs font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            一括削除
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    checked={selectedIds.length === cards.length && cards.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                名前 / 会社
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                自分の所属
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                役職 / 部署
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
                            <CardRow
                                key={`${card.id}-${refreshKey}`}
                                card={card}
                                isSelected={selectedIds.includes(card.id)}
                                onToggle={() => toggleSelect(card.id)}
                                profileName={getProfileName(card.profileId)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {showBulkTagModal && (
                <BulkTagModal
                    selectedCardIds={selectedIds}
                    onClose={() => setShowBulkTagModal(false)}
                    onSuccess={() => {
                        setShowBulkTagModal(false);
                        setSelectedIds([]);
                        setRefreshKey(prev => prev + 1);
                        loadCards(profiles.map(p => p.id));
                    }}
                />
            )}
        </div>
    );
};

const CardRow = ({
    card,
    isSelected,
    onToggle,
    profileName
}: {
    card: BusinessCard;
    isSelected: boolean;
    onToggle: () => void;
    profileName: string;
}) => {
    const [tags, setTags] = useState<Tag[]>([]);

    useEffect(() => {
        tagService.getTagsForCard(card.id).then(setTags);
    }, [card.id]);

    return (
        <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isSelected ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
            <td className="px-6 py-4 whitespace-nowrap">
                <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={isSelected}
                    onChange={onToggle}
                />
            </td>
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border dark:border-gray-600">
                    {profileName}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">{card.position}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{card.department}</div>
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
