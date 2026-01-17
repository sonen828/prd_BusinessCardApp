import { fileSyncService } from './fileSyncService';
import { db } from '../db';

/**
 * Auto-Sync Service
 * Orchestrates automatic backup and sync with user-selected folder
 */

export interface SyncStatus {
    enabled: boolean;
    folderName: string | null;
    lastSyncedAt: Date | null;
    isSyncing: boolean;
}

class AutoSyncService {
    private dirHandle: FileSystemDirectoryHandle | null = null;
    private autoSaveTimeout: number | null = null;
    private readonly DEBOUNCE_MS = 5000; // 5 seconds
    private syncCallbacks: Array<(status: SyncStatus) => void> = [];

    /**
     * Initialize service - retrieve stored directory handle if exists
     */
    async initialize(): Promise<void> {
        if (!fileSyncService.checkBrowserSupport()) {
            console.log('Auto-sync not available: Browser does not support File System Access API');
            return;
        }

        try {
            this.dirHandle = await fileSyncService.retrieveDirHandle();
            if (this.dirHandle) {
                console.log('Auto-sync initialized with folder:', this.dirHandle.name);
                this.notifyStatusChange();
            }
        } catch (error) {
            console.error('Failed to initialize auto-sync:', error);
        }
    }

    /**
     * Enable auto-sync by selecting a folder
     */
    async enableAutoSync(): Promise<boolean> {
        try {
            const dirHandle = await fileSyncService.requestFolderAccess();
            if (!dirHandle) {
                return false; // User cancelled
            }

            this.dirHandle = dirHandle;
            await fileSyncService.storeDirHandle(dirHandle);

            // Perform initial sync
            await this.syncNow();

            this.notifyStatusChange();
            return true;
        } catch (error) {
            console.error('Failed to enable auto-sync:', error);
            throw error;
        }
    }

    /**
     * Disable auto-sync
     */
    async disableAutoSync(): Promise<void> {
        this.dirHandle = null;
        await fileSyncService.clearDirHandle();

        // Clear any pending auto-save
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }

