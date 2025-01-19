import { Router, Request } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';
import { User } from '../models';
import authService from '../services/auth.service';
import { IUser } from '../models/types';
import { WebSocketErrorType } from '../types/websocket.types';
import Logger from '../utils/logger';
import '../types/session.types';

const router = Router();

// Email/Password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token, refreshToken } = await authService.login(email, password);

    // Store tokens in session
    req.session.token = token;
    req.session.refreshToken = refreshToken;

    res.json({ user, token });
  } catch (error) {
    Logger.error('Login failed', {
      context: 'AuthRoutes',
      code: WebSocketErrorType.AUTH_FAILED,
      data: error instanceof Error ? error.message : String(error)
    });

    if (error instanceof Error && error.name === 'AuthError') {
      res.status(401).json({
        code: WebSocketErrorType.AUTH_FAILED,
        message: error.message,
        details: (error as any).details
      });
    } else {
      res.status(401).json({
        code: WebSocketErrorType.AUTH_FAILED,
        message: 'Invalid credentials'
      });
    }
  }
});

// Guest login
router.post('/guest', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      Logger.error('Guest login failed - missing username', {
        context: 'AuthRoutes',
        code: WebSocketErrorType.AUTH_FAILED
      });
      return res.status(400).json({
        code: WebSocketErrorType.AUTH_FAILED,
        message: 'Username is required'
      });
    }

    const { user, token } = await authService.createGuestUser(username);
    res.json({ token });
  } catch (error) {
    Logger.error('Guest login failed', {
      context: 'AuthRoutes',
      code: WebSocketErrorType.AUTH_FAILED,
      data: error instanceof Error ? error.message : String(error)
    });

    if (error instanceof Error && error.name === 'AuthError') {
      res.status(400).json({
        code: WebSocketErrorType.AUTH_FAILED,
        message: error.message,
        details: (error as any).details
      });
    } else {
      res.status(400).json({
        code: WebSocketErrorType.AUTH_FAILED,
        message: 'Guest login failed'
      });
    }
  }
});

// Google OAuth routes
router.get('/google', (req, res) => {
  const callbackUrl = req.query.callbackUrl as string;
  const state = req.query.state as string;

  Logger.info('Starting Google OAuth flow', {
    context: 'AuthRoutes',
    data: {
      callbackUrl,
      state: state.substring(0, 8) + '...'
    }
  });

  // Store state in session
  req.session.oauthState = state;
  req.session.oauthCallback = callbackUrl;

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state
  })(req, res);
});

router.get('/google/callback',
  (req, res, next) => {
    Logger.info('Google OAuth callback received', {
      context: 'AuthRoutes',
      data: {
        hasSession: !!req.session,
        state: req.query.state,
        savedState: req.session?.oauthState
      }
    });

    // Check for error from Google
    if (req.query.error) {
      Logger.error('Google OAuth error', {
        context: 'AuthRoutes',
        code: WebSocketErrorType.AUTH_FAILED,
        data: { error: req.query.error }
      });
      return res.redirect('/login?error=' + encodeURIComponent(req.query.error as string));
    }

    // Verify state parameter early
    const savedState = req.session?.oauthState;
    const receivedState = req.query.state;
    if (!savedState || !receivedState || savedState !== receivedState) {
      Logger.error('Invalid OAuth state', {
        context: 'AuthRoutes',
        code: WebSocketErrorType.AUTH_FAILED,
        data: {
          savedState: savedState?.substring(0, 8),
          receivedState: typeof receivedState === 'string' ? receivedState.substring(0, 8) : null
        }
      });
      return res.redirect('/login?error=invalid_state');
    }

    next();
  },
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?error=oauth_failed'
  }),
  (req, res) => {
    Logger.info('Google OAuth authentication successful', {
      context: 'AuthRoutes'
    });

    const user = req.user as IUser;
    if (!user?._id) {
      Logger.error('No user ID in authenticated request', {
        context: 'AuthRoutes',
        code: WebSocketErrorType.AUTH_FAILED
      });
      return res.redirect('/login?error=no_user');
    }

    const token = jwt.sign({ id: user._id }, jwtConfig.secret.toString(), {
      expiresIn: '7d'
    });

    const callbackUrl = req.session?.oauthCallback || '/auth/callback';
    Logger.info('Redirecting to callback URL', {
      context: 'AuthRoutes',
      data: {
        callbackUrl,
        tokenPreview: token.substring(0, 8) + '...'
      }
    });

    // Clear session data
    delete req.session.oauthState;
    delete req.session.oauthCallback;

    res.redirect(`${callbackUrl}?token=${token}&state=${req.query.state}`);
  }
);

