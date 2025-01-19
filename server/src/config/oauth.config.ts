import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { User } from '../models';
import { jwtConfig } from './jwt.config';
import { channelService } from '../services/channel.service';
import { Request } from 'express';
import '../types/session.types';

interface JwtPayload {
  id: string;
}

// Configure JWT strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtConfig.secret.toString()
}, async (payload: JwtPayload, done) => {
  try {
    const user = await User.findById(payload.id);
    if (!user) {
      return done(null, false);
    }
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  passReqToCallback: true
}, async (req: Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    // Verify state parameter
    const savedState = req.session?.oauthState;
    const receivedState = req.query.state;

    if (!savedState || !receivedState || savedState !== receivedState) {
      return done(null, false, { message: 'Invalid state parameter' });
    }

    // First try to find user by Google ID
    let user = await User.findOne({ googleId: profile.id });

    // If no user found by Google ID, try by email
    if (!user && profile.emails?.[0]?.value) {
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        // Update existing user with Google info
        user.googleId = profile.id;
        if (profile.photos?.[0]?.value) {
          user.avatar = profile.photos[0].value;
        }
        await user.save();
        return done(null, user);
      }
    }

    // If still no user, create new one
    if (!user) {
      try {
        user = await User.create({
          username: profile.displayName,
          email: profile.emails?.[0]?.value,
          googleId: profile.id,
          avatar: profile.photos?.[0]?.value,
          oauthProvider: 'google'
        });

        // Add user to public channels
        await channelService.addUserToPublicChannels(user._id.toString());
        console.log('Added Google user to public channels');

      } catch (error) {
        console.error('Error creating user:', error);
        return done(error);
      }
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Configure GitHub OAuth strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback',
  passReqToCallback: true
}, async (req: Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    // Verify state parameter
    const savedState = req.session?.oauthState;
    const receivedState = req.query.state;

    if (!savedState || !receivedState || savedState !== receivedState) {
      return done(null, false, { message: 'Invalid state parameter' });
    }

    // First try to find user by GitHub ID
    let user = await User.findOne({ githubId: profile.id });

    // If no user found by GitHub ID, try by email
    if (!user && profile.emails?.[0]?.value) {
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        // Update existing user with GitHub info
        user.githubId = profile.id;
        if (profile.photos?.[0]?.value) {
          user.avatar = profile.photos[0].value;
        }
        await user.save();
        return done(null, user);
      }
    }

    // If still no user, create new one with unique email
    if (!user) {
      let username = profile.username || profile.displayName;
      let email = profile.emails?.[0]?.value;

      // If no email provided, generate a unique one
      if (!email) {
        let baseEmail = `${username}@github.user`;
        let counter = 0;
        let testEmail = baseEmail;

        // Keep trying until we find a unique email
        while (await User.findOne({ email: testEmail })) {
          counter++;
          testEmail = `${username}${counter}@github.user`;
        }
        email = testEmail;
      }

      // Ensure unique username
      let counter = 0;
      let testUsername = username;
      while (await User.findOne({ username: testUsername })) {
        counter++;
        testUsername = `${username}${counter}`;
      }
      username = testUsername;

      try {
        user = await User.create({
          username,
          email,
          githubId: profile.id,
          avatar: profile.photos?.[0]?.value,
          oauthProvider: 'github'
        });

        // Add user to public channels
        await channelService.addUserToPublicChannels(user._id.toString());
        console.log('Added GitHub user to public channels');

      } catch (error) {
        console.error('Error creating user:', error);
        return done(error);
      }
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

export default passport;
