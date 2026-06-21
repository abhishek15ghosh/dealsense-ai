import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;
const ACTUAL_JWT_SECRET = JWT_SECRET || 'dealsense_secret_key_12345';
export const TOKEN_COOKIE_NAME = 'dealsense_token';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export function signToken(payload: TokenPayload): string {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is missing. Please set JWT_SECRET in your production configuration.');
  }
  return jwt.sign(payload, ACTUAL_JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is missing. Please set JWT_SECRET in your production configuration.');
  }
  try {
    return jwt.verify(token, ACTUAL_JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(req?: NextRequest): Promise<TokenPayload | null> {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    } catch {
      return null;
    }
  }
  if (!token) return null;
  return verifyToken(token);
}
