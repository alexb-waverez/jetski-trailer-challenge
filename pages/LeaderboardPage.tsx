import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Competitor, CompetitorStatus, EventCompetitionStatus, computeEventStatus, parseCompetitorsFromDoc } from '../types';
import { client, databases, getDbConfig, isAppwriteConfigured } from '../lib/appwrite';
import { EventStatusBadge } from '../components/EventStatusBadge';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Clock, 
  Users, 
  Zap, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowDownAZ, 
  ArrowUpAZ, 
  Shuffle, 
  RotateCcw, 
  RefreshCw, 
  Layers, 
  Search, 
  X, 
  Calendar, 
  ChevronRight, 
  Loader2 
} from 'lucide-react';

interface LeaderboardPageProps {
  competitors: Competitor[];
  currentEventName: string | null;
  currentEventId: string | null;
  eventStatus?: EventCompetitionStatus;
  selectEvent?: (
    eventId: string,
    eventName: string,
    competitors: Competitor[],
    status?: EventCompetitionStatus
  ) => void;
}

const PENALTY_MS = 5000;

const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
    milliseconds
  ).padStart(3, '0')}`;
};

// Internal Live Digital Stopwatch for Active Runners
const ActiveRunnerTimer: React.FC<{ startTime: number; penaltyPoints: number }> = ({
  startTime,
  penaltyPoints,
}) => {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now() - startTime);
    }, 47); // Updates ~20 times per second for smooth ms rendering
    return () => clearInterval(interval);
  }, [startTime]);

  const totalTime = currentTime + penaltyPoints * PENALTY_MS;

  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-3xl md:text-4xl text-amber-300 font-black tracking-widest drop-shadow-[0_0_12px_rgba(252,211,77,0.7)] animate-pulse">
        {formatTime(totalTime)}
      </span>
      <span className="text-[10px] text-amber-400 font-bold font-mono mt-0.5 tracking-widest uppercase">
        LIVE ELAPSED (ADJUSTED)
      </span>
    </div>
  );
};

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  competitors: initialCompetitors,
  currentEventName: initialEventName,
  currentEventId,
  eventStatus: initialEventStatus,
  selectEvent,
}) => {
  // Local active event ID allows public spectators to switch competitions if desired
  const [activeEventId, setActiveEventId] = useState<string | null>(currentEventId);
  const [eventName, setEventName] = useState(initialEventName || 'Challenge Event');
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  const [status, setStatus] = useState<EventCompetitionStatus>(initialEventStatus || 'Onboarding');
  
  // Real-time synchronization state (pure WebSocket via Appwrite Realtime wss://)
  const [syncMode, setSyncMode] = useState<'websocket' | 'local' | 'connecting'>('connecting');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cross-event detection: detect if another competition has become 'Running' via WebSocket push
  const [otherRunningEvent, setOtherRunningEvent] = useState<{ id: string; name: string } | null>(null);

  // Switch Event Modal states for public users
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [loadingEventsList, setLoadingEventsList] = useState(false);
  const [eventsListError, setEventsListError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Sorting state for Racers Awaiting Run
  const [awaitingSort, setAwaitingSort] = useState<'default' | 'az' | 'za' | 'random'>('default');
  const [randomOrderIds, setRandomOrderIds] = useState<string[]>([]);

  // Ref tracking current competitors to prevent redundant re-renders
  const lastPayloadStringRef = useRef<string>(JSON.stringify(initialCompetitors));

  // Sync props changes from parent
  useEffect(() => {
    if (currentEventId && currentEventId !== activeEventId) {
      setActiveEventId(currentEventId);
    }
  }, [currentEventId]);

  useEffect(() => {
    if (initialCompetitors && initialCompetitors.length > 0) {
      setCompetitors(initialCompetitors);
      lastPayloadStringRef.current = JSON.stringify(initialCompetitors);
    }
  }, [initialCompetitors]);

  useEffect(() => {
    if (initialEventName) {
      setEventName(initialEventName);
    }
  }, [initialEventName]);

  useEffect(() => {
    if (initialEventStatus) {
      setStatus(initialEventStatus);
    }
  }, [initialEventStatus]);

  // Keep secondsAgo counter active (purely local client-side time tracking)
  useEffect(() => {
    const t = setInterval(() => {
      if (lastSyncTime) {
        setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastSyncTime.getTime()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lastSyncTime]);

  // Baseline document fetcher for active event (runs ONCE on initial load or on manual user refresh)
  const fetchEventData = async (targetId: string, showIndicator = false) => {
    if (!targetId) return;
    if (showIndicator) setIsRefreshing(true);

    if (targetId === 'local' || !isAppwriteConfigured()) {
      const localComps = localStorage.getItem('offline_competitors');
      const localName = localStorage.getItem('appwrite_active_event_name');
      const localStatus = localStorage.getItem('appwrite_active_event_status');
      if (localComps) {
        try {
          const parsed = JSON.parse(localComps);
          setCompetitors(parsed);
          setStatus(computeEventStatus(localStatus, parsed));
        } catch (e) {}
      }
      if (localName) setEventName(localName);
      setSyncMode('local');
      setLastSyncTime(new Date());
      if (showIndicator) setTimeout(() => setIsRefreshing(false), 250);
      return;
    }

    try {
      const config = getDbConfig();
      const doc: any = await databases.getDocument(
        config.databaseId,
        config.collectionId,
        targetId
      );

      const parsedComps = parseCompetitorsFromDoc(doc);
      const payloadString = JSON.stringify(parsedComps);
      
      // Update state if anything changed
      if (payloadString !== lastPayloadStringRef.current) {
        lastPayloadStringRef.current = payloadString;
        setCompetitors(parsedComps);
      }

      if (doc.eventName) {
        setEventName(doc.eventName);
      }

      const computed = computeEventStatus(doc.status, parsedComps);
      setStatus(computed);
      setLastSyncTime(new Date());
      setSyncMode('websocket');
    } catch (err) {
      console.warn("Initial event snapshot fetch error:", err);
    } finally {
      if (showIndicator) setTimeout(() => setIsRefreshing(false), 250);
    }
  };

  // Auto-discover event on mount if no activeEventId is present (runs ONCE on startup)
  useEffect(() => {
    if (!activeEventId && isAppwriteConfigured()) {
      const config = getDbConfig();
      databases.listDocuments(config.databaseId, config.collectionId)
        .then(res => {
          if (res.documents.length > 0) {
            const runningDoc = res.documents.find((d: any) => d.status === 'Running');
            const onboardingDoc = res.documents.slice().reverse().find((d: any) => d.status === 'Onboarding');
            const chosen = runningDoc || onboardingDoc || res.documents[res.documents.length - 1];
            
            setActiveEventId(chosen.$id);
            setEventName(chosen.eventName || 'Challenge Event');
            const comps = parseCompetitorsFromDoc(chosen);
            setCompetitors(comps);
            const computedStatus = computeEventStatus(chosen.status, comps);
            setStatus(computedStatus);
            setLastSyncTime(new Date());
            setSyncMode('websocket');

            if (selectEvent) {
              selectEvent(chosen.$id, chosen.eventName || 'Challenge Event', comps, computedStatus);
            }
          }
        })
        .catch(err => {
          console.warn("Failed auto-discovering event for leaderboard:", err);
        });
    }
  }, [activeEventId]);

  // Pure Realtime Engine: Appwrite Realtime WebSocket (wss://)
  // Subscribes to live WebSocket channels with ZERO recurring GET requests or polling.
  useEffect(() => {
    if (!activeEventId || activeEventId === 'local' || !isAppwriteConfigured()) {
      if (activeEventId === 'local') setSyncMode('local');
      return;
    }

    const config = getDbConfig();
    const docChannel = `databases.${config.databaseId}.collections.${config.collectionId}.documents.${activeEventId}`;
    const collChannel = `databases.${config.databaseId}.collections.${config.collectionId}.documents`;

    let isSubscribed = true;
    let unsubscribe: (() => void) | null = null;

    // Load initial snapshot once upon connecting
    fetchEventData(activeEventId);

    // Setup pure real-time WebSocket connection
    try {
      unsubscribe = client.subscribe([docChannel, collChannel], (response: any) => {
        if (!isSubscribed) return;
        const doc = response.payload;
        if (!doc) return;

        // If the payload is for our actively monitored event
        if (doc.$id === activeEventId || (!doc.$id && response.channels?.some((c: string) => c.includes(activeEventId)))) {
          const updatedComps = parseCompetitorsFromDoc(doc);
          const payloadStr = JSON.stringify(updatedComps);
          lastPayloadStringRef.current = payloadStr;
          setCompetitors(updatedComps);

          if (doc.eventName) {
            setEventName(doc.eventName);
          }
          const resolvedStatus = computeEventStatus(doc.status, updatedComps);
          setStatus(resolvedStatus);
          setSyncMode('websocket');
          setLastSyncTime(new Date());
        } else if (doc.status === 'Running' && doc.$id !== activeEventId) {
          // A different event transitioned to Running via WebSocket push!
          setOtherRunningEvent({
            id: doc.$id,
            name: doc.eventName || 'Challenge Event',
          });
        } else if (otherRunningEvent && doc.$id === otherRunningEvent.id && doc.status !== 'Running') {
          setOtherRunningEvent(null);
        }
      });
      setSyncMode('websocket');
    } catch (err) {
      console.warn("WebSocket subscribe error:", err);
    }

    return () => {
      isSubscribed = false;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (e) {}
      }
    };
  }, [activeEventId]);

  // Local storage cross-tab sync (instant zero-latency tab-to-tab updates)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'offline_competitors' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setCompetitors(parsed);
          setLastSyncTime(new Date());
        } catch (err) {}
      }
      if (e.key === 'appwrite_active_event_status' && e.newValue) {
        setStatus(e.newValue as EventCompetitionStatus);
      }
      if (e.key === 'appwrite_active_event_name' && e.newValue) {
        setEventName(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Compute Leaderboard classifications
  const finishedList = competitors
    .filter(c => c.status === CompetitorStatus.Finished && c.elapsedTime !== null)
    .sort((a, b) => {
      const timeA = a.elapsedTime! + a.penaltyPoints * PENALTY_MS;
      const timeB = b.elapsedTime! + b.penaltyPoints * PENALTY_MS;
      return timeA - timeB;
    });

  const runningList = competitors.filter(c => c.status === CompetitorStatus.Running);
  const pendingList = competitors.filter(c => c.status === CompetitorStatus.Pending);
  const disqualifiedList = competitors.filter(c => c.status === CompetitorStatus.Disqualified);

  // Sorting handlers for Racers Awaiting Run
  const handleAlphabeticalSort = () => {
    if (awaitingSort === 'az') {
      setAwaitingSort('za');
    } else {
      setAwaitingSort('az');
    }
  };

  const handleRandomSort = () => {
    setAwaitingSort('random');
    const ids = pendingList.map(r => r.id);
    // Fisher-Yates random shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setRandomOrderIds(ids);
  };

  const handleResetSort = () => {
    setAwaitingSort('default');
    setRandomOrderIds([]);
  };

  // Compute sorted awaiting queue
  const sortedPendingList = useMemo(() => {
    let list = [...pendingList];
    if (awaitingSort === 'az') {
      return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else if (awaitingSort === 'za') {
      return list.sort((a, b) => b.fullName.localeCompare(a.fullName));
    } else if (awaitingSort === 'random' && randomOrderIds.length > 0) {
      const map = new Map(randomOrderIds.map((id, idx) => [id, idx]));
      return list.sort((a, b) => {
        const idxA = map.has(a.id) ? map.get(a.id)! : 999;
        const idxB = map.has(b.id) ? map.get(b.id)! : 999;
        return idxA - idxB;
      });
    }
    return list;
  }, [pendingList, awaitingSort, randomOrderIds]);

  // Key Stats Calculations
  const totalRegistered = competitors.length;
  // Finished includes both timed completions and disqualified racers
  const completedRunsCount = finishedList.length + disqualifiedList.length;
  // Racers remaining to run (pending + running)
  const racersRemaining = pendingList.length + runningList.length;
  
  const rawBestTime = finishedList.length > 0 
    ? finishedList[0].elapsedTime! + finishedList[0].penaltyPoints * PENALTY_MS 
    : null;

  // Penalties calculations
  const competitorsWithPenalties = competitors.filter(c => c.penaltyPoints > 0);
  const maxPenalties = competitorsWithPenalties.length > 0
    ? Math.max(...competitorsWithPenalties.map(c => c.penaltyPoints))
    : 0;
  const mostPenalizedRacers = competitorsWithPenalties.filter(c => c.penaltyPoints === maxPenalties);
  const mostPenalizedLabel = mostPenalizedRacers.length > 0
    ? mostPenalizedRacers.map(r => r.fullName).join(', ')
    : 'None';

  // Handler to switch to another active running event
  const handleSwitchToRunningEvent = async () => {
    if (!otherRunningEvent) return;
    const targetId = otherRunningEvent.id;
    const targetName = otherRunningEvent.name;
    setActiveEventId(targetId);
    setEventName(targetName);
    setOtherRunningEvent(null);
    await fetchEventData(targetId, true);
    if (selectEvent) {
      selectEvent(targetId, targetName, competitors, 'Running');
    }
  };

  // Handler to load all events for the competition switcher modal
  const fetchAllEventsForModal = async () => {
    setLoadingEventsList(true);
    setEventsListError(null);
    try {
      if (!isAppwriteConfigured()) {
        const localComps = localStorage.getItem('offline_competitors');
        const localName = localStorage.getItem('appwrite_active_event_name') || 'Local Offline Mode';
        const localStatus = localStorage.getItem('appwrite_active_event_status') || 'Onboarding';
        const comps = localComps ? JSON.parse(localComps) : [];
        setAvailableEvents([{
          $id: 'local',
          eventName: localName,
          status: localStatus,
          competitorsCount: comps.length,
          competitors: comps,
        }]);
        return;
      }
      const config = getDbConfig();
      const res = await databases.listDocuments(config.databaseId, config.collectionId);
      const mapped = res.documents.map((d: any) => {
        const comps = parseCompetitorsFromDoc(d);
        return {
          $id: d.$id,
          eventName: d.eventName || 'Challenge Event',
          status: computeEventStatus(d.status, comps),
          competitorsCount: comps.length,
          competitors: comps,
          $createdAt: d.$createdAt,
        };
      });
      // Sort: 'Running' first, then latest created
      mapped.sort((a: any, b: any) => {
        if (a.status === 'Running' && b.status !== 'Running') return -1;
        if (b.status === 'Running' && a.status !== 'Running') return 1;
        return (new Date(b.$createdAt || 0).getTime()) - (new Date(a.$createdAt || 0).getTime());
      });
      setAvailableEvents(mapped);
    } catch (err: any) {
      console.error("Failed to fetch events for modal:", err);
      setEventsListError(err.message || "Failed to load competitions list");
    } finally {
      setLoadingEventsList(false);
    }
  };

  const handleSelectEventFromModal = (ev: any) => {
    setActiveEventId(ev.$id);
    setEventName(ev.eventName);
    setCompetitors(ev.competitors || []);
    setStatus(ev.status || 'Onboarding');
    lastPayloadStringRef.current = JSON.stringify(ev.competitors || []);
    setShowSwitchModal(false);
    if (selectEvent) {
      selectEvent(ev.$id, ev.eventName, ev.competitors || [], ev.status);
    }
    fetchEventData(ev.$id, true);
  };

  const filteredEvents = availableEvents.filter(ev => 
    ev.eventName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      {/* Live running competition notification banner if viewing a different competition */}
      {otherRunningEvent && (
        <div className="bg-gradient-to-r from-red-950/90 via-amber-950/80 to-red-950/90 border border-amber-500/60 p-4 rounded-3xl shadow-[0_0_20px_rgba(245,158,11,0.25)] flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-ping shrink-0" />
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                  LIVE ACTION DETECTED
                </span>
                <span className="text-xs text-gray-300 font-mono">Another competition is currently running!</span>
              </div>
              <p className="font-orbitron font-black text-white text-base mt-0.5">
                "{otherRunningEvent.name}" is LIVE on the course
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSwitchToRunningEvent}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-black font-orbitron font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)] whitespace-nowrap flex items-center gap-1.5"
          >
            <Zap className="h-3.5 w-3.5 fill-black" />
            <span>Switch to Live Event</span>
          </button>
        </div>
      )}

      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between items-center text-center md:text-left border-b border-white/10 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 justify-center md:justify-start mb-2 flex-wrap">
            {/* Real-time status indicator */}
            {syncMode === 'websocket' ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold leading-none bg-emerald-950/70 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>REALTIME WEBSOCKET</span>
                <span className="text-[9px] text-emerald-400/80 pl-1 border-l border-emerald-500/30">
                  {secondsAgo <= 2 ? 'just now' : `${secondsAgo}s ago`}
                </span>
              </span>
            ) : syncMode === 'local' ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold leading-none bg-black/60 text-gray-300 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                <span>OFFLINE LOCAL SYNC</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold leading-none bg-black/60 text-gray-400 border border-white/10">
                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                <span>CONNECTING WEBSOCKET...</span>
              </span>
            )}

            {/* Manual refresh button */}
            <button
              type="button"
              onClick={() => {
                if (activeEventId) fetchEventData(activeEventId, true);
              }}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-cyan-300 transition cursor-pointer"
              title="Force snapshot sync"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <span className="text-xs text-gray-400 font-bold font-mono uppercase tracking-widest pl-1">
              TIMINGS
            </span>
            <EventStatusBadge status={status} size="sm" />
          </div>

          <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
            <h1 className="text-3xl md:text-4xl font-orbitron font-extrabold italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white drop-shadow-[0_2px_4px_rgba(8,145,178,0.5)]">
              {eventName}
            </h1>
            
            {/* Switch / View Competitions button */}
            <button
              type="button"
              onClick={() => {
                setShowSwitchModal(true);
                fetchAllEventsForModal();
              }}
              className="px-3 py-1 bg-black/60 hover:bg-white/10 border border-white/15 hover:border-cyan-500/40 text-gray-300 hover:text-cyan-300 font-mono text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Switch between different competitions or heats"
            >
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>Competitions</span>
            </button>
          </div>
        </div>

        <div className="text-center md:text-right font-mono text-xs text-gray-400">
          <p className="font-bold text-cyan-400 uppercase tracking-widest text-[10px]">Realtime Central Feed</p>
          <p className="mt-0.5">
            Protocol: <span className="text-emerald-400 font-bold uppercase">{syncMode === 'websocket' ? 'REALTIME WEBSOCKET (WSS)' : syncMode === 'local' ? 'OFFLINE LOCAL' : 'CONNECTING...'}</span>
          </p>
        </div>
      </div>

      {/* Grid statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
        {/* Total Racers */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-4 md:p-5 rounded-3xl shadow-glass-glow flex items-center space-x-3.5">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-cyan-300 font-mono tracking-wider block">Racers</span>
            <span className="text-xl md:text-2xl font-orbitron font-extrabold text-white">{totalRegistered}</span>
            <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">Total registered</p>
          </div>
        </div>

        {/* Racers Remaining */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-4 md:p-5 rounded-3xl shadow-glass-glow flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-indigo-300 font-mono tracking-wider block">Remaining</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl md:text-2xl font-orbitron font-extrabold text-white">{racersRemaining}</span>
              {runningList.length > 0 && (
                <span className="text-[9px] font-mono text-amber-400 font-bold">({runningList.length} live)</span>
              )}
            </div>
            <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">{pendingList.length} in queue</p>
          </div>
        </div>

        {/* Running */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-4 md:p-5 rounded-3xl shadow-glass-glow flex items-center space-x-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 shrink-0">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-amber-300 font-mono tracking-wider block">Running</span>
            <span className="text-xl md:text-2xl font-orbitron font-extrabold text-white">{runningList.length}</span>
            <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">Active on course</p>
          </div>
        </div>

        {/* Finished (Includes Disqualified) */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-4 md:p-5 rounded-3xl shadow-glass-glow flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-emerald-300 font-mono tracking-wider block">Finished</span>
            <span className="text-xl md:text-2xl font-orbitron font-extrabold text-white">{completedRunsCount}</span>
            <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">
              {disqualifiedList.length > 0 
                ? `${finishedList.length} timed, ${disqualifiedList.length} DQ` 
                : 'Timed & Disqualified'}
            </p>
          </div>
        </div>

        {/* Most Penalties & Who */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-4 md:p-5 rounded-3xl shadow-glass-glow flex items-center space-x-3.5">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-red-300 font-mono tracking-wider block truncate">
              Most Penalties
            </span>
            {maxPenalties > 0 ? (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl md:text-2xl font-orbitron font-extrabold text-red-400">{maxPenalties}</span>
                  <span className="text-[9px] font-mono text-red-400/80 font-bold">(+{maxPenalties * 5}s)</span>
                </div>
                <p className="text-[10px] font-mono text-white/90 truncate font-semibold mt-0.5" title={mostPenalizedLabel}>
                  {mostPenalizedLabel}
                </p>
              </div>
            ) : (
              <div>
                <span className="text-xl md:text-2xl font-orbitron font-extrabold text-emerald-400">0</span>
                <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">Clean course runs</p>
              </div>
            )}
          </div>
        </div>

        {/* Course Record */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-4 md:p-5 rounded-3xl shadow-glass-glow flex items-center space-x-3.5">
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-2xl text-orange-400 shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-orange-300 font-mono tracking-wider block">Course Record</span>
            <span className="text-base md:text-lg font-mono font-bold text-amber-300 truncate block">
              {rawBestTime !== null ? formatTime(rawBestTime) : '--:--.---'}
            </span>
            <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">
              {finishedList.length > 0 ? finishedList[0].fullName : 'No times yet'}
            </p>
          </div>
        </div>
      </div>

      {/* ACTIVE RUNNING OVERLAY DISPLAY - GIVES STICKY FEEDBACK */}
      {runningList.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/30 via-slate-950/80 to-amber-950/30 border border-amber-400/50 p-6 md:p-8 rounded-3xl shadow-glass-glow relative overflow-hidden backdrop-blur-2xl">
          {/* Pulsing indicator decor */}
          <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="text-xs font-orbitron font-bold tracking-widest text-amber-300 uppercase">
              HOT ACTION: NOW ON COURSE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {runningList.map(runner => (
              <div key={runner.id} className="bg-black/60 border border-amber-400/30 p-5 rounded-2xl flex flex-col md:flex-row items-center md:justify-between gap-4">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-orbitron font-extrabold text-white tracking-tight">{runner.fullName}</h3>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{runner.companyName}</p>
                  
                  {runner.penaltyPoints > 0 && (
                    <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      <AlertTriangle className="h-3 w-3" />
                      +{runner.penaltyPoints * 5}s Penalty Added ({runner.penaltyPoints})
                    </span>
                  )}
                </div>
                {runner.startTime && (
                  <ActiveRunnerTimer startTime={runner.startTime} penaltyPoints={runner.penaltyPoints} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN RANKINGS BOARD */}
      <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl shadow-glass-glow overflow-hidden">
        <div className="p-6 border-b border-white/10 bg-black/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xl font-orbitron font-extrabold italic uppercase tracking-wider text-white">Race Rankings</h2>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">
            Sorted strictly by (Course Run + penalties [5s each])
          </span>
        </div>

        {finishedList.length === 0 && disqualifiedList.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <div className="h-12 w-12 rounded-full border border-dashed border-white/20 flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-base font-orbitron font-bold text-gray-300">No competitors finished yet.</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans">
              Once an administrator starts runs in the Competition room and stops timers, completed entries will sort onto this score panel in realtime!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/80 border-b border-white/10 font-mono text-[10px] text-cyan-300 tracking-wider">
                  <th className="py-4 px-6 font-bold uppercase text-center w-20">Rank</th>
                  <th className="py-4 px-6 font-bold uppercase">Competitor</th>
                  <th className="py-4 px-6 font-bold uppercase text-center">Penalties</th>
                  <th className="py-4 px-6 font-bold uppercase text-center" title="The raw, unpenalized elapsed stopwatch time on the course">
                    <div className="flex flex-col items-center">
                      <span>Course Run</span>
                      <span className="text-[9px] font-mono text-cyan-400/80 font-normal lowercase tracking-normal">raw track time</span>
                    </div>
                  </th>
                  <th className="py-4 px-6 font-bold uppercase text-right w-44" title="Final official time = Course Run + (Penalties × 5s)">
                    <div className="flex flex-col items-end">
                      <span>Total Adjusted</span>
                      <span className="text-[9px] font-mono text-emerald-400/80 font-normal lowercase tracking-normal">run time + penalties</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <AnimatePresence initial={false}>
                  {/* Ranked Finished Competitors */}
                  {finishedList.map((competitor, idx) => {
                    const rank = idx + 1;
                    const isPodium = rank <= 3;
                    const penaltyTime = competitor.penaltyPoints * PENALTY_MS;
                    const totalAdjusted = (competitor.elapsedTime || 0) + penaltyTime;

                    const getPodiumClass = (pos: number) => {
                      if (pos === 1) return 'bg-amber-500/10 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
                      if (pos === 2) return 'bg-slate-300/10 text-slate-100 border border-slate-300/40';
                      return 'bg-amber-700/10 text-amber-300 border border-amber-700/40';
                    };

                    const getRankLabel = (pos: number) => {
                      if (pos === 1) return '🏆 1st';
                      if (pos === 2) return '🥈 2nd';
                      if (pos === 3) return '🥉 3rd';
                    };

                    return (
                      <motion.tr 
                        key={competitor.id}
                        layoutId={competitor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="transition-colors hover:bg-white/5 border-b border-white/10"
                      >
                        <td className="py-4 px-6 text-center">
                          {isPodium ? (
                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-bold font-orbitron tracking-wide ${getPodiumClass(rank)}`}>
                              {getRankLabel(rank) || rank}
                            </span>
                          ) : (
                            <span className="font-mono text-sm font-bold text-gray-400 pl-1">
                              {rank}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-orbitron font-bold text-white text-base leading-tight hover:text-cyan-300 transition-colors">
                              {competitor.fullName}
                            </p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                              {competitor.companyName}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {competitor.penaltyPoints > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              {competitor.penaltyPoints} penalty
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-gray-500">None</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="font-mono text-sm text-gray-300">
                            {formatTime(competitor.elapsedTime || 0)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={`font-mono text-base font-black ${isPodium ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-cyan-300'}`}>
                            {formatTime(totalAdjusted)}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}

                  {/* Disqualified Competitors listed at the end of the Leaderboard in RED */}
                  {disqualifiedList.map((competitor) => (
                    <motion.tr 
                      key={competitor.id}
                      layoutId={competitor.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="bg-red-950/20 hover:bg-red-950/35 border-b border-red-500/25 transition-colors"
                    >
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-xl text-xs font-bold font-mono tracking-wide bg-red-950 text-red-400 border border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                          DQ
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-orbitron font-bold text-red-300 text-base leading-tight line-through decoration-red-500/60">
                            {competitor.fullName}
                          </p>
                          <p className="text-xs text-red-400/70 font-mono mt-0.5">
                            {competitor.companyName}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {competitor.penaltyPoints > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-lg">
                            <AlertTriangle className="h-3 w-3 shrink-0 text-red-400" />
                            {competitor.penaltyPoints} penalty
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-red-500/70">None</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-mono text-sm text-red-300/80">
                          {competitor.elapsedTime !== null && competitor.elapsedTime !== undefined
                            ? formatTime(competitor.elapsedTime)
                            : '--:--.---'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-mono text-xs md:text-sm font-black text-red-400 bg-red-950/90 border border-red-500/50 px-3 py-1.5 rounded-xl uppercase tracking-wider inline-flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                          Disqualified
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WAITING AREA / PENDING CHECKS (FULL WIDTH) */}
      <div className="w-full">
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl shadow-glass-glow overflow-hidden flex flex-col">
          <div className="p-4 bg-black/60 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <h3 className="text-xs font-orbitron font-extrabold uppercase tracking-wider text-white">
                Racers Awaiting Run ({pendingList.length})
              </h3>
            </div>

            {pendingList.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Alphabetical Sort Toggle Button */}
                <button
                  type="button"
                  onClick={handleAlphabeticalSort}
                  className={`py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 cursor-pointer border ${
                    awaitingSort === 'az' || awaitingSort === 'za'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                      : 'bg-black/50 text-gray-300 border-white/10 hover:border-cyan-500/40 hover:text-cyan-300'
                  }`}
                  title={awaitingSort === 'az' ? 'Switch to Z-A Alphabetical Order' : 'Sort Alphabetically (A-Z)'}
                >
                  {awaitingSort === 'za' ? (
                    <ArrowUpAZ className="h-3 w-3 text-cyan-400" />
                  ) : (
                    <ArrowDownAZ className="h-3 w-3 text-cyan-400" />
                  )}
                  <span>{awaitingSort === 'za' ? 'Z-A' : awaitingSort === 'az' ? 'A-Z' : 'Sort A-Z'}</span>
                </button>

                {/* Random / Shuffle Sort Button */}
                <button
                  type="button"
                  onClick={handleRandomSort}
                  className={`py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 cursor-pointer border ${
                    awaitingSort === 'random'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
                      : 'bg-black/50 text-gray-300 border-white/10 hover:border-purple-500/40 hover:text-purple-300'
                  }`}
                  title="Randomize / Shuffle Awaiting Queue Order"
                >
                  <Shuffle className="h-3 w-3 text-purple-400" />
                  <span>{awaitingSort === 'random' ? 'Re-Shuffle' : 'Random'}</span>
                </button>

                {/* Reset to Default Order */}
                {awaitingSort !== 'default' && (
                  <button
                    type="button"
                    onClick={handleResetSort}
                    className="py-1 px-2 rounded-lg text-[10px] font-mono font-bold bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/10 transition flex items-center gap-1 cursor-pointer"
                    title="Reset to Default Registration Order"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-5 flex-1 divide-y divide-white/10 overflow-y-auto max-h-[360px]">
            {sortedPendingList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6 font-mono">No racers registered or awaiting run.</p>
            ) : (
              <AnimatePresence initial={false}>
                {sortedPendingList.map((r, idx) => (
                  <motion.div 
                    key={r.id} 
                    layoutId={`awaiting-${r.id}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    className="py-3 flex justify-between items-center first:pt-1 last:pb-1 group hover:bg-white/[0.02] px-2 rounded-lg -mx-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-gray-500 w-5 text-right shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-orbitron font-bold text-white text-sm leading-tight truncate group-hover:text-cyan-300 transition-colors">
                          {r.fullName}
                        </h4>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">{r.companyName}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-1 rounded-lg shrink-0 ml-2 shadow-[0_0_6px_rgba(34,211,238,0.15)]">
                      WAITING
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* PUBLIC COMPETITION SWITCHER MODAL */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-orbitron font-bold text-lg text-white">Select Competition</h3>
                  <p className="text-xs font-mono text-gray-400">View real-time timing & rankings for any event</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search filter input */}
            <div className="mt-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search competitions by name..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* Event List */}
            <div className="mt-4 overflow-y-auto flex-1 space-y-2.5 pr-1">
              {loadingEventsList ? (
                <div className="py-12 text-center text-gray-400 text-xs font-mono flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                  <span>Loading available competitions...</span>
                </div>
              ) : eventsListError ? (
                <div className="py-8 text-center text-red-400 text-xs font-mono bg-red-950/20 border border-red-500/30 rounded-2xl p-4">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-400" />
                  <p className="font-bold">Failed to load competitions list</p>
                  <p className="text-[11px] text-gray-400 mt-1">{eventsListError}</p>
                  <button
                    type="button"
                    onClick={fetchAllEventsForModal}
                    className="mt-3 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-xs font-mono border border-red-500/40 transition cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs font-mono">
                  No competitions matching "{searchFilter}"
                </div>
              ) : (
                filteredEvents.map(ev => {
                  const isCurrent = ev.$id === activeEventId;
                  const isRunning = ev.status === 'Running';

                  return (
                    <button
                      key={ev.$id}
                      type="button"
                      onClick={() => handleSelectEventFromModal(ev)}
                      className={`w-full text-left p-4 rounded-2xl border transition flex items-center justify-between gap-3 group cursor-pointer ${
                        isCurrent 
                          ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                          : isRunning
                          ? 'bg-amber-950/30 hover:bg-amber-950/50 border-amber-500/40'
                          : 'bg-black/40 hover:bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-orbitron font-bold text-white text-sm group-hover:text-cyan-300 transition truncate">
                            {ev.eventName}
                          </h4>
                          {isCurrent && (
                            <span className="text-[9px] font-mono font-bold bg-cyan-400 text-black px-2 py-0.5 rounded-full">
                              CURRENTLY VIEWING
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-cyan-400" />
                            <span>{ev.competitorsCount} racers</span>
                          </span>
                          {ev.$createdAt && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(ev.$createdAt).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <EventStatusBadge status={ev.status} size="sm" />
                        <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-cyan-300 transition transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>{availableEvents.length} competitions stored</span>
              <button
                type="button"
                onClick={fetchAllEventsForModal}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${loadingEventsList ? 'animate-spin' : ''}`} />
                <span>Refresh List</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
