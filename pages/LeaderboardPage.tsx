import React, { useState, useEffect } from 'react';
import { Competitor, CompetitorStatus } from '../types';
import { client, databases, getDbConfig, isAppwriteConfigured } from '../lib/appwrite';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Clock, Users, Zap, AlertTriangle, ShieldCheck, Play } from 'lucide-react';

interface LeaderboardPageProps {
  competitors: Competitor[];
  currentEventName: string | null;
  currentEventId: string | null;
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
      <span className="font-mono text-3xl md:text-4xl text-yellow-405 font-black tracking-wider drop-shadow-[0_2px_8px_rgba(234,179,8,0.2)]">
        {formatTime(totalTime)}
      </span>
      <span className="text-[10px] text-yellow-500 font-bold font-mono mt-0.5 tracking-widest animate-pulse">
        LIVE ELAPSED (ADJUSTED)
      </span>
    </div>
  );
};

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  competitors: initialCompetitors,
  currentEventName: initialEventName,
  currentEventId,
}) => {
  const [eventName, setEventName] = useState(initialEventName || 'Challenge Event');
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  const [isLive, setIsLive] = useState(false);

  // Keep local states synced with props changes
  useEffect(() => {
    setCompetitors(initialCompetitors);
  }, [initialCompetitors]);

  useEffect(() => {
    if (initialEventName) {
      setEventName(initialEventName);
    }
  }, [initialEventName]);

  // Appwrite Realtime Subscriptions
  useEffect(() => {
    if (!currentEventId || currentEventId === 'local' || !isAppwriteConfigured()) {
      setIsLive(false);
      return;
    }

    const config = getDbConfig();
    const channel = `databases.${config.databaseId}.collections.${config.collectionId}.documents.${currentEventId}`;
    
    // Set status to live subscribed
    setIsLive(true);

    const unsubscribe = client.subscribe(channel, (response: any) => {
      const doc = response.payload;
      if (!doc) return;

      const updatedCompetitors: Competitor[] = [];
      for (let i = 1; i <= 20; i++) {
        const compStr = doc[`competitor${i}`];
        if (compStr && compStr.trim()) {
          try {
            updatedCompetitors.push(JSON.parse(compStr));
          } catch (e) {
            console.error("Failed to parse real-time competitor payload:", e);
          }
        }
      }

      setCompetitors(updatedCompetitors);
      if (doc.eventName) {
        setEventName(doc.eventName);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentEventId]);

  // local backup sync if in local offline mode
  useEffect(() => {
    if (currentEventId === 'local') {
      const interval = setInterval(() => {
        const localComps = localStorage.getItem('offline_competitors');
        if (localComps) {
          try {
            const parsed = JSON.parse(localComps);
            setCompetitors(parsed);
          } catch (e) {
            // ignore JSON error
          }
        }
      }, 1000); // Check local storage every second for offline timing syncing
      return () => clearInterval(interval);
    }
  }, [currentEventId]);

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

  // Key Stats Calculations
  const totalRegistered = competitors.length;
  const completedRunsCount = finishedList.length;
  const rawBestTime = finishedList.length > 0 
    ? finishedList[0].elapsedTime! + finishedList[0].penaltyPoints * PENALTY_MS 
    : null;

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between items-center text-center md:text-left border-b border-gray-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 justify-center md:justify-start mb-1.5">
            {isLive ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold leading-none bg-emerald-500/15 text-emerald-405 border border-emerald-500/25 shadow-md shadow-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>LIVE UPDATING</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold leading-none bg-gray-700/60 text-gray-300 border border-gray-650">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                <span>OFFLINE VIEW</span>
              </span>
            )}
            <span className="text-xs text-gray-500 font-bold font-mono uppercase tracking-widest pl-2">
              COMPETITION TIMINGS
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            {eventName}
          </h1>
        </div>
        <div className="text-center md:text-right font-mono text-xs text-gray-400">
          <p className="font-bold text-sky-400 uppercase tracking-widest text-[10px]">Realtime Central Feed</p>
          <p className="mt-0.5">Device Connection: <span className="text-emerald-400 font-bold">STABLE</span></p>
        </div>
      </div>

      {/* Grid statistics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-gray-800/80 border border-gray-750 p-5 rounded-xl shadow-lg flex items-center space-x-4">
          <div className="p-3 bg-sky-500/10 border border-sky-500/15 rounded-lg text-sky-450 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Racers</span>
            <span className="text-2xl font-black text-white font-mono">{totalRegistered}</span>
          </div>
        </div>

        <div className="bg-gray-800/80 border border-gray-750 p-5 rounded-xl shadow-lg flex items-center space-x-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/15 rounded-lg text-yellow-455 shrink-0">
            <Zap className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Running</span>
            <span className="text-2xl font-black text-white font-mono">{runningList.length}</span>
          </div>
        </div>

        <div className="bg-gray-800/80 border border-gray-750 p-5 rounded-xl shadow-lg flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-lg text-emerald-455 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Finished</span>
            <span className="text-2xl font-black text-white font-mono">{completedRunsCount}</span>
          </div>
        </div>

        <div className="bg-gray-800/80 border border-gray-750 p-5 rounded-xl shadow-lg flex items-center space-x-4 col-span-2 lg:col-span-1">
          <div className="p-3 bg-orange-500/10 border border-orange-500/15 rounded-lg text-orange-455 shrink-0">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Course Record</span>
            <span className="text-lg md:text-xl font-black text-orange-400 font-mono truncate">
              {rawBestTime !== null ? formatTime(rawBestTime) : '--:--.---'}
            </span>
          </div>
        </div>
      </div>

      {/* ACTIVE RUNNING OVERLAY DISPLAY - GIVES STICKY FEEDBACK */}
      {runningList.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-950/20 via-yellow-950/40 to-yellow-950/20 border-2 border-yellow-500/40 p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Pulsing indicator decor */}
          <div className="absolute top-0 right-0 h-40 w-40 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="text-xs font-black tracking-widest text-yellow-500 uppercase font-mono">
              HOT ACTION: NOW ON COURSE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {runningList.map(runner => (
              <div key={runner.id} className="bg-gray-900/90 border border-yellow-500/20 p-5 rounded-xl flex flex-col md:flex-row items-center md:justify-between gap-4">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-black text-white tracking-tight">{runner.fullName}</h3>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{runner.companyName}</p>
                  
                  {runner.penaltyPoints > 0 && (
                    <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
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
      <div className="bg-gray-800 border border-gray-750 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-750 bg-gray-850/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5.5 w-5.5 text-yellow-405" />
            <h2 className="text-xl font-black text-white tracking-tight">Race Rankings</h2>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">
            Sorted strictly by (Raw Time + penalties [5s each])
          </span>
        </div>

        {finishedList.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <div className="h-12 w-12 rounded-full border border-dashed border-gray-700 flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
            <p className="text-base font-semibold">No competitors finished yet.</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Once an administrator starts runs in the Competition room and stops timers, completed entries will sort onto this score panel in realtime!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 border-b border-gray-750 font-mono text-[10px] text-gray-400 tracking-wider">
                  <th className="py-4 px-6 font-bold uppercase text-center w-16">Rank</th>
                  <th className="py-4 px-6 font-bold uppercase">Competitor</th>
                  <th className="py-4 px-6 font-bold uppercase text-center">Penalties</th>
                  <th className="py-4 px-6 font-bold uppercase text-center">Course Run</th>
                  <th className="py-4 px-6 font-bold uppercase text-right w-44">Total Adjusted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-750/50">
                <AnimatePresence initial={false}>
                  {finishedList.map((competitor, idx) => {
                    const rank = idx + 1;
                    const isPodium = rank <= 3;
                    const penaltyTime = competitor.penaltyPoints * PENALTY_MS;
                    const totalAdjusted = (competitor.elapsedTime || 0) + penaltyTime;

                    const getPodiumClass = (pos: number) => {
                      if (pos === 1) return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
                      if (pos === 2) return 'bg-slate-305/10 text-slate-300 border border-slate-300/20';
                      return 'bg-amber-600/10 text-amber-500 border border-amber-600/20';
                    };

                    const getRankLabel = (pos: number) => {
                      if (pos === 1) return '🏆 1st';
                      if (pos === 2) return '🥈 2nd';
                      if (pos === pos) return `🥉 3rd`;
                    };

                    return (
                      <motion.tr 
                        key={competitor.id}
                        layoutId={competitor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className={`transition-colors hover:bg-gray-750/20 ${idx % 2 === 0 ? 'bg-gray-800/10' : 'bg-transparent'}`}
                      >
                        <td className="py-4 px-6 text-center">
                          {isPodium ? (
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-black font-mono tracking-wide ${getPodiumClass(rank)}`}>
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
                            <p className="font-bold text-white text-base leading-tight hover:text-sky-400 transition-colors">
                              {competitor.fullName}
                            </p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                              {competitor.companyName}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {competitor.penaltyPoints > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2.5 py-1 rounded">
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
                          <span className={`font-mono text-base font-black ${isPodium ? 'text-emerald-400' : 'text-sky-300'}`}>
                            {formatTime(totalAdjusted)}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WAITING AREA / PENDING CHECKS */}
        <div className="bg-gray-800 border border-gray-750 rounded-xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 bg-gray-850 border-b border-gray-750">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Racers Awaiting Run ({pendingList.length})
            </h3>
          </div>
          <div className="p-5 flex-1 divide-y divide-gray-750/30 overflow-y-auto max-h-[320px]">
            {pendingList.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6 font-mono">No racers registered or awaiting run.</p>
            ) : (
              pendingList.map(r => (
                <div key={r.id} className="py-2.5 flex justify-between items-center first:pt-1 last:pb-1">
                  <div>
                    <h4 className="font-semibold text-white text-sm leading-tight">{r.fullName}</h4>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">{r.companyName}</p>
                  </div>
                  <span className="text-[10px] font-bold font-mono tracking-wider text-sky-400 bg-sky-950/40 border border-sky-900 px-2 py-0.5 rounded">
                    WAITING
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLD BENCH / DISQUALIFIED LINE */}
        <div className="bg-gray-800 border border-gray-750 rounded-xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 bg-gray-850 border-b border-gray-750">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Course Disqualifications ({disqualifiedList.length})
            </h3>
          </div>
          <div className="p-5 flex-1 divide-y divide-gray-750/30 overflow-y-auto max-h-[320px]">
            {disqualifiedList.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6 font-mono">No disqualifications reported. Safe racing!</p>
            ) : (
              disqualifiedList.map(r => (
                <div key={r.id} className="py-2.5 flex justify-between items-center first:pt-1 last:pb-1">
                  <div>
                    <h4 className="font-semibold text-gray-200 text-sm leading-tight line-through">{r.fullName}</h4>
                    <span className="text-[11px] text-gray-400 font-mono block mt-0.5">{r.companyName}</span>
                  </div>
                  <span className="text-[10px] font-bold font-mono tracking-wider text-red-500 bg-red-950/20 border border-red-900/30 px-2 py-0.5 rounded">
                    DQ
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
