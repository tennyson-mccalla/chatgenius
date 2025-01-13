import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';
import { User } from '../models';
import authService from '../services/auth.service';
import passwordResetService from '../services/password-reset.service';
import channelService from '../services/channel.service';

const router = Router();

// Middleware to ensure user is authenticated
const authenticate = passport.authenticate('jwt', { session: false });

// Register new user
router.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt:', { email: req.body.email, username: req.body.username });
    const user = await authService.register(req.body);

    const token = jwt.sign({ id: user._id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });

    console.log('Registration successful:', { userId: user._id });
    res.json({ token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Login with email/password
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email });
    const result = await authService.login(req.body.email, req.body.password);
    console.log('Login successful:', { userId: result.user._id });
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.status(500).json({ message: error.message });
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
router.get('/google', (req, res, next) => {
  console.log('Starting Google OAuth flow');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  console.log('Google callback received - Raw request:', {
    query: req.query,
    headers: req.headers,
  });

  passport.authenticate('google', { session: false }, async (err, user, info) => {
    console.log('Google auth callback details:', {
      error: err?.message,
      user: user?.id,
      info,
      isAuthenticated: req.isAuthenticated()
    });

    if (err) {
      console.error('Google OAuth error:', err);
      return res.redirect(`${process.env.CLIENT_URL}/#/login?error=oauth_error`);
    }

    if (!user) {
      console.log('Google OAuth failed - no user:', info);
      return res.redirect(`${process.env.CLIENT_URL}/#/login?error=no_user`);
    }

    try {
      console.log('Generating tokens for user:', user.id);
      const { token, refreshToken } = await authService.generateTokens(user.id);
      console.log('Tokens generated, redirecting to callback');

      // Add user to public channels if needed
      await channelService.addUserToPublicChannels(user.id);

      // Redirect with hash routing
      return res.redirect(`${process.env.CLIENT_URL}/#/oauth/callback?token=${token}&refreshToken=${refreshToken}`);
    } catch (error) {
      console.error('Token generation error:', error);
      return res.redirect(`${process.env.CLIENT_URL}/#/login?error=token_error`);
    }
  })(req, res, next);
});

// GitHub OAuth routes
router.get('/github', (req, res, next) => {
  console.log('Starting GitHub OAuth flow');
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  console.log('Received GitHub OAuth callback');
  passport.authenticate('github', { session: false }, async (err, user, info) => {
    console.log('GitHub OAuth result:', { error: err?.message, user: user?.id, info });

    if (err) {
      console.error('GitHub OAuth error:', err);
      return res.redirect(`${process.env.CLIENT_URL}/#/login?error=oauth_error`);
    }

    if (!user) {
      console.log('GitHub OAuth failed:', info?.message);
      return res.redirect(`${process.env.CLIENT_URL}/#/login?error=oauth_failed`);
    }

    try {
      const { token, refreshToken } = await authService.generateTokens(user.id);
      console.log('GitHub OAuth successful:', { userId: user.id });

      // Add user to public channels if needed
      await channelService.addUserToPublicChannels(user.id);

      // Use the same redirect format as Google OAuth
      return res.redirect(`${process.env.CLIENT_URL}/#/oauth/callback?token=${token}&refreshToken=${refreshToken}`);
    } catch (error) {
      console.error('Error generating tokens:', error);
      res.redirect(`${process.env.CLIENT_URL}/#/login?error=token_error`);
    }
  })(req, res, next);
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    await passwordResetService.createResetToken(email);
    res.json({ message: 'If an account exists with this email, you will receive password reset instructions.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    await passwordResetService.resetPassword(token, newPassword);
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get current user
router.get('/me', passport.authenticate('jwt', { session: false }), async (req, res) => {
  console.log('Get current user request:', { userId: req.user.id });
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      console.log('User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('User found:', user._id);
    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout
router.post('/logout', passport.authenticate('jwt', { session: false }), async (req, res) => {
  console.log('Logout request received for user:', req.user.id);
  try {
    await authService.logout(req.user.id);
    console.log('User logged out successfully:', req.user.id);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error logging out' });
  }
});

export default router;
