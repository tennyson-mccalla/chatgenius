import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Profile as GoogleProfile } from 'passport-google-oauth20';
import { Profile as GitHubProfile } from 'passport-github2';
import passport from 'passport';
import { User } from '../models';
import channelService from '../services/channel.service';

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
      console.log('Google OAuth profile received:', {
        id: profile.id,
        displayName: profile.displayName,
        emails: profile.emails?.map(e => e.value),
        photos: profile.photos?.map(p => p.value)
      });

      // Check if user exists
      let user = await User.findOne({
        $or: [
          { 'oauthProviders.google': profile.id },
          { email: profile.emails?.[0]?.value }
        ]
      });

      if (!user) {
        console.log('Creating new user for Google OAuth');
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
          lastSeen: new Date()
        });

        // Add user to public channels
        await channelService.addUserToPublicChannels(user._id.toString());
        console.log('New user created:', { userId: user._id });
      } else {
        console.log('Existing user found:', { userId: user._id });
        // Update user info
        user.lastSeen = new Date();
        user.status = 'online';
        if (!user.oauthProviders?.google) {
          user.oauthProviders = {
            ...user.oauthProviders,
            google: profile.id
          };
        }
        await user.save();
      }

      // Add id field for consistency
      const userWithId = {
        ...user.toObject(),
        id: user._id
      };

      return done(null, userWithId);
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

      console.log('GitHub OAuth profile received:', {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        emails: profile.emails?.map(e => e.value) || [],
        photos: profile.photos?.map(p => p.value) || []
      });

      // Check if user exists
      let user = await User.findOne({
        'oauthProviders.github': profile.id,
      });

      if (!user) {
        console.log('Creating new user for GitHub OAuth');
        // Create new user if doesn't exist
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
        console.log('New user created:', { userId: user.id });
      } else {
        console.log('Existing user found:', { userId: user.id });
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
