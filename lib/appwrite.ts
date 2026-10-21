import { Client, Account, Databases, Query } from 'appwrite';

export const client = new Client();

export const getEndpoint = (): string => {
  return localStorage.getItem('appwrite_endpoint') || import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
};

export const getProjectId = (): string => {
  return localStorage.getItem('appwrite_project_id') || import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
};

export const isAppwriteConfigured = (): boolean => {
  return !!getProjectId();
};

export const initAppwriteClient = () => {
  const ep = getEndpoint();
  const pid = getProjectId();
  if (pid) {
    client.setEndpoint(ep).setProject(pid);
  }
};

if (isAppwriteConfigured()) {
  initAppwriteClient();
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
  endpoint: string;
  projectId: string;
  usersCollectionId: string;
  bidsCollectionId: string;
  attendeesCollectionId: string;
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
  const localAttendees = localStorage.getItem('appwrite_attendees_collection_id');
  
  return {
    ...active,
    endpoint: getEndpoint(),
    projectId: getProjectId(),
    usersCollectionId: localUsers || import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID || 'users',
    bidsCollectionId: localBids || import.meta.env.VITE_APPWRITE_BIDS_COLLECTION_ID || 'bids',
    attendeesCollectionId: localAttendees || import.meta.env.VITE_APPWRITE_ATTENDEES_COLLECTION_ID || 'attendees',
  };
};

export const saveDbConfig = (config: DbConfig) => {
  localStorage.setItem('appwrite_database_id', config.databaseId);
  localStorage.setItem('appwrite_collection_id', config.collectionId);
};

export const saveFullDbConfig = (config: FullDbConfig) => {
  if (config.endpoint) {
    localStorage.setItem('appwrite_endpoint', config.endpoint);
  }
  if (config.projectId) {
    localStorage.setItem('appwrite_project_id', config.projectId);
  }
  localStorage.setItem('appwrite_database_id', config.databaseId);
  localStorage.setItem('appwrite_collection_id', config.collectionId);
  localStorage.setItem('appwrite_users_collection_id', config.usersCollectionId);
  localStorage.setItem('appwrite_bids_collection_id', config.bidsCollectionId);
  localStorage.setItem('appwrite_attendees_collection_id', config.attendeesCollectionId);
  initAppwriteClient();
};

/**
 * Detects whether an Appwrite error is caused by browser network/CORS restrictions,
 * such as when a new production URL has not been whitelisted as a Web Platform in Appwrite Console.
 */
export const isCorsOrNetworkError = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const name = (err.name || '').toLowerCase();
  return (
    name === 'typeerror' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('cross-origin') ||
    msg.includes('cors') ||
    msg.includes('invalid origin') ||
    err.type === 'general_unknown_origin' ||
    err.code === 403
  );
};


