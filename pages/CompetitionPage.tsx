
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
      if (!isAdmin) return 'bg-gray-850 border border-gray-700 text-gray-500 cursor-not-allowed';
      switch (status) {
          case CompetitorStatus.Pending:
            return 'bg-green-600 hover:bg-green-700';
          case CompetitorStatus.Running:
            return 'bg-red-600 hover:bg-red-700';
          case CompetitorStatus.Finished:
            return 'bg-gray-500 cursor-not-allowed';
          default:
            return 'bg-gray-600 cursor-not-allowed';
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
     <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-sky-400 mb-2">Competition Live</h1>
        <p className="text-lg text-gray-400">Start and stop the timer for each competitor's run.</p>
      </div>

      {!isAdmin && (
        <div className="bg-sky-950/65 border border-sky-505/30 p-4 rounded-xl flex items-start gap-3.5 max-w-2xl mx-auto text-left shadow-lg">
          <span className="text-2xl mt-0.5" role="img" aria-label="Lock">🔒</span>
          <div>
            <span className="text-xs font-bold font-mono text-sky-400 tracking-wider block uppercase">
              Spectator Access (View-Only)
            </span>
            <p className="text-sm text-gray-300 mt-0.5">
              You are signed in as a <strong>user</strong> spectator. Modifying course timers, technical penalty tallies, and competitor qualifications requires the <strong>admin</strong> role.
            </p>
          </div>
        </div>
      )}

       {competitors.length === 0 ? (
        <p className="text-center text-gray-400 text-xl mt-10">No competitors registered. Please add them on the Home page.</p>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitors.map((competitor) => {
          const isDisqualified = competitor.status === CompetitorStatus.Disqualified;
          return (
            <div key={competitor.id} className={`bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col justify-between space-y-4 transition-all duration-300 ${isDisqualified ? 'border-2 border-red-500' : 'transform hover:scale-102'}`}>
              <div>
                <h3 className="text-xl font-bold text-sky-300 truncate">{competitor.fullName}</h3>
                <p className="text-gray-400">{competitor.companyName}</p>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <span className="text-xs text-gray-400 font-bold font-mono tracking-wider">COURSE PENALTIES</span>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handlePenaltyChange(competitor, -1)}
                        className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-650 text-lg font-bold transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-white"
                        aria-label="Decrease penalty points"
                        disabled={competitor.penaltyPoints === 0 || isDisqualified || !isAdmin}
                    >
                        -
                    </button>
                    <span className="font-mono text-xl w-10 text-center text-orange-400 font-bold">{competitor.penaltyPoints}</span>
                    <button
                        onClick={() => handlePenaltyChange(competitor, 1)}
                        className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-650 text-lg font-bold transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-white"
                        aria-label="Increase penalty points"
                        disabled={isDisqualified || !isAdmin}
                    >
                        +
                    </button>
                </div>
              </div>

              <div className="text-center h-8 flex items-center justify-center">
                <Timer 
                  status={competitor.status} 
                  startTime={competitor.startTime} 
                  elapsedTime={competitor.elapsedTime}
                  penaltyPoints={competitor.penaltyPoints}
                />
              </div>
              
              <div className="mt-auto pt-2 space-y-2">
                <button
                  onClick={() => handleTimerToggle(competitor)}
                  disabled={competitor.status === CompetitorStatus.Finished || isDisqualified || !isAdmin}
                  className={`w-full py-2.5 px-4 text-white font-bold rounded-md transition duration-300 ${isDisqualified ? 'bg-gray-700/50 cursor-not-allowed' : getButtonClass(competitor.status)}`}
                >
                  {getButtonText(competitor.status)}
                </button>
                <div className="text-center h-5 flex items-center justify-center">
                    {isAdmin ? (
                        <button
                            onClick={() => handleDqToggle(competitor)}
                            className={`text-xs font-semibold uppercase tracking-wider ${isDisqualified ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}`}
                        >
                            {isDisqualified ? 'Reinstate Competitor' : 'Disqualify'}
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

