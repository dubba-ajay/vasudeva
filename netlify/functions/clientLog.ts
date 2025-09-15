export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const body = JSON.parse(event.body || '{}');
    console.log('CLIENT LOG:', JSON.stringify(body));
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e:any) {
    console.error('clientLog error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
