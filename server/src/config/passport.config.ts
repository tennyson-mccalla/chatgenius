import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt, VerifyCallback } from 'passport-jwt';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models';
import { jwtConfig } from './jwt.config';

// Passport serialization
passport.serializeUser((user: Express.User, done) => {
  console.log('Serializing user:', (user as IUser).id);
  done(null, (user as IUser).id);
});

passport.deserializeUser(async (id: string, done) => {
  console.log('Deserializing user:', id);
  try {
    const user = await User.findById(id);
    if (!user) {
      console.log('User not found during deserialization:', id);
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error);
  }
});

// Local Strategy for username/password login
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email: string, password: string, done) => {
    console.log('Attempting local strategy authentication:', { email });
    try {
      const user = await User.findOne({ email });

      if (!user) {
        console.log('User not found:', { email });
        return done(null, false, { message: 'User not found' });
      }

      if (!user.password) {
        console.log('User has no password (OAuth user):', { email });
        return done(null, false, { message: 'Invalid login method' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Invalid password for user:', { email });
        return done(null, false, { message: 'Invalid password' });
      }

      console.log('Local authentication successful:', { userId: user._id });
      const userWithId = {
        ...user.toObject(),
        id: user._id
      };
      return done(null, userWithId);
    } catch (error) {
      console.error('Error in local strategy:', error);
      return done(error);
    }
  }
));

// JWT Strategy for token authentication
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtConfig.secret.toString(),
}, async (jwtPayload: { id: string }, done: (error: any, user?: any, info?: any) => void) => {
  try {
    console.log('Verifying JWT token:', { userId: jwtPayload.id });
    const user = await User.findById(jwtPayload.id);

    if (!user) {
      console.log('User not found for JWT token:', { userId: jwtPayload.id });
      return done(null, false);
    }

    const userWithId = {
      ...user.toObject(),
      id: user._id
    };
    console.log('JWT verification successful:', { userId: user._id });
    return done(null, userWithId);
  } catch (error) {
    console.error('Error verifying JWT:', error);
    return done(error, false);
  }
}));

export default passport;
