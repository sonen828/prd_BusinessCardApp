import { useEffect, useState } from 'react';
import { useCardStore } from '../stores/cardStore';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { CardGrid } from '../components/dashboard/CardGrid';
import { CardFilter } from '../components/dashboard/CardFilter';
import { CardList } from '../components/dashboard/CardList';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
    const { user } = useAuthStore();
    const { cards, loadCards, isLoading, filter } = useCardStore();
    const { profiles, loadProfiles } = useProfileStore();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // In a real app, we likely have a "current profile" context
    // For now, let's assume we load cards for the first profile or all user's cards?
    // The requirement says cards belong to a profile.
    // Let's assume we fetch the first profileId for now or pass a dummy one if we haven't implemented profile selection fully.
    // Actually, `cards` table has `profileId`. We need a way to select current profile.
    // Simplifying: Let's fetch all cards for the user (requires service update to filter by user's profiles) OR just use a hardcoded profileId for the MVP flow if profile creation is done.

    // TEMPORARY: To make it work without complex profile context, let's fetch strictly by profileId if available, else standard empty.
    // We need to fetch profiles first to get an ID.

    // For this phase, let's allow `cardService.search` to accept `null` for profileId to mean "search my profiles".
    // Or simpler: Just load user's default profile.

    useEffect(() => {
        const fetchAndLoad = async () => {
            if (user) {
                // 1. Load profiles using store
                await loadProfiles(user.id);
            }
        };
        fetchAndLoad();
    }, [user, loadProfiles]);

    useEffect(() => {
        if (user && profiles.length > 0) {
            // 2. Load cards for all profiles
            const profileIds = profiles.map(p => p.id);
            loadCards(profileIds);
        }
    }, [user, profiles, loadCards, filter]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        My Card Manager
                    </h1>
                    <div className="flex items-center space-x-4">
                        <Link to="/profiles" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                            所属管理
                        </Link>
                        <Link to="/settings" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                            設定
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
                    <div className="flex-1 max-w-lg">
                        <CardFilter />
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-1 flex items-center mr-2 border dark:border-gray-700">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p - 2 rounded - md transition - colors ${viewMode === 'grid'
                                        ? 'bg-gray-100 text-primary-600 dark:bg-gray-700 dark:text-primary-400'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    } `}
                                title="グリッド表示"
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p - 2 rounded - md transition - colors ${viewMode === 'list'
                                        ? 'bg-gray-100 text-primary-600 dark:bg-gray-700 dark:text-primary-400'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    } `}
                                title="リスト表示"
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>

                        <Link
                            to="/cards/batch"
                            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:border-gray-600 mr-2"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            一括登録
                        </Link>
                        <Link
                            to="/cards/new"
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            名刺を登録
                        </Link>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : cards.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            名刺がまだ登録されていません
                        </p>
                        <Link
                            to="/cards/new"
                            className="inline-flex items-center text-primary-600 hover:text-primary-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            最初の名刺を登録する
                        </Link>
                    </div>
                ) : viewMode === 'grid' ? (
                    <CardGrid cards={cards} />
                ) : (
                    <CardList cards={cards} />
                )}
            </main>
        </div>
    );
};
