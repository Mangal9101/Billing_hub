const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.BILLING_HUB_FROM_EMAIL || 'Billing Hub <billing@billing-hub.in>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://billing-hub.in';

function money(amount: unknown) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '₹99';
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function planLabel(plan: string) {
  switch (String(plan).toLowerCase()) {
    case 'monthly': return 'Monthly';
    case 'quarterly': return '3 Months';
    case 'yearly': return '12 Months';
    case 'lifetime': return 'Lifetime';
    default: return plan || 'Billing Hub';
  }
}

function dateLabel(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendBillingHubPaymentEmail(input: {
  to: string;
  plan: string;
  amount: number;
  paymentId?: string | null;
  subscriptionId?: string | null;
  nextDueAt?: string | null;
  isTrial?: boolean;
}) {
  if (!RESEND_API_KEY || !input.to) return { skipped: true };

  const plan = planLabel(input.plan);
  const isTrial = input.isTrial === true;
  const paymentId = input.paymentId || '';
  const subscriptionId = input.subscriptionId || '';
  const nextDue = dateLabel(input.nextDueAt);
  const subject = isTrial
    ? 'Your Billing Hub trial has started'
    : `Payment successful — Billing Hub ${plan}`;

  const rows = [
    [isTrial ? 'Trial payment' : 'Amount paid', money(input.amount)],
    ['Plan', escapeHtml(plan)],
    ...(nextDue ? [['Next payment', escapeHtml(nextDue)]] : []),
    ...(paymentId ? [['Payment ID', escapeHtml(paymentId)]] : []),
    ...(subscriptionId ? [['Subscription ID', escapeHtml(subscriptionId)]] : []),
  ];

  const details = rows.map(([label, value]) => `
    <tr>
      <td style="padding:9px 0;color:#6b7280;font-size:14px;">${label}</td>
      <td style="padding:9px 0;text-align:right;color:#24160f;font-size:14px;font-weight:600;">${value}</td>
    </tr>`).join('');

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f7f3ef;font-family:Arial,Helvetica,sans-serif;color:#24160f;">
    <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
      <div style="background:#7b3f18;border-radius:18px 18px 0 0;padding:28px 24px;text-align:center;">
        <img src="${APP_URL}/assets/images/app_logo.png" alt="Billing Hub" width="58" height="58" style="display:block;margin:0 auto 14px;border-radius:14px;object-fit:contain;background:#fff;">
        <div style="font-size:27px;line-height:1.2;color:#fff;font-weight:700;">Billing Hub</div>
        <div style="font-size:14px;color:#f3dfd0;margin-top:7px;">Bill. Manage. Grow.</div>
      </div>

      <div style="background:#fff;padding:30px 24px;border:1px solid #eadfd7;border-top:0;border-radius:0 0 18px 18px;">
        <h1 style="margin:0 0 10px;font-size:24px;color:#24160f;">
          ${isTrial ? 'Trial Started Successfully' : 'Payment Successful'}
        </h1>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
          ${isTrial
            ? 'Your ₹2 Billing Hub trial payment was successful. Your 7-day access has started.'
            : 'Your Billing Hub subscription payment was received successfully.'}
        </p>

        <div style="background:#faf7f4;border:1px solid #eadfd7;border-radius:14px;padding:18px 18px;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;">${details}</table>
        </div>

        <a href="${APP_URL}" style="display:inline-block;background:#7b3f18;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700;font-size:14px;">
          Open Billing Hub
        </a>

        <p style="margin:26px 0 0;color:#8a7d75;font-size:13px;line-height:1.6;">
          This is a transactional email from Billing Hub. Please keep this email for your records.
        </p>
      </div>
    </div>
  </body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [input.to],
      subject,
      html,
      ...(paymentId ? { idempotency_key: `billing-hub-payment-${paymentId}` } : {}),
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await response.text().catch(() => '');
    console.error('[billing-email] Resend failed:', error);
    return { sent: false, error };
  }

  return { sent: true };
}
