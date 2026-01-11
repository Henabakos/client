import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  isOnline: boolean;
  lastSeen: Date | null;
};

/**
 * Get authenticated user from session
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image ?? null,
      isOnline: (session.user as AuthenticatedUser).isOnline ?? false,
      lastSeen: (session.user as AuthenticatedUser).lastSeen ?? null,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Require authentication - throws 401 if not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Wrapper for protected API routes
 */
export function withAuth<T>(
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const user = await getAuthenticatedUser();
      
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      return handler(req, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Get session token from request for WebSocket authentication
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Try cookie
  const cookie = req.cookies.get('better-auth.session_token');
  return cookie?.value ?? null;
}
