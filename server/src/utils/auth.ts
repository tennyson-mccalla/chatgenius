import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';

export interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret.toString()) as DecodedToken;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
