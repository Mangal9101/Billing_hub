import { createHmac, timingSafeEqual } from 'node:crypto';

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export const RAZORPAY_PLAN_IDS = {
  monthly: process.env.RAZORPAY_PLAN_MONTHLY_ID || '',
  quarterly: process.env.RAZORPAY_PLAN_QUARTERLY_ID || '',
  yearly: process.env.RAZORPAY_PLAN_YEARLY_ID || '',
};

export function requireRazorpay() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
}

export async function razorpayRequest(path: string, init: RequestInit = {}) {
  requireRazorpay();
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Basic ${auth}`);
  headers.set('Content-Type', 'application/json');
  return fetch(`https://api.razorpay.com/v1/${path}`, { ...init, headers, cache: 'no-store' });
}

export function verifyCheckoutSignature(message: string, signature: string) {
  requireRazorpay();
  const expected = createHmac('sha256', RAZORPAY_KEY_SECRET).update(message).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || '');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
