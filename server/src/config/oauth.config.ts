import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Profile as GoogleProfile } from 'passport-google-oauth20';
import { Profile as GitHubProfile } from 'passport-github2';
import passport from 'passport';
import { User } from '../models';

// Configure Google OAuth Strategy
const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  },
  async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: any) => {
    try {
      console.log('Google OAuth configuration:', {
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        clientIDLength: process.env.GOOGLE_CLIENT_ID?.length,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
      });

      console.log('Google OAuth callback received:', {
        id: profile.id,
        displayName: profile.displayName,
        emails: profile.emails?.map(e => e.value) || []
      });

      // Check if user exists
      let user = await User.findOne({
        'oauthProviders.google': profile.id,
      });

      if (!user) {
        // Create new user if doesn't exist
        user = await User.create({
          username: profile.displayName || `google_${profile.id}`,
          email: profile.emails?.[0]?.value,
          oauthProviders: {
            google: profile.id,
          },
          avatar: profile.photos?.[0]?.value,
          isGuest: false,
          status: 'online',
        });
      }

      // Update last seen
      user.lastSeen = new Date();
      user.status = 'online';
      await user.save();

      return done(null, user);
    } catch (error) {
      console.error('Error in Google OAuth strategy:', error);
      return done(error);
    }
  }
);

// Configure GitHub OAuth Strategy
const githubStrategy = new GitHubStrategy(
  {
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: process.env.GITHUB_CALLBACK_URL!,
    scope: ['user:email']
  },
  async (accessToken: string, refreshToken: string, profile: GitHubProfile, done: any) => {
    try {
      console.log('GitHub OAuth configuration:', {
        callbackURL: process.env.GITHUB_CALLBACK_URL,
        clientIDLength: process.env.GITHUB_CLIENT_ID?.length,
        hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET
      });

      console.log('GitHub OAuth callback received:', {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        emails: profile.emails?.map(e => e.value) || []
      });

      // First try to find user by GitHub ID
      let user = await User.findOne({
        'oauthProviders.github': profile.id,
      });

      // If no user found by GitHub ID, try to find by email
      if (!user && profile.emails?.[0]?.value) {
        user = await User.findOne({ email: profile.emails[0].value });

        // If user exists with this email, update their GitHub provider
        if (user) {
          user.oauthProviders = {
            ...user.oauthProviders,
            github: profile.id
          };
          await user.save();
        }
      }

      // If still no user, create new one
      if (!user) {
        user = await User.create({
          username: profile.username || profile.displayName || `github_${profile.id}`,
          email: profile.emails?.[0]?.value,
          oauthProviders: {
            github: profile.id,
          },
          avatar: profile.photos?.[0]?.value,
          isGuest: false,
          status: 'online',
        });
      }

      // Update last seen
      user.lastSeen = new Date();
      user.status = 'online';
      await user.save();

      return done(null, user);
    } catch (error) {
      console.error('Error in GitHub OAuth strategy:', error);
      return done(error);
    }
  }
);

// Register strategies with passport
passport.use(googleStrategy);
passport.use(githubStrategy);

export default passport;
