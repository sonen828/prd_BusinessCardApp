import { db } from '../db'; // Correct path to db
import { Session } from '../../types/models';
import { generateId, generateToken } from '../../utils/crypto';

// Default timeout: 30 minutes
const DEFAULT_TIMEOUT_MINUTES = 30;

export const sessionService = {
    async createSession(userId: string): Promise<Session> {
        const now = new Date();
        // Default expiration is set here, but can be managed dynamically based on user settings later
        const expiresAt = new Date(now.getTime() + DEFAULT_TIMEOUT_MINUTES * 60 * 1000);

        const session: Session = {
            id: generateId(),
            userId,
            token: generateToken(),
            expiresAt,
            createdAt: now,
        };

        await db.sessions.add(session);
        return session;
    },

    async getValidSession(token: string): Promise<Session | undefined> {
        const session = await db.sessions.where('token').equals(token).first();
        if (!session) return undefined;

        if (session.expiresAt < new Date()) {
            await this.removeSession(session.id);
            return undefined;
        }

        return session;
    },

    async extendSession(sessionId: string): Promise<void> {
        const session = await db.sessions.get(sessionId);
        if (session) {
            const now = new Date();
            const newExpiresAt = new Date(now.getTime() + DEFAULT_TIMEOUT_MINUTES * 60 * 1000);
            await db.sessions.update(sessionId, { expiresAt: newExpiresAt });
        }
    },

    async removeSession(sessionId: string): Promise<void> {
        await db.sessions.delete(sessionId);
    },

    async clearUserSessions(userId: string): Promise<void> {
        await db.sessions.where('userId').equals(userId).delete();
    }
};
