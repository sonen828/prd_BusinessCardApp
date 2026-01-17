import { db } from './index';
import { MyProfile } from '../../types/models';
import { generateId } from '../../utils/crypto';

export const profileService = {
    async getAll(userId: string): Promise<MyProfile[]> {
        return db.myProfiles
            .where('userId')
            .equals(userId)
            .sortBy('displayOrder');
    },

    async getById(id: string): Promise<MyProfile | undefined> {
        return db.myProfiles.get(id);
    },

    async create(profile: Omit<MyProfile, 'id' | 'createdAt' | 'updatedAt' | 'displayOrder'>): Promise<MyProfile> {
        const now = new Date();

        // Calculate new display order
        const count = await db.myProfiles.where('userId').equals(profile.userId).count();

        const newProfile: MyProfile = {
            ...profile,
            id: generateId(),
            displayOrder: count + 1,
            createdAt: now,
            updatedAt: now,
        };

        await db.myProfiles.add(newProfile);
        return newProfile;
    },

    async update(id: string, updates: Partial<MyProfile>): Promise<void> {
        await db.myProfiles.update(id, {
            ...updates,
            updatedAt: new Date(),
        });
    },

    async delete(id: string): Promise<void> {
        await db.myProfiles.delete(id);
    },

    async reorder(profileIds: string[]): Promise<void> {
        await db.transaction('rw', db.myProfiles, async () => {
            const updates = profileIds.map((id, index) =>
                db.myProfiles.update(id, { displayOrder: index + 1 })
            );
            await Promise.all(updates);
        });
    }
};
