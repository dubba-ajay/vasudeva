import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";
import crypto from "crypto";

function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, s, 64).toString("hex");
  return { salt: s, hash: derived };
}

function isStrongPassword(pw: string) {
  if (!pw || pw.length < 8) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { username, password, userId } = JSON.parse(event.body || '{}');
    if (!username || !password) return { statusCode: 400, body: JSON.stringify({ error: 'username and password required' }) };
    if (!isStrongPassword(password)) return { statusCode: 400, body: JSON.stringify({ error: 'password not strong enough' }) };

    // ensure username unique
    const existing = await prisma.authCredential.findUnique({ where: { username } as any }).catch(()=>null);
    if (existing) return { statusCode: 409, body: JSON.stringify({ error: 'username taken' }) };

    const { salt, hash } = hashPassword(password);
    const rec = await prisma.authCredential.create({ data: { username, passwordHash: hash, salt, role: 'USER', userId: userId || null, mustReset: false } });
    return { statusCode: 200, body: JSON.stringify({ ok: true, username: rec.username }) };
  } catch (e:any) {
    console.error('createCredential error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
