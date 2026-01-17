import { Search } from 'lucide-react';
import { useCardStore } from '../../stores/cardStore';

export const CardFilter = () => {
    const { filter, setFilter } = useCardStore();

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="名前、会社名、タグで検索..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={filter.keyword || ''}
                    onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
                />
            </div>
            {/* Future: Advanced filters (Tags, Industry, Date, etc.) */}
        </div>
    );
};
