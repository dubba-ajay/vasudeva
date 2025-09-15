import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, s, 64).toString('hex');
  return { salt: s, hash: derived };
}

async function ensureUniqueUsername(username) {
  const existing = await prisma.authCredential.findUnique({ where: { username } }).catch(() => null);
  if (!existing) return username;
  // append random suffix
  return `${username}_${Math.random().toString(36).slice(2,6)}`;
}

async function createUserCredential({ username, password, role, profileType }) {
  const uname = await ensureUniqueUsername(username);
  const { salt, hash } = hashPassword(password);

  // create profile depending on profileType
  let userId = null;
  if (profileType === 'user') {
    const uid = `user_${Math.random().toString(36).slice(2,9)}`;
    await prisma.user.create({ data: { id: uid, name: uname, mobile: null, role: 'customer' } }).catch(()=>null);
    userId = uid;
  } else if (profileType === 'owner') {
    const uid = `owner_${Math.random().toString(36).slice(2,9)}`;
    await prisma.user.create({ data: { id: uid, name: uname, mobile: null, role: 'owner' } }).catch(()=>null);
    userId = uid;
  } else if (profileType === 'freelancer') {
    const fid = `freelancer_${Math.random().toString(36).slice(2,9)}`;
    await prisma.freelancer.create({ data: { id: fid, name: uname, phone: null } }).catch(()=>null);
    userId = fid;
  }

  const rec = await prisma.authCredential.create({ data: {
    username: uname,
    passwordHash: hash,
    salt,
    role,
    userId,
    mustReset: false,
  }});
  return { username: rec.username, password, role, userId };
}

async function run() {
  try {
    const creds = [];
    creds.push(await createUserCredential({ username: 'testuser1', password: 'UserPass123', role: 'USER', profileType: 'user' }));
    creds.push(await createUserCredential({ username: 'testowner1', password: 'OwnerPass123', role: 'OWNER', profileType: 'owner' }));
    creds.push(await createUserCredential({ username: 'testfreelancer1', password: 'FreelancerPass123', role: 'FREELANCER', profileType: 'freelancer' }));

    console.log('Created test credentials:');
    creds.forEach(c => console.log(`${c.role}: username=${c.username} password=${c.password} userId=${c.userId}`));
  } catch (e) {
    console.error('Error creating test creds', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
