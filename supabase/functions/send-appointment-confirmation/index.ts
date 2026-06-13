// @ts-nocheck
const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Require an Authorization header (user JWT for logged-in users, anon key for guests).
  // This blocks calls from outside the Supabase client entirely.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }, status: 401,
    })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }, status: 500,
    })
  }

  try {
    const { to, name, service, stylist, date, time, price, paymentStatus } = await req.json()

    if (!to || !name || !service) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const isInStore = paymentStatus === 'pay_in_store'
    const subject = `Confirmed: ${service} on ${date} at ${time} — HairGo`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Appointment Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#0a0a12;font-family:'Georgia',serif;color:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a12;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#12121a;border:1px solid rgba(201,168,76,0.15);border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#C9A84C,#C4956A);padding:28px 36px;">
            <p style="margin:0;font-size:26px;font-weight:300;color:#000;font-family:'Georgia',serif;">Hair<strong>Go</strong></p>
            <p style="margin:6px 0 0;font-size:12px;color:rgba(0,0,0,0.5);font-family:Arial,sans-serif;letter-spacing:0.12em;text-transform:uppercase;">Appointment Confirmed</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 24px;font-size:15px;color:rgba(255,255,255,0.55);font-family:Arial,sans-serif;">
              Hi <strong style="color:#fff;">${name}</strong>, your appointment is all set!
            </p>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                ['Service',  service],
                ['Stylist',  stylist],
                ['Date',     date],
                ['Time',     time],
              ].map(([label, value]) => `
              <tr>
                <td style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.3);">${label}</td>
                <td style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-family:Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.8);text-align:right;">${value}</td>
              </tr>`).join('')}
              <tr>
                <td style="padding:11px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.3);">Price</td>
                <td style="padding:11px 0;font-family:Arial,sans-serif;font-size:18px;color:#C9A84C;text-align:right;font-weight:700;">$${price}</td>
              </tr>
            </table>

            <!-- Payment status box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
              <tr>
                <td style="padding:14px 18px;border-radius:10px;${isInStore ? 'background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);' : 'background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);'}">
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;${isInStore ? 'color:rgba(245,158,11,0.9);' : 'color:rgba(52,211,153,0.9);'}">
                    ${isInStore
                      ? `<strong>Pay in store</strong> — please bring <strong>$${price}</strong> to the salon at the time of your appointment.`
                      : `<strong>Payment confirmed</strong> — your payment of <strong>$${price}</strong> has been processed.`
                    }
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.2);">
            HairGo &nbsp;·&nbsp; Auckland, New Zealand
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend error ${res.status}: ${body}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (err) {
    console.error('send-appointment-confirmation error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})
