import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, LogOut, Sun, Database, FolderSync, RefreshCw, AlertCircle } from 'lucide-react';
import { db } from '../services/db';
import { autoSyncService, SyncStatus } from '../services/sync/autoSyncService';
import { fileSyncService } from '../services/sync/fileSyncService';

export const SettingsPage = () => {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Auto-sync state
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        enabled: false,
        folderName: null,
        lastSyncedAt: null,
        isSyncing: false,
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const [browserSupported, setBrowserSupported] = useState(true);

    // Initialize auto-sync on mount
    useEffect(() => {
        setBrowserSupported(fileSyncService.checkBrowserSupport());
        autoSyncService.initialize().then(() => {
            setSyncStatus(autoSyncService.getStatus());
        });

        // Subscribe to status changes
        autoSyncService.onStatusChange((status) => {
            setSyncStatus(status);
        });
    }, []);

    const handleEnableSync = async () => {
        try {
            setIsSyncing(true);
            const success = await autoSyncService.enableAutoSync();
            if (success) {
                alert('自動同期が有効になりました。');
            }
        } catch (error) {
            alert(`自動同期の有効化に失敗しました: ${(error as Error).message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDisableSync = async () => {
        if (!confirm('自動同期を無効化しますか？\n※フォルダへの保存は停止されますが、既存のバックアップファイルは削除されません。')) {
            return;
        }
        try {
            await autoSyncService.disableAutoSync();
            alert('自動同期が無効になりました。');
        } catch (error) {
            alert(`自動同期の無効化に失敗しました: ${(error as Error).message}`);
        }
    };

    const handleSyncNow = async () => {
        try {
            setIsSyncing(true);
            await autoSyncService.syncNow();
            alert('同期が完了しました。');
        } catch (error) {
            alert(`同期に失敗しました: ${(error as Error).message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLogout = async () => {
        if (confirm('ログアウトしますか？')) {
            await logout();
            navigate('/login');
        }
    };

    const handleExport = async () => {
        if (!user) return;
        setIsExporting(true);
        try {
            // 1. Fetch all data for user
            // Simplified: Exporting Profile and Cards
            const profiles = await db.myProfiles.where('userId').equals(user.id).toArray();
            const profileIds = profiles.map(p => p.id);
            const cards = await db.businessCards.where('profileId').anyOf(profileIds).toArray();
            const cardIds = cards.map(c => c.id);
            const images = await db.businessCardImages.where('cardId').anyOf(cardIds).toArray();

            // 2. Create JSON
            const data = {
                version: 1,
                exportedAt: new Date().toISOString(),
                user: { id: user.id, email: user.email }, // Metadata only
                profiles,
                cards,
                images // Warning: This can be huge due to Base64/Blob. 
                // Dexie stores blobs. JSON.stringify might fail on blobs unless converted.
                // For this MVP, we might need to convert Blobs to Base64 if not already.
                // Actually browser-image-compression result is Blob/File.
            };

            // Convert images to Base64 for JSON export
            const imagesBase64 = await Promise.all(images.map(async (img) => {
                const base64 = await blobToBase64(img.imageData as Blob);
                return { ...img, imageData: base64 };
            }));

            const exportData = { ...data, images: imagesBase64 };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `my_card_manager_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Export failed:', error);
            alert('バックアップの作成に失敗しました。');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('現在のデータを上書き（または追加）しますか？\n注意: 重複データはIDが同じ場合上書きされます。')) {
            return;
        }

        setIsImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.version || !data.profiles) {
                throw new Error('Invalid backup file format');
            }

            await db.transaction('rw', db.myProfiles, db.businessCards, db.businessCardImages, async () => {
                // Restore Profiles
                await db.myProfiles.bulkPut(data.profiles);
                // Restore Cards
                await db.businessCards.bulkPut(data.cards);
                // Restore Images (Convert Base64 back to Blob)
                if (data.images) {
                    const images = data.images.map((img: any) => ({
                        ...img,
                        imageData: base64ToBlob(img.imageData), // Need implementation
                        createdAt: new Date(img.createdAt) // fix Date parsing
                    }));
                    await db.businessCardImages.bulkPut(images);
                }
            });

            alert('データの復元が完了しました。');
            window.location.reload(); // Reload to refresh stores

        } catch (error) {
            console.error('Import failed:', error);
            alert('データの復元に失敗しました。ファイル形式を確認してください。');
        } finally {
            setIsImporting(false);
            e.target.value = ''; // Reset input
        }
    };

    // Helper: Blob to Base64
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Helper: Base64 to Blob
    const base64ToBlob = (base64: string): Blob => {
        const arr = base64.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">設定</h1>

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Theme Settings (Placeholder) */}
                    <div className="p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <Sun className="w-5 h-5 mr-2" />
                            表示設定
                        </h2>
                        <div className="flex items-center space-x-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                テーマ切り替え（OS設定に従います）
                            </p>
                        </div>
                    </div>

                    {/* Auto-Sync */}
                    <div className="p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <FolderSync className="w-5 h-5 mr-2" />
                            自動同期
                        </h2>

                        {!browserSupported ? (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-4">
                                <div className="flex">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
                                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                        <p className="font-medium mb-1">ブラウザ非対応</p>
                                        <p>
                                            自動同期機能はこのブラウザではご利用いただけません。
                                            Chrome または Edge をご利用ください。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {!syncStatus.enabled ? (
                                    <div>
                                        <button
                                            onClick={handleEnableSync}
                                            disabled={isSyncing}
                                            className="flex items-center text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                                        >
                                            <FolderSync className="w-4 h-4 mr-2" />
                                            {isSyncing ? '設定中...' : '同期フォルダを選択'}
                                        </button>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Googleドライブなどの同期フォルダを選択すると、自動的にバックアップが保存され、
                                            複数のデバイスでデータを同期できます。
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                                            <p className="text-sm text-green-700 dark:text-green-300">
                                                <span className="font-medium">同期フォルダ:</span> {syncStatus.folderName}
                                            </p>
                                            {syncStatus.lastSyncedAt && (
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                    最終同期: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex space-x-4">
                                            <button
                                                onClick={handleSyncNow}
                                                disabled={isSyncing}
                                                className="flex items-center text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                                            >
                                                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                                                {isSyncing ? '同期中...' : '今すぐ同期'}
                                            </button>

                                            <button
                                                onClick={handleDisableSync}
                                                className="flex items-center text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                                            >
                                                無効化
                                            </button>
                                        </div>

                                        <p className="text-xs text-gray-500">
                                            データ変更後、5秒後に自動的に同期フォルダへバックアップが保存されます。
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Data Management */}
                    <div className="p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <Database className="w-5 h-5 mr-2" />
                            データ管理
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="flex items-center text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    {isExporting ? 'バックアップ作成中...' : 'データをバックアップ（JSON）'}
                                </button>
                                <p className="mt-1 text-xs text-gray-500">
                                    登録した名刺データと画像をJSONファイルとしてダウンロードします。
                                </p>
                            </div>

                            <div>
                                <label className="flex items-center text-primary-600 hover:text-primary-700 font-medium cursor-pointer disabled:opacity-50">
                                    <Upload className="w-4 h-4 mr-2" />
                                    {isImporting ? '復元中...' : 'データを復元（インポート）'}
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImport}
                                        disabled={isImporting}
                                        className="hidden"
                                    />
                                </label>
                                <p className="mt-1 text-xs text-gray-500">
                                    バックアップファイルを読み込んでデータを復元します。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Account */}
                    <div className="p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 text-red-600 flex items-center">
                            <LogOut className="w-5 h-5 mr-2" />
                            アカウント
                        </h2>
                        <button
                            onClick={handleLogout}
                            className="w-full sm:w-auto px-4 py-2 border border-red-300 text-red-700 bg-white hover:bg-red-50 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-gray-600"
                        >
                            ログアウト
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
