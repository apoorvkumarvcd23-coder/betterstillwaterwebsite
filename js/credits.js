// ── Stilwater credits (client-side prototype) ───────────────────────────────
// A lightweight, localStorage-backed "gold coins" balance for the test site.
// There is no server component yet ("for now"): the balance lives in the
// browser, starts at 50, and is spent 1-at-a-time by:
//   • Tadasana / Balasana "Watch & Learn"  (care-path.html)
//   • each AI Nutritionist message — starter card, follow-up chip, or typed
//     question (care-path.html sendMessage)
// This file only owns the balance, the gold-coin badge beside the "Hi, [name]"
// pill, and the logged-out "log in to get free credits" nudge. The spend hooks
// live where the actions happen and call window.SwCredits.spend(1).
//
// Defensive throughout (try/catch, no-ops on missing DOM) so it can never break
// a page if something it expects isn't there.
(function () {
  "use strict";

  var KEY = "sw_credits_v1";      // localStorage balance
  var START = 50;                  // free starting balance
  var DISMISS_KEY = "sw_credits_nudge_dismissed"; // sessionStorage flag
  var LOGIN_FLAG = "sw_has_logged_in"; // localStorage: set once the user has
                                       // logged in at least once on this
                                       // browser → the nudge never shows again

  function hasEverLoggedIn() {
    try { return localStorage.getItem(LOGIN_FLAG) === "1"; } catch (_e) { return false; }
  }
  function markLoggedIn() {
    try { localStorage.setItem(LOGIN_FLAG, "1"); } catch (_e) {}
  }

  var authed = false;             // resolved from /api/auth/me

  // ── balance read / write ──────────────────────────────────────────────────
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw === null || raw === undefined) {
        write(START);
        return START;
      }
      var n = parseInt(raw, 10);
      if (isNaN(n) || n < 0) return 0;
      return n;
    } catch (_e) {
      return START;
    }
  }

  function write(n) {
    try {
      localStorage.setItem(KEY, String(Math.max(0, n | 0)));
    } catch (_e) {}
  }

  // ── public API ────────────────────────────────────────────────────────────
  function get() {
    return read();
  }

  function set(n) {
    write(n);
    renderBadge();
    return read();
  }

  // Spend `amount` coins (default 1). Clamps at 0 — actions are never blocked
  // in this prototype, the balance simply bottoms out at zero.
  function spend(amount) {
    amount = amount && amount > 0 ? Math.floor(amount) : 1;
    var cur = read();
    var next = Math.max(0, cur - amount);
    write(next);
    renderBadge();
    pulse();
    return next;
  }

  // ── gold-coin badge beside the auth pill ──────────────────────────────────
  function coinMarkup(count) {
    return (
      '<span class="sw-credit-coin" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none">' +
      '<circle cx="12" cy="12" r="10" fill="#e8b94a" stroke="#c9952a" stroke-width="1.4"/>' +
      '<circle cx="12" cy="12" r="6.5" fill="none" stroke="#f4d98a" stroke-width="1.2"/>' +
      '<path d="M12 7.5v9M9.6 9.4c0-1 .9-1.6 2.4-1.6s2.4.6 2.4 1.6-1 1.5-2.4 1.7c-1.4.2-2.4.7-2.4 1.8s1 1.7 2.4 1.7 2.4-.6 2.4-1.6" stroke="#9a6f12" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg></span>' +
      '<span class="sw-credit-count">' + count + '</span>'
    );
  }

  function renderBadge() {
    var actions = document.getElementById("authActions");
    if (!actions) return;
    var badge = document.getElementById("swCreditBadge");

    if (!authed) {
      if (badge) badge.style.display = "none";
      return;
    }

    if (!badge) {
      badge = document.createElement("div");
      badge.id = "swCreditBadge";
      badge.className = "sw-credit-badge";
      badge.setAttribute("title", "Your Stilwater credits");
      badge.setAttribute("aria-label", "Stilwater credits");
      // Sit just to the LEFT of the "Hi, [name]" pill.
      var wrap = document.getElementById("authMenuWrap");
      if (wrap && wrap.parentNode === actions) {
        actions.insertBefore(badge, wrap);
      } else {
        actions.insertBefore(badge, actions.firstChild);
      }
    }
    badge.style.display = "inline-flex";
    badge.innerHTML = coinMarkup(read());
  }

  function pulse() {
    var badge = document.getElementById("swCreditBadge");
    if (!badge) return;
    badge.classList.remove("sw-credit-pulse");
    // Force reflow so the animation re-triggers on every spend.
    void badge.offsetWidth;
    badge.classList.add("sw-credit-pulse");
  }

  // ── logged-out nudge: "log in to get free credits" ────────────────────────
  function showNudge() {
    // First-time-only: once this browser has logged in even once, never nudge
    // again — not this session, not after a later logout.
    if (hasEverLoggedIn()) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch (_e) {}
    if (document.getElementById("swCreditNudge")) return;
    if (!document.body) return;

    var loginUrl = "/auth.html?returnTo=" + encodeURIComponent(window.location.href);
    var box = document.createElement("div");
    box.id = "swCreditNudge";
    box.className = "sw-credit-nudge";
    box.innerHTML =
      '<span class="sw-credit-nudge-coin" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none">' +
      '<circle cx="12" cy="12" r="10" fill="#e8b94a" stroke="#c9952a" stroke-width="1.4"/>' +
      '<path d="M12 7.5v9M9.6 9.4c0-1 .9-1.6 2.4-1.6s2.4.6 2.4 1.6-1 1.5-2.4 1.7c-1.4.2-2.4.7-2.4 1.8s1 1.7 2.4 1.7 2.4-.6 2.4-1.6" stroke="#9a6f12" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg></span>' +
      '<span class="sw-credit-nudge-text">Log in to get <strong>free credits</strong></span>' +
      '<a class="sw-credit-nudge-cta" href="' + loginUrl + '">Log in</a>' +
      '<button class="sw-credit-nudge-x" type="button" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(box);

    var x = box.querySelector(".sw-credit-nudge-x");
    if (x) {
      x.addEventListener("click", function () {
        try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch (_e) {}
        window.removeEventListener("resize", positionNudge);
        box.classList.add("sw-credit-nudge-hide");
        setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 220);
      });
    }
    positionNudge();
    window.addEventListener("resize", positionNudge);
    requestAnimationFrame(function () { box.classList.add("sw-credit-nudge-in"); });
  }

  // Pin the nudge just below the green "Login / Sign up" button. Falls back to
  // the top-right corner if the button isn't visible (e.g. tucked into a mobile
  // hamburger menu).
  function positionNudge() {
    var box = document.getElementById("swCreditNudge");
    if (!box) return;
    var btn = document.getElementById("btnLogin");
    var r = btn && btn.getBoundingClientRect();
    if (r && r.width > 0 && r.height > 0) {
      box.style.top = (r.bottom + 10) + "px";
      box.style.right = Math.max(8, window.innerWidth - r.right) + "px";
    } else {
      box.style.top = "70px";
      box.style.right = "16px";
    }
    box.style.left = "auto";
    box.style.bottom = "auto";
  }

  function hideNudge() {
    window.removeEventListener("resize", positionNudge);
    var box = document.getElementById("swCreditNudge");
    if (box && box.parentNode) box.parentNode.removeChild(box);
  }

  // ── styles (injected so this is a single drop-in file) ────────────────────
  function injectStyles() {
    if (document.getElementById("swCreditStyles")) return;
    var css =
      ".sw-credit-badge{display:none;align-items:center;gap:0.32rem;padding:0.28rem 0.6rem;" +
      "background:linear-gradient(180deg,#fff8e6,#f6eccf);border:1px solid #e3c878;border-radius:999px;" +
      "font-size:0.8rem;font-weight:700;color:#6b4e0e;line-height:1;white-space:nowrap;cursor:default;" +
      "box-shadow:0 1px 2px rgba(0,0,0,0.06);}" +
      ".sw-credit-badge .sw-credit-coin{display:inline-flex;}" +
      ".sw-credit-badge .sw-credit-count{font-variant-numeric:tabular-nums;}" +
      "@keyframes swCreditPulse{0%{transform:scale(1);}35%{transform:scale(1.18);}100%{transform:scale(1);}}" +
      ".sw-credit-badge.sw-credit-pulse{animation:swCreditPulse 0.4s ease;}" +
      // nudge — anchored just under the green Login button (top-right). The
      // exact top/right are set inline by positionNudge() from the button rect.
      ".sw-credit-nudge{position:fixed;top:70px;right:16px;transform:translateY(-8px);" +
      "display:flex;align-items:center;gap:0.6rem;z-index:2000;max-width:calc(100vw - 24px);" +
      "padding:0.55rem 0.7rem 0.55rem 0.85rem;background:#264f45;color:#f4f1ea;border-radius:14px;" +
      "font-size:0.85rem;box-shadow:0 10px 30px rgba(0,0,0,0.28);opacity:0;transition:transform .2s ease,opacity .2s ease;}" +
      ".sw-credit-nudge.sw-credit-nudge-in{transform:translateY(0);opacity:1;}" +
      ".sw-credit-nudge.sw-credit-nudge-hide{transform:translateY(-8px);opacity:0;}" +
      ".sw-credit-nudge-coin{display:inline-flex;}" +
      ".sw-credit-nudge-text{white-space:nowrap;}" +
      ".sw-credit-nudge-text strong{color:#f0d28a;}" +
      ".sw-credit-nudge-cta{background:#e8b94a;color:#3a2c05;text-decoration:none;font-weight:700;" +
      "padding:0.3rem 0.85rem;border-radius:999px;font-size:0.8rem;white-space:nowrap;}" +
      ".sw-credit-nudge-cta:hover{background:#f0c75e;}" +
      ".sw-credit-nudge-x{background:transparent;border:none;color:#cfe0d6;font-size:1.1rem;line-height:1;" +
      "cursor:pointer;padding:0 0.15rem;}" +
      ".sw-credit-nudge-x:hover{color:#fff;}" +
      "@media(max-width:480px){.sw-credit-nudge-text{white-space:normal;}}";
    var s = document.createElement("style");
    s.id = "swCreditStyles";
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // ── auth resolution ───────────────────────────────────────────────────────
  function resolveAuth() {
    fetch("/api/auth/me", { credentials: "include" })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (user) {
        authed = Boolean(user && user.authenticated !== false);
        if (authed) {
          markLoggedIn();   // remember first login → nudge won't show again
          hideNudge();
          renderBadge();
        } else {
          renderBadge(); // hides badge
          showNudge();
        }
      })
      .catch(function () {
        authed = false;
        renderBadge();
        showNudge();
      });
  }

  function init() {
    injectStyles();
    resolveAuth();
    // Re-assert the badge after shared.js / i18n.js rebuild the auth header.
    setTimeout(renderBadge, 600);
    setTimeout(renderBadge, 1500);
  }

  window.SwCredits = { get: get, set: set, spend: spend };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
