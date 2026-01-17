import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardStore } from '../stores/cardStore';
import { orchestrator } from '../services/skills';
import { ImageUploader } from '../components/card/ImageUploader';
import { BusinessCardData } from '../types/skills';
import { profileService } from '../services/db/profileService';
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';
import { MyProfile } from '../types/models';
import { ArrowLeft, Loader2, Star } from 'lucide-react';
import { StarRating } from '../components/common/StarRating';

export const CardRegisterPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { createCard } = useCardStore();
    const [profiles, setProfiles] = useState<MyProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [cardImage, setCardImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state (Sync with BusinessCardData)
    const [formData, setFormData] = useState<Partial<BusinessCardData>>({
        companyName: '',
        personName: '',
        email: '',
        phone: '',
    });
    const [priority, setPriority] = useState(3); // Default priority

    // Load available profiles
    useEffect(() => {
        const fetchProfiles = async () => {
            if (user) {
                const data = await profileService.getAll(user.id);
                setProfiles(data);
                if (data.length > 0) {
                    setSelectedProfileId(data[0].id);
                }
            }
        };
        fetchProfiles();
    }, [user]);

    const handleImageSelect = (file: File) => {
        setCardImage(file);
        setImagePreview(URL.createObjectURL(file));
        setError(null);
    };

    const handleOCR = async () => {
        if (!cardImage) return;

        setIsProcessing(true);
        setError(null);
        try {
            const result = await orchestrator.scanCard({
                image: cardImage,
                mimeType: cardImage.type as any,
                mode: 'local'
            });

            console.log('OCR Result:', result);

            if (result.data) {
                setFormData((prev: Partial<BusinessCardData>) => ({
                    ...prev,
                    companyName: result.data?.companyName || prev.companyName,
                    personName: result.data?.personName || prev.personName,
                    email: result.data?.email || prev.email,
                    phone: result.data?.phone || result.data?.mobile || prev.phone,
                    department: result.data?.department || prev.department,
                    position: result.data?.position || prev.position,
                }));
            } else {
                setError('OCR結果の解析に失敗しました（JSON形式ではありませんでした）。');
            }

        } catch (error) {
            console.error('OCR Failed:', error);
            const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
            setError(`名刺の読み取りに失敗しました。\n詳細: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfileId || !formData.companyName || !formData.personName) {
            setError('必須項目を入力してください（所属、会社名、氏名）');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            const success = await createCard({
                profileId: selectedProfileId,
                companyName: formData.companyName,
                personName: formData.personName,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                department: formData.department || undefined,
                position: formData.position || undefined,
                priority: priority,
            }, cardImage ? [cardImage] : undefined);

            if (success) {
                navigate('/');
            } else {
                setError('保存に失敗しました');
            }
        } catch (error) {
            console.error('Save failed:', error);
            setError('保存中にエラーが発生しました');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center">
                    <button onClick={() => navigate('/')} className="mr-4 text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        名刺を登録
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Image Upload & OCR */}
                    <div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-4">
                            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">名刺画像</h2>
                            <ImageUploader
                                onImageSelect={handleImageSelect}
                                onClear={() => {
                                    setCardImage(null);
                                    setImagePreview(null);
                                    setError(null);
                                }}
                                imagePreview={imagePreview}
                            />

                            {/* Error Message */}
                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 whitespace-pre-wrap">
                                    {error}
                                </div>
                            )}

                            {/* OCR Button */}
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={handleOCR}
                                    disabled={!cardImage || isProcessing}
                                    className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            読み取り中...
                                        </>
                                    ) : (
                                        '名刺を読み取る（AI-OCR）'
                                    )}
                                </button>
                                <p className="mt-2 text-xs text-gray-500 text-center">
                                    画像をアップロード後、ボタンを押すと自動入力されます
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div>
                        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm space-y-4">
                            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">登録情報</h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">保存先の所属 *</label>
                                {profiles.length === 0 ? (
                                    <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                        <p className="text-sm text-yellow-700 mb-2">
                                            保存先の所属（Myプロフィール）が登録されていません。
                                            名刺を管理するには、まず所属を作成してください。
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/profiles')}
                                            className="text-sm font-medium text-primary-600 hover:text-primary-700 underline"
                                        >
                                            所属を追加する
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        value={selectedProfileId}
                                        onChange={e => setSelectedProfileId(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        {profiles.map(p => (
                                            <option key={p.id} value={p.id}>{p.companyName}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">会社名 *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.companyName || ''}
                                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">部署</label>
                                    <input
                                        type="text"
                                        value={formData.department || ''}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">役職</label>
                                    <input
                                        type="text"
                                        value={formData.position || ''}
                                        onChange={e => setFormData({ ...formData, position: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">氏名 *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.personName || ''}
                                    onChange={e => setFormData({ ...formData, personName: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">電話番号</label>
                                <input
                                    type="tel"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            {/* Priority Rating */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                                    <Star className="w-4 h-4 mr-1" />
                                    優先度
                                </label>
                                <StarRating value={priority} onChange={setPriority} />
                                <p className="mt-1 text-xs text-gray-500">相手の重要度や親密度を設定できます</p>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving || isProcessing || profiles.length === 0}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? '保存中...' : '保存する'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
