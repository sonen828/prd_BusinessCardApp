import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';

export const RegisterForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const { register, isLoading, error } = useAuthStore();
    const navigate = useNavigate();

    const validatePassword = (pwd: string) => {
        // Basic check: 8 chars, 1 uppercase, 1 lowercase
        if (pwd.length < 8) return false;
        if (!/[A-Z]/.test(pwd)) return false;
        if (!/[a-z]/.test(pwd)) return false;
        // Number check omitted in simple regex but required by spec "numeric"
        if (!/[0-9]/.test(pwd)) return false;
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError(null);

        if (password !== confirmPassword) {
            setPasswordError('パスワードが一致しません');
            return;
        }

        if (!validatePassword(password)) {
            setPasswordError('パスワードは8文字以上で、大文字・小文字・数字を含めてください');
            return;
        }

        const success = await register(email, password);
        if (success) {
            navigate('/');
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md dark:bg-gray-800">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                新規登録
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
                        placeholder="8文字以上（英大文字・小文字・数字）"
                        required
                        autoComplete="new-password"
                    />
                </div>

                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        パスワード（確認）
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        placeholder="********"
                        required
                        autoComplete="new-password"
                    />
                    {passwordError && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordError}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2 font-bold text-white bg-primary-600 rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                    {isLoading ? '登録中...' : '登録する'}
                </button>
            </form>

            <div className="text-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">すでにアカウントをお持ちですか？ </span>
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                    ログイン
                </Link>
            </div>
        </div>
    );
};
