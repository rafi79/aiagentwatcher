// api/hp.js
// Honeypot endpoint — any request here = confirmed bot
// The hidden HTML link and LLM comment trap both point here
// Logs appear in: Vercel Dashboard → Project → Functions → Logs

export default async function handler(req, res) {
  const ts = new Date().toISOString();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const source = req.query.source || 'unknown';
  const country = req.headers['x-vercel-ip-country'] || '??';

  // Build log entry
  const entry = {
    event: 'HONEYPOT_TRIGGERED',
    verdict: 'CONFIRMED_BOT',
    confidence: 100,
    ts,
    ip,
    country,
    source,        // html_link | llm_comment | img_beacon | fetch_intercept
    ua: ua.substring(0, 200),
    method: req.method,
    referer: req.headers['referer'] || 'none',
    accept: req.headers['accept'] || 'none',
    accept_lang: req.headers['accept-language'] || 'none',
    sec_fetch: req.headers['sec-fetch-site'] || 'absent',
  };

  // Log to Vercel Functions console (Vercel Dashboard → Functions → Logs)
  console.log('🚨 HONEYPOT:', JSON.stringify(entry));

  // Optional: send to Discord webhook
  // const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
  // if (DISCORD_WEBHOOK) {
  //   await fetch(DISCORD_WEBHOOK, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       content: `🚨 **Bot detected!**\n\`\`\`json\n${JSON.stringify(entry, null, 2)}\n\`\`\``
  //     })
  //   }).catch(() => {});
  // }

  // Return 404 — don't let the bot know it was caught
  res.status(404).end();
}
