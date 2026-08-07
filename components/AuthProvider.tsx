import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account, isAppwriteConfigured, ID, databases, getFullDbConfig, query } from '../lib/appwrite';
import { UserRole } from '../types';

interface AuthContextType {
  user: any | null; // Appwrite User session object
  role: UserRole;
  dbRole: UserRole | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setError: (error: string | null) => void;
  toggleSimulatedRole: () => void;
  refreshRole: () => Promise<void>;
  dbRolesConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [dbRole, setDbRole] = useState<UserRole | null>(null);
  const [dbRolesConfigured, setDbRolesConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = isAppwriteConfigured();

  const fetchUserRole = async (userId: string, emailStr: string) => {
    if (!isConfigured) {
      setRole('admin');
      setDbRole('admin');
      setDbRolesConfigured(false);
      return;
    }

    const config = getFullDbConfig();
    const normalizedEmail = (emailStr || '').trim().toLowerCase();

    const applyRole = (rawRole: any) => {
      const parsedRole: UserRole = String(rawRole || '').toLowerCase() === 'admin' ? 'admin' : 'user';
      setDbRolesConfigured(true);
      setDbRole(parsedRole);
      setRole(parsedRole);
      return parsedRole;
    };

    // Strategy 1: Direct document lookup by userId (when document $id === userId)
    try {
      const doc = await databases.getDocument(
        config.databaseId,
        config.usersCollectionId,
        userId
      );
      if (doc && doc.role) {
        applyRole(doc.role);
        return;
      }
    } catch (err) {
      // Document with $id === userId not found, proceed to query & list searches
    }

    // Strategy 2: Query collection by email attribute
    if (normalizedEmail) {
      try {
        const response = await databases.listDocuments(
          config.databaseId,
          config.usersCollectionId,
          [query.equal('email', [normalizedEmail])]
        );
        if (response.documents.length > 0 && response.documents[0].role) {
          applyRole(response.documents[0].role);
          return;
        }
      } catch (err) {
        // Query might fail if index on 'email' is missing or case mismatch
      }

      // Try query with original email string
      if (emailStr && emailStr !== normalizedEmail) {
        try {
          const response = await databases.listDocuments(
            config.databaseId,
            config.usersCollectionId,
            [query.equal('email', [emailStr])]
          );
          if (response.documents.length > 0 && response.documents[0].role) {
            applyRole(response.documents[0].role);
            return;
          }
        } catch (err) {}
      }
    }

    // Strategy 3: Query collection by userId attribute
    if (userId) {
      try {
        const response = await databases.listDocuments(
          config.databaseId,
          config.usersCollectionId,
          [query.equal('userId', [userId])]
        );
        if (response.documents.length > 0 && response.documents[0].role) {
          applyRole(response.documents[0].role);
          return;
        }
      } catch (err) {}
    }

    // Strategy 4: Full collection scan (works even without ANY database indexes configured in Appwrite!)
    try {
      const response = await databases.listDocuments(
        config.databaseId,
        config.usersCollectionId,
        []
      );

      const matchedDoc = response.documents.find((doc: any) => {
        const docEmail = (doc.email || doc.userEmail || '').trim().toLowerCase();
        const docUserId = doc.userId || doc.id || doc.$id;
        return (
          (normalizedEmail && docEmail === normalizedEmail) ||
          (userId && docUserId === userId)
        );
      });

      if (matchedDoc && matchedDoc.role) {
        applyRole(matchedDoc.role);
        return;
      }
    } catch (err: any) {
      console.warn("Could not list documents from users collection:", err?.message);
    }

    // Strategy 5: If user record does not exist anywhere in the users collection, auto-create it
    setDbRolesConfigured(true);
    const defaultRole: UserRole = 'user';

    try {
      await databases.createDocument(
        config.databaseId,
        config.usersCollectionId,
        userId,
        {
          email: normalizedEmail || emailStr || '',
          role: defaultRole,
          userId: userId
        }
      );
      setDbRole(defaultRole);
      setRole(defaultRole);
    } catch (createErr: any) {
      // If document creation fails (e.g. document $id already exists or schema mismatch)
      const isAlreadyExists = createErr.code === 409 || (
        createErr.message && createErr.message.toLowerCase().includes('already exists')
      );

      if (isAlreadyExists) {
        // Try reading document one final time
        try {
          const existingDoc = await databases.getDocument(
            config.databaseId,
            config.usersCollectionId,
            userId
          );
          if (existingDoc && existingDoc.role) {
            applyRole(existingDoc.role);
            return;
          }
        } catch (e) {}
      }

      console.warn("User role record fallback applied:", createErr?.message);
      setRole(defaultRole);
      setDbRole(defaultRole);
    }
  };

  const checkUserSession = async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    try {
      const sessionUser = await account.get();
      setUser(sessionUser);
      await fetchUserRole(sessionUser.$id, sessionUser.email);
    } catch (err) {
      setUser(null);
      setRole('user');
      setDbRole('user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      if (!isConfigured) {
        throw new Error("Appwrite is not configured. Please define environmental variables.");
      }
      await account.createEmailPasswordSession(email, password);
      const sessionUser = await account.get();
      setUser(sessionUser);
      await fetchUserRole(sessionUser.$id, sessionUser.email);
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setError(null);
    setLoading(true);
    try {
      if (!isConfigured) {
        throw new Error("Appwrite is not configured. Please define environmental variables.");
      }
      await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      const sessionUser = await account.get();
      setUser(sessionUser);
      await fetchUserRole(sessionUser.$id, sessionUser.email);
    } catch (err: any) {
      setError(err.message || "Failed to sign up.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    setLoading(true);
    try {
      if (isConfigured) {
        await account.deleteSession('current');
      }
      setUser(null);
      setRole('user');
      setDbRole('user');
    } catch (err: any) {
      setError(err.message || "Failed to log out.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleSimulatedRole = () => {
    // Only permit toggling roles if we are running fully unconfigured local mock state.
    // When Appwrite is configured, role is strictly assigned based on database record, no toggling allowed.
    if (isConfigured) {
      return;
    }
    const nextRole = role === 'admin' ? 'user' : 'admin';
    setRole(nextRole);
    localStorage.setItem('simulated_role', nextRole);
  };

  const refreshRole = async () => {
    if (user) {
      await fetchUserRole(user.$id, user.email);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      dbRole,
      loading, 
      error, 
      isConfigured, 
      login, 
      signup, 
      logout, 
      setError,
      toggleSimulatedRole,
      refreshRole,
      dbRolesConfigured
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

