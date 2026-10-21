import React from 'react';
import { EventCompetitionStatus } from '../types';
import { Play, CheckCircle2, UserCheck, Flag, Sparkles } from 'lucide-react';

interface EventStatusBadgeProps {
  status: EventCompetitionStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const EventStatusBadge: React.FC<EventStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const normalized = (status || 'Onboarding') as EventCompetitionStatus;

  const sizeClasses = {
    sm: 'text-[9px] px-2 py-0.5 rounded-lg gap-1 font-mono tracking-wider',
    md: 'text-xs px-2.5 py-1 rounded-xl gap-1.5 font-mono tracking-wider',
    lg: 'text-sm px-3.5 py-1.5 rounded-2xl gap-2 font-orbitron tracking-wide font-bold',
  }[size];

  if (normalized === 'Finished') {
    return (
      <span
        title="Competition is completed and finalized"
        className={`inline-flex items-center uppercase font-bold bg-gradient-to-r from-emerald-950/90 via-teal-950/70 to-black text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.3)] ${sizeClasses} ${className}`}
      >
        {showIcon && <CheckCircle2 className={size === 'lg' ? 'h-4 w-4 text-emerald-400' : 'h-3 w-3 text-emerald-400'} />}
        <span>Finished</span>
      </span>
    );
  }

  if (normalized === 'Running') {
    return (
      <span
        title="Competition is actively underway"
        className={`inline-flex items-center uppercase font-bold bg-gradient-to-r from-amber-950/80 via-red-950/70 to-black text-amber-300 border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)] ${sizeClasses} ${className}`}
      >
        {showIcon && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        )}
        <span>Running</span>
      </span>
    );
  }

  // Default: Onboarding
  return (
    <span
      title="Competition is being prepared (registering competitors & placing predictions)"
      className={`inline-flex items-center uppercase font-bold bg-gradient-to-r from-cyan-950/70 via-blue-950/60 to-black text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.2)] ${sizeClasses} ${className}`}
    >
      {showIcon && <UserCheck className={size === 'lg' ? 'h-4 w-4 text-cyan-400' : 'h-3 w-3 text-cyan-400'} />}
      <span>Onboarding</span>
    </span>
  );
};
