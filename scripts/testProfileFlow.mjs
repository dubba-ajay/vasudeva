import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Starting profile upsert/get flow test');
    const userId = `test_user_${Date.now()}`;
    const phone = `9999999999`;

    // Upsert simulation: create
    const created = await prisma.user.create({
      data: {
        id: userId,
        name: 'E2E Test User',
        mobile: phone,
        role: 'customer',
        address: '123 Test Lane'
      }
    });
    console.log('Created user:', created);

    // Fetch by id
    const fetchedById = await prisma.user.findUnique({ where: { id: userId } });
    console.log('Fetched by id:', fetchedById);

    // Fetch by phone
    const fetchedByPhone = await prisma.user.findFirst({ where: { mobile: phone } });
    console.log('Fetched by phone:', fetchedByPhone);

    // Update simulation (upsert update path)
    const updated = await prisma.user.update({ where: { id: userId }, data: { name: 'E2E Test User Updated', address: '456 Updated Ave' } });
    console.log('Updated user:', updated);

    // Final fetch to verify
    const finalFetch = await prisma.user.findUnique({ where: { id: userId } });
    console.log('Final fetch:', finalFetch);

    // Cleanup
    await prisma.user.delete({ where: { id: userId } });
    console.log('Cleanup done: deleted test user');

    await prisma.$disconnect();
    console.log('Profile upsert/get flow test completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    try { await prisma.$disconnect(); } catch {};
    process.exit(1);
  }
}

run();