// GitHub OAuth routes
router.get('/github', (req, res) => {
  const callbackUrl = req.query.callbackUrl as string;
  const state = req.query.state as string;

  Logger.info('Starting GitHub OAuth flow', {
    context: 'AuthRoutes',
    data: {
      callbackUrl,
      state: state.substring(0, 8) + '...'
    }
  });

  // Store state in session
  req.session.oauthState = state;
  req.session.oauthCallback = callbackUrl;

  passport.authenticate('github', {
    scope: ['user:email'],
    state
  })(req, res);
});

router.get('/github/callback',
  (req, res, next) => {
    Logger.info('GitHub OAuth callback received', {
      context: 'AuthRoutes',
      data: {
        hasSession: !!req.session,
        state: req.query.state,
        savedState: req.session?.oauthState
      }
    });

    // Check for error from GitHub
    if (req.query.error) {
      Logger.error('GitHub OAuth error', {
        context: 'AuthRoutes',
        code: WebSocketErrorType.AUTH_FAILED,
        data: { error: req.query.error }
      });
      return res.redirect('/login?error=' + encodeURIComponent(req.query.error as string));
    }

    // Verify state parameter early
    const savedState = req.session?.oauthState;
    const receivedState = req.query.state;
    if (!savedState || !receivedState || savedState !== receivedState) {
      Logger.error('Invalid OAuth state', {
        context: 'AuthRoutes',
        code: WebSocketErrorType.AUTH_FAILED,
        data: {
          savedState: savedState?.substring(0, 8),
          receivedState: typeof receivedState === 'string' ? receivedState.substring(0, 8) : null
        }
      });
      return res.redirect('/login?error=invalid_state');
    }

    next();
  },
  passport.authenticate('github', {
    session: false,
    failureRedirect: '/login?error=oauth_failed'
  }),
  (req, res) => {
    Logger.info('GitHub OAuth authentication successful', {
      context: 'AuthRoutes'
    });

    const user = req.user as IUser;
    if (!user?._id) {
      Logger.error('No user ID in authenticated request', {
        context: 'AuthRoutes',
        code: WebSocketErrorType.AUTH_FAILED
      });
      return res.redirect('/login?error=no_user');
    }

    const token = jwt.sign({ id: user._id }, jwtConfig.secret.toString(), {
      expiresIn: '7d'
    });

    const callbackUrl = req.session?.oauthCallback || '/auth/callback';
    Logger.info('Redirecting to callback URL', {
      context: 'AuthRoutes',
      data: {
        callbackUrl,
        tokenPreview: token.substring(0, 8) + '...'
      }
    });

    // Clear session data
    delete req.session.oauthState;
    delete req.session.oauthCallback;

    res.redirect(`${callbackUrl}?token=${token}&state=${req.query.state}`);
  }
);

// Get current user
router.get('/me',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json(req.user);
  }
);

// Auth check endpoint
router.get('/check', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth check request received:', {
      hasAuthHeader: !!authHeader,
      authHeader: authHeader ? `${authHeader.substring(0, 15)}...` : null
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.secret.toString()) as { id: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log('Auth check failed: User not found');
      return res.status(401).json({ message: 'Invalid token' });
    }

    console.log('Auth check successful:', { userId: user._id });
    res.json({ user });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
});

export default router;
