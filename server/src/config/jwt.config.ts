import { Secret } from 'jsonwebtoken';

export const jwtConfig = {
  secret: process.env.JWT_SECRET as Secret || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};
