import { IUser } from '../models/types';

declare global {
  namespace Express {
    interface User extends IUser {}
  }
}
