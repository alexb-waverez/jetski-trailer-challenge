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

export type BidStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface Bid {
  id: string;
  $id?: string;
  email: string;
  competitorName: string;
  eventId: string;
  approvedByAdmin?: BidStatus;
  $createdAt?: string;
}

export interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export type EventCompetitionStatus = 'Onboarding' | 'Running' | 'Finished';

export const computeEventStatus = (
  explicitStatus?: string | null, 
  competitorsList?: Competitor[]
): EventCompetitionStatus => {
  if (explicitStatus === 'Onboarding' || explicitStatus === 'Running' || explicitStatus === 'Finished') {
    return explicitStatus;
  }
  if (!competitorsList || competitorsList.length === 0) {
    return 'Onboarding';
  }
  const allFinished = competitorsList.length > 0 && competitorsList.every(
    c => c.status === CompetitorStatus.Finished || c.status === CompetitorStatus.Disqualified
  );
  if (allFinished) return 'Finished';

  const hasRunningOrCompleted = competitorsList.some(
    c => c.status !== CompetitorStatus.Pending
  );
  if (hasRunningOrCompleted) return 'Running';

  return 'Onboarding';
};

