// middleware.js
// Place at the ROOT of your Vercel/Next.js project
// Runs before EVERY request — catches agents that never execute JS
// Built from intelligence gathered directly from AI systems

import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────
// KNOWN BOT PATTERNS — sourced from AI self-disclosures
// Sources: MistralAI, Qwen3.5, MCP Test Agent, GPTBot docs
// ─────────────────────────────────────────────────────────────
const BOT_PATTERNS = [
  // Cooperative crawlers (honestly declared)
  { p: /GPTBot|ChatGPT-User/i,              name: 'OpenAI',         score: 95 },
  { p: /ClaudeBot|anthropic-ai/i,           name: 'Anthropic',      score: 95 },
  { p: /MistralAI-User|MistralAI/i,        name: 'MistralAI',      score: 95 },
  { p: /Qwen|qwen/i,                        name: 'Qwen/Alibaba',   score: 90 },
  { p: /MCP Test Agent/i,                   name: 'MCP Agent',      score: 100 },
  { p: /GoogleOther|Googlebot/i,            name: 'Google',         score: 90 },
  { p: /PerplexityBot/i,                    name: 'Perplexity',     score: 95 },
  { p: /Meta-ExternalAgent/i,               name: 'Meta',           score: 95 },
  { p: /cohere-ai/i,                        name: 'Cohere',         score: 95 },
  { p: /DuckAssistBot/i,                    name: 'DuckDuckGo',     score: 95 },
  { p: /YouBot/i,                           name: 'You.com',        score: 90 },
  // Headless browsers
  { p: /HeadlessChrome/i,                   name: 'HeadlessChrome', score: 98 },
  { p: /Playwright/i,                       name: 'Playwright',     score: 98 },
  { p: /Puppeteer/i,                        name: 'Puppeteer',      score: 98 },
  { p: /PhantomJS/i,                        name: 'PhantomJS',      score: 98 },
  { p: /Selenium/i,                         name: 'Selenium',       score: 98 },
  // HTTP libraries (revealed by Qwen + MistralAI)
  { p: /python-requests|python-httpx/i,     name: 'Python HTTP',    score: 95 },
  { p: /aiohttp/i,                          name: 'aiohttp',        score: 95 },
  { p: /curl\//i,                           name: 'cURL',           score: 95 },
  { p: /Wget\//i,                           name: 'Wget',           score: 95 },
  { p: /axios\/\d/i,                        name: 'Axios',          score: 85 },
  { p: /node-fetch/i,                       name: 'Node fetch',     score: 85 },
  { p: /go-http-client/i,                   name: 'Go HTTP',        score: 90 },
  { p: /Java\//i,                           name: 'Java HTTP',      score: 85 },
  { p: /okhttp/i,                           name: 'OkHttp',         score: 85 },
];

// ─────────────────────────────────────────────────────────────
// KNOWN DATACENTER ASNs — agents run from cloud infrastructure
// Source: Qwen confessed "Alibaba Cloud AS45102", MCP "GCP/AWS"
// ─────────────────────────────────────────────────────────────
const DATACENTER_ASNS = [
  'AS14618', 'AS16509',  // Amazon AWS
  'AS15169',             // Google Cloud
  'AS8075',              // Microsoft Azure
  'AS45102',             // Alibaba Cloud (Qwen confirmed)
  'AS20473',             // Vultr
  'AS14061',             // DigitalOcean
  'AS13335',             // Cloudflare
  'AS396982',            // Google Cloud 2
];

// ─────────────────────────────────────────────────────────────
// DETECTION ENGINE
// ─────────────────────────────────────────────────────────────
function detectAgent(req) {
  const ua = req.headers.get('user-agent') || '';
  const signals = [];
  let score = 0;
  let agentName = null;

  // ── SIGNAL 1: Known bot User-Agent ──
  const uaMatch = BOT_PATTERNS.find(b => b.p.test(ua));
  if (uaMatch) {
    signals.push({ type: 'ua_match', detail: uaMatch.name });
    score = Math.max(score, uaMatch.score);
    agentName = uaMatch.name;
  }

  // ── SIGNAL 2: Missing Sec-Fetch headers on Chrome-like UA ──
  // MistralAI confessed: "No Sec-Fetch-* headers"
  // MCP Test Agent confessed: "does not send Sec-Fetch-*"
  // Spoofed Chrome sends ALL Sec-Fetch headers — missing = fake
  const secFetchSite = req.headers.get('sec-fetch-site');
  const secFetchMode = req.headers.get('sec-fetch-mode');
  const isChromeLike = /Chrome|Chromium|Edge/i.test(ua) && !/Googlebot/i.test(ua);
  if (isChromeLike && !secFetchSite && !secFetchMode) {
    signals.push({ type: 'missing_sec_fetch', detail: 'Chrome UA without Sec-Fetch headers' });
    score = Math.min(100, score + 30);
  }

  // ── SIGNAL 3: Accept-Language geo mismatch ──
  // Qwen confessed: "accept-language defaults to en-US or zh-CN regardless of IP"
  // MCP confessed: "always en-US,en;q=0.9 regardless of egress IP location"
  const acceptLang = req.headers.get('accept-language') || '';
  const country = req.headers.get('x-vercel-ip-country') ||
                  req.headers.get('cf-ipcountry') || '';
  if (!acceptLang) {
    signals.push({ type: 'no_accept_language', detail: 'Missing Accept-Language' });
    score = Math.min(100, score + 25);
  }

  // ── SIGNAL 4: Wildcard Accept header ──
  // HTTP libraries send */*, real browsers send text/html,application/xhtml+xml...
  const accept = req.headers.get('accept') || '';
  if (accept === '*/*' || accept === '' || accept === 'text/*') {
    signals.push({ type: 'wildcard_accept', detail: `Accept: "${accept}"` });
    score = Math.min(100, score + 20);
  }

  // ── SIGNAL 5: Web Bot Auth (cryptographic — most reliable) ──
  // Cloudflare standard — registered agents sign requests
  const sigAgent = req.headers.get('signature-agent');
  const signature = req.headers.get('signature');
  if (sigAgent && signature) {
    signals.push({ type: 'web_bot_auth', detail: sigAgent });
    score = 100;
    agentName = agentName || sigAgent;
  }

  // ── SIGNAL 6: Empty/missing User-Agent ──
  if (!ua || ua.trim().length < 10) {
    signals.push({ type: 'no_ua', detail: 'Empty or very short User-Agent' });
    score = Math.max(score, 90);
  }

  // ── SIGNAL 7: Missing Client Hints on modern Chrome ──
  // Doc 37 confessed: "Missing Sec-CH-UA-Full-Version-List is a tell"
  const secChUA = req.headers.get('sec-ch-ua');
  const secChFull = req.headers.get('sec-ch-ua-full-version-list');
  if (isChromeLike && secChUA && !secChFull) {
    signals.push({ type: 'missing_ch_hints', detail: 'Partial Client Hints — likely spoofed' });
    score = Math.min(100, score + 15);
  }

  // ── SIGNAL 8: Injected Referer ──
  // Doc 37 confessed: "fetch service injects Referer: https://www.google.com/"
  // Real navigation from google would also have this — but combined with other signals it's useful
  const referer = req.headers.get('referer') || '';
  if (referer === 'https://www.google.com/' && !secFetchSite) {
    signals.push({ type: 'injected_referer', detail: 'Hardcoded google.com referer without Sec-Fetch' });
    score = Math.min(100, score + 10);
  }

  return {
    isAgent: score >= 70,
    score,
    signals,
    agentName: agentName || 'unknown',
    ua: ua.substring(0, 150),
    country,
  };
}

// ─────────────────────────────────────────────────────────────
// STRUCTURED JSON RESPONSE FOR AGENTS
// Give them what they want — clean structured portfolio data
// Source: Qwen said "I prefer JSON or Markdown over HTML"
// ─────────────────────────────────────────────────────────────
function agentResponse(detection) {
  return NextResponse.json({
    _meta: {
      type: 'agent_response',
      schema: '1.0',
      detected_agent: detection.agentName,
      signals: detection.signals.map(s => s.type),
      score: detection.score,
      timestamp: new Date().toISOString(),
      llms_txt: 'https://aiagentwatcher.vercel.app/llms.txt',
    },
    owner: {
      name: 'Your Name',
      title: 'Full-stack Developer',
      location: 'Dhaka, Bangladesh',
      available_for_hire: true,
      bio: 'Developer specializing in React, Node.js, AI integration, and web security.',
    },
    skills: ['React', 'Next.js', 'Node.js', 'Python', 'TypeScript', 'AI Integration'],
    projects: [
      {
        name: 'AI Agent Watcher',
        url: 'https://aiagentwatcher.vercel.app',
        description: 'Real-time AI agent detection system built from AI self-disclosures',
        tech: ['JavaScript', 'Next.js', 'Vercel Edge'],
      },
    ],
    contact: {
      email: 'you@email.com',
      github: 'https://github.com/yourname',
      linkedin: 'https://linkedin.com/in/yourname',
    },
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Detected': 'true',
      'X-Agent-Name': detection.agentName,
      'X-Detection-Score': String(detection.score),
      'Cache-Control': 'no-store',
    },
  });
}

// ─────────────────────────────────────────────────────────────
// HTTPONLY COOKIE TRAP
// MCP confessed: "I can read HttpOnly cookies via document.cookie"
// Real browsers CANNOT read HttpOnly cookies — it's the spec
// Set this cookie for humans → client-traps.js checks if JS can read it
// If readable → confirmed bot runtime
// ─────────────────────────────────────────────────────────────
function setHttpOnlyTrap(response) {
  response.cookies.set('_aw_trap', 'ht_' + Date.now(), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30,
    path: '/',
  });
  return response;
}

// ─────────────────────────────────────────────────────────────
// LOGGING
// Visible in Vercel Dashboard → Project → Functions → Logs
// ─────────────────────────────────────────────────────────────
function logVisit(req, detection, pathname) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  console.log(JSON.stringify({
    event: detection.isAgent ? 'AGENT_VISIT' : 'HUMAN_VISIT',
    ts: new Date().toISOString(),
    verdict: detection.isAgent ? 'AGENT' : 'HUMAN',
    score: detection.score,
    agent: detection.agentName,
    signals: detection.signals.map(s => `${s.type}:${s.detail}`),
    ip,
    country: detection.country,
    path: pathname,
    ua: detection.ua,
  }));
}

// ─────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE
// ─────────────────────────────────────────────────────────────
export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Skip static assets and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/llms.txt') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/.well-known/') ||
    /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|map|xml|txt)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const detection = detectAgent(req);
  logVisit(req, detection, pathname);

  if (detection.isAgent) {
    return agentResponse(detection);
  }

  // Human — serve normally + set HttpOnly trap cookie
  const response = NextResponse.next();
  return setHttpOnlyTrap(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
