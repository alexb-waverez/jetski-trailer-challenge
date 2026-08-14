import React, { useState, useEffect } from 'react';
import { CompetitorStatus } from '../types';

interface TimerProps {
  startTime: number | null;
  status: CompetitorStatus;
  elapsedTime: number | null;
  penaltyPoints: number;
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

const Timer: React.FC<TimerProps> = ({ startTime, status, elapsedTime, penaltyPoints }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const penaltyMs = penaltyPoints * PENALTY_MS;

  useEffect(() => {
    let intervalId: number | undefined;

    if (status === CompetitorStatus.Running && startTime) {
      intervalId = window.setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 50); // Update every 50ms for smoother display
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status, startTime]);

  if (status === CompetitorStatus.Disqualified) {
    return <span className="font-mono text-xl sm:text-2xl font-black text-red-500 tracking-wider drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">DISQUALIFIED</span>;
  }

  if (status === CompetitorStatus.Finished && elapsedTime !== null) {
    return <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 tracking-widest drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">{formatTime(elapsedTime + penaltyMs)}</span>;
  }

  if (status === CompetitorStatus.Running) {
    return <span className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tracking-widest drop-shadow-[0_0_10px_rgba(252,211,77,0.7)] animate-pulse">{formatTime(currentTime + penaltyMs)}</span>;
  }
  
  // For pending state, show penalty time if any
  return <span className="font-mono text-2xl sm:text-3xl font-extrabold text-cyan-300/80 tracking-widest drop-shadow-[0_0_6px_rgba(34,211,238,0.3)]">{formatTime(penaltyMs)}</span>;
};

export default Timer;
