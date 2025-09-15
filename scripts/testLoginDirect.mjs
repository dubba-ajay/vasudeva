import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function test(username, password) {
  const cred = await prisma.authCredential.findUnique({ where: { username } });
  if (!cred) {
    console.log('not found');
    return;
  }
  const derived = crypto.scryptSync(password, cred.salt, 64).toString('hex');
  const ok = crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(cred.passwordHash, 'hex'));
  console.log({ username: cred.username, role: cred.role, mustReset: cred.mustReset, ok });
}

(async()=>{
  await test('testuser1', 'UserPass123');
  await test('testowner1', 'OwnerPass123');
  await test('testfreelancer1', 'FreelancerPass123');
  await prisma.$disconnect();
})();
