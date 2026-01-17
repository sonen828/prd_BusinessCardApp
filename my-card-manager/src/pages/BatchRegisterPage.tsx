import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCardStore } from '../stores/cardStore';
import { orchestrator } from '../services/skills';
import { profileService } from '../services/db/profileService';
import { useAuthStore } from '../stores/authStore';
import { MyProfile } from '../types/models';

interface BatchItem {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'success' | 'error';
    message?: string;
    resultName?: string;
}

export const BatchRegisterPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { createCard } = useCardStore();

    const [profiles, setProfiles] = useState<MyProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load profiles
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

    // Handle folder selection
    const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newItems: BatchItem[] = [];
        Array.from(files).forEach((file) => {
            // Filter images
            if (file.type.startsWith('image/')) {
                newItems.push({
                    id: Math.random().toString(36).substring(7),
                    file,
                    status: 'pending'
                });
            }
        });

        setBatchItems(newItems);
        setProgress({ current: 0, total: newItems.length });
    };

    // Execute Batch Processing
    const startBatchProcessing = async () => {
        if (!selectedProfileId || batchItems.length === 0) return;

        setIsProcessing(true);
        let processedCount = 0;

        // Process sequentially to be safe with rate limits
        for (const item of batchItems) {
            if (item.status === 'success') {
                processedCount++;
                continue; // Skip already finished
            }

            // Update status to processing
            updateItemStatus(item.id, 'processing');

            try {
                // 1. OCR Scan
                const result = await orchestrator.scanCard({
                    image: item.file,
                    mimeType: item.file.type as any,
                    mode: 'local' // actually uses cloud if key is set
                });

                if (!result.data) {
                    throw new Error('JSON解析に失敗しました');
                }

                const data = result.data;
                const companyName = data.companyName;
                const personName = data.personName;

                if (!companyName || !personName) {
                    throw new Error('必須項目（会社名、氏名）が取得できませんでした');
                }

                // 2. Save to DB
                // Since this is a batch, we prioritize speed/automation over manual blocking.
                // We assume priority 3 (default)
                await createCard({
                    profileId: selectedProfileId,
                    companyName,
                    personName,
                    email: data.email || undefined,
                    phone: data.phone || data.mobile || undefined,
                    department: data.department || undefined,
                    position: data.position || undefined,
                    priority: 3
                }, [item.file]);

                updateItemStatus(item.id, 'success', undefined, `${companyName} / ${personName}`);

            } catch (error) {
                console.error(`Batch processing failed for ${item.file.name}:`, error);
                const msg = error instanceof Error ? error.message : 'Unknown error';
                updateItemStatus(item.id, 'error', msg);
            }

            processedCount++;
            setProgress(prev => ({ ...prev, current: processedCount }));

            // Small delay to be nice to API
            await new Promise(r => setTimeout(r, 1000));
        }

        setIsProcessing(false);
        alert('一括処理が完了しました');
    };

    const updateItemStatus = (id: string, status: BatchItem['status'], message?: string, resultName?: string) => {
        setBatchItems(prev => prev.map(item =>
            item.id === id ? { ...item, status, message, resultName } : item
        ));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center">
                    <button onClick={() => navigate('/')} className="mr-4 text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        名刺一括登録 (バッチ実行)
                    </h1>
                </div>

                {/* Controls Area */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">

                        {/* 1. Select Profile */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                保存先の所属 *
                            </label>
                            {profiles.length === 0 ? (
                                <p className="text-red-500 text-sm">所属を作成してください</p>
                            ) : (
                                <select
                                    value={selectedProfileId}
                                    onChange={e => setSelectedProfileId(e.target.value)}
                                    disabled={isProcessing}
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.companyName}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* 2. Select Folder */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                画像フォルダを選択
                            </label>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    // @ts-ignore - webkitdirectory is not standard but supported in most browsers
                                    webkitdirectory=""
                                    directory=""
                                    multiple
                                    className="hidden"
                                    onChange={handleFolderSelect}
                                    disabled={isProcessing}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isProcessing}
                                    className="flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:border-gray-600"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    フォルダを開く
                                </button>
                                <span className="text-sm text-gray-500">
                                    {batchItems.length > 0 ? `${batchItems.length} 件の画像を検出` : '未選択'}
                                </span>
                            </div>
                        </div>

                    </div>

                    {/* Start Button */}
                    <div className="mt-6 border-t pt-4 dark:border-gray-700">
                        <button
                            onClick={startBatchProcessing}
                            disabled={isProcessing || batchItems.length === 0 || !selectedProfileId}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    処理中 ({progress.current} / {progress.total})
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    一括登録を開始する
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Status List */}
                {batchItems.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">処理ステータス</h3>
                        </div>
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                            {batchItems.map(item => (
                                <li key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <div className="flex items-center min-w-0 flex-1">
                                        <div className="flex-shrink-0 mr-4">
                                            {item.status === 'pending' && <span className="w-6 h-6 rounded-full bg-gray-200 block" />}
                                            {item.status === 'processing' && <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />}
                                            {item.status === 'success' && <CheckCircle className="w-6 h-6 text-green-500" />}
                                            {item.status === 'error' && <XCircle className="w-6 h-6 text-red-500" />}
                                        </div>
                                        <div className="min-w-0 flex-1 px-4">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {item.file.name}
                                            </p>
                                            {item.resultName && (
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                    登録完了: {item.resultName}
                                                </p>
                                            )}
                                            {item.message && item.status === 'error' && (
                                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                    {item.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-shrink-0 text-sm text-gray-500">
                                        {(item.file.size / 1024).toFixed(1)} KB
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
