import { db } from './index';
import { Tag } from '../../types/models';
import { autoSyncService } from '../sync/autoSyncService';

export const tagService = {
    async getAll(userId: string): Promise<Tag[]> {
        return await db.tags.where('userId').equals(userId).toArray();
    },

    async create(userId: string, name: string, color?: string): Promise<Tag> {
        const id = crypto.randomUUID();
        const tag: Tag = {
            id,
            userId,
            name,
            color,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await db.tags.add(tag);
        autoSyncService.autoSave();
        return tag;
    },

    async delete(tagId: string): Promise<void> {
        await db.transaction('rw', db.tags, db.cardTags, async () => {
            await db.cardTags.where('tagId').equals(tagId).delete();
            await db.tags.delete(tagId);
        });
        autoSyncService.autoSave();
    },

    async getTagsForCard(cardId: string): Promise<Tag[]> {
        const cardTags = await db.cardTags.where('cardId').equals(cardId).toArray();
        const tagIds = cardTags.map(ct => ct.tagId);
        return await db.tags.where('id').anyOf(tagIds).toArray();
    },

    async assignToCard(cardId: string, tagId: string): Promise<void> {
        const existing = await db.cardTags.get([cardId, tagId]);
        if (!existing) {
            await db.cardTags.add({
                cardId,
                tagId,
                createdAt: new Date()
            });
            autoSyncService.autoSave();
        }
    },

    async removeFromCard(cardId: string, tagId: string): Promise<void> {
        await db.cardTags.where({ cardId, tagId }).delete();
        autoSyncService.autoSave();
    }
};
