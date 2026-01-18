import { create } from 'zustand';
import { BusinessCard, FilterConfig, SortConfig, BusinessCardImage } from '../types/models';
import { cardService } from '../services/db/cardService';

interface CardState {
    cards: BusinessCard[];
    selectedCard: BusinessCard | null;
    selectedCardImages: BusinessCardImage[];
    isLoading: boolean;
    error: string | null;

    filter: FilterConfig;
    sort: SortConfig;

    // Actions
    loadCards: (profileId: string | string[]) => Promise<void>;
    loadCardDetail: (id: string) => Promise<void>;
    createCard: (card: Omit<BusinessCard, 'id' | 'createdAt' | 'updatedAt'>, images?: File[]) => Promise<boolean>;
    updateCard: (id: string, updates: Partial<BusinessCard>) => Promise<boolean>;
    deleteCard: (id: string) => Promise<boolean>;
    setFilter: (filter: FilterConfig) => void;
    setSort: (sort: SortConfig) => void;
    clearSelection: () => void;
    uploadImage: (cardId: string, file: File) => Promise<boolean>;
    deleteImage: (imageId: string) => Promise<boolean>;
}

export const useCardStore = create<CardState>((set, get) => ({
    cards: [],
    selectedCard: null,
    selectedCardImages: [],
    isLoading: false,
    error: null,

    filter: { keyword: '' },
    sort: { field: 'createdAt', direction: 'desc' },

    loadCards: async (profileId: string | string[]) => {
        set({ isLoading: true, error: null });
        try {
            const { filter, sort } = get();
            const cards = await cardService.search(profileId, filter, sort);
            set({ cards, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    loadCardDetail: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const card = await cardService.getById(id);
            if (card) {
                const images = await cardService.getImages(id);
                set({ selectedCard: card, selectedCardImages: images, isLoading: false });
            } else {
                set({ error: 'Card not found', isLoading: false });
            }
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createCard: async (card, images) => {
        set({ isLoading: true, error: null });
        try {
            await cardService.create(card, images);
            // Reload is handled by component usually, or we can refresh strictly if we track current profileId
            set({ isLoading: false });
            return true;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            return false;
        }
    },

    updateCard: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            await cardService.update(id, updates);
            set((state) => ({
                cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
                selectedCard: state.selectedCard?.id === id ? { ...state.selectedCard, ...updates } : state.selectedCard,
                isLoading: false,
            }));
            return true;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            return false;
        }
    },

    deleteCard: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await cardService.delete(id);
            set((state) => ({
                cards: state.cards.filter((c) => c.id !== id),
                selectedCard: null,
                selectedCardImages: [],
                isLoading: false,
            }));
            return true;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            return false;
        }
    },

    setFilter: (filter) => set({ filter }),
    setSort: (sort) => set({ sort }),
    clearSelection: () => set({ selectedCard: null, selectedCardImages: [] }),

    uploadImage: async (cardId: string, file: File) => {
        set({ isLoading: true, error: null });
        try {
            await cardService.saveImage(cardId, file, 'other', get().selectedCardImages.length);
            const images = await cardService.getImages(cardId);
            set({ selectedCardImages: images, isLoading: false });
            return true;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            return false;
        }
    },

    deleteImage: async (imageId: string) => {
        const cardId = get().selectedCard?.id;
        if (!cardId) return false;

        set({ isLoading: true, error: null });
        try {
            await cardService.deleteImage(imageId);
            const images = await cardService.getImages(cardId);
            set({ selectedCardImages: images, isLoading: false });
            return true;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            return false;
        }
    },
}));
