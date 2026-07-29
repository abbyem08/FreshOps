// pages/api/notify-new-request.js
// Sends you an email when a customer submits an order request.
// Uses Resend (resend.com) — free tier covers this volume easily.
// See SETUP-GUIDE.md for the 2-minute signup + API key step.
export default async function handler(req, res) {
  const { requestId } = JSON.parse(req.body);

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FreshOps <orders@yourdomain.com>', // update after verifying a domain in Resend
        to: process.env.NOTIFY_EMAIL, // your email, set in Vercel env vars
        subject: 'New order request in FreshOps',
        text: `A new order request (#${requestId}) just came in. Review it: ${process.env.NEXT_PUBLIC_APP_URL}/admin/requests`
      })
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    // Don't block the customer's submission if the email fails — just log it.
    console.error('Notify failed', e);
    res.status(200).json({ ok: false });
  }
}
