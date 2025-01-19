export interface CreateChannelParams {
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string;
  members?: string[];
}

export interface UpdateChannelParams {
  name?: string;
  description?: string;
  isPrivate?: boolean;
}
