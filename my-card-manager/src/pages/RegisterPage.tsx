import { RegisterForm } from '../components/auth/RegisterForm';

export const RegisterPage = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md">
                <h1 className="mb-8 text-4xl font-bold text-center text-primary-600">
                    My Card Manager
                </h1>
                <RegisterForm />
            </div>
        </div>
    );
};
