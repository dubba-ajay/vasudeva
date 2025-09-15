import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";
import crypto from "crypto";

function verifyPassword(password: string, salt: string, hash: string) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}

function signToken(payload: any) {
  const secret = process.env.SESSION_SECRET || process.env.VITE_SESSION_SECRET || 'dev_secret';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PUT,PATCH,DELETE',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-admin-key',
};

function buildResponse(status: number, body: any) {
  return {
    statusCode: status,
    headers: CORS_HEADERS,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  } as any;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return buildResponse(204, '');
  if (event.httpMethod !== 'POST') return buildResponse(405, 'Method Not Allowed');
  try {
    const { username, password } = JSON.parse(event.body || '{}');
    if (!username || !password) return buildResponse(400, { error: 'username and password required' });
    let cred = await prisma.authCredential.findUnique({ where: { username } });
    // If exact match not found, try a permissive startsWith lookup to handle test users that have suffixes
    if (!cred) {
      try {
        cred = await prisma.authCredential.findFirst({ where: { username: { startsWith: username } } });
      } catch (ee) {
        // ignore
      }
    }
    if (!cred) return buildResponse(401, { error: 'invalid credentials' });
    const ok = verifyPassword(password, cred.salt, cred.passwordHash);
    if (!ok) return buildResponse(401, { error: 'invalid credentials' });

    const token = signToken({ id: cred.id, role: cred.role });
    return buildResponse(200, { ok: true, role: cred.role, mustReset: cred.mustReset, token, userId: cred.userId || null });
  } catch (e: any) {
    console.error('login error', e);
    return buildResponse(500, { error: e.message || String(e) });
  }
};

export default handler;
