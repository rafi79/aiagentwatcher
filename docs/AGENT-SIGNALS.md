# AI Agent Detection Signals

Complete reference of every known detection signal with source citations.
Each signal is labeled with which AI system revealed it.

---

## Server-Side Signals (catch agents before JS runs)

### S1: User-Agent Pattern Match
**Reliability: 95-100%**
**Source: AI self-disclosure**

| Agent | User-Agent String | Source |
|-------|------------------|--------|
| OpenAI GPTBot | `GPTBot/1.0` | OpenAI documentation |
| OpenAI Browsing | `ChatGPT-User` | OpenAI documentation |
| Anthropic | `ClaudeBot/1.0` or `anthropic-ai` | Anthropic documentation |
| MistralAI | `MistralAI-User/1.0` | **MistralAI confessed directly** |
| Qwen | `Qwen3.5` | **Qwen3.5 confessed directly** |
| MCP Agent | `MCP Test Agent` | **MCP Agent confessed directly** |
| Headless Chrome | `HeadlessChrome` | Browser internals |
| Playwright | `Playwright` | Playwright documentation |

**Detection code:**
```js
const BOT = /GPTBot|ClaudeBot|MistralAI-User|Qwen|MCP Test Agent|HeadlessChrome|Playwright/i;
if (BOT.test(req.headers['user-agent'])) { /* AGENT */ }
```

---

### S2: Missing Sec-Fetch Headers
**Reliability: 85-90%**
**Source: MistralAI + Qwen + MCP all confessed**

Real Chrome ALWAYS sends:
- `Sec-Fetch-Site`
- `Sec-Fetch-Mode`
- `Sec-Fetch-Dest`
- `Sec-Fetch-User`

MistralAI said: *"No Sec-Fetch-* headers"*
Qwen said: *"Probably not sent — browser-specific headers"*
MCP said: *"I do not send any Sec-Fetch-* headers"*

**Detection code:**
```js
const isChrome = /Chrome/i.test(ua);
const hasSec = !!req.headers['sec-fetch-site'];
if (isChrome && !hasSec) { /* LIKELY AGENT */ }
```

---

### S3: Accept-Language vs IP Geo Mismatch
**Reliability: 80-85%**
**Source: MCP Agent + Qwen confessed**

MCP Agent said: *"accept-language is ALWAYS en-US,en;q=0.9 regardless of egress IP location"*
Qwen confessed via httpbin: Sent `zh-CN,zh` from non-China IP

**Detection code:**
```js
const lang = req.headers['accept-language'];
const country = req.headers['x-vercel-ip-country'];
const hardcoded = lang === 'en-US,en;q=0.9' || lang === 'zh-CN,zh';
const nonMatch = ['CN','JP','KR','DE','FR'].includes(country) && lang?.startsWith('en-US');
if (!lang || hardcoded && nonMatch) { /* BOT SIGNAL */ }
```

---

### S4: Wildcarded Accept Header
**Reliability: 75%**
**Source: Qwen + MCP**

HTTP libraries send `*/*`. Real browsers send `text/html,application/xhtml+xml,...`

Qwen said: *"Likely text/html,application/xhtml+xml... but I cannot verify"*
MCP sends: `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`

---

### S5: Datacenter ASN
**Reliability: 70%**
**Source: Qwen confessed "Alibaba Cloud AS45102", MCP confessed "GCP/AWS"**

| ASN | Provider | Agent Using It |
|-----|----------|---------------|
| AS45102 | Alibaba Cloud | **Qwen confessed** |
| AS16509 | Amazon AWS | MCP Agent |
| AS15169 | Google Cloud | MCP Agent |
| AS8075 | Microsoft Azure | Various |

---

## Client-Side Signals (catch JS-capable agents)

### C1: navigator.hardwareConcurrency Absent — CERTAIN
**Reliability: 100%**
**Source: MCP Agent confessed directly**

MCP said: *"navigator.hardwareConcurrency — does NOT exist at all — undefined (not even present)"*

Real browsers: always returns a number (CPU core count)
MCP runtime: property completely absent

**Detection code:**
```js
if (typeof navigator.hardwareConcurrency !== 'number') {
  // 100% bot — this property NEVER missing in real browsers
}
```

