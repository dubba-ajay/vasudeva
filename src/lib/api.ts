export function getApiBase() {
  let base = import.meta.env.VITE_API_BASE || "";
  // If VITE_API_BASE not set, prefer explicit same-origin functions path in browser
  if (!base) {
    if (typeof window !== 'undefined') {
      base = window.location.origin + '/.netlify/functions';
    } else {
      base = '/.netlify/functions';
    }
  }
  return String(base).replace(/\/$/, "");
}

export async function apiFetch(path: string, init?: RequestInit & { adminKey?: string }) {
  const DISABLE_BACKEND = (import.meta.env.VITE_DISABLE_BACKEND === 'true');
  const base = getApiBase();
  const { adminKey, headers, ...rest } = init || {};
  const h: Record<string, string> = { "Content-Type": "application/json", ...(headers as any) };
  if (adminKey) h["x-admin-key"] = adminKey;
  const url = `${base}${path.startsWith("/") ? path : "/" + path}`;

  // When disabled, serve lightweight mocked responses so frontend and design work without backend
  if (DISABLE_BACKEND) {
    // simple helper to build a mock response-like object
    const build = (status: number, body: any) => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
      headers: new Map<string,string>(),
    });

    async function readBody() {
      try {
        if (!rest || !('body' in rest)) return null;
        const b = (rest as any).body;
        if (!b) return null;
        if (typeof b === 'string') return JSON.parse(b);
        if (typeof b === 'object') return b;
        return null;
      } catch (e) { return null; }
    }

    const p = path.startsWith('/') ? path : '/' + path;
    // Mock handlers for a small set of endpoints used by the frontend
    if (p === '/login') {
      const body = await readBody();
      const username = body?.username || '';
      const password = body?.password || '';
      const handle = String(username || '').toLowerCase();
      const local = (handle.includes('@') ? handle.split('@')[0] : handle);
      const roleRaw = (local.startsWith('testowner') || local.startsWith('owner')) ? 'OWNER' : (local.startsWith('testfreelancer') || local.startsWith('freelancer')) ? 'FREELANCER' : 'USER';
      const role = roleRaw === 'OWNER' ? 'owner' : roleRaw === 'FREELANCER' ? 'freelancer' : 'customer';
      // naive password rules for mocked users
      const ok = (username && password && (password.toLowerCase().includes('pass') || password.toLowerCase().includes('owner') || password.toLowerCase().includes('freelancer')));
      if (!ok) return build(401, { error: 'invalid credentials' });
      // build a JWT-like token so downstream decoding works
      const b64url = (obj: any) => {
        const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
        return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };
      const header = { alg: 'HS256', typ: 'JWT' };
      const payload = { id: `mock_${username}` , role };
      const token = `${b64url(header)}.${b64url(payload)}.dev`;
      return build(200, { ok: true, role, mustReset: false, token, userId: `mock_${username}` });
    }

    if (p === '/clientLog') {
      const body = await readBody();
      // keep logs in console only
      // eslint-disable-next-line no-console
      console.log('[mock clientLog]', body);
      return build(200, { ok: true });
    }

    if (p === '/upsertProfile' || p === '/createCredential' || p === '/resetPassword') {
      return build(200, { ok: true });
    }

    // default mock: 404
    return build(404, { error: 'mock endpoint not found', path: p });
  }

  try {
    const res = await fetch(url, { ...rest, headers: h });
    if (!res.ok) {
      // try to get body safely
      let text = '';
      try { text = await res.text(); } catch (e) { text = res.statusText || String(res.status); }
      if (res.status === 404) {
        throw new Error(`API 404 at ${url}. The functions endpoint was not found. Ensure VITE_API_BASE is set to your functions host (eg. https://<your-netlify-site>/.netlify/functions) and that functions are deployed. Response: ${text}`);
      }
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return res;
  } catch (e: any) {
    // Provide actionable error for network issues / CORS
    if (e instanceof TypeError && /Failed to fetch|NetworkError/.test(String(e.message))) {
      throw new Error(`Network error while calling API ${url}. Check VITE_API_BASE environment variable and CORS settings. Original: ${e.message}`);
    }
    throw e;
  }
}
