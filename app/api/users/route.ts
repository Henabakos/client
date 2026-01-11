import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/middleware';

// GET /api/users - List all users (except current user)
export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          not: currentUser.id,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isOnline: true,
        lastSeen: true,
      },
      orderBy: [
        { isOnline: 'desc' },
        { name: 'asc' },
      ],
    });

    // Transform to match frontend User type
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
      status: user.isOnline ? 'Online' : 'Offline',
      lastSeen: user.lastSeen?.toISOString(),
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
