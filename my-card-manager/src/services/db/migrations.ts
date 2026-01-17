import { MyCardDatabase } from './index';

export const migrateDatabase = async (db: MyCardDatabase) => {
    // Version 1 is the initial schema, so no migration needed yet.
    // Future migrations will be handled here based on db.verno.

    console.log(`Database version: ${db.verno}`);
};
