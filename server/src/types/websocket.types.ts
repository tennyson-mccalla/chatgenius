import { Types } from 'mongoose';

/**
 * Represents the possible states of a WebSocket connection.
 * Used to track the lifecycle of the connection.
 */
export enum WebSocketConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED'
}

/**
 * Defines the types of errors that can occur in WebSocket operations.
 * Used for error handling and client notifications.
 */
export enum WebSocketErrorType {
  CONNECTION_FAILED = 'WS001',
  SEND_FAILED = 'WS002',
  AUTH_FAILED = 'AUTH001',
  MESSAGE_FAILED = 'MSG001',
  INVALID_MESSAGE = 'MSG002',
  RATE_LIMITED = 'PR001',
  CHANNEL_ERROR = 'CH001'
}

/**
 * Comprehensive list of all WebSocket message types.
 * Used to identify the purpose and handling of each message.
 */
export enum WebSocketMessageType {
  // Connection
  AUTH = 'auth',
  AUTH_SUCCESS = 'auth_success',
  AUTH_ERROR = 'auth_error',
  ERROR = 'error',
  ERROR_ACK = 'error_ack',

  // Messages
  MESSAGE = 'message',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_UPDATED = 'message_updated',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_READ = 'message_read',
  UNREAD_UPDATED = 'unread_updated',

  // Channels
  CHANNEL_JOIN = 'channel_join',
  CHANNEL_JOINED = 'channel_joined',
  CHANNEL_LEAVE = 'channel_leave',
  CHANNEL_LEFT = 'channel_left',
  CHANNEL_CREATE = 'channel_create',
  CHANNEL_UPDATE = 'channel_update',
  CHANNEL_UPDATED = 'channel_updated',
  CHANNEL_INVITE = 'channel_invite',

  // Reactions
  REACTION_ADD = 'reaction_add',
  REACTION_ADDED = 'reaction_added',
  REACTION_REMOVE = 'reaction_remove',
  REACTION_REMOVED = 'reaction_removed',

  // Typing
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',

  // Presence
  PRESENCE_UPDATE = 'presence_update',
  PRESENCE_CHANGED = 'presence_changed',
  INITIAL_PRESENCE = 'initial_presence',

  CHANNELS_LOADED = 'channels_loaded'
}

/**
 * Authentication related payload types
 */
export interface AuthPayload {
  token: string;
}

export interface AuthSuccessPayload {
  userId: string;
  username: string;
}

/**
 * Message related payload types
 */
export interface MessagePayload {
  content: string;
  channelId: string;
  senderId: string;
  parentMessageId?: string;
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
  }>;
}

export interface MessageReceivedPayload {
  channelId: string;
  message: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      username: string;
      avatar?: string;
    };
    channel: {
      _id: string;
    };
    createdAt: string;
    reactions?: Array<{
      emoji: string;
      users: string[];
    }>;
  };
}

export interface MessageReadPayload {
  channelId: string;
  userId: string;
}

export interface UnreadUpdatePayload {
  channelId: string;
  count: number;
}

/**
 * Channel related payload types
 */
export interface ChannelJoinPayload {
  channelId: string;
  userId: string;
}

export interface ChannelUpdatePayload {
  channelId: string;
  name?: string;
  description?: string;
  isPrivate?: boolean;
  members?: string[];
}

export interface ChannelLeftPayload {
  channelId: string;
  userId: string;
}

/**
 * Typing indicator payload
 */
export interface TypingPayload {
  channelId: string;
  userId: string;
  username: string;
}

/**
 * Reaction related payload types
 */
export interface ReactionPayload {
  messageId: string;
  channelId: string;
  emoji: string;
  userId: string;
}

/**
 * Presence and status payload types
 */
export interface PresencePayload {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: number;
}

/**
 * Base interface for all WebSocket messages
 */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
  id?: string;
  timestamp: number;
}

/**
 * Error handling interface
 */
export interface WebSocketError {
  type: WebSocketErrorType;
  message: string;
  timestamp: number;
  data?: any;
}

/**
 * Configuration interfaces
 */
export interface WebSocketConfig {
  url: string;
  debug?: boolean;
  authTimeout?: number;
  reconnect: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    timeoutMs: number;
  };
}

export interface ChannelMember {
  _id: string;
  username: string;
  avatar?: string;
  status?: string;
}

export interface Channel {
  _id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  isDM: boolean;
  members: ChannelMember[];
  hasAccess: boolean;
}

export interface ChannelsLoadedPayload {
  channels: Channel[];
}
