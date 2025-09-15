import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, s, 64).toString('hex');
  return { salt: s, hash: derived };
}
(async()=>{
  try {
    const targetPrefix = 'testowner1';
    const cred = await prisma.authCredential.findFirst({ where: { username: { startsWith: targetPrefix } } });
    if (!cred) {
      console.log('No credential found starting with', targetPrefix);
      process.exit(0);
    }
    const { salt, hash } = hashPassword('OwnerPass123');
    const updated = await prisma.authCredential.update({ where: { id: cred.id }, data: { salt, passwordHash: hash } });
    console.log('Updated credential', { username: updated.username, id: updated.id });
  } catch (e) {
    console.error('Error', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
