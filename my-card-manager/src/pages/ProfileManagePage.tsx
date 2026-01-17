import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { profileService } from '../services/db/profileService';
import { MyProfile } from '../types/models';
import { ProfileForm } from '../components/profile/ProfileForm';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';

export const ProfileManagePage = () => {
    const { user } = useAuthStore();
    const [profiles, setProfiles] = useState<MyProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editTarget, setEditTarget] = useState<MyProfile | undefined>(undefined);

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

    const handleCreate = () => {
        setEditTarget(undefined);
        setIsEditing(true);
    };

    const handleEdit = (profile: MyProfile) => {
        setEditTarget(profile);
        setIsEditing(true);
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

    const handleSuccess = async () => {
        setIsEditing(false);
        setEditTarget(undefined);
        await loadProfiles();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link to="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            所属情報の管理
                        </h1>
                    </div>
                </div>

                {isEditing ? (
                    <ProfileForm
                        initialData={editTarget}
                        onSuccess={handleSuccess}
                        onCancel={() => setIsEditing(false)}
                    />
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                    登録済みの所属
                                </h2>
                                <button
                                    onClick={handleCreate}
                                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    新しい所属を追加
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="text-center py-8">Loading...</div>
                            ) : profiles.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    所属情報が登録されていません。<br />
                                    「新しい所属を追加」ボタンから登録してください。
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {profiles.map((profile) => (
                                        <div
                                            key={profile.id}
                                            className="p-4 border border-gray-200 rounded-lg dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                        {profile.companyName}
                                                    </h3>
                                                    <p className="text-primary-600 font-medium">
                                                        {profile.position || '役職なし'}
                                                    </p>
                                                    <div className="mt-4 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                                                        {profile.email && <p>{profile.email}</p>}
                                                        {profile.phone && <p>{profile.phone}</p>}
                                                        {profile.address && <p>{profile.address}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(profile)}
                                                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(profile.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full dark:hover:bg-red-900/30 transition-colors"
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
                    </div>
                )}
            </div>
        </div>
    );
};
