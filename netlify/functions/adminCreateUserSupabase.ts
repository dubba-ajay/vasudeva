import type { Handler } from "@netlify/functions";
import fetch from 'node-fetch';
import { prisma } from './_prisma';

const ADMIN_KEY = process.env.ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const provided = event.headers['x-admin-key'] || event.headers['X-Admin-Key'];
  if (!ADMIN_KEY || provided !== ADMIN_KEY) return { statusCode: 401, body: 'unauthorized' } as any;
  if (!SUPABASE_URL || !SERVICE_ROLE) return { statusCode: 500, body: 'Supabase env missing' };
  try {
    const { name, username, email, phone, role } = JSON.parse(event.body || '{}');
    if (!name || !role || (!username && !email)) return { statusCode: 400, body: 'missing fields' };

    const rRole = (role || '').toLowerCase();
    if (!['freelancer','owner'].includes(rRole)) return { statusCode: 400, body: 'role must be freelancer or owner' };

    const userEmail = email || `${username}@no-reply.${new URL(SUPABASE_URL).host}`;
    const tempPassword = Math.random().toString(36).slice(2,10) + 'A1';

    // create user via Supabase Admin API
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify({ email: userEmail, phone, password: tempPassword, email_confirm: true, user_metadata: { role: rRole, name } })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { statusCode: resp.status, body: JSON.stringify({ error: 'supabase create user failed', details: text }) };
    }
    const created = await resp.json();

    // persist a link in prisma for convenience
    try {
      await prisma.authCredential.create({ data: { username: username || userEmail, passwordHash: '', salt: '', role: rRole.toUpperCase(), userId: created.id, mustReset: true } }).catch(()=>null);
    } catch(e) { /* non-fatal */ }

    // respond with username/email and temp password
    return { statusCode: 200, body: JSON.stringify({ ok: true, email: userEmail, username: username || userEmail, tempPassword, userId: created.id }) };
  } catch (e:any) {
    console.error('adminCreateUserSupabase error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
