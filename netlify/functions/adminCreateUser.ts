import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";
import crypto from "crypto";

const ADMIN_KEY = process.env.ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY;
const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM;

function randomPassword(len = 10) {
  return crypto.randomBytes(len).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, len);
}

function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, s, 64).toString("hex");
  return { salt: s, hash: derived };
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!SENDGRID_KEY) {
    console.log(`No SENDGRID configured. Credentials for ${to}: ${text}`);
    return;
  }
  const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.SENDGRID_FROM || "no-reply@example.com", name: "Admin" },
      subject,
      content: [{ type: "text/plain", value: text }],
    }),
  });
  if (!r.ok) console.warn('SendGrid failed', await r.text());
}

async function sendSms(to: string, text: string) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.log(`No Twilio configured. SMS for ${to}: ${text}`);
    return;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const body = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: text });
  const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64') }, body });
  if (!r.ok) console.warn('Twilio failed', await r.text());
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const provided = event.headers['x-admin-key'] || event.headers['X-Admin-Key'];
  if (!ADMIN_KEY || provided !== ADMIN_KEY) return { statusCode: 401, body: 'unauthorized' } as any;

  try {
    const payload = JSON.parse(event.body || '{}');
    const { name, email, phone, role } = payload;
    if (!name || !role) return { statusCode: 400, body: 'name and role required' };
    const rRole = (role || '').toUpperCase();
    if (!['FREELANCER', 'OWNER'].includes(rRole)) return { statusCode: 400, body: 'role must be FREELANCER or OWNER' };

    // generate username and temp password
    const usernameBase = (email && email.split('@')[0]) || (phone ? `user${phone.slice(-4)}` : 'user');
    const username = `${usernameBase}_${Math.random().toString(36).slice(2, 8)}`;
    const tempPassword = randomPassword(10);
    const { salt, hash } = hashPassword(tempPassword);

    // create credential record
    const cred = await prisma.authCredential.create({ data: { username, passwordHash: hash, salt, role: rRole, mustReset: true } });

    // create profile entry
    if (rRole === 'FREELANCER') {
      const fr = await prisma.freelancer.create({ data: { id: cred.id, name: name || undefined, phone: phone || undefined, email: email || undefined } as any }).catch(()=>null);
      // link credential.userId to freelancer id
      if (fr) {
        await prisma.authCredential.update({ where: { id: cred.id }, data: { userId: fr.id } });
      }
    } else if (rRole === 'OWNER') {
      // create a User entry with role owner
      const uid = `owner_${Math.random().toString(36).slice(2,8)}`;
      const urec = await prisma.user.create({ data: { id: uid, name: name || undefined, mobile: phone || undefined, role: 'owner' } }).catch(()=>null);
      if (urec) {
        await prisma.authCredential.update({ where: { id: cred.id }, data: { userId: urec.id } });
      }
    }

    const text = `Welcome ${name}. Your account has been created.
Username: ${username}
Temporary password: ${tempPassword}
Please reset your password on first login.`;

    if (email) await sendEmail(email, 'Your account credentials', text);
    if (phone) await sendSms(phone, text);

    return { statusCode: 200, body: JSON.stringify({ ok: true, username, sentTo: { email: !!email, phone: !!phone } }) };
  } catch (e: any) {
    console.error('adminCreateUser error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