        this.notifyStatusChange();
    }

    /**
     * Check if auto-sync is enabled
     */
    isEnabled(): boolean {
        return this.dirHandle !== null;
    }

    /**
     * Get current sync status
     */
    getStatus(): SyncStatus {
        const lastSyncedAt = localStorage.getItem('last-synced-at');

        return {
            enabled: this.isEnabled(),
            folderName: this.dirHandle?.name || null,
            lastSyncedAt: lastSyncedAt ? new Date(lastSyncedAt) : null,
            isSyncing: false, // TODO: track syncing state
        };
    }

    /**
     * Trigger auto-save (debounced)
     * Called after data changes
     */
    autoSave(): void {
        if (!this.isEnabled()) {
            return;
        }

        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Set new timeout
        this.autoSaveTimeout = window.setTimeout(() => {
            this.syncNow().catch(error => {
                console.error('Auto-save failed:', error);
            });
        }, this.DEBOUNCE_MS);
    }

    /**
     * Manually trigger sync immediately
     */
    async syncNow(): Promise<void> {
        if (!this.dirHandle) {
            throw new Error('Auto-sync is not enabled');
        }

        try {
            // Export current data
            const data = await this.exportAllData();

            // Save to folder
            await fileSyncService.saveToFolder(this.dirHandle, data);

            // Update last synced timestamp
            const now = new Date();
            localStorage.setItem('last-synced-at', now.toISOString());

            this.notifyStatusChange();

            console.log('Sync completed successfully');
        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
        }
    }

    /**
     * Auto-load on app startup
     * Check if remote data is newer and offer to restore
     */
    async autoLoad(): Promise<boolean> {
        if (!this.dirHandle) {
            return false;
        }

        try {
            // Load data from folder
            const remoteData = await fileSyncService.loadFromFolder(this.dirHandle);

            if (!remoteData) {
                // No remote backup yet
                console.log('No remote backup found, creating initial backup...');
                await this.syncNow();
                return false;
            }

            // Check if remote data is newer
            const shouldRestore = await this.checkConflict(remoteData);

            if (shouldRestore) {
                await this.importAllData(remoteData);
                console.log('Restored data from sync folder');
                return true;
            }

            return false;
        } catch (error) {
            console.error('Auto-load failed:', error);
            return false;
        }
    }

    /**
     * Check for conflicts between local and remote data
     * Returns true if remote should be used
     */
    private async checkConflict(remoteData: any): Promise<boolean> {
        if (!remoteData.exportedAt) {
            return false;
        }

        const remoteDate = new Date(remoteData.exportedAt);
        const lastSyncedAt = localStorage.getItem('last-synced-at');

        if (!lastSyncedAt) {
            // First time loading, ask user
            return confirm(
                `同期フォルダからバックアップが見つかりました（${remoteDate.toLocaleString()}）。\n` +
                'このデータを読み込みますか？\n\n' +
                '※現在のローカルデータは上書きされます。'
            );
        }

        const localDate = new Date(lastSyncedAt);

        if (remoteDate > localDate) {
            // Remote is newer
            return confirm(
                `同期フォルダに新しいデータが見つかりました。\n\n` +
                `ローカル: ${localDate.toLocaleString()}\n` +
                `リモート: ${remoteDate.toLocaleString()}\n\n` +
                '新しいデータを読み込みますか？'
            );
        }

        return false;
    }

    /**
     * Export all data (same format as manual backup)
     */
    private async exportAllData(): Promise<any> {
        // Get current user from auth store (we'll need to access this)
        const authData = localStorage.getItem('auth-storage');
        if (!authData) {
            throw new Error('User not authenticated');
        }

        const { state } = JSON.parse(authData);
        const userId = state?.user?.id;

        if (!userId) {
            throw new Error('User ID not found');
        }

        // Export all user data
        const profiles = await db.myProfiles.where('userId').equals(userId).toArray();
        const profileIds = profiles.map(p => p.id);
        const cards = await db.businessCards.where('profileId').anyOf(profileIds).toArray();
        const cardIds = cards.map(c => c.id);
        const images = await db.businessCardImages.where('cardId').anyOf(cardIds).toArray();
        const tags = await db.tags.where('userId').equals(userId).toArray();
        const tagIds = tags.map(t => t.id);
        const cardTags = await db.cardTags.where('tagId').anyOf(tagIds).toArray();
        const interactionNotes = await db.interactionNotes.where('cardId').anyOf(cardIds).toArray();

        // Convert images to Base64
        const imagesBase64 = await Promise.all(images.map(async (img) => {
            const base64 = await this.blobToBase64(img.imageData as Blob);
            return { ...img, imageData: base64 };
        }));

        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            user: { id: userId },
            profiles,
            cards,
            images: imagesBase64,
            tags,
            cardTags,
            interactionNotes,
        };
    }

    private async importAllData(data: any): Promise<void> {
        if (!data.version || !data.profiles) {
            throw new Error('Invalid backup file format');
        }

        await db.transaction(
            'rw',
            [db.myProfiles, db.businessCards, db.businessCardImages, db.tags, db.cardTags, db.interactionNotes],
            async () => {
                // Restore Profiles
                await db.myProfiles.bulkPut(data.profiles);

                // Restore Cards
                await db.businessCards.bulkPut(data.cards);

                // Restore Images
                if (data.images) {
                    const images = data.images.map((img: any) => ({
                        ...img,
                        imageData: this.base64ToBlob(img.imageData),
                        createdAt: new Date(img.createdAt)
                    }));
                    await db.businessCardImages.bulkPut(images);
                }

                // Restore Tags
                if (data.tags) {
                    await db.tags.bulkPut(data.tags);
                }

                // Restore CardTags
                if (data.cardTags) {
                    await db.cardTags.bulkPut(data.cardTags);
                }

                // Restore Interaction Notes
                if (data.interactionNotes) {
                    const notes = data.interactionNotes.map((note: any) => ({
                        ...note,
                        date: new Date(note.date),
                        createdAt: new Date(note.createdAt)
                    }));
                    await db.interactionNotes.bulkPut(notes);
                }
            }
        );

        // Update last synced timestamp
        localStorage.setItem('last-synced-at', data.exportedAt);
    }

    /**
     * Helper: Blob to Base64
     */
    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Helper: Base64 to Blob
     */
    private base64ToBlob(base64: string): Blob {
        const arr = base64.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    /**
     * Subscribe to status changes
     */
    onStatusChange(callback: (status: SyncStatus) => void): void {
        this.syncCallbacks.push(callback);
    }

    /**
     * Notify all subscribers of status change
     */
    private notifyStatusChange(): void {
        const status = this.getStatus();
        this.syncCallbacks.forEach(cb => cb(status));
    }
}

export const autoSyncService = new AutoSyncService();
