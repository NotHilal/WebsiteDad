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
<body style="margin:0;padding:0;background:#F5F2ED;font-family:Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2ED;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo bar -->
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <p style="margin:0;font-size:30px;font-weight:300;color:#1a1212;font-family:Georgia,serif;letter-spacing:0.02em;">
              Hair<strong style="color:#C9A84C;">Go</strong>
            </p>
            <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.26em;text-transform:uppercase;color:#9b8e82;font-family:Arial,sans-serif;">
              Auckland&nbsp;&nbsp;·&nbsp;&nbsp;Hair Studio
            </p>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#FFFFFF;border-radius:16px;border:1px solid #E8E2DA;overflow:hidden;">

            <!-- Gold top stripe -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#C9A84C,#C4956A,#e8c97a);font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>

            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:32px 40px 24px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 14px;background:#FBF7EE;border:1px solid #E8D9B0;border-radius:20px;">
                        <span style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-family:Arial,sans-serif;font-weight:700;">Confirmed</span>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:16px 0 0;font-size:24px;font-weight:300;color:#1a1212;font-family:Georgia,serif;line-height:1.2;">
                    Your appointment<br>is all set, <strong>${name}</strong>.
                  </p>
                  <p style="margin:10px 0 0;font-size:13px;color:#9b8e82;font-family:Arial,sans-serif;line-height:1.6;">
                    We look forward to seeing you. Here's a summary of your booking.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="height:1px;background:#F0EBE3;margin:0 40px;font-size:0;">&nbsp;</td></tr>
            </table>

            <!-- Details -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:24px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;border-radius:12px;border:1px solid #EDE8E0;">
                    ${[
                      ['Service', service],
                      ['Stylist',  stylist],
                      ['Date',    date],
                      ['Time',    time],
                    ].map(([label, value], i, arr) => `
                    <tr>
                      <td style="padding:14px 20px;${i < arr.length - 1 ? 'border-bottom:1px solid #EDE8E0;' : ''}">
                        <span style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#b0a396;font-family:Arial,sans-serif;">${label}</span>
                      </td>
                      <td style="padding:14px 20px;text-align:right;${i < arr.length - 1 ? 'border-bottom:1px solid #EDE8E0;' : ''}">
                        <span style="font-size:14px;color:#1a1212;font-family:Arial,sans-serif;font-weight:600;">${value}</span>
                      </td>
                    </tr>`).join('')}
                  </table>
                </td>
              </tr>
            </table>

            <!-- Price row -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 40px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#FBF7EE,#FDF9F2);border-radius:12px;border:1px solid #E8D9B0;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <span style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#b0a396;font-family:Arial,sans-serif;">Total</span>
                      </td>
                      <td style="padding:16px 20px;text-align:right;">
                        <span style="font-size:22px;color:#C9A84C;font-family:Georgia,serif;font-weight:700;">$${price}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Payment status -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 40px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="${isInStore
                    ? 'background:#FFFBF0;border:1px solid #F0D98A;border-radius:12px;'
                    : 'background:#F0FBF6;border:1px solid #A8DFC2;border-radius:12px;'}">
                    <tr>
                      <td style="padding:14px 20px;">
                        <p style="margin:0;font-size:13px;line-height:1.65;font-family:Arial,sans-serif;${isInStore ? 'color:#92700A;' : 'color:#1A7A4A;'}">
                          ${isInStore
                            ? `<strong>Pay in store</strong> &mdash; please bring <strong>$${price}</strong> to the salon at the time of your appointment.`
                            : `<strong>&#10003;&nbsp; Payment received</strong> &mdash; your payment of <strong>$${price}</strong> has been successfully processed.`
                          }
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:28px 16px 0;">
            <p style="margin:0;font-size:11px;color:#b0a396;font-family:Arial,sans-serif;letter-spacing:0.06em;">
              HairGo &nbsp;&middot;&nbsp; Auckland, New Zealand
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#c8bfb4;font-family:Arial,sans-serif;">
              Questions? Reply to this email or visit us in store.
            </p>
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
        from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev',
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
