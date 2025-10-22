
import React from 'react';
import { Competitor, CompetitorStatus } from '../types';
import Timer from '../components/Timer';

interface CompetitionPageProps {
  competitors: Competitor[];
  updateCompetitor: (id: string, updates: Partial<Competitor>) => void;
}

const CompetitionPage: React.FC<CompetitionPageProps> = ({ competitors, updateCompetitor }) => {
  const handleTimerToggle = (competitor: Competitor) => {
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
    const newPoints = Math.max(0, competitor.penaltyPoints + delta);
    updateCompetitor(competitor.id, { penaltyPoints: newPoints });
  };
  
  const handleDqToggle = (competitor: Competitor) => {
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
        case CompetitorStatus.Pending: return 'Start Timer';
        case CompetitorStatus.Running: return 'Stop Timer';
        case CompetitorStatus.Finished: return 'Finished';
        case CompetitorStatus.Disqualified: return 'Disqualified';
    }
  }

  return (
     <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-sky-400 mb-2">Competition Live</h1>
        <p className="text-lg text-gray-400">Start and stop the timer for each competitor's run.</p>
      </div>

       {competitors.length === 0 ? (
        <p className="text-center text-gray-400 text-xl mt-10">No competitors registered. Please add them on the Home page.</p>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitors.map((competitor) => {
          const isDisqualified = competitor.status === CompetitorStatus.Disqualified;
          return (
            <div key={competitor.id} className={`bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col justify-between space-y-4 transition-all duration-300 ${isDisqualified ? 'border-2 border-red-500' : 'transform hover:scale-105'}`}>
              <div>
                <h3 className="text-xl font-bold text-sky-300 truncate">{competitor.fullName}</h3>
                <p className="text-gray-400">{competitor.companyName}</p>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <span className="text-sm text-gray-400 font-medium">PENALTIES</span>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handlePenaltyChange(competitor, -1)}
                        className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-lg font-bold transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Decrease penalty points"
                        disabled={competitor.penaltyPoints === 0 || isDisqualified}
                    >
                        -
                    </button>
                    <span className="font-mono text-xl w-10 text-center text-orange-400">{competitor.penaltyPoints}</span>
                    <button
                        onClick={() => handlePenaltyChange(competitor, 1)}
                        className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-lg font-bold transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Increase penalty points"
                        disabled={isDisqualified}
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
                  disabled={competitor.status === CompetitorStatus.Finished || isDisqualified}
                  className={`w-full py-2 px-4 text-white font-bold rounded-md transition duration-300 ${isDisqualified ? 'bg-gray-600 cursor-not-allowed' : getButtonClass(competitor.status)}`}
                >
                  {getButtonText(competitor.status)}
                </button>
                <div className="text-center h-5">
                    <button
                        onClick={() => handleDqToggle(competitor)}
                        className={`text-sm font-medium ${isDisqualified ? 'text-green-400 hover:text-green-300' : 'text-red-500 hover:text-red-400'}`}
                    >
                        {isDisqualified ? 'Reinstate Competitor' : 'Disqualify'}
                    </button>
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
