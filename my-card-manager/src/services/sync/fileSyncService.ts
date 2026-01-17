/**
 * File System Access API Wrapper Service
 * Provides abstraction for browser file system operations
 */

// Use browser's built-in File System Access API types
declare global {
    interface Window {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    }
}


class FileSyncService {
    private static readonly BACKUP_FILENAME = 'my-card-manager-backup.json';
    private static readonly STORAGE_KEY = 'sync-directory-handle';

    /**
     * Check if File System Access API is supported
     */
    checkBrowserSupport(): boolean {
        return 'showDirectoryPicker' in window;
    }

    /**
     * Request user to select a folder for sync
     * Returns directory handle that can be persisted
     */
    async requestFolderAccess(): Promise<FileSystemDirectoryHandle | null> {
        if (!this.checkBrowserSupport()) {
            throw new Error('File System Access API is not supported in this browser');
        }

        try {
            const dirHandle = await window.showDirectoryPicker!();

            // Verify we have write permission
            const permissionStatus = await this.verifyPermission(dirHandle);
            if (!permissionStatus) {
                throw new Error('Write permission denied');
            }

            return dirHandle;
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                // User cancelled the picker
                return null;
            }
            throw error;
        }
    }

    /**
     * Verify or request write permission for a directory handle
     */
    private async verifyPermission(dirHandle: FileSystemDirectoryHandle): Promise<boolean> {
        const options = { mode: 'readwrite' as const };

        // Check if permission was already granted
        if ((await (dirHandle as any).queryPermission(options)) === 'granted') {
            return true;
        }

        // Request permission
        if ((await (dirHandle as any).requestPermission(options)) === 'granted') {
            return true;
        }

        return false;
    }

    /**
     * Save data to the selected folder
     */
    async saveToFolder(dirHandle: FileSystemDirectoryHandle, data: any): Promise<void> {
        try {
            // Verify permission before writing
            const hasPermission = await this.verifyPermission(dirHandle);
            if (!hasPermission) {
                throw new Error('No write permission for the selected folder');
            }

            // Get or create the backup file
            const fileHandle = await dirHandle.getFileHandle(
                FileSyncService.BACKUP_FILENAME,
                { create: true }
            );

            // Create a writable stream
            const writable = await fileHandle.createWritable();

            // Write the data
            const jsonString = JSON.stringify(data, null, 2);
            await writable.write(jsonString);

            // Close the file
            await writable.close();

            console.log('Backup saved successfully to:', dirHandle.name);
        } catch (error) {
            console.error('Failed to save backup:', error);
            throw new Error(`バックアップの保存に失敗しました: ${(error as Error).message}`);
        }
    }

    /**
     * Load data from the selected folder
     */
    async loadFromFolder(dirHandle: FileSystemDirectoryHandle): Promise<any | null> {
        try {
            // Try to get the backup file
            const fileHandle = await dirHandle.getFileHandle(FileSyncService.BACKUP_FILENAME);

            // Read the file
            const file = await fileHandle.getFile();
            const text = await file.text();

            // Parse JSON
            const data = JSON.parse(text);

            console.log('Backup loaded successfully from:', dirHandle.name);
            return data;
        } catch (error) {
            if ((error as Error).name === 'NotFoundError') {
                // File doesn't exist yet
                console.log('No backup file found in the selected folder');
                return null;
            }
            console.error('Failed to load backup:', error);
            throw new Error(`バックアップの読み込みに失敗しました: ${(error as Error).message}`);
        }
    }

    /**
     * Get the last modified date of the backup file
     */
    async getBackupLastModified(dirHandle: FileSystemDirectoryHandle): Promise<Date | null> {
        try {
            const fileHandle = await dirHandle.getFileHandle(FileSyncService.BACKUP_FILENAME);
            const file = await fileHandle.getFile();
            return new Date(file.lastModified);
        } catch (error) {
            return null;
        }
    }

    /**
     * Store directory handle reference (for persistence between sessions)
     * Note: The handle itself is stored in IndexedDB by the browser
     */
    async storeDirHandle(dirHandle: FileSystemDirectoryHandle): Promise<void> {
        // Store handle in IndexedDB (browser will serialize it)
        const idbDatabase = await this.openIDB();
        const transaction = idbDatabase.transaction(['handles'], 'readwrite');
        const store = transaction.objectStore('handles');
        await store.put(dirHandle, FileSyncService.STORAGE_KEY);
    }

    /**
     * Retrieve stored directory handle
     */
    async retrieveDirHandle(): Promise<FileSystemDirectoryHandle | null> {
        try {
            const idbDatabase = await this.openIDB();
            const transaction = idbDatabase.transaction(['handles'], 'readonly');
            const store = transaction.objectStore('handles');
            const request = store.get(FileSyncService.STORAGE_KEY);

            const handle = await new Promise<any>((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (handle) {
                // Verify permission is still valid
                const hasPermission = await this.verifyPermission(handle as FileSystemDirectoryHandle);
                if (hasPermission) {
                    return handle as FileSystemDirectoryHandle;
                }
            }
            return null;
        } catch (error) {
            console.error('Failed to retrieve directory handle:', error);
            return null;
        }
    }

    /**
     * Clear stored directory handle
     */
    async clearDirHandle(): Promise<void> {
        try {
            const idbDatabase = await this.openIDB();
            const transaction = idbDatabase.transaction(['handles'], 'readwrite');
            const store = transaction.objectStore('handles');
            await store.delete(FileSyncService.STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear directory handle:', error);
        }
    }

    /**
     * Open IndexedDB for storing directory handles
     */
    private openIDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('file-sync-storage', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
            };
        });
    }
}

export const fileSyncService = new FileSyncService();
