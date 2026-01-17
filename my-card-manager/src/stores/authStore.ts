import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/models';
import { authService } from '../services/auth/authService';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const { user, token } = await authService.login(email, password);
                    set({ user, token, isAuthenticated: true, isLoading: false });
                    return true;
                } catch (error) {
                    set({ error: (error as Error).message, isLoading: false });
                    return false;
                }
            },

            register: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    // Register automatically logs in? Or requires separate login?
                    // For now, let's auto-login after register in the service calls if needed, 
                    // but typically register just creates user.
                    // Let's assume register returns user, then we can auto-login or ask user to login.
                    // The authService.register returns User.

                    await authService.register(email, password);
                    // Auto login after register
                    const { user, token } = await authService.login(email, password);
                    set({ user, token, isAuthenticated: true, isLoading: false });
                    return true;
                } catch (error) {
                    set({ error: (error as Error).message, isLoading: false });
                    return false;
                }
            },

            logout: async () => {
                const { token } = get();
                if (token) {
                    await authService.logout(token);
                }
                set({ user: null, token: null, isAuthenticated: false });
            },

            checkSession: async () => {
                const { token } = get();
                if (!token) {
                    set({ isAuthenticated: false, user: null });
                    return;
                }
                try {
                    const user = await authService.checkSession(token);
                    if (user) {
                        set({ user, isAuthenticated: true });
                    } else {
                        set({ user: null, token: null, isAuthenticated: false });
                    }
                } catch (e) {
                    set({ user: null, token: null, isAuthenticated: false });
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token, isAuthenticated: state.isAuthenticated }),
        }
    )
);
