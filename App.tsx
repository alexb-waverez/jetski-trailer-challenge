import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Competitor, CompetitorStatus, EventCompetitionStatus, computeEventStatus } from './types';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CompetitionPage from './pages/CompetitionPage';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AttendeesPage from './pages/AttendeesPage';
import BidsPage from './pages/BidsPage';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import { databases, getDbConfig, isAppwriteConfigured } from './lib/appwrite';
import jetskiStormBg from './src/assets/images/jetski_storm_bg_1779561776139.png';

const AppContent: React.FC = () => {
  const { user, loading, role } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  
  const [currentEventId, setCurrentEventId] = useState<string | null>(() => {
    return localStorage.getItem('appwrite_active_event_id');
  });
  const [currentEventName, setCurrentEventName] = useState<string | null>(() => {
    return localStorage.getItem('appwrite_active_event_name');
  });
  const [eventStatus, setEventStatus] = useState<EventCompetitionStatus>(() => {
    const saved = localStorage.getItem('appwrite_active_event_status');
    if (saved === 'Onboarding' || saved === 'Running' || saved === 'Finished') {
      return saved;
    }
    return 'Onboarding';
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'local' | null>(null);
  const [isActiveEventLoaded, setIsActiveEventLoaded] = useState(false);
  const [loadingActiveEvent, setLoadingActiveEvent] = useState(false);

  // Concurrency & state tracking refs for Database Write Optimizations
  const isSyncingRef = useRef(false);
  const pendingSyncRef = useRef<Competitor[] | null>(null);
  const lastSyncedPayloadRef = useRef<string>("");
  const currentEventNameRef = useRef<string | null>(currentEventName);
  const eventStatusRef = useRef<EventCompetitionStatus>(eventStatus);
  const hasAutoDiscoveredRef = useRef(false);

  // Synchronize ref with interactive user changes to prevent stale closure data in the write-stream
  useEffect(() => {
    currentEventNameRef.current = currentEventName;
  }, [currentEventName]);

  useEffect(() => {
    eventStatusRef.current = eventStatus;
  }, [eventStatus]);

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

      let activeId = currentEventId;
      let activeName = currentEventName;

      // Auto-discover latest event ONLY on fresh initial startup if no event was chosen,
      // and NOT if the user explicitly clicked "Switch Event" or closed the event.
      if (!activeId && !hasAutoDiscoveredRef.current && sessionStorage.getItem('event_manually_closed') !== 'true') {
        hasAutoDiscoveredRef.current = true;
        try {
          const config = getDbConfig();
          const listRes = await databases.listDocuments(
            config.databaseId,
            config.collectionId
          );
          if (listRes.documents.length > 0) {
            // Priority 1: An event that is currently marked as 'Running'
            // Priority 2: An event that is 'Onboarding'
            // Priority 3: The latest event in the list
            const runningDoc = listRes.documents.find((d: any) => d.status === 'Running');
            const onboardingDoc = listRes.documents.slice().reverse().find((d: any) => d.status === 'Onboarding');
            const latestDoc = runningDoc || onboardingDoc || listRes.documents[listRes.documents.length - 1];
            activeId = latestDoc.$id;
            activeName = latestDoc.eventName || 'Challenge Event';
            const initialStatus = computeEventStatus((latestDoc as any).status);
            setCurrentEventId(activeId);
            setCurrentEventName(activeName);
            setEventStatus(initialStatus);
            eventStatusRef.current = initialStatus;
            localStorage.setItem('appwrite_active_event_id', activeId);
            localStorage.setItem('appwrite_active_event_name', activeName);
            localStorage.setItem('appwrite_active_event_status', initialStatus);
          }
        } catch (err) {
          console.warn("Could not auto-detect active event for guest:", err);
        }
      } else if (!user && activeId) {
        // If a public guest already has an event stored, check if another event is actively RUNNING
        try {
          const config = getDbConfig();
          const listRes = await databases.listDocuments(
            config.databaseId,
            config.collectionId
          );
          const runningDoc = listRes.documents.find((d: any) => d.status === 'Running');
          if (runningDoc && runningDoc.$id !== activeId) {
            activeId = runningDoc.$id;
            activeName = runningDoc.eventName || 'Challenge Event';
            const initialStatus = 'Running';
            setCurrentEventId(activeId);
            setCurrentEventName(activeName);
            setEventStatus(initialStatus);
            eventStatusRef.current = initialStatus;
            localStorage.setItem('appwrite_active_event_id', activeId);
            localStorage.setItem('appwrite_active_event_name', activeName);
            localStorage.setItem('appwrite_active_event_status', initialStatus);
          }
        } catch (e) {}
      } else {
        hasAutoDiscoveredRef.current = true;
      }

      if (!activeId) {
        setIsActiveEventLoaded(true);
        return;
      }
      
      if (activeId === 'local') {
        setSyncStatus('local');
        const localComps = localStorage.getItem('offline_competitors');
        if (localComps) {
          try {
            const parsed = JSON.parse(localComps);
            setCompetitors(parsed);
            const localStatus = computeEventStatus(localStorage.getItem('appwrite_active_event_status'), parsed);
            setEventStatus(localStatus);
            eventStatusRef.current = localStatus;
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
          activeId
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
        const resolvedStatus = computeEventStatus((document as any).status, parsedCompetitors);
        setEventStatus(resolvedStatus);
        eventStatusRef.current = resolvedStatus;
        localStorage.setItem('appwrite_active_event_status', resolvedStatus);

        // Save initial payload reference to prevent redundant writes
        lastSyncedPayloadRef.current = JSON.stringify(parsedCompetitors);
        setSyncStatus('synced');
        setIsActiveEventLoaded(true);
      } catch (err: any) {
        console.error("Failed to recover Appwrite active event:", err);
        // If document was deleted or does not exist, reset active event pointer cleanly
        if (
          err?.code === 404 || 
          err?.type === 'document_not_found' || 
          err?.message?.toLowerCase().includes('could not be found') ||
          err?.message?.toLowerCase().includes('not found')
        ) {
          console.warn("Active event document was removed from server. Resetting stored event session.");
          localStorage.removeItem('appwrite_active_event_id');
          localStorage.removeItem('appwrite_active_event_name');
          setCurrentEventId(null);
          setCurrentEventName(null);
          currentEventNameRef.current = null;
          setSyncStatus(null);
        } else {
          // General connectivity/auth error: load from local storage cache if available
          const localComps = localStorage.getItem('offline_competitors');
          if (localComps) {
            try {
              setCompetitors(JSON.parse(localComps));
            } catch (e) {}
          }
          setSyncStatus('error');
        }
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

    // Always maintain local offline cache safety
    localStorage.setItem('offline_competitors', JSON.stringify(updatedCompetitors));

    if (currentEventId === 'local') {
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
          status: eventStatusRef.current || 'Onboarding',
        };
        
        for (let i = 1; i <= 20; i++) {
          const competitor = competitorsToSync[i - 1];
          updateData[`competitor${i}`] = competitor ? JSON.stringify(competitor) : "";
        }

        try {
          await databases.updateDocument(
            config.databaseId,
            config.collectionId,
            currentEventId,
            updateData
          );
        } catch (writeErr: any) {
          // If status attribute is not yet created in the Appwrite collection schema, fallback safely without status
          if (
            writeErr?.message?.toLowerCase().includes('attribute') ||
            writeErr?.type?.toLowerCase().includes('attribute')
          ) {
            const fallbackData = { ...updateData };
            delete fallbackData.status;
            await databases.updateDocument(
              config.databaseId,
              config.collectionId,
              currentEventId,
              fallbackData
            );
          } else {
            throw writeErr;
          }
        }
        
        lastSyncedPayloadRef.current = currentPayload;
        setSyncStatus('synced');
      } catch (err: any) {
        console.error("Failed to synchronize competitor state to Appwrite:", err);
        if (
          err?.code === 404 || 
          err?.type === 'document_not_found' || 
          err?.message?.toLowerCase().includes('could not be found')
        ) {
          localStorage.removeItem('appwrite_active_event_id');
          localStorage.removeItem('appwrite_active_event_name');
          localStorage.removeItem('appwrite_active_event_status');
          setCurrentEventId(null);
          setCurrentEventName(null);
          currentEventNameRef.current = null;
          setEventStatus('Onboarding');
          eventStatusRef.current = 'Onboarding';
        }
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

  const updateEventStatus = async (newStatus: EventCompetitionStatus) => {
    setEventStatus(newStatus);
    eventStatusRef.current = newStatus;
    localStorage.setItem('appwrite_active_event_status', newStatus);

    if (currentEventId && currentEventId !== 'local' && isAppwriteConfigured()) {
      try {
        const config = getDbConfig();
        await databases.updateDocument(
          config.databaseId,
          config.collectionId,
          currentEventId,
          { status: newStatus }
        );
      } catch (err: any) {
        console.warn("Notice: Status attribute update skipped if schema not yet created:", err);
      }
    }
  };

  const retrySync = async () => {
    if (!currentEventId) return;
    if (currentEventId === 'local') {
      setSyncStatus('local');
      return;
    }
    lastSyncedPayloadRef.current = "";
    await syncCompetitors(competitors);
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

  const reorderCompetitors = (reorderedList: Competitor[]) => {
    setCompetitors(reorderedList);
    syncCompetitors(reorderedList);
  };

  const selectEvent = (
    eventId: string, 
    eventName: string, 
    eventCompetitors: Competitor[],
    status?: EventCompetitionStatus
  ) => {
    const finalStatus = status || computeEventStatus(null, eventCompetitors);
    setCurrentEventId(eventId);
    setCurrentEventName(eventName);
    currentEventNameRef.current = eventName;
    setEventStatus(finalStatus);
    eventStatusRef.current = finalStatus;
    setCompetitors(eventCompetitors);
    lastSyncedPayloadRef.current = JSON.stringify(eventCompetitors);
    setSyncStatus(eventId === 'local' ? 'local' : 'synced');
    setIsActiveEventLoaded(true);
    
    sessionStorage.removeItem('event_manually_closed');
    localStorage.setItem('appwrite_active_event_id', eventId);
    localStorage.setItem('appwrite_active_event_name', eventName);
    localStorage.setItem('appwrite_active_event_status', finalStatus);
    if (eventId === 'local') {
      localStorage.setItem('offline_competitors', JSON.stringify(eventCompetitors));
    }
  };

  const closeEvent = () => {
    sessionStorage.setItem('event_manually_closed', 'true');
    setCurrentEventId(null);
    setCurrentEventName(null);
    currentEventNameRef.current = null;
    setEventStatus('Onboarding');
    eventStatusRef.current = 'Onboarding';
    setCompetitors([]);
    lastSyncedPayloadRef.current = "";
    pendingSyncRef.current = null;
    isSyncingRef.current = false;
    setSyncStatus(null);
    setIsActiveEventLoaded(true);
    localStorage.removeItem('appwrite_active_event_id');
    localStorage.removeItem('appwrite_active_event_name');
    localStorage.removeItem('appwrite_active_event_status');
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

  return (
    <div className="min-h-screen w-full bg-slate-950 text-gray-100 font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Unified stationary background layer */}
      <div 
        style={{ backgroundImage: `url(${jetskiStormBg})` }}
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
      />
      {/* Dark storm tint overlay */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-brightness-[0.80] pointer-events-none z-0" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <Routes>
            {/* Public Routes - Accessible without login */}
            <Route 
              path="/leaderboard" 
              element={
                <LeaderboardPage 
                  competitors={competitors} 
                  currentEventName={currentEventName}
                  currentEventId={currentEventId}
                  eventStatus={eventStatus}
                  selectEvent={selectEvent}
                />
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
                  eventStatus={eventStatus}
                />
              } 
            />
            <Route
              path="/login"
              element={
                user ? <Navigate to="/" replace /> : <LoginPage />
              }
            />

            {/* Authenticated Routes */}
            <Route
              path="/"
              element={
                user ? (
                  <HomePage
                    addCompetitor={addCompetitor}
                    deleteCompetitor={deleteCompetitor}
                    updateCompetitor={updateCompetitor}
                    reorderCompetitors={reorderCompetitors}
                    competitors={competitors}
                    resetCompetition={resetCompetition}
                    currentEventId={currentEventId}
                    currentEventName={currentEventName}
                    eventStatus={eventStatus}
                    updateEventStatus={updateEventStatus}
                    syncStatus={syncStatus}
                    retrySync={retrySync}
                    selectEvent={selectEvent}
                    closeEvent={closeEvent}
                    renameActiveEvent={renameActiveEvent}
                  />
                ) : (
                  <Navigate to="/leaderboard" replace />
                )
              }
            />
            <Route
              path="/competition"
              element={
                user && role === 'admin' ? (
                  <CompetitionPage 
                    competitors={competitors} 
                    updateCompetitor={updateCompetitor}
                    currentEventName={currentEventName}
                    currentEventId={currentEventId}
                    eventStatus={eventStatus}
                    updateEventStatus={updateEventStatus}
                  />
                ) : (
                  <Navigate to={user ? "/" : "/leaderboard"} replace />
                )
              }
            />
            <Route
              path="/attendees"
              element={
                user && role === 'admin' ? (
                  <AttendeesPage />
                ) : (
                  <Navigate to={user ? "/" : "/leaderboard"} replace />
                )
              }
            />
            <Route 
              path="/bids" 
              element={
                user ? (
                  <BidsPage 
                    competitors={competitors} 
                    currentEventId={currentEventId}
                    currentEventName={currentEventName}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/leaderboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;

