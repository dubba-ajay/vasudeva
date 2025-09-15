import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.resolve(process.cwd(), 'netlify', 'data');
const REVIEWS_FILE = path.join(DATA_PATH, 'reviews.json');

function ensureDataDir() {
  try { fs.mkdirSync(DATA_PATH, { recursive: true }); } catch (e) {}
  if (!fs.existsSync(REVIEWS_FILE)) {
    try { fs.writeFileSync(REVIEWS_FILE, JSON.stringify([])); } catch (e) {}
  }
}

async function readFileReviews() {
  ensureDataDir();
  try { const raw = fs.readFileSync(REVIEWS_FILE, 'utf-8'); return JSON.parse(raw || '[]'); } catch (e) { return []; }
}

async function writeFileReviews(rows: any[]) {
  ensureDataDir();
  try { fs.writeFileSync(REVIEWS_FILE, JSON.stringify(rows, null, 2)); } catch (e) { console.error('writeFileReviews error', e); }
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const q = (event.queryStringParameters || {}) as any;
      const storeId = q.storeId || q.salonId || null;
      // Try DB first
      try {
        const rows = await (prisma as any).$queryRawUnsafe ? await prisma.$queryRaw`select 1` : null;
      } catch (e) {
        // If prisma raw fails, fallback to file
      }
      try {
        // If Reviews model exists, use prisma
        if ((prisma as any).review) {
          const where: any = {};
          if (storeId) where.storeId = String(storeId);
          const items = await (prisma as any).review.findMany({ where, orderBy: { createdAt: 'desc' } });
          const avg = items.length ? (items.reduce((s:any,i:any)=>s+i.rating,0)/items.length) : 0;
          return { statusCode: 200, body: JSON.stringify({ reviews: items, average: avg }) };
        }
      } catch (e) { /* continue to file fallback */ }

      const fileRows = await readFileReviews();
      const filtered = storeId ? fileRows.filter((r:any)=>String(r.storeId) === String(storeId)) : fileRows;
      const avg = filtered.length ? filtered.reduce((s:any,i:any)=>s+i.rating,0)/filtered.length : 0;
      return { statusCode: 200, body: JSON.stringify({ reviews: filtered, average: avg }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { storeId, userId, rating, title, body: text } = body as any;
      if (!storeId || !rating) return { statusCode: 400, body: JSON.stringify({ error: 'storeId and rating required' }) };

      // Try DB create if Reviews model exists
      try {
        if ((prisma as any).review) {
          const rec = await (prisma as any).review.create({ data: { storeId: String(storeId), userId: userId || null, rating: Number(rating), title: title || null, body: text || null } });
          return { statusCode: 200, body: JSON.stringify({ review: rec }) };
        }
      } catch (e) { console.error('prisma review create failed', e); }

      // File fallback: append
      const rows = await readFileReviews();
      const rec = { id: 'r_' + Math.random().toString(36).slice(2,9), storeId: String(storeId), userId: userId || null, rating: Number(rating), title: title || null, body: text || null, createdAt: new Date().toISOString() };
      rows.unshift(rec);
      await writeFileReviews(rows);
      return { statusCode: 200, body: JSON.stringify({ review: rec }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e:any) {
    console.error('reviews handler error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
