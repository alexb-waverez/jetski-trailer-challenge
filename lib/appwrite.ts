import { Client, Account, Databases, Query } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

export const isAppwriteConfigured = (): boolean => {
  return !!projectId;
};

if (isAppwriteConfigured()) {
  client
    .setEndpoint(endpoint)
    .setProject(projectId);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const query = Query;
export { ID } from 'appwrite';


// Database config helpers
export interface DbConfig {
  databaseId: string;
  collectionId: string;
}

export interface FullDbConfig extends DbConfig {
  usersCollectionId: string;
  bidsCollectionId: string;
}

export const getDbConfig = (): DbConfig => {
  const localDb = localStorage.getItem('appwrite_database_id');
  const localColl = localStorage.getItem('appwrite_collection_id');
  
  return {
    databaseId: localDb || import.meta.env.VITE_APPWRITE_DATABASE_ID || 'default',
    collectionId: localColl || import.meta.env.VITE_APPWRITE_COLLECTION_ID || 'events',
  };
};

export const getFullDbConfig = (): FullDbConfig => {
  const active = getDbConfig();
  const localUsers = localStorage.getItem('appwrite_users_collection_id');
  const localBids = localStorage.getItem('appwrite_bids_collection_id');
  
  return {
    ...active,
    usersCollectionId: localUsers || import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID || 'users',
    bidsCollectionId: localBids || import.meta.env.VITE_APPWRITE_BIDS_COLLECTION_ID || 'bids',
  };
};

export const saveDbConfig = (config: DbConfig) => {
  localStorage.setItem('appwrite_database_id', config.databaseId);
  localStorage.setItem('appwrite_collection_id', config.collectionId);
};

export const saveFullDbConfig = (config: FullDbConfig) => {
  localStorage.setItem('appwrite_database_id', config.databaseId);
  localStorage.setItem('appwrite_collection_id', config.collectionId);
  localStorage.setItem('appwrite_users_collection_id', config.usersCollectionId);
  localStorage.setItem('appwrite_bids_collection_id', config.bidsCollectionId);
};


