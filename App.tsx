import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Competitor, CompetitorStatus } from './types';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CompetitionPage from './pages/CompetitionPage';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import { AuthProvider, useAuth } from './components/AuthProvider';
import LoginPage from './pages/LoginPage';
import { databases, getDbConfig, isAppwriteConfigured } from './lib/appwrite';

const AppContent: React.FC = () => {
  const { user, loading, role } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  
  const [currentEventId, setCurrentEventId] = useState<string | null>(() => {
    return localStorage.getItem('appwrite_active_event_id');
  });
  const [currentEventName, setCurrentEventName] = useState<string | null>(() => {
    return localStorage.getItem('appwrite_active_event_name');
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'local' | null>(null);
  const [isActiveEventLoaded, setIsActiveEventLoaded] = useState(false);
  const [loadingActiveEvent, setLoadingActiveEvent] = useState(false);

  // Concurrency & state tracking refs for Database Write Optimizations
  const isSyncingRef = useRef(false);
  const pendingSyncRef = useRef<Competitor[] | null>(null);
  const lastSyncedPayloadRef = useRef<string>("");
  const currentEventNameRef = useRef<string | null>(currentEventName);

  // Synchronize ref with interactive user changes to prevent stale closure data in the write-stream
  useEffect(() => {
    currentEventNameRef.current = currentEventName;
  }, [currentEventName]);

  // Restore/Load Active Event state on startup
  useEffect(() => {
    const fetchStoredEvent = async () => {
      if (!isAppwriteConfigured()) {
        setCurrentEventId('local');
        setCurrentEventName('Local Offline Mode');
        setSyncStatus('local');
        setIsActiveEventLoaded(true);
        return;
      }

      if (!currentEventId) {
        setIsActiveEventLoaded(true);
        return;
      }
      
      if (currentEventId === 'local') {
        setSyncStatus('local');
        const localComps = localStorage.getItem('offline_competitors');
        if (localComps) {
          try {
            setCompetitors(JSON.parse(localComps));
          } catch (e) {
            console.error(e);
          }
        }
        setIsActiveEventLoaded(true);
        return;
      }

      setLoadingActiveEvent(true);
      try {
        const config = getDbConfig();
        const document = await databases.getDocument(
          config.databaseId,
          config.collectionId,
          currentEventId
        );
        
        // Parse competitor attributes
        const parsedCompetitors: Competitor[] = [];
        for (let i = 1; i <= 20; i++) {
          const compStr = (document as any)[`competitor${i}`];
          if (compStr && compStr.trim()) {
            try {
              const compObj = JSON.parse(compStr);
              parsedCompetitors.push(compObj);
            } catch (e) {
              console.error("Failed parsing competitor info at index", i, e);
            }
          }
        }
        setCompetitors(parsedCompetitors);
        // Save initial payload reference to prevent redundant writes
        lastSyncedPayloadRef.current = JSON.stringify(parsedCompetitors);
        setSyncStatus('synced');
        setIsActiveEventLoaded(true);
      } catch (err) {
        console.error("Failed to recover Appwrite active event, reverting to offline state:", err);
        setSyncStatus('error');
        setIsActiveEventLoaded(true);
      } finally {
        setLoadingActiveEvent(false);
      }
    };

    fetchStoredEvent();
  }, [currentEventId]);

  // Unified save handler with atomic queuing and redundancy controls
  const syncCompetitors = async (updatedCompetitors: Competitor[]) => {
    if (!currentEventId) return;

    if (currentEventId === 'local') {
      localStorage.setItem('offline_competitors', JSON.stringify(updatedCompetitors));
      setSyncStatus('local');
      return;
    }

    const payloadString = JSON.stringify(updatedCompetitors);
    // 1. Redundancy Avoidance: Skip saving if the payload hasn't changed from what's currently synced/saved
    if (payloadString === lastSyncedPayloadRef.current) {
      return;
    }

    // 2. Queueing/Serializing Writes: If already syncing, stack this list to be executed right after
    if (isSyncingRef.current) {
      pendingSyncRef.current = updatedCompetitors;
      setSyncStatus('saving');
      return;
    }

    isSyncingRef.current = true;
    setSyncStatus('saving');

    const executeSync = async (competitorsToSync: Competitor[]) => {
      const config = getDbConfig();
      const currentPayload = JSON.stringify(competitorsToSync);
      
      try {
        const updateData: Record<string, any> = {
          eventName: currentEventNameRef.current || 'Challenge Event',
        };
        
        for (let i = 1; i <= 20; i++) {
          const competitor = competitorsToSync[i - 1];
          updateData[`competitor${i}`] = competitor ? JSON.stringify(competitor) : "";
        }

        await databases.updateDocument(
          config.databaseId,
          config.collectionId,
          currentEventId,
          updateData
        );
        
        lastSyncedPayloadRef.current = currentPayload;
        setSyncStatus('synced');
      } catch (err) {
        console.error("Failed to synchronize competitor state to Appwrite:", err);
        setSyncStatus('error');
      } finally {
        // Check if a new update occurred during the write
        if (pendingSyncRef.current) {
          const nextSyncPayload = pendingSyncRef.current;
          pendingSyncRef.current = null;
          // Execute the next sync with the latest accumulated state
          await executeSync(nextSyncPayload);
        } else {
          isSyncingRef.current = false;
        }
      }
    };

    await executeSync(updatedCompetitors);
  };

  const addCompetitor = (fullName: string, companyName: string) => {
    if (competitors.length >= 20) return;
    const newCompetitor: Competitor = {
      id: new Date().toISOString() + Math.random(),
      fullName,
      companyName,
      startTime: null,
      endTime: null,
      elapsedTime: null,
      status: CompetitorStatus.Pending,
      penaltyPoints: 0,
    };
    const nextList = [...competitors, newCompetitor];
    setCompetitors(nextList);
    syncCompetitors(nextList);
  };
  
  const resetCompetition = () => {
    setCompetitors([]);
    syncCompetitors([]);
  };

  const updateCompetitor = (id: string, updates: Partial<Competitor>) => {
    const nextList = competitors.map(c => (c.id === id ? { ...c, ...updates } : c));
    setCompetitors(nextList);
    syncCompetitors(nextList);
  };

  const deleteCompetitor = (id: string) => {
    const nextList = competitors.filter(c => c.id !== id);
    setCompetitors(nextList);
    syncCompetitors(nextList);
  };

  const selectEvent = (eventId: string, eventName: string, eventCompetitors: Competitor[]) => {
    setCurrentEventId(eventId);
    setCurrentEventName(eventName);
    currentEventNameRef.current = eventName;
    setCompetitors(eventCompetitors);
    lastSyncedPayloadRef.current = JSON.stringify(eventCompetitors);
    setSyncStatus(eventId === 'local' ? 'local' : 'synced');
    setIsActiveEventLoaded(true);
    
    localStorage.setItem('appwrite_active_event_id', eventId);
    localStorage.setItem('appwrite_active_event_name', eventName);
    if (eventId === 'local') {
      localStorage.setItem('offline_competitors', JSON.stringify(eventCompetitors));
    }
  };

  const closeEvent = () => {
    setCurrentEventId(null);
    setCurrentEventName(null);
    currentEventNameRef.current = null;
    setCompetitors([]);
    lastSyncedPayloadRef.current = "";
    pendingSyncRef.current = null;
    isSyncingRef.current = false;
    setSyncStatus(null);
    localStorage.removeItem('appwrite_active_event_id');
    localStorage.removeItem('appwrite_active_event_name');
  };

  const renameActiveEvent = async (newName: string) => {
    setCurrentEventName(newName);
    currentEventNameRef.current = newName;
    localStorage.setItem('appwrite_active_event_name', newName);

    if (currentEventId && currentEventId !== 'local') {
      // Reuse the robust queue-concurrency handler
      await syncCompetitors(competitors);
    }
  };

  if (loading || (currentEventId && !isActiveEventLoaded)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-100">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-sky-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-400 text-xs tracking-widest font-mono">LOADING EVENTS ENGINE...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                addCompetitor={addCompetitor}
                deleteCompetitor={deleteCompetitor}
                competitors={competitors}
                resetCompetition={resetCompetition}
                currentEventId={currentEventId}
                currentEventName={currentEventName}
                syncStatus={syncStatus}
                selectEvent={selectEvent}
                closeEvent={closeEvent}
                renameActiveEvent={renameActiveEvent}
              />
            }
          />
          <Route
            path="/competition"
            element={
              role === 'admin' ? (
                <CompetitionPage competitors={competitors} updateCompetitor={updateCompetitor} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route 
            path="/results" 
            element={
              <ResultsPage 
                competitors={competitors} 
                currentEventName={currentEventName}
                currentEventId={currentEventId}
                renameActiveEvent={renameActiveEvent}
              />
            } 
          />
          <Route 
            path="/leaderboard" 
            element={
              <LeaderboardPage 
                competitors={competitors} 
                currentEventName={currentEventName}
                currentEventId={currentEventId}
              />
            } 
          />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;

