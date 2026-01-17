import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { profileService } from '../../services/db/profileService';
import { MyProfile } from '../../types/models';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const ProfileList = () => {
    const { user } = useAuthStore();
    const [profiles, setProfiles] = useState<MyProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadProfiles();
    }, [user]);

    const loadProfiles = async () => {
        if (!user) return;
        try {
            const data = await profileService.getAll(user.id);
            setProfiles(data);
        } catch (error) {
            console.error('Failed to load profiles:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('本当に削除しますか？')) return;
        try {
            await profileService.delete(id);
            await loadProfiles();
        } catch (error) {
            console.error('Failed to delete profile:', error);
        }
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    登録済みの所属
                </h2>
                {/* Trigger Add Modal/Page (To be implemented) */}
                <button className="flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700">
                    <Plus className="w-4 h-4 mr-2" />
                    追加
                </button>
            </div>

            {profiles.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-lg shadow dark:bg-gray-800 text-gray-500">
                    所属情報が登録されていません
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {profiles.map((profile) => (
                        <div
                            key={profile.id}
                            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {profile.companyName}
                                    </h3>
                                    {profile.position && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {profile.position}
                                        </p>
                                    )}
                                    {(profile.startDate || profile.endDate || profile.isCurrent) && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {profile.startDate ? profile.startDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' }) : '????/??'}
                                            {' - '}
                                            {profile.isCurrent ? '現在' : (profile.endDate ? profile.endDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' }) : '????/??')}
                                        </p>
                                    )}
                                    {profile.email && (
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            {profile.email}
                                        </p>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        className="p-1 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                                        title="編集"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(profile.id)}
                                        className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                                        title="削除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
