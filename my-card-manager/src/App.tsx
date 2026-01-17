import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { autoSyncService } from './services/sync/autoSyncService';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Dashboard } from './pages/Dashboard';
import { ProfileManagePage } from './pages/ProfileManagePage';
import { SettingsPage } from './pages/SettingsPage';
import { CardRegisterPage } from './pages/CardRegisterPage';
import { BatchRegisterPage } from './pages/BatchRegisterPage';
import { CardDetailPage } from './pages/CardDetailPage';
import { PrivateRoute, PublicRoute } from './components/layout/RouteGuards';

export const App = () => {
  const { checkSession, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Initialize auto-sync on app startup
  useEffect(() => {
    if (isAuthenticated) {
      autoSyncService.initialize().then(() => {
        // Auto-load synced data if available
        autoSyncService.autoLoad();
      });
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Private Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profiles" element={<ProfileManagePage />} />
          <Route path="/cards/new" element={<CardRegisterPage />} />
          <Route path="/cards/batch" element={<BatchRegisterPage />} />
          <Route path="/cards/:id" element={<CardDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
