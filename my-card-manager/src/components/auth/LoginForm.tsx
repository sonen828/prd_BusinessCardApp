import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { autoSyncService } from '../../services/sync/autoSyncService';
import { FolderSync } from 'lucide-react';

export const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading, error } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await login(email, password);
        if (success) {
            navigate('/');
        }
    };

    const handleRestore = async () => {
        try {
            const success = await autoSyncService.restoreFromBackup();
            if (success) {
                // Restoration success alert is handled inside the service
                // No redirect needed, user just stays on login page to login
            }
        } catch (error) {
            console.error('Restore handle failed:', error);
            alert(error instanceof Error ? error.message : '復元に失敗しました');
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md dark:bg-gray-800">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                ログイン
            </h2>

            {error && (
                <div className="p-4 text-sm text-red-700 bg-red-100 rounded dark:bg-red-900 dark:text-red-100">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        メールアドレス
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="example@mail.com"
                        required
                        autoComplete="username"
                    />
                </div>

                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        パスワード
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="********"
                        required
                        autoComplete="current-password"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2 font-bold text-white bg-primary-600 rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                    {isLoading ? 'ログイン中...' : 'ログイン'}
                </button>
            </form>

            <div className="text-center text-sm space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                    <span className="text-gray-600 dark:text-gray-400">アカウントをお持ちでないですか？ </span>
                    <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                        新規登録
                    </Link>
                </div>

                <div className="pt-2">
                    <p className="text-xs text-gray-500 mb-2">別のPCからデータを引き継ぎたい場合：</p>
                    <button
                        type="button"
                        onClick={handleRestore}
                        className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
                    >
                        <FolderSync className="w-4 h-4 mr-2" />
                        同期フォルダから復元
                    </button>
                </div>
            </div>
        </div>
    );
};
