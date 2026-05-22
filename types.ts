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
  userId: string;
  userName: string;
  competitorId: string;
  competitorName: string;
  bidAmount: number;
  eventId: string;
  approvedByAdmin?: boolean;
}

