export enum CompetitorStatus {
  Pending = 'Pending',
  Running = 'Running',
  Finished = 'Finished',
  Disqualified = 'Disqualified',
}

export interface Competitor {
  id: string;
  fullName: string;
  companyName: string;
  startTime: number | null;
  endTime: number | null;
  elapsedTime: number | null;
  status: CompetitorStatus;
  penaltyPoints: number;
}

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  userId: string;
  email: string;
  role: UserRole;
}

export interface Bid {
  id: string;
  email: string;
  competitorName: string;
  eventId: string;
}

export interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

