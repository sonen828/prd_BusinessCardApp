import { db } from './index';
import { User, UserSetting } from '../../types/models';
import { generateId } from '../../utils/crypto';

export const userService = {
    async getByEmail(email: string): Promise<User | undefined> {
        return db.users.where('email').equals(email).first();
    },

    async getById(id: string): Promise<User | undefined> {
        return db.users.get(id);
    },

    async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
        const now = new Date();
        const newUser: User = {
            ...user,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
        };

        await db.transaction('rw', db.users, db.userSettings, async () => {
            await db.users.add(newUser);
            // Create default settings
            const defaultSettings: UserSetting = {
                id: generateId(),
                userId: newUser.id,
                sessionTimeout: 30,
                defaultPriority: 3,
                listPageSize: 50,
                theme: 'light',
                ocrLanguages: 'jpn+eng',
                enableAiFeatures: true,
                enableCompanyLookup: true,
                createdAt: now,
                updatedAt: now
            };
            await db.userSettings.add(defaultSettings);
        });

        return newUser;
    },

    async updateLastLogin(id: string): Promise<void> {
        await db.users.update(id, { lastLoginAt: new Date() });
    }
};
