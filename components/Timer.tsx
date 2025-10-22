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
    return <span className="font-mono text-2xl text-red-500 font-bold">DISQUALIFIED</span>;
  }

  if (status === CompetitorStatus.Finished && elapsedTime !== null) {
    return <span className="font-mono text-2xl text-green-400">{formatTime(elapsedTime + penaltyMs)}</span>;
  }

  if (status === CompetitorStatus.Running) {
    return <span className="font-mono text-2xl text-yellow-400">{formatTime(currentTime + penaltyMs)}</span>;
  }
  
  // For pending state, show penalty time if any
  return <span className="font-mono text-2xl text-gray-500">{formatTime(penaltyMs)}</span>;
};

export default Timer;
