#!/usr/bin/env node
import fetch from 'node-fetch';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const API_BASE = process.env.API_BASE || process.env.VITE_API_BASE || 'http://localhost:8888/.netlify/functions';
const LOGIN_URL = `${API_BASE.replace(/\/$/, '')}/login`;

(async () => {
  try {
    console.log('Testing login endpoints against', LOGIN_URL);
    // fetch up to 10 test credentials created in DB
    const rows = await prisma.authCredential.findMany({ orderBy: { id: 'asc' }, take: 20 });
    const creds = rows.map(r => ({ username: r.username, password: (r.username.includes('test') ? (r.username.startsWith('testowner1') || r.username.startsWith('testowner') ? 'OwnerPass123' : r.username.startsWith('testuser1') ? 'UserPass123' : r.username.startsWith('testfreelancer1') ? 'FreelancerPass123' : 'password') : 'password'), role: r.role }));

    for (const c of creds) {
      try {
        const res = await fetch(LOGIN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: c.username, password: c.password })
        });
        const text = await res.text();
        let body;
        try { body = JSON.parse(text); } catch(e) { body = text; }
        console.log('\n--', c.role, c.username, '--');
        console.log('status:', res.status);
        console.log('body:', body);
      } catch (e) {
        console.log('\n--', c.role, c.username, '--');
        console.error('Request failed:', String(e));
      }
    }
  } catch (err) {
    console.error('Error testing logins', err);
  } finally {
    await prisma.$disconnect();
  }
})();
