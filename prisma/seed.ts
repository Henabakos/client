import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Create AI user
  const aiUser = await prisma.user.upsert({
    where: { email: 'ai@chatflow.app' },
    update: {},
    create: {
      email: 'ai@chatflow.app',
      name: 'ChatFlow AI',
      image: 'https://ui-avatars.com/api/?name=AI&background=6366f1&color=fff',
      isOnline: true,
      emailVerified: true,
    },
  });
  console.log('✅ AI user created:', aiUser.email);

  // Create demo users for testing
  const demoUsers = [
    {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      image: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=random',
    },
    {
      email: 'bob@example.com',
      name: 'Bob Smith',
      image: 'https://ui-avatars.com/api/?name=Bob+Smith&background=random',
    },
    {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      image: 'https://ui-avatars.com/api/?name=Charlie+Brown&background=random',
    },
  ];

  for (const userData of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        emailVerified: true,
      },
    });
    console.log('✅ Demo user created:', user.email);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
