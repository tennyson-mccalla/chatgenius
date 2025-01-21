/**
 * Comprehensive list of all WebSocket message types.
 * Used to identify the purpose and handling of each message.
 */
import { User, UserStatus } from './user.types';

export enum WebSocketMessageType {
  // Connection messages
  AUTH = 'auth',
  AUTH_SUCCESS = 'auth_success',
  AUTH_ERROR = 'auth_error',
  CLIENT_READY = 'client_ready',
  READY_CONFIRMED = 'ready_confirmed',
  ERROR = 'error',

  // Channel messages
  CHANNELS_LOADED = 'channels_loaded',
  CHANNEL_JOIN = 'channel_join',
  CHANNEL_JOINED = 'channel_joined',
  CHANNEL_LEAVE = 'channel_leave',
  CHANNEL_LEFT = 'channel_left',
  CHANNEL_UPDATE = 'channel_update',
  CHANNEL_UPDATED = 'channel_updated',

  // Chat messages
  MESSAGE = 'message',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_UPDATED = 'message_updated',
  MESSAGE_DELETED = 'message_deleted',

  // Typing indicators
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',

  // Presence updates
  INITIAL_PRESENCE = 'initial_presence',
  PRESENCE_CHANGED = 'presence_changed',

  // Reactions
  REACTION_ADD = 'reaction_add',
  REACTION_ADDED = 'reaction_added',
  REACTION_REMOVE = 'reaction_remove',
  REACTION_REMOVED = 'reaction_removed'
}

export enum WebSocketErrorType {
  INVALID_MESSAGE = 'invalid_message',
  MESSAGE_FAILED = 'message_failed',
  AUTH_FAILED = 'auth_failed',
  CONNECTION_ERROR = 'connection_error'
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload?: any;
  timestamp?: number;
}

export interface WebSocketError {
  type: WebSocketErrorType;
  message: string;
  details?: any;
}

export interface PresencePayload {
  userId: string;
  username: string;
  status: UserStatus;
  lastSeen?: Date;
}

export interface TypingPayload {
  channelId: string;
  userId: string;
  username: string;
}

export interface MessagePayload {
  channelId: string;
  content: string;
}

export interface MessageReceivedPayload {
  channelId: string;
  message: {
    _id: string;
    content: string;
    sender: User;
    channel: {
      _id: string;
    };
    createdAt: string;
    updatedAt: string;
    reactions?: Array<{
      emoji: string;
      users: string[];
    }>;
  };
}

export interface ReactionPayload {
  messageId: string;
  channelId: string;
  emoji: string;
  userId: string;
}

export interface ChannelMember {
  _id: string;
  username: string;
  avatar?: string;
  status?: UserStatus;
}

export interface Channel {
  _id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  isDM: boolean;
  members: ChannelMember[];
  hasAccess: boolean;
  lastMessage?: Date;
}

export interface ChannelsLoadedPayload {
  channels: Channel[];
}
