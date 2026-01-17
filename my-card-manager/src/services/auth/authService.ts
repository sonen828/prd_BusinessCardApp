import { userService } from '../db/userService';
import { sessionService } from './sessionManager';
import { User } from '../../types/models';
import { hashPassword, comparePassword } from '../../utils/crypto';

export const authService = {
    async register(email: string, password: string): Promise<User> {
        const existingUser = await userService.getByEmail(email);
        if (existingUser) {
            throw new Error('Email already registered');
        }

        const passwordHash = await hashPassword(password);
        return userService.create({
            email,
            passwordHash,
        });
    },

    async login(email: string, password: string): Promise<{ user: User; token: string }> {
        const user = await userService.getByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid email or password');
        }

        await userService.updateLastLogin(user.id);
        const session = await sessionService.createSession(user.id);

        return { user, token: session.token };
    },

    async logout(token: string): Promise<void> {
        const session = await sessionService.getValidSession(token);
        if (session) {
            await sessionService.removeSession(session.id);
        }
    },

    async checkSession(token: string): Promise<User | null> {
        const session = await sessionService.getValidSession(token);
        if (!session) return null;

        // Extend session on activity check
        await sessionService.extendSession(session.id);

        const user = await userService.getById(session.userId);
        return user || null;
    }
};
