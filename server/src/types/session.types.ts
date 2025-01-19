import 'express-session';

declare module 'express-session' {
  interface SessionData {
    token?: string;
    refreshToken?: string;
    oauthState?: string;
    oauthCallback?: string;
  }
}