---

### C2: HttpOnly Cookie Readable — ZERO-DAY CERTAIN
**Reliability: 100% when triggered**
**Source: MCP Agent confessed this security violation**

MCP said: *"I can read HttpOnly cookies via document.cookie. This violates the HttpOnly specification. If a server sets Set-Cookie: test=value; HttpOnly, my JS runtime will include test=value in document.cookie."*

Real browsers: HttpOnly cookies are NEVER readable via JS (spec enforcement)
MCP runtime: CAN read them (confirmed security violation)

**Implementation:**
1. Server sets `Set-Cookie: _aw_trap=value; HttpOnly; Secure`
2. Client checks `document.cookie.includes('_aw_trap')`
3. If found → **100% confirmed bot** (physically impossible in real browser)

---

### C3: navigator.deviceMemory Absent
**Reliability: 50% (some legitimate browsers missing)**
**Source: MCP Agent confessed**

MCP: *"deviceMemory does NOT exist at all"*

---

### C4: navigator.maxTouchPoints Absent
**Reliability: 70%**
**Source: MCP Agent confessed**

MCP: *"maxTouchPoints does NOT exist"*
Real browsers: always present (0 for desktop)

---

### C5: navigator.permissions Absent
**Reliability: 65%**
**Source: Qwen + MCP both confessed**

Qwen: *"navigator.permissions is absent"*
MCP: *"permissions does NOT exist"*

---

### C6: window.outerWidth Undefined
**Reliability: 75%**
**Source: MCP Agent confessed**

MCP: *"window.outerWidth is undefined. My runtime has no viewport or screen concept."*

---

### C7: WebRTC Returns Loopback IP
**Reliability: 70%**
**Source: MistralAI confessed**

MistralAI: *"If a site tries to get my IP via WebRTC, it would only see 127.0.0.1 (localhost)"*

---

### C8: Resource Count ≤11
**Reliability: 95%**
**Source: MCP Agent confessed hard limit**

MCP: *"Hard limit of 10 subresources per page. Request waterfall shows exactly 1 main document + up to 10 subresources, then stops."*

Real browsers: 50-200 resources. ≤11 total is statistically impossible.

---

### C9: Zero Behavioral Events
**Reliability: 85% combined**
**Source: All AIs confirmed**

All AIs confirmed: zero mouse events, zero scroll events, zero touch events.

- `mousemove` events = 0 after 10 seconds → suspicious
- Combined with other signals → very reliable

---

## Network-Level Signals (require packet inspection)

### N1: HTTP/2 Frame Timing < 2ms
**Reliability: 99%**
**Source: MCP Agent confessed**

MCP: *"I send all HTTP/2 frames in under 2ms. Real browsers take 15-50ms minimum."*

Requires: WAF or packet-level inspection (not standard server logs)

---

### N2: TCP Fast Open (SYN+data in same packet)
**Reliability: 99%**
**Source: MCP Agent confessed**

MCP: *"I send TCP Fast Open cookies — HTTP request piggybacks on SYN packet. No browser does this by default."*

---

### N3: ALPN Missing h3/h2c
**Reliability: 85%**
**Source: MCP Agent confessed + doc 36**

MCP: *"ALPN: h2, http/1.1 — no h3, no h2c"*
Real Chrome: advertises h3 (QUIC), h2, http/1.1, h2c

---

## Scoring Weights

| Signal | Points | Type |
|--------|--------|------|
| Known bot UA | 95 | Certain |
| HttpOnly cookie readable | 100 | Certain |
| webdriver = true | 100 | Certain |
| SwiftShader GPU | 95 | Certain |
| hardwareConcurrency absent | 90 | Near-certain |
| Missing Sec-Fetch on Chrome UA | 30 | Strong |
| No Accept-Language | 25 | Strong |
| Resource count ≤11 | 45 | Strong |
| WebRTC loopback | 20 | Medium |
| Zero behavioral events | 15 | Medium |
| Datacenter ASN | 20 | Medium |

**Verdict thresholds:**
- Score ≥ 90 → **CONFIRMED AGENT**
- Score 60-89 → **SUSPECTED AGENT**
- Score < 60 → **HUMAN** (if no certain signals)
