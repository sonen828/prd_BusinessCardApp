export interface User {
    id: string; // UUID
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
}

export interface Session {
    id: string; // UUID
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface UserSetting {
    id: string; // UUID
    userId: string;
    sessionTimeout: number; // minutes
    defaultPriority: number; // 1-5
    listPageSize: number;
    theme: 'light' | 'dark';
    ocrLanguages: string;
    cloudOcrProvider?: string;
    cloudOcrApiKey?: string; // Encrypted
    llmProvider?: string;
    llmApiKey?: string; // Encrypted
    enableAiFeatures: boolean;
    enableCompanyLookup: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface MyProfile {
    id: string; // UUID
    userId: string;
    companyName: string;
    position?: string;
    email?: string;
    phone?: string;
    address?: string;
    cardImage?: Blob;
    startDate?: Date;
    endDate?: Date;
    isCurrent?: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface BusinessCard {
    id: string; // UUID
    profileId: string;
    personName: string;
    personNameKana?: string;
    companyName: string;
    department?: string;
    position?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    address?: string;
    website?: string;
    industry?: string;
    area?: string;
    positionLevel?: string;
    title?: string; // OCR might capture 'title' separately or as alias for position
    exchangeDate?: Date;
    meetingPlace?: string;
    memo?: string;
    priority: number; // 1-5
    createdAt: Date;
    updatedAt: Date;
}

export interface BusinessCardImage {
    id: string; // UUID
    cardId: string;
    imageData: Blob;
    imageType: 'front' | 'back' | 'other';
    displayOrder: number;
    createdAt: Date;
}

export interface Tag {
    id: string; // UUID
    userId: string;
    name: string;
    color?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CardTag {
    cardId: string;
    tagId: string;
    createdAt: Date;
}

export interface DuplicateSkip {
    cardId1: string;
    cardId2: string;
    createdAt: Date;
}

export interface InteractionNote {
    id: string; // UUID
    cardId: string;
    content: string;
    date: Date; // The date of interaction
    type: 'memo' | 'meeting' | 'email' | 'call' | 'other';
    createdAt: Date;
    updatedAt: Date;
}

export interface BackupHistory {
    id: string; // UUID
    userId: string;
    backupType: 'json' | 'zip';
    schemaVersion: string;
    cardCount: number;
    fileSize: number;
    createdAt: Date;
}

export interface SortConfig {
    field: keyof BusinessCard | 'exchangeDate';
    direction: 'asc' | 'desc';
}

export interface FilterConfig {
    keyword?: string;
    profileIds?: string[];
    priorities?: number[];
    tagIds?: string[];
    industries?: string[];
    areas?: string[];
    positionLevels?: string[];
    exchangeDateFrom?: Date | null;
    exchangeDateTo?: Date | null;
}
