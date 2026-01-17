import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export const PrivateRoute = () => {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export const PublicRoute = () => {
    const { isAuthenticated } = useAuthStore();
    return !isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};
