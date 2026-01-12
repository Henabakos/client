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
    update: {
      image: '/Container.png',
    },
    create: {
      email: 'ai@chatflow.app',
      name: 'ChatFlow AI',
      image: '/Container.png',
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
    },
    {
      email: 'bob@example.com',
      name: 'Bob Smith',
    },
    {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
    },
  ];

  for (const userData of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        image: null, // Clear existing images to use initials-based placeholders
      },
      create: {
        ...userData,
        emailVerified: true,
        image: null,
      },
    });
    console.log('✅ Demo user updated/created:', user.email);
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
