import { useState, useEffect } from 'react';
import { Tag } from '../../types/models';
import { tagService } from '../../services/db/tagService';
import { useAuthStore } from '../../stores/authStore';
import { X, Loader2 } from 'lucide-react';

interface BulkTagModalProps {
    selectedCardIds: string[];
    onClose: () => void;
    onSuccess: () => void;
}

export const BulkTagModal = ({ selectedCardIds, onClose, onSuccess }: BulkTagModalProps) => {
    const { user } = useAuthStore();
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [selectedTagId, setSelectedTagId] = useState<string>('');

    useEffect(() => {
        const fetchTags = async () => {
            if (user) {
                const tags = await tagService.getAll(user.id);
                setAllTags(tags);
                setIsLoading(false);
            }
        };
        fetchTags();
    }, [user]);

    const handleApply = async () => {
        let tagIdToApply = selectedTagId;

        if (!tagIdToApply && !newTagName.trim()) return;

        setIsSaving(true);
        try {
            if (!tagIdToApply && newTagName.trim()) {
                // Create new tag first
                const newTag = await tagService.create(user!.id, newTagName.trim());
                tagIdToApply = newTag.id;
            }

            await tagService.batchAssignToCards(selectedCardIds, tagIdToApply);
            onSuccess();
        } catch (error) {
            console.error('Failed to apply tags:', error);
            alert('タグの一括適用に失敗しました。');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        タグを一括適用 ({selectedCardIds.length}件)
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    既存のタグから選択
                                </label>
                                <select
                                    value={selectedTagId}
                                    onChange={(e) => {
                                        setSelectedTagId(e.target.value);
                                        if (e.target.value) setNewTagName('');
                                    }}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
                                >
                                    <option value="">選択してください...</option>
                                    {allTags.map(tag => (
                                        <option key={tag.id} value={tag.id}>{tag.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-sm text-gray-500">または</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    新しいタグを作成して適用
                                </label>
                                <input
                                    type="text"
                                    placeholder="タグ名を入力..."
                                    value={newTagName}
                                    onChange={(e) => {
                                        setNewTagName(e.target.value);
                                        if (e.target.value) setSelectedTagId('');
                                    }}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={isSaving || (!selectedTagId && !newTagName.trim())}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        適用する
                    </button>
                </div>
            </div>
        </div>
    );
};
