import { User } from '../database/memory-storage';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
