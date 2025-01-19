// Environment detection
export const isDev = process.env.NODE_ENV === 'development';

// Error codes
export const ErrorCodes = {
  // Auth errors
  AUTH_CHECK_FAILED: 'AUTH001',
  LOGOUT_FAILED: 'AUTH002',
  OAUTH_INVALID_STATE: 'AUTH003',
  OAUTH_MISSING_TOKEN: 'AUTH004',

  // WebSocket errors
  WS_CONNECTION_FAILED: 'WS001',
  WS_SEND_FAILED: 'WS002',

  // Channel errors
  CHANNEL_FETCH_FAILED: 'CH001',
  CHANNEL_CREATE_FAILED: 'CH002',

  // Message errors
  MESSAGE_SEND_FAILED: 'MSG001',
  MESSAGE_FETCH_FAILED: 'MSG002',

  // Presence errors
  PRESENCE_UPDATE_FAILED: 'PR001',
  PRESENCE_LASTSEEN_FAILED: 'PR002',

  // Reaction errors
  REACTION_ADD_FAILED: 'REACT001',
  REACTION_REMOVE_FAILED: 'REACT002'
};
