import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const prisma = new PrismaClient();
async function check(username, password) {
  // try exact
  let cred = await prisma.authCredential.findUnique({ where: { username } }).catch(()=>null);
  if (!cred) {
    cred = await prisma.authCredential.findFirst({ where: { username: { startsWith: username } } }).catch(()=>null);
  }
  if (!cred) {
    console.log('not found');
    return;
  }
  const derived = crypto.scryptSync(password, cred.salt, 64).toString('hex');
  const ok = crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(cred.passwordHash, 'hex'));
  console.log({ lookedUp: username, matchedUsername: cred.username, role: cred.role, ok });
  await prisma.$disconnect();
}

(async()=>{
  await check('testuser1','UserPass123');
  await check('testowner1','OwnerPass123');
  await check('testfreelancer1','FreelancerPass123');
})();
