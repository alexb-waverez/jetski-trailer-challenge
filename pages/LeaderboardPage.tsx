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
      <div className="flex flex-col md:flex-row md:items-end justify-between items-center text-center md:text-left border-b border-white/10 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
            {isLive ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold leading-none bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE UPDATING</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold leading-none bg-black/60 text-gray-300 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                <span>OFFLINE VIEW</span>
              </span>
            )}
            <span className="text-xs text-gray-400 font-bold font-mono uppercase tracking-widest pl-2">
              COMPETITION TIMINGS
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-orbitron font-extrabold italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white drop-shadow-[0_2px_4px_rgba(8,145,178,0.5)]">
            {eventName}
          </h1>
        </div>
        <div className="text-center md:text-right font-mono text-xs text-gray-400">
          <p className="font-bold text-cyan-400 uppercase tracking-widest text-[10px]">Realtime Central Feed</p>
          <p className="mt-0.5">Device Connection: <span className="text-emerald-400 font-bold">STABLE</span></p>
        </div>
      </div>

      {/* Grid statistics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-5 md:p-6 rounded-3xl shadow-glass-glow flex items-center space-x-4">
          <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-cyan-300 font-mono tracking-wider block">Racers</span>
            <span className="text-2xl font-orbitron font-extrabold text-white">{totalRegistered}</span>
          </div>
        </div>

        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-5 md:p-6 rounded-3xl shadow-glass-glow flex items-center space-x-4">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 shrink-0">
            <Zap className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-300 font-mono tracking-wider block">Running</span>
            <span className="text-2xl font-orbitron font-extrabold text-white">{runningList.length}</span>
          </div>
        </div>

        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-5 md:p-6 rounded-3xl shadow-glass-glow flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-300 font-mono tracking-wider block">Finished</span>
            <span className="text-2xl font-orbitron font-extrabold text-white">{completedRunsCount}</span>
          </div>
        </div>

        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-5 md:p-6 rounded-3xl shadow-glass-glow flex items-center space-x-4 col-span-2 lg:col-span-1">
          <div className="p-3.5 bg-orange-500/10 border border-orange-500/30 rounded-2xl text-orange-400 shrink-0">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-300 font-mono tracking-wider block">Course Record</span>
            <span className="text-lg md:text-xl font-mono font-bold text-amber-300 truncate">
              {rawBestTime !== null ? formatTime(rawBestTime) : '--:--.---'}
            </span>
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
            Sorted strictly by (Raw Time + penalties [5s each])
          </span>
        </div>

        {finishedList.length === 0 ? (
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
                  <th className="py-4 px-6 font-bold uppercase text-center">Course Run</th>
                  <th className="py-4 px-6 font-bold uppercase text-right w-44">Total Adjusted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <AnimatePresence initial={false}>
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
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WAITING AREA / PENDING CHECKS */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl shadow-glass-glow overflow-hidden flex flex-col">
          <div className="p-4 bg-black/60 border-b border-white/10">
            <h3 className="text-xs font-orbitron font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              Racers Awaiting Run ({pendingList.length})
            </h3>
          </div>
          <div className="p-5 flex-1 divide-y divide-white/10 overflow-y-auto max-h-[320px]">
            {pendingList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6 font-mono">No racers registered or awaiting run.</p>
            ) : (
              pendingList.map(r => (
                <div key={r.id} className="py-3 flex justify-between items-center first:pt-1 last:pb-1">
                  <div>
                    <h4 className="font-orbitron font-bold text-white text-sm leading-tight">{r.fullName}</h4>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">{r.companyName}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 bg-cyan-950 border border-cyan-500/40 px-2.5 py-1 rounded-lg">
                    WAITING
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLD BENCH / DISQUALIFIED LINE */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl shadow-glass-glow overflow-hidden flex flex-col">
          <div className="p-4 bg-black/60 border-b border-white/10">
            <h3 className="text-xs font-orbitron font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Course Disqualifications ({disqualifiedList.length})
            </h3>
          </div>
          <div className="p-5 flex-1 divide-y divide-white/10 overflow-y-auto max-h-[320px]">
            {disqualifiedList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6 font-mono">No disqualifications reported. Safe racing!</p>
            ) : (
              disqualifiedList.map(r => (
                <div key={r.id} className="py-3 flex justify-between items-center first:pt-1 last:pb-1">
                  <div>
                    <h4 className="font-orbitron font-bold text-gray-400 text-sm leading-tight line-through">{r.fullName}</h4>
                    <span className="text-[11px] text-gray-500 font-mono block mt-0.5">{r.companyName}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-wider text-red-400 bg-red-950 border border-red-500/40 px-2.5 py-1 rounded-lg">
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
