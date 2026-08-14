
import React from 'react';
import { Competitor, CompetitorStatus } from '../types';
import Timer from '../components/Timer';
import { useAuth } from '../components/AuthProvider';

interface CompetitionPageProps {
  competitors: Competitor[];
  updateCompetitor: (id: string, updates: Partial<Competitor>) => void;
}

const CompetitionPage: React.FC<CompetitionPageProps> = ({ competitors, updateCompetitor }) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const handleTimerToggle = (competitor: Competitor) => {
    if (!isAdmin) return;
    if (competitor.status === CompetitorStatus.Pending) {
      updateCompetitor(competitor.id, {
        status: CompetitorStatus.Running,
        startTime: Date.now(),
      });
    } else if (competitor.status === CompetitorStatus.Running) {
      const endTime = Date.now();
      updateCompetitor(competitor.id, {
        status: CompetitorStatus.Finished,
        endTime,
        elapsedTime: endTime - (competitor.startTime || endTime),
      });
    }
  };

  const handlePenaltyChange = (competitor: Competitor, delta: number) => {
    if (!isAdmin) return;
    const newPoints = Math.max(0, competitor.penaltyPoints + delta);
    updateCompetitor(competitor.id, { penaltyPoints: newPoints });
  };
  
  const handleDqToggle = (competitor: Competitor) => {
    if (!isAdmin) return;
    if (competitor.status === CompetitorStatus.Disqualified) {
      // Reinstate competitor
      updateCompetitor(competitor.id, {
        status: CompetitorStatus.Pending,
        startTime: null,
        endTime: null,
        elapsedTime: null,
        penaltyPoints: 0,
      });
    } else {
      // Disqualify competitor
      updateCompetitor(competitor.id, {
        status: CompetitorStatus.Disqualified,
      });
    }
  };

  const getButtonClass = (status: CompetitorStatus) => {
    if (!isAdmin) return 'bg-black/40 border border-white/10 text-gray-500 font-mono text-xs cursor-not-allowed';
    switch (status) {
      case CompetitorStatus.Pending:
        return 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-orbitron font-bold italic uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] text-xs cursor-pointer';
      case CompetitorStatus.Running:
        return 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-orbitron font-black italic uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse text-xs cursor-pointer';
      case CompetitorStatus.Finished:
        return 'bg-black/60 border border-emerald-500/40 text-emerald-300 font-orbitron font-bold italic uppercase tracking-wider text-xs cursor-not-allowed';
      default:
        return 'bg-black/40 border border-white/10 text-gray-500 font-mono text-xs cursor-not-allowed';
    }
  }

  const getButtonText = (status: CompetitorStatus) => {
    switch (status) {
        case CompetitorStatus.Pending: return isAdmin ? 'Start Timer' : 'Pending Start';
        case CompetitorStatus.Running: return isAdmin ? 'Stop Timer' : 'Active Run';
        case CompetitorStatus.Finished: return 'Finished';
        case CompetitorStatus.Disqualified: return 'Disqualified';
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="text-center space-y-2">
        <h1 className="font-orbitron font-extrabold italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white text-3xl md:text-4xl drop-shadow-[0_2px_4px_rgba(8,145,178,0.5)]">
          Competition Live
        </h1>
        <p className="text-sm md:text-base text-gray-300 max-w-xl mx-auto font-sans leading-relaxed">
          Real-time precision timers and penalty points tracking for active course runs.
        </p>
      </div>

      {!isAdmin && (
        <div className="bg-slate-950/70 backdrop-blur-xl border border-cyan-500/30 p-5 rounded-3xl flex items-start gap-3.5 max-w-2xl mx-auto text-left shadow-glass-glow">
          <span className="text-2xl mt-0.5" role="img" aria-label="Lock">🔒</span>
          <div>
            <span className="text-xs font-bold font-mono text-cyan-300 tracking-wider block uppercase">
              Spectator Access (View-Only)
            </span>
            <p className="text-xs md:text-sm text-gray-300 mt-1 font-sans leading-relaxed">
              You are signed in as a <strong className="text-cyan-300">user</strong> spectator. Modifying course timers, technical penalty tallies, and competitor qualifications requires the <strong className="text-cyan-300">admin</strong> role.
            </p>
          </div>
        </div>
      )}

      {competitors.length === 0 ? (
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-12 text-center max-w-md mx-auto my-12 shadow-glass-glow space-y-3">
          <p className="text-gray-300 font-orbitron font-bold text-lg">No competitors registered</p>
          <p className="text-xs text-gray-400 font-mono">Please add competitors on the Home page to start runs.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitors.map((competitor, idx) => {
          const isDisqualified = competitor.status === CompetitorStatus.Disqualified;
          const isRunning = competitor.status === CompetitorStatus.Running;
          const isFinished = competitor.status === CompetitorStatus.Finished;

          return (
            <div 
              key={competitor.id} 
              className={`bg-slate-950/70 backdrop-blur-xl rounded-3xl shadow-glass-glow p-6 md:p-7 border flex flex-col justify-between space-y-5 transition-all duration-300 relative overflow-hidden group ${
                isDisqualified 
                  ? 'border-red-500/80 bg-red-955/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
                  : isRunning
                  ? 'border-amber-400/80 bg-amber-955/10 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                  : isFinished
                  ? 'border-emerald-500/50 bg-emerald-955/10'
                  : 'border-white/[0.08] hover:border-cyan-500/30'
              }`}
            >
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono font-extrabold text-cyan-300 uppercase px-2.5 py-0.5 bg-black/60 border border-white/10 rounded-lg">
                    RIDER #{idx + 1}
                  </span>
                  <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-lg border ${
                    isDisqualified
                      ? 'bg-red-950/80 text-red-300 border-red-500/40'
                      : isRunning
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse'
                      : isFinished
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-black/60 text-cyan-300 border-white/10'
                  }`}>
                    {competitor.status}
                  </span>
                </div>
                <h3 className="text-lg font-orbitron font-extrabold italic uppercase tracking-wider text-white truncate pt-1 group-hover:text-cyan-300 transition-colors">
                  {competitor.fullName}
                </h3>
                <p className="text-xs text-gray-400 font-mono uppercase truncate">{competitor.companyName}</p>
              </div>

              {/* Course Penalties Box */}
              <div className="bg-black/50 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-bold font-mono tracking-wider uppercase">
                  COURSE PENALTIES
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePenaltyChange(competitor, -1)}
                    className="w-8 h-8 rounded-xl bg-black/60 hover:bg-white/10 border border-white/10 hover:border-cyan-400 text-lg font-bold transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-white"
                    aria-label="Decrease penalty points"
                    disabled={competitor.penaltyPoints === 0 || isDisqualified || !isAdmin}
                  >
                    -
                  </button>
                  <span className="font-mono text-xl w-8 text-center text-amber-400 font-black">
                    {competitor.penaltyPoints}
                  </span>
                  <button
                    onClick={() => handlePenaltyChange(competitor, 1)}
                    className="w-8 h-8 rounded-xl bg-black/60 hover:bg-white/10 border border-white/10 hover:border-cyan-400 text-lg font-bold transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-white"
                    aria-label="Increase penalty points"
                    disabled={isDisqualified || !isAdmin}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Digital Timer Screen */}
              <div className="bg-black/80 border border-cyan-500/30 rounded-2xl py-3 px-4 text-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),0_0_15px_rgba(34,211,238,0.15)] flex items-center justify-center min-h-[58px]">
                <Timer 
                  status={competitor.status} 
                  startTime={competitor.startTime} 
                  elapsedTime={competitor.elapsedTime}
                  penaltyPoints={competitor.penaltyPoints}
                />
              </div>
              
              {/* Controls */}
              <div className="mt-auto pt-1 space-y-2.5">
                <button
                  onClick={() => handleTimerToggle(competitor)}
                  disabled={competitor.status === CompetitorStatus.Finished || isDisqualified || !isAdmin}
                  className={`w-full py-3 px-4 rounded-xl transition duration-300 ${
                    isDisqualified 
                      ? 'bg-black/40 border border-white/10 text-gray-500 font-mono text-xs cursor-not-allowed' 
                      : getButtonClass(competitor.status)
                  }`}
                >
                  {getButtonText(competitor.status)}
                </button>
                <div className="text-center h-5 flex items-center justify-center">
                    {isAdmin ? (
                      <button
                        onClick={() => handleDqToggle(competitor)}
                        className={`text-[11px] font-mono font-bold uppercase tracking-wider transition ${
                          isDisqualified ? 'text-emerald-400 hover:text-emerald-300' : 'text-red-400 hover:text-red-300'
                        }`}
                      >
                        {isDisqualified ? '✓ Reinstate Competitor' : '⚠ Disqualify Competitor'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Grading Disabled</span>
                    )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  );
};

export default CompetitionPage;

