import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";
import crypto from "crypto";

function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, s, 64).toString("hex");
  return { salt: s, hash: derived };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { username, newPassword } = JSON.parse(event.body || '{}');
    if (!username || !newPassword) return { statusCode: 400, body: JSON.stringify({ error: 'username and newPassword required' }) };
    function isStrongPassword(pw: string) { if (!pw || pw.length < 8) return false; if (!/[A-Z]/.test(pw)) return false; if (!/[a-z]/.test(pw)) return false; if (!/[0-9]/.test(pw)) return false; return true; }
    if (!isStrongPassword(newPassword)) return { statusCode: 400, body: JSON.stringify({ error: 'password not strong enough' }) };
    const cred = await prisma.authCredential.findUnique({ where: { username } });
    if (!cred) return { statusCode: 404, body: JSON.stringify({ error: 'not found' }) };
    const { salt, hash } = hashPassword(newPassword);
    await prisma.authCredential.update({ where: { username }, data: { passwordHash: hash, salt, mustReset: false } });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('resetPassword error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
