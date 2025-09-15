import fetch from 'node-fetch';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE not set');
  process.exit(1);
}

async function createUser(email, password, role, name) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role, name } })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

(async()=>{
  try {
    const users = [
      { email: `test_user_${Date.now()}@example.com`, password: 'UserPass123!', role: 'customer', name: 'Test User' },
      { email: `test_owner_${Date.now()}@example.com`, password: 'OwnerPass123!', role: 'owner', name: 'Test Owner' },
      { email: `test_freelancer_${Date.now()}@example.com`, password: 'FreelancerPass123!', role: 'freelancer', name: 'Test Freelancer' }
    ];
    for (const u of users) {
      const created = await createUser(u.email, u.password, u.role, u.name);
      console.log(`${u.role.toUpperCase()}: email=${u.email} password=${u.password} id=${created.id}`);
    }
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  }
})();
