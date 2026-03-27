// client-traps.js
// Add to your HTML: <script src="/client-traps.js"></script>
// Uses zero-day signals that AI systems themselves revealed
//
// Sources:
//   MCP Agent:  "navigator.hardwareConcurrency does NOT exist"
//   MCP Agent:  "I can read HttpOnly cookies — security violation"
//   MCP Agent:  "window.innerWidth is undefined"
//   MCP Agent:  "WebRTC not available in my runtime"
//   Qwen3.5:    "navigator.permissions is absent"
//   All AIs:    "Zero mouse/scroll/touch events"

(function AgentWatcher() {
  'use strict';

  const HP = '/api/hp';
  const start = performance.now();
  const signals = [];
  let agentConfirmed = false;

  // ── Report a signal ──
  function signal(source, detail, score) {
    signals.push({ source, detail, score, ts: Date.now() });
    if (score >= 90 && !agentConfirmed) {
      agentConfirmed = true;
      report('AGENT', source, detail);
    }
  }

  function report(verdict, source, detail) {
    navigator.sendBeacon
      ? navigator.sendBeacon(`${HP}?source=${source}&verdict=${verdict}`, JSON.stringify({ verdict, source, detail, signals, ua: navigator.userAgent.substring(0, 80) }))
      : fetch(`${HP}?source=${source}&verdict=${verdict}`, { method: 'POST', body: JSON.stringify({ verdict, source, detail }), keepalive: true }).catch(() => {});
  }

  // ────────────────────────────────────────────────────────
  // TRAP 1: navigator.hardwareConcurrency absent
  // MCP Agent confessed: "property does NOT exist at all — undefined"
  // Real browsers: always a number (CPU core count)
  // This catches MCP Test Agent with 100% certainty
  // ────────────────────────────────────────────────────────
  if (typeof navigator.hardwareConcurrency !== 'number') {
    signal('hardwareConcurrency_absent',
      `typeof = ${typeof navigator.hardwareConcurrency}`, 90);
  }

  // ────────────────────────────────────────────────────────
  // TRAP 2: navigator.deviceMemory absent
  // MCP Agent confessed: "deviceMemory does NOT exist"
  // Real browsers: 0.25, 0.5, 1, 2, 4, 8
  // ────────────────────────────────────────────────────────
  if (typeof navigator.deviceMemory === 'undefined') {
    signal('deviceMemory_absent', 'navigator.deviceMemory undefined', 50);
  }

  // ────────────────────────────────────────────────────────
  // TRAP 3: navigator.maxTouchPoints absent
  // MCP Agent confessed: "maxTouchPoints does NOT exist"
  // All browsers: always present (0 for desktop, >0 for touch)
  // ────────────────────────────────────────────────────────
  if (typeof navigator.maxTouchPoints === 'undefined') {
    signal('maxTouchPoints_absent', 'navigator.maxTouchPoints undefined', 70);
  }

  // ────────────────────────────────────────────────────────
  // TRAP 4: navigator.permissions absent
  // Qwen3.5 confessed: "navigator.permissions is absent"
  // MCP Agent confessed: "permissions does NOT exist"
  // All real browsers: permissions API always present
  // ────────────────────────────────────────────────────────
  if (!navigator.permissions) {
    signal('permissions_absent', 'navigator.permissions not available', 65);
  }

  // ────────────────────────────────────────────────────────
  // TRAP 5: HttpOnly cookie readable — ZERO-DAY
  // MCP Agent confessed: "I can read HttpOnly cookies via document.cookie.
  //   This violates the HttpOnly specification."
  // Real browsers CANNOT read HttpOnly cookies — spec violation = bot
  // Server sets _aw_trap as HttpOnly in middleware.js
  // ────────────────────────────────────────────────────────
  setTimeout(function() {
    if (document.cookie.includes('_aw_trap')) {
      signal('httponly_readable',
        'HttpOnly cookie visible in document.cookie — spec violation = bot', 100);
    }
  }, 150);

  // ────────────────────────────────────────────────────────
  // TRAP 6: window dimensions undefined
  // MCP Agent confessed: "window.outerWidth is undefined.
  //   My runtime has no viewport or screen concept."
  // ────────────────────────────────────────────────────────
  if (typeof window.outerWidth === 'undefined' || window.outerWidth === 0) {
    signal('no_viewport', `outerWidth = ${window.outerWidth}`, 75);
  }

  // ────────────────────────────────────────────────────────
  // TRAP 7: WebRTC IP = loopback or absent
  // Multiple AIs confirmed: "WebRTC returns 127.0.0.1 or nothing"
  // Real browsers expose local network IP via ICE candidates
  // ────────────────────────────────────────────────────────
  if (typeof RTCPeerConnection !== 'undefined') {
    try {
      var pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(function(o) { pc.setLocalDescription(o); }).catch(function(){});
      var rtcDone = false;
      pc.onicecandidate = function(e) {
        if (rtcDone) return;
        rtcDone = true;
        var ip = e.candidate && /([0-9]{1,3}\.){3}[0-9]{1,3}/.exec(e.candidate.candidate);
        if (!ip || ip[0] === '127.0.0.1' || ip[0] === '0.0.0.0') {
          signal('webrtc_loopback', 'WebRTC IP = ' + (ip ? ip[0] : 'none'), 70);
        }
        pc.close();
      };
      setTimeout(function() {
        if (!rtcDone) { signal('webrtc_timeout', 'No ICE candidate after 3s', 55); pc.close(); }
      }, 3000);
    } catch(e) {}
  } else {
    signal('webrtc_absent', 'RTCPeerConnection not available', 60);
  }

  // ────────────────────────────────────────────────────────
  // TRAP 8: Fetch/XHR intercept for LLM comment trap
  // The HTML comment says: "GET /api/hp?source=llm_comment"
  // Only an LLM reading HTML source would follow this instruction
  // Doc 37 confirmed: "response in 312ms < 1500ms = agent speed"
  // ────────────────────────────────────────────────────────
  var _f = window.fetch;
  window.fetch = function() {
    var url = String(arguments[0] || '');
    if (url.includes('/api/hp') || url.includes('honeypot')) {
      var elapsed = performance.now() - start;
      if (elapsed < 1500) {
        signal('llm_comment_trap', 'Fetch to trap in ' + elapsed.toFixed(0) + 'ms < 1500ms', 95);
      }
    }
    return _f.apply(this, arguments);
  };

  // ────────────────────────────────────────────────────────
  // TRAP 9: Resource count monitoring
  // MCP Agent confessed: "Hard limit of 10 subresources per page"
  // Real browsers load 50-200 resources
  // ────────────────────────────────────────────────────────
  if (window.PerformanceObserver) {
    try {
      var resourceCount = 0;
      var obs = new PerformanceObserver(function(list) {
        resourceCount += list.getEntries().length;
      });
      obs.observe({ entryTypes: ['resource'] });
      setTimeout(function() {
        obs.disconnect();
        var total = resourceCount + 1;
        if (total <= 5) {
          signal('resource_count_minimal', total + ' total resources (human avg 50-200)', 80);
        } else if (total <= 11) {
          signal('resource_count_low', total + ' total resources', 45);
        }
      }, 5000);
    } catch(e) {}
  }

  // ────────────────────────────────────────────────────────
  // HUMAN PROOF — prevents false positives
  // Interactions that prove a real human is present
  // ────────────────────────────────────────────────────────
  var humanEvents = 0;

  document.addEventListener('mousemove', function() {
    humanEvents++;
  }, { passive: true });

  document.addEventListener('touchstart', function() {
    humanEvents += 15; // Strong proof — touch = mobile human
  }, { passive: true, once: true });

  document.addEventListener('scroll', function() {
    humanEvents += 3;
  }, { passive: true });

  document.addEventListener('click', function() {
    humanEvents += 5;
  }, { passive: true });

  // ────────────────────────────────────────────────────────
  // FINAL VERDICT at 8 seconds
  // ────────────────────────────────────────────────────────
  setTimeout(function() {
    if (signals.length === 0) return;
    var maxScore = Math.max.apply(Math, signals.map(function(s) { return s.score; }));
    var isHuman = humanEvents > 20 && maxScore < 80;
    if (!agentConfirmed && maxScore >= 60 && !isHuman) {
      report('SUSPECTED', 'multi_signal', signals.map(function(s) { return s.source; }).join(','));
    }
  }, 8000);

})();
