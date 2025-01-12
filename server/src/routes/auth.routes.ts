import { Router } from 'express';
import passport from 'passport';
import authService from '../services/auth.service';
import '../config/oauth.config';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = await authService.register({ username, email, password });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Login with email/password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

// Guest login
router.post('/guest', async (req, res) => {
  try {
    const { username } = req.body;
    const result = await authService.createGuestUser(username);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
      }

      // Generate tokens
      const { token, refreshToken } = await authService.generateTokensForUser(user.id);

      // Redirect to client with tokens
      res.redirect(
        `${process.env.CLIENT_URL}/oauth/callback?token=${token}&refreshToken=${refreshToken}`
      );
    } catch (error) {
      res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

// GitHub OAuth routes
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
  passport.authenticate('github', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
      }

      // Generate tokens
      const { token, refreshToken } = await authService.generateTokensForUser(user.id);

      // Redirect to client with tokens
      res.redirect(
        `${process.env.CLIENT_URL}/oauth/callback?token=${token}&refreshToken=${refreshToken}`
      );
    } catch (error) {
      res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

// Get current user
router.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json(req.user);
});

export default router;
