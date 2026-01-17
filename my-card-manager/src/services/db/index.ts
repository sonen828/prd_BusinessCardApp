import Dexie, { type Table } from 'dexie';
import type {
    User,
    Session,
    UserSetting,
    MyProfile,
    BusinessCard,
    BusinessCardImage,
    Tag,
    CardTag,
    InteractionNote,
    DuplicateSkip,
    BackupHistory,
} from '../../types/models';

export class MyCardDatabase extends Dexie {
    users!: Table<User, string>;
    sessions!: Table<Session, string>;
    userSettings!: Table<UserSetting, string>;
    myProfiles!: Table<MyProfile, string>;
    businessCards!: Table<BusinessCard, string>;
    businessCardImages!: Table<BusinessCardImage, string>;
    tags!: Table<Tag, string>;
    cardTags!: Table<CardTag, [string, string]>;
    interactionNotes!: Table<InteractionNote, string>;
    duplicateSkips!: Table<DuplicateSkip, [string, string]>;
    backupHistory!: Table<BackupHistory, string>;

    constructor() {
        super('my-card-manager-db');

        this.version(1).stores({
            users: 'id, &email', // Primary key and unique index
            sessions: 'id, userId',
            userSettings: 'id, userId',
            myProfiles: 'id, userId, displayOrder',
            businessCards: 'id, profileId, companyName, personName, exchangeDate, priority, createdAt',
            businessCardImages: 'id, cardId',
            tags: 'id, userId',
            cardTags: '[cardId+tagId], cardId, tagId', // Compound primary key
            interactionNotes: 'id, cardId, date', // Index by card and date
            duplicateSkips: '[cardId1+cardId2]', // Compound primary key
            backupHistory: 'id, userId, createdAt',
        });
    }
}

export const db = new MyCardDatabase();
