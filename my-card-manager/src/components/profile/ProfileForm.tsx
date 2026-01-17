import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { profileService } from '../../services/db/profileService';
import { MyProfile } from '../../types/models';

interface ProfileFormProps {
    initialData?: MyProfile;
    onSuccess: () => void;
    onCancel: () => void;
}

export const ProfileForm = ({ initialData, onSuccess, onCancel }: ProfileFormProps) => {
    const { user } = useAuthStore();
    const [formData, setFormData] = useState<Partial<MyProfile>>(
        initialData || {
            companyName: '',
            position: '',
            email: '',
            phone: '',
            address: '',
            isCurrent: true,
        }
    );

    // Date conversion helpers
    const toDateString = (date?: Date) => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    };

    const fromDateString = (dateStr: string) => {
        return dateStr ? new Date(dateStr) : undefined;
    };
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);

        try {
            if (initialData?.id) {
                await profileService.update(initialData.id, formData);
            } else {
                await profileService.create({
                    ...formData as Omit<MyProfile, 'id' | 'createdAt' | 'updatedAt' | 'displayOrder'>,
                    userId: user.id,
                });
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {initialData ? '所属情報を編集' : '新しい所属を追加'}
            </h3>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">会社名 *</label>
                <input
                    type="text"
                    required
                    value={formData.companyName || ''}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">役職</label>
                <input
                    type="text"
                    value={formData.position || ''}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">電話番号</label>
                    <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">住所</label>
                <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
                />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                    <input
                        id="isCurrent"
                        type="checkbox"
                        checked={formData.isCurrent ?? false}
                        onChange={(e) => setFormData({
                            ...formData,
                            isCurrent: e.target.checked,
                            endDate: e.target.checked ? undefined : formData.endDate
                        })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isCurrent" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        現在も在籍中
                    </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">入社日（自）</label>
                        <input
                            type="date"
                            value={toDateString(formData.startDate)}
                            onChange={(e) => setFormData({ ...formData, startDate: fromDateString(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${formData.isCurrent ? 'opacity-50' : ''}`}>
                            退社日（至）
                        </label>
                        <input
                            type="date"
                            disabled={formData.isCurrent}
                            value={toDateString(formData.endDate)}
                            onChange={(e) => setFormData({ ...formData, endDate: fromDateString(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border disabled:bg-gray-100 dark:disabled:bg-gray-800"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                    キャンセル
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                    {isLoading ? '保存中...' : '保存'}
                </button>
            </div>
        </form>
    );
};
