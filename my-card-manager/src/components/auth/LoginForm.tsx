import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';

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

            <div className="text-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">アカウントをお持ちでないですか？ </span>
                <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                    新規登録
                </Link>
            </div>
        </div>
    );
};
