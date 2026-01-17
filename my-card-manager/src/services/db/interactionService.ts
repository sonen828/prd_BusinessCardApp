import { db } from './index';
import { InteractionNote } from '../../types/models';
import { autoSyncService } from '../sync/autoSyncService';

export const interactionService = {
    async getNotes(cardId: string): Promise<InteractionNote[]> {
        return await db.interactionNotes
            .where('cardId')
            .equals(cardId)
            .sortBy('date'); // default ascending order
    },

    async addNote(cardId: string, content: string, date: Date, type: InteractionNote['type'] = 'memo'): Promise<InteractionNote> {
        // Enforce limit: Max 50 notes per card per day
        // To verify this efficiently, we count existing notes for that card and day.

        // Dexie doesn't have native "date-only" index support easily without composite keys.
        // We can just query by range for that day.
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const count = await db.interactionNotes
            .where('cardId')
            .equals(cardId)
            .filter(note => note.date >= startOfDay && note.date <= endOfDay)
            .count();

        if (count >= 50) {
            throw new Error('1日あたりのメモ登録上限（50件）に達しました。');
        }

        const note: InteractionNote = {
            id: crypto.randomUUID(),
            cardId,
            content,
            date,
            type,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await db.interactionNotes.add(note);
        autoSyncService.autoSave();
        return note;
    },

    async deleteNote(id: string): Promise<void> {
        await db.interactionNotes.delete(id);
        autoSyncService.autoSave();
    },

    async updateNote(id: string, content: string): Promise<void> {
        await db.interactionNotes.update(id, {
            content,
            updatedAt: new Date()
        });
        autoSyncService.autoSave();
    }
};
