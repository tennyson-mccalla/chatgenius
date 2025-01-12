import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import passport from 'passport';
import { User } from '../models';

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await User.findOne({
        'oauthProviders.google': profile.id
      });

      if (!user) {
        // Create new user if doesn't exist
        user = await User.create({
          username: profile.displayName || `user_${profile.id}`,
          email: profile.emails?.[0]?.value,
          oauthProviders: {
            google: profile.id
          },
          avatar: profile.photos?.[0]?.value,
          isGuest: false,
          status: 'online'
        });
      }

      // Update last seen
      user.lastSeen = new Date();
      user.status = 'online';
      await user.save();

      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }
));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
    scope: ['user:email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await User.findOne({
        'oauthProviders.github': profile.id
      });

      if (!user) {
        // Create new user if doesn't exist
        user = await User.create({
          username: profile.username || profile.displayName || `github_${profile.id}`,
          email: profile.emails?.[0]?.value,
          oauthProviders: {
            github: profile.id
          },
          avatar: profile.photos?.[0]?.value,
          isGuest: false,
          status: 'online'
        });
      }

      // Update last seen
      user.lastSeen = new Date();
      user.status = 'online';
      await user.save();

      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }
));

export default passport;
