import { create } from 'zustand';
import { MyProfile } from '../types/models';
import { profileService } from '../services/db/profileService';

interface ProfileState {
    profiles: MyProfile[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadProfiles: (userId: string) => Promise<void>;
    getProfileName: (id: string) => string;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
    profiles: [],
    isLoading: false,
    error: null,

    loadProfiles: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const profiles = await profileService.getAll(userId);
            set({ profiles, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    getProfileName: (id: string) => {
        const profile = get().profiles.find(p => p.id === id);
        return profile ? profile.companyName : '不明な所属';
    }
}));
