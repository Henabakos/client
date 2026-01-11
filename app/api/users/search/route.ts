import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/middleware';

// GET /api/users/search?q=query - Search users by name or email
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {
              not: currentUser.id,
            },
          },
          {
            OR: [
              {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isOnline: true,
        lastSeen: true,
      },
      take: 20,
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
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
