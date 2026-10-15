import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface UserSessionPayload {
  username: string;
  uuid?: string;
  isAdmin: boolean;
  groups: string[];
}

export function signToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d'
  });
}

export function verifyToken(token: string): UserSessionPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as UserSessionPayload;
  } catch {
    return null;
  }
}

