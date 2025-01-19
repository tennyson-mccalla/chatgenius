export interface PresenceData {
  status: string;
  user: any;
}

export type UserPresenceMap = Map<string, PresenceData>;
