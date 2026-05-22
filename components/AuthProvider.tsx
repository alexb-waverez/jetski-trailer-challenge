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
      // Direct lookup by document ID (which is userId) - zero search index configuration required!
      const doc = await databases.getDocument(
        config.databaseId,
        config.usersCollectionId,
        userId
      );

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
        const defaultRole: UserRole = emailStr.toLowerCase().trim() === 'alexb@waverez.com' ? 'admin' : 'user';
        setDbRolesConfigured(true); // Lock role configuration to prevent simulated role override
        setRole(defaultRole);
        setDbRole(defaultRole);
        return;
      }

      const isNotFound = err.code === 404 || (err.message && err.message.toLowerCase().includes('not found'));

      if (isNotFound) {
        setDbRolesConfigured(true);
        // Default newly registered to 'user' unless they are 'alexb@waverez.com'
        const defaultRole: UserRole = emailStr.toLowerCase().trim() === 'alexb@waverez.com' ? 'admin' : 'user';

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
          const defaultFallback = emailStr.toLowerCase().trim() === 'alexb@waverez.com' ? 'admin' : 'user';
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
        const defaultRole: UserRole = emailStr.toLowerCase().trim() === 'alexb@waverez.com' ? 'admin' : 'user';
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
    // Only permit toggling roles if we are running fully unconfigured local mock state OR if the database fetched role is explicitly 'admin'
    if (isConfigured) {
      const isTrueAdmin = dbRole === 'admin' || (user && user.email && user.email.toLowerCase().trim() === 'alexb@waverez.com');
      if (!isTrueAdmin) {
        return;
      }
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

