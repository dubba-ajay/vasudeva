#!/usr/bin/env node
import fetch from 'node-fetch';
import crypto from 'node:crypto';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const k = a.replace(/^--/, '');
      const v = args[i+1] && !args[i+1].startsWith('--') ? args[++i] : 'true';
      out[k] = v;
    }
  }
  return out;
}

(async function main(){
  const argv = parseArgs();
  const provider = (argv.provider || 'razorpay').toLowerCase();
  const url = argv.url || (process.env.VITE_API_BASE ? process.env.VITE_API_BASE.replace(/\/$/, '') + '/webhook' : 'http://localhost:8888/.netlify/functions/webhook');
  const orderId = argv.orderId || argv.order || 'test_order_123';
  const paymentId = argv.paymentId || argv.payment || 'test_payment_123';
  const event = argv.event || (provider === 'razorpay' ? 'payment.captured' : 'payment_intent.succeeded');
  const rzpSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.VITE_RAZORPAY_WEBHOOK_SECRET || argv.rzpSecret;
  const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.VITE_STRIPE_WEBHOOK_SECRET || argv.stripeSecret;

  let body = {};
  let headers = { 'Content-Type': 'application/json' };

  if (provider === 'razorpay') {
    body = {
      entity: 'event',
      event,
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            status: 'captured',
            amount: 10000,
            currency: 'INR'
          }
        }
      }
    };
    const raw = JSON.stringify(body);
    const sig = rzpSecret ? crypto.createHmac('sha256', rzpSecret).update(raw).digest('hex') : 'test-sig';
    headers['x-razorpay-signature'] = sig;
  } else if (provider === 'stripe') {
    body = {
      id: 'evt_test_webhook',
      object: 'event',
      type: event,
      data: { object: { id: paymentId, amount: 10000, currency: 'inr' } }
    };
    const raw = JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000);
    let sigHeader = 't=' + timestamp;
    if (stripeSecret) {
      const signedPayload = `${timestamp}.${raw}`;
      const sig = crypto.createHmac('sha256', stripeSecret).update(signedPayload).digest('hex');
      sigHeader += `,v1=${sig}`;
    } else {
      sigHeader += ',v1=test-sig';
    }
    headers['stripe-signature'] = sigHeader;
  } else {
    console.error('Unknown provider. Use --provider razorpay|stripe');
    process.exit(1);
  }

  // allow custom header to mimic exact provider
  if (argv.header) {
    const [hk,hv] = argv.header.split(':');
    if (hk && hv) headers[hk.trim()] = hv.trim();
  }

  console.log('Sending test webhook', { provider, url, event, orderId, paymentId, headers });
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await res.text();
    console.log('Response', res.status, text);
  } catch (e) {
    console.error('Failed to send webhook', e);
    process.exit(2);
  }
})();
