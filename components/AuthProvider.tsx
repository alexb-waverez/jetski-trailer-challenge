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
    try {
      const config = getFullDbConfig();
      let doc: any = null;

      // 1. Direct fetch by Document ID (which should match userId)
      try {
        doc = await databases.getDocument(
          config.databaseId,
          config.usersCollectionId,
          userId
        );
      } catch (directErr: any) {
        console.warn(`[User Role] Direct lookup failed for userId '${userId}'. Attempting query fallbacks...`, directErr.message);
        
        // 2. Fallback: Search the collection where email matches the logged in user's email
        if (emailStr) {
          try {
            const emailClean = emailStr.toLowerCase().trim();
            const emailQueryRes = await databases.listDocuments(
              config.databaseId,
              config.usersCollectionId,
              [query.equal('email', emailClean)]
            );
            if (emailQueryRes && emailQueryRes.documents.length > 0) {
              doc = emailQueryRes.documents[0];
              console.log(`[User Role] Successfully resolved user role via email query: '${emailClean}' -> role: '${doc.role}'`);
            }
          } catch (emailQueryErr: any) {
            console.warn("[User Role] Query by email failed:", emailQueryErr.message);
          }
        }

        // 3. Fallback: Search the collection where userId matches (in case it is a custom attribute)
        if (!doc) {
          try {
            const idQueryRes = await databases.listDocuments(
              config.databaseId,
              config.usersCollectionId,
              [query.equal('userId', userId)]
            );
            if (idQueryRes && idQueryRes.documents.length > 0) {
              doc = idQueryRes.documents[0];
              console.log(`[User Role] Successfully resolved user role via userId attribute query: '${userId}' -> role: '${doc.role}'`);
            }
          } catch (idQueryErr: any) {
            console.warn("[User Role] Query by userId attribute failed:", idQueryErr.message);
          }
        }

        // 4. Try client-side scan of the collection as a final backstop
        if (!doc) {
          try {
            const allDocs = await databases.listDocuments(
              config.databaseId,
              config.usersCollectionId,
              []
            );
            const matchingDoc = allDocs.documents.find((d: any) => 
              (d.email && d.email.toLowerCase().trim() === emailStr.toLowerCase().trim()) ||
              (d.userId && d.userId === userId) ||
              (d.$id && d.$id === userId)
            );
            if (matchingDoc) {
              doc = matchingDoc;
              console.log(`[User Role] Successfully resolved user role via collection scan -> role: '${doc.role}'`);
            }
          } catch (scanErr: any) {
            console.warn("[User Role] Scan of collection failed:", scanErr.message);
          }
        }

        // If all fallbacks failed, throw the original direct lookup error to trigger default auto-creation/handling
        if (!doc) {
          throw directErr;
        }
      }

      setDbRolesConfigured(true);
      const fetchedRole = doc.role as UserRole;
      setDbRole(fetchedRole);
      setRole(fetchedRole);
    } catch (err: any) {
      const config = getFullDbConfig();
      // Check if collection itself is missing vs. document missing
      const isCollectionMissing = err.message && (
        err.message.toLowerCase().includes('collection') && 
        err.message.toLowerCase().includes('not found')
      );

      if (isCollectionMissing) {
        const defaultRole: UserRole = 'user';
        setDbRolesConfigured(true); // Lock role configuration to prevent simulated role override
        setRole(defaultRole);
        setDbRole(defaultRole);
        return;
      }

      const isNotFound = err.code === 404 || (err.message && err.message.toLowerCase().includes('not found'));

      if (isNotFound) {
        setDbRolesConfigured(true);
        // Default newly registered to 'user'
        const defaultRole: UserRole = 'user';

        try {
          await databases.createDocument(
            config.databaseId,
            config.usersCollectionId,
            userId,
            {
              email: emailStr || '',
              role: defaultRole
            }
          );
          setDbRole(defaultRole);
          setRole(defaultRole);
        } catch (createErr: any) {
          const isAlreadyExists = createErr.code === 409 || (
            createErr.message && createErr.message.toLowerCase().includes('already exists')
          );

          if (isAlreadyExists) {
            try {
              const existingDoc = await databases.getDocument(
                config.databaseId,
                config.usersCollectionId,
                userId
              );
              const existingRole = existingDoc.role as UserRole;
              setDbRole(existingRole);
              setRole(existingRole);
              return;
            } catch (readErr) {
              console.error("Failed to read existing user role record after conflict:", readErr);
            }
          }

          console.error("Auto-creation of user role record failed:", createErr);
          setDbRolesConfigured(true);
          const defaultFallback = 'user';
          setRole(defaultFallback);
          setDbRole(defaultFallback);

          const isCreateCollMissing = createErr.message && (
            createErr.message.toLowerCase().includes('collection') && 
            createErr.message.toLowerCase().includes('not found')
          );
          if (isCreateCollMissing) {
            throw new Error(`Auto-creation of user role record failed because the collection '${config.usersCollectionId}' doesn't exist. Please configure the correct Collection IDs in the settings drawer.`);
          }
          throw createErr;
        }
      } else {
        console.warn("Could not query User role from collection. Fallback safely to default permission:", err.message);
        setDbRolesConfigured(true);
        const defaultRole: UserRole = 'user';
        setRole(defaultRole);
        setDbRole(defaultRole);
      }
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

