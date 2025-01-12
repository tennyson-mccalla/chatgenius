import { Router } from 'express';
import passport from 'passport';
import authService from '../services/auth.service';
import passwordResetService from '../services/password-reset.service';

const router = Router();

// Middleware to ensure user is authenticated
const authenticate = passport.authenticate('jwt', { session: false });

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
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        console.error('Google OAuth Error:', err);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent(err.message)}`);
      }

      if (!user) {
        console.error('Google OAuth: No user returned', info);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
      }

      // Generate tokens
      authService.generateTokensForUser(user.id)
        .then(({ token, refreshToken }) => {
          res.redirect(
            `${process.env.CLIENT_URL}/oauth/callback?token=${token}&refreshToken=${refreshToken}`
          );
        })
        .catch(error => {
          console.error('Token generation error:', error);
          res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
        });
    })(req, res, next);
  }
);

// GitHub OAuth routes
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
  (req, res, next) => {
    passport.authenticate('github', { session: false }, (err, user, info) => {
      if (err) {
        console.error('GitHub OAuth Error:', err);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent(err.message)}`);
      }

      if (!user) {
        console.error('GitHub OAuth: No user returned', info);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
      }

      // Generate tokens
      authService.generateTokensForUser(user.id)
        .then(({ token, refreshToken }) => {
          res.redirect(
            `${process.env.CLIENT_URL}/oauth/callback?token=${token}&refreshToken=${refreshToken}`
          );
        })
        .catch(error => {
          console.error('Token generation error:', error);
          res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
        });
    })(req, res, next);
  }
);

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
router.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json(req.user);
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a stateless JWT setup, we don't need to do anything server-side
    // The client will remove the tokens
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out' });
  }
});

export default router;
