import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Competitor, CompetitorStatus } from './types';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CompetitionPage from './pages/CompetitionPage';
import ResultsPage from './pages/ResultsPage';
import { AuthProvider, useAuth } from './components/AuthProvider';
import LoginPage from './pages/LoginPage';
import { databases, getDbConfig, isAppwriteConfigured } from './lib/appwrite';

const AppContent: React.FC = () => {
  const { user, loading, role } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [recoveredNotice, setRecoveredNotice] = useState<string | null>(null);
  
  const [currentEventId, setCurrentEventId] = useState<string | null>(() => {
    return localStorage.getItem('appwrite_active_event_id');
  });
  const [currentEventName, setCurrentEventName] = useState<string | null>(() => {
    return localStorage.getItem('appwrite_active_event_name');
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'local' | null>(null);
  const [isActiveEventLoaded, setIsActiveEventLoaded] = useState(false);
  const [loadingActiveEvent, setLoadingActiveEvent] = useState(false);

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
        setSyncStatus('synced');
        setIsActiveEventLoaded(true);
      } catch (err: any) {
        const errMsg = err?.message || '';
        const errCode = err?.code;
        const isNotFound = errCode === 404 || errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('could not be found');
        
        if (isNotFound) {
          console.warn(`[Event Recovery] The stored active event ID '${currentEventId}' no longer exists in Appwrite (it may have been deleted). Resetting stale session.`);
          setRecoveredNotice(`The previously active competition event "${currentEventName || 'Unknown Event'}" could not be found or has been deleted from the database. Active event has been reset.`);
        } else {
          console.error("Failed to recover Appwrite active event, reverting to offline state:", err);
          setRecoveredNotice("An error occurred while recovering the active database event connection. Falling back to default.");
        }
        
        // Clean up stale configuration in localStorage to prevent getting stuck
        localStorage.removeItem('appwrite_active_event_id');
        localStorage.removeItem('appwrite_active_event_name');
        setCurrentEventId(null);
        setCurrentEventName(null);
        setCompetitors([]);
        setSyncStatus(null);
        setIsActiveEventLoaded(true);
      } finally {
        setLoadingActiveEvent(false);
      }
    };

    fetchStoredEvent();
  }, [currentEventId]);

  // Unified save handler
  const syncCompetitors = async (updatedCompetitors: Competitor[]) => {
    if (!currentEventId) return;

    if (currentEventId === 'local') {
      localStorage.setItem('offline_competitors', JSON.stringify(updatedCompetitors));
      setSyncStatus('local');
      return;
    }

    setSyncStatus('saving');
    try {
      const config = getDbConfig();
      const updateData: Record<string, any> = {
        eventName: currentEventName || 'Challenge Event',
      };
      
      for (let i = 1; i <= 20; i++) {
        const competitor = updatedCompetitors[i - 1];
        updateData[`competitor${i}`] = competitor ? JSON.stringify(competitor) : "";
      }

      await databases.updateDocument(
        config.databaseId,
        config.collectionId,
        currentEventId,
        updateData
      );
      setSyncStatus('synced');
    } catch (err) {
      console.error("Failed to synchronize competitor state to Appwrite:", err);
      setSyncStatus('error');
    }
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

  const selectEvent = (eventId: string, eventName: string, eventCompetitors: Competitor[]) => {
    setCurrentEventId(eventId);
    setCurrentEventName(eventName);
    setCompetitors(eventCompetitors);
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
    setCompetitors([]);
    setSyncStatus(null);
    localStorage.removeItem('appwrite_active_event_id');
    localStorage.removeItem('appwrite_active_event_name');
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
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
        <main className="container mx-auto p-4 md:p-8">
          <LoginPage />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        {recoveredNotice && (
          <div className="mb-6 bg-amber-950/40 border border-amber-500/20 text-amber-200 p-4 rounded-xl flex items-center justify-between gap-4 animate-fade-in shadow-lg">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-500/10 rounded-lg text-amber-400 font-bold">⚠️</span>
              <p className="text-sm font-sans">{recoveredNotice}</p>
            </div>
            <button 
              onClick={() => setRecoveredNotice(null)} 
              className="text-amber-400 hover:text-amber-200 text-xs font-bold uppercase transition bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                addCompetitor={addCompetitor}
                competitors={competitors}
                resetCompetition={resetCompetition}
                currentEventId={currentEventId}
                currentEventName={currentEventName}
                syncStatus={syncStatus}
                selectEvent={selectEvent}
                closeEvent={closeEvent}
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
          <Route path="/results" element={<ResultsPage competitors={competitors} />} />
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

