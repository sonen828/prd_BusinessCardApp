import { db } from './index';
import { BusinessCard, BusinessCardImage, FilterConfig, SortConfig } from '../../types/models';
import { generateId } from '../../utils/crypto';
import imageCompression from 'browser-image-compression';
import { autoSyncService } from '../sync/autoSyncService';

export const cardService = {
    async getById(id: string): Promise<BusinessCard | undefined> {
        return db.businessCards.get(id);
    },

    async search(profileId: string | string[], filter: FilterConfig, sort: SortConfig): Promise<BusinessCard[]> {
        let collection;

        if (Array.isArray(profileId)) {
            collection = db.businessCards.where('profileId').anyOf(profileId);
        } else {
            collection = db.businessCards.where('profileId').equals(profileId);
        }

        // Filter by keyword (slow in IndexedDB without full text search, simple implementation for now)
        const keyword = filter.keyword?.toLowerCase();

        let results = await collection.toArray();

        if (keyword) {
            // Optimization: Fetch card IDs that have matching tags first
            const matchingTags = await db.tags
                .filter(tag => tag.name.toLowerCase().includes(keyword))
                .toArray();

            const matchingTagIds = matchingTags.map(t => t.id);

            let cardsWithMatchingTags = new Set<string>();
            if (matchingTagIds.length > 0) {
                const cardTags = await db.cardTags
                    .where('tagId')
                    .anyOf(matchingTagIds)
                    .toArray();
                cardTags.forEach(ct => cardsWithMatchingTags.add(ct.cardId));
            }

            results = results.filter(card =>
                card.personName.toLowerCase().includes(keyword) ||
                card.companyName.toLowerCase().includes(keyword) ||
                card.department?.toLowerCase().includes(keyword) ||
                card.email?.toLowerCase().includes(keyword) ||
                cardsWithMatchingTags.has(card.id)
            );
        }

        // Apply other filters
        if (filter.tagIds && filter.tagIds.length > 0) {
            // Need to join with cardTags. For now, skipping complex join filtering in memory
            // Ideally: get cardIds from cardTags where tagId is in filter.tagIds
        }

        // Sort
        results.sort((a, b) => {
            const valA = a[sort.field];
            const valB = b[sort.field];

            if (valA === undefined) return 1;
            if (valB === undefined) return -1;

            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return results;
    },

    async create(card: Omit<BusinessCard, 'id' | 'createdAt' | 'updatedAt'>, images?: File[]): Promise<BusinessCard> {
        const now = new Date();
        const newCard: BusinessCard = {
            ...card,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
        };

        await db.transaction('rw', db.businessCards, db.businessCardImages, async () => {
            await db.businessCards.add(newCard);

            if (images && images.length > 0) {
                await Promise.all(images.map((img, index) => this.saveImage(newCard.id, img, index === 0 ? 'front' : 'back', index)));
            }
        });

        // Trigger auto-sync
        autoSyncService.autoSave();

        return newCard;
    },

    async update(id: string, updates: Partial<BusinessCard>): Promise<void> {
        await db.businessCards.update(id, {
            ...updates,
            updatedAt: new Date(),
        });

        // Trigger auto-sync
        autoSyncService.autoSave();
    },

    async delete(id: string): Promise<void> {
        await db.transaction('rw', db.businessCards, db.businessCardImages, db.cardTags, async () => {
            await db.businessCards.delete(id);
            await db.businessCardImages.where('cardId').equals(id).delete();
            await db.cardTags.where('cardId').equals(id).delete();
        });

        // Trigger auto-sync
        autoSyncService.autoSave();
    },

    async saveImage(cardId: string, file: File, type: 'front' | 'back' | 'other', displayOrder: number): Promise<void> {
        // Compress image
        const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
        });

        const newImage: BusinessCardImage = {
            id: generateId(),
            cardId,
            imageData: compressedFile, // Dexie supports Blob/File storage
            imageType: type,
            displayOrder,
            createdAt: new Date(),
        };

        await db.businessCardImages.add(newImage);
    },

    async getImages(cardId: string): Promise<BusinessCardImage[]> {
        return db.businessCardImages.where('cardId').equals(cardId).sortBy('displayOrder');
    }
};
