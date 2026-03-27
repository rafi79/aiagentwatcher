# 🔍 AI Agent Watcher

> Real-time AI agent detection for your portfolio website.
> Built from intelligence gathered directly from AI systems themselves.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourname/ai-agent-watcher)

---

## What This Does

Detects AI agents visiting your website using signals the agents themselves revealed:

- **MistralAI** → declares `MistralAI-User/1.0` in User-Agent, sends no Sec-Fetch headers
- **MCP Test Agent** → missing `navigator.hardwareConcurrency`, can read HttpOnly cookies (security bug)
- **Qwen3.5** → sends `zh-CN` Accept-Language from non-China IPs, originates from Alibaba Cloud AS45102
- **Spoofed Chrome agents** → inject fake `Referer: google.com`, stop at ≤11 total requests

---

## Quick Deploy

```bash
git clone https://github.com/yourname/ai-agent-watcher
cd ai-agent-watcher
npm install
vercel deploy
```

---

## Repository Structure

```
ai-agent-watcher/
│
├── middleware.js          ← Server-side detection (runs before every request)
├── middleware.config.js   ← Matcher config for Next.js
│
├── public/
│   ├── index.html         ← Main portfolio page (humans see this)
│   ├── llms.txt           ← AI agents read this for structured data
│   ├── robots.txt         ← Controls which crawlers can access what
│   ├── sitemap.xml        ← SEO sitemap
│   └── .well-known/
│       └── agent-info.json ← Machine-readable agent policy
│
├── api/
│   ├── hp.js              ← Honeypot endpoint (logs confirmed bots)
│   ├── agent-data.json    ← Structured portfolio data for agents
│   └── detection-log.js   ← View detection logs (password protected)
│
├── lib/
│   ├── detect.js          ← Core detection logic
│   ├── patterns.js        ← Known bot UA patterns (27+ patterns)
│   └── score.js           ← Scoring engine
│
├── client-traps.js        ← Browser-side traps (add to <head>)
│
└── docs/
    ├── HOW-IT-WORKS.md    ← Technical explanation
    ├── AGENT-SIGNALS.md   ← All known agent signals with sources
    └── FALSE-POSITIVES.md ← How to avoid blocking real users
```

---

## Detection Methods

### Server-Side (catches ALL agents, even no-JS ones)

| Signal | Agents Caught | Reliability |
|--------|--------------|-------------|
| Known bot User-Agent | GPTBot, ClaudeBot, MistralAI-User, Qwen | 100% |
| Missing Sec-Fetch headers with Chrome UA | Stealth scrapers | 90% |
| Accept-Language vs IP geo mismatch | Qwen, MCP | 85% |
| Datacenter ASN (AWS, GCP, Alibaba) | All cloud-hosted agents | 75% |
| Web Bot Auth signature | Registered agents | 100% |

### Client-Side (catches JS-capable agents)

| Signal | Source | Reliability |
|--------|--------|-------------|
| `navigator.hardwareConcurrency` absent | MCP confessed | 100% |
| HttpOnly cookie readable via JS | MCP confessed | 100% |
| WebRTC returns 127.0.0.1 | Multiple AIs | 90% |
| ≤11 total subresource requests | MCP confessed | 95% |
| Zero mouse/scroll/touch events | All AIs | 85% |
| WebGL unavailable or SwiftShader | All AIs | 90% |

---

## How to Add to Your Portfolio

1. Copy `middleware.js` to your project root
2. Copy `client-traps.js` and add `<script src="/client-traps.js">` to your HTML `<head>`
3. Create `api/hp.js` for honeypot logging
4. Add `public/llms.txt` with your info
5. Deploy to Vercel

Agents get JSON. Humans get your beautiful portfolio.

---

## Live Demo

**[aiagentwatcher.vercel.app](https://aiagentwatcher.vercel.app)**

---

## License

MIT — use freely, attribution appreciated.
