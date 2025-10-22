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
