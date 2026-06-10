// ── Stilwater credits (server-backed) ───────────────────────────────────────
// The gold-coin balance now lives on the SERVER (per authenticated user), so
// we can report who spent how much. This file owns the coin badge beside the
// "Hi, [name]" pill, the logged-out "log in to get free credits" nudge, and the
// spend calls. Balance + spend go through:
//   GET  /api/credits        → { balance, totalSpent }
//   POST /api/credits/spend  → body { action }, returns { balance }
// Spend hooks call window.SwCredits.spend("<action>") — e.g. from the
// Tadasana/Balasana "Watch & Learn" buttons and each AI Nutritionist message.
//
// Defensive throughout (try/catch, no-ops on missing DOM / network) so it can
// never break a page.
(function () {
  "use strict";

  var DISMISS_KEY = "sw_credits_nudge_dismissed";      // sessionStorage
  var LOGIN_FLAG = "sw_has_logged_in";                 // localStorage (nudge gate)

  var authed = false;      // resolved from /api/credits (200 vs 401)
  var balance = null;      // null until first load

  function hasEverLoggedIn() {
    try { return localStorage.getItem(LOGIN_FLAG) === "1"; } catch (_e) { return false; }
  }
  function markLoggedIn() {
    try { localStorage.setItem(LOGIN_FLAG, "1"); } catch (_e) {}
  }

  // ── public API ────────────────────────────────────────────────────────────
  function get() { return balance; }

  // DEPRECATED. Charging is now enforced SERVER-SIDE inside each AI endpoint
  // (see src/credits/charge.js). The badge syncs automatically from the
  // `X-Credits-Balance` response header via the fetch interceptor below, and an
  // out-of-credits 402 opens the Buy modal. This is kept only as a safe no-op
  // (just refreshes the badge) so any legacy caller can't double-charge.
  function spend(_action) {
    if (!authed) return;
    reload();
  }

  function reload() {
    return fetch("/api/credits", { credentials: "include" })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && typeof d.balance === "number") { balance = d.balance; renderBadge(); }
        return balance;
      })
      .catch(function () { return null; });
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
      '<span class="sw-credit-count">' + (count == null ? "…" : count) + '</span>'
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
      var wrap = document.getElementById("authMenuWrap");
      if (wrap && wrap.parentNode === actions) {
        actions.insertBefore(badge, wrap);
      } else {
        actions.insertBefore(badge, actions.firstChild);
      }
    }
    badge.style.display = "inline-flex";
    badge.classList.add("sw-credit-badge-buyable");
    badge.setAttribute("title", "Add credits");
    badge.onclick = openBuy;
    badge.innerHTML =
      coinMarkup(balance) +
      '<span class="sw-credit-plus" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="10" height="10" fill="none">' +
      '<path d="M12 5.5v13M5.5 12h13" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
      "</svg></span>";
  }

  function pulse() {
    var badge = document.getElementById("swCreditBadge");
    if (!badge) return;
    badge.classList.remove("sw-credit-pulse");
    void badge.offsetWidth;
    badge.classList.add("sw-credit-pulse");
  }

  // ── logged-out nudge: "log in to get free credits" ────────────────────────
  function showNudge() {
    if (hasEverLoggedIn()) return;     // first-time-only
    try { if (sessionStorage.getItem(DISMISS_KEY) === "1") return; } catch (_e) {}
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

  // Pin the nudge just below the green "Login / Sign up" button; fall back to
  // the top-right corner if that button isn't visible (mobile hamburger).
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

  // ── Buy credits (Cashfree) ────────────────────────────────────────────────
  var CF_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
  var cfSdkPromise = null;

  function loadCashfreeSdk() {
    if (window.Cashfree) return Promise.resolve(window.Cashfree);
    if (cfSdkPromise) return cfSdkPromise;
    cfSdkPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = CF_SDK_URL;
      s.onload = function () { resolve(window.Cashfree); };
      s.onerror = function () { reject(new Error("Cashfree SDK failed to load")); };
      (document.head || document.documentElement).appendChild(s);
    });
    return cfSdkPromise;
  }

  // Small transient toast for purchase feedback.
  function showToast(msg, ok) {
    try {
      var t = document.createElement("div");
      t.className = "sw-buy-toast" + (ok === false ? " sw-buy-toast-err" : "");
      t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(function () { t.classList.add("sw-buy-toast-in"); });
      setTimeout(function () {
        t.classList.remove("sw-buy-toast-in");
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 250);
      }, 3200);
    } catch (_e) {}
  }

  function closeBuy() {
    var ov = document.getElementById("swBuyOverlay");
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  }

  // Open the package picker. No-op for logged-out users (they can't pay).
  function openBuy() {
    if (!authed) {
      showNudge();
      return;
    }
    if (document.getElementById("swBuyOverlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "swBuyOverlay";
    overlay.className = "sw-buy-overlay";
    overlay.innerHTML =
      '<div class="sw-buy-modal" role="dialog" aria-label="Add credits">' +
      '<button class="sw-buy-close" type="button" aria-label="Close">&times;</button>' +
      '<h3 class="sw-buy-title">Add Stilwater credits</h3>' +
      '<p class="sw-buy-sub">Credits power Aria chat, meal plans and guided practice.</p>' +
      '<div class="sw-buy-packs" id="swBuyPacks"><div class="sw-buy-loading">Loading…</div></div>' +
      '<p class="sw-buy-note">Secured by Cashfree · payments in INR</p>' +
      "</div>";
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeBuy();
    });
    overlay.querySelector(".sw-buy-close").addEventListener("click", closeBuy);

    fetch("/api/payments/cashfree/packages", { credentials: "include" })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (d) {
        var host = document.getElementById("swBuyPacks");
        if (!host) return;
        if (!d || !d.packages) { host.innerHTML = '<div class="sw-buy-loading">Could not load packages.</div>'; return; }
        var order = ["taster", "popular", "pro"];
        // Baseline per-credit (the smallest pack) so we can show real savings.
        var basePer =
          d.packages.taster && d.packages.taster.credits
            ? d.packages.taster.amount / d.packages.taster.credits
            : null;
        var html = "";
        order.forEach(function (id) {
          var p = d.packages[id];
          if (!p) return;
          var best = id === "popular";
          var per = p.amount / p.credits;
          var perStr = "₹" + per.toFixed(2) + " / credit";
          var save =
            basePer && per < basePer
              ? Math.round((1 - per / basePer) * 100)
              : 0;
          html +=
            '<button class="sw-buy-pack' + (best ? " sw-buy-pack-best" : "") + '" type="button" data-pkg="' + id + '">' +
            (best ? '<span class="sw-buy-tag">Best value</span>' : "") +
            '<div class="sw-buy-pack-left">' +
            '<span class="sw-buy-credits">' + p.credits + " credits</span>" +
            (p.blurb ? '<span class="sw-buy-blurb">' + p.blurb + "</span>" : "") +
            '<span class="sw-buy-percredit">' + perStr +
            (save > 0 ? ' <span class="sw-buy-save">Save ' + save + "%</span>" : "") +
            "</span>" +
            "</div>" +
            '<div class="sw-buy-pack-right">' +
            '<span class="sw-buy-price">₹' + p.amount + "</span>" +
            '<span class="sw-buy-go">Buy →</span>' +
            "</div>" +
            "</button>";
        });
        host.innerHTML = html;
        Array.prototype.forEach.call(host.querySelectorAll(".sw-buy-pack"), function (btn) {
          btn.addEventListener("click", function () { startCheckout(btn.getAttribute("data-pkg"), btn); });
        });
      })
      .catch(function () {
        var host = document.getElementById("swBuyPacks");
        if (host) host.innerHTML = '<div class="sw-buy-loading">Could not load packages.</div>';
      });
  }

  // Create the order, then hand off to Cashfree's hosted checkout. On success
  // Cashfree redirects back to ?cf_order=<id>, which checkReturn() reconciles.
  function startCheckout(packageId, btn) {
    if (btn) { btn.disabled = true; btn.classList.add("sw-buy-pack-busy"); }
    fetch("/api/payments/cashfree/order", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: packageId }),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j || !res.j.paymentSessionId) {
          throw new Error((res.j && res.j.error) || "Could not start payment");
        }
        return loadCashfreeSdk().then(function (Cashfree) {
          var cashfree = Cashfree({ mode: res.j.mode === "production" ? "production" : "sandbox" });
          // Remember which order we're awaiting (return URL also carries it).
          try { sessionStorage.setItem("sw_pending_order", res.j.orderId); } catch (_e) {}
          cashfree.checkout({ paymentSessionId: res.j.paymentSessionId, redirectTarget: "_self" });
        });
      })
      .catch(function (err) {
        if (btn) { btn.disabled = false; btn.classList.remove("sw-buy-pack-busy"); }
        showToast(err.message || "Payment could not start", false);
      });
  }

  // On load, if we returned from Cashfree (?cf_order=), confirm + credit.
  function checkReturn() {
    var orderId = null;
    try {
      var params = new URLSearchParams(window.location.search);
      orderId = params.get("cf_order");
    } catch (_e) {}
    if (!orderId) {
      try { orderId = sessionStorage.getItem("sw_pending_order"); } catch (_e2) {}
    }
    if (!orderId) return;
    try { sessionStorage.removeItem("sw_pending_order"); } catch (_e3) {}

    // Clean the param from the URL so a refresh doesn't re-trigger.
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete("cf_order");
      window.history.replaceState({}, document.title, url.toString());
    } catch (_e4) {}

    fetch("/api/payments/cashfree/status/" + encodeURIComponent(orderId), { credentials: "include" })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.status === "PAID") {
          if (typeof d.balance === "number") { balance = d.balance; renderBadge(); pulse(); }
          else { reload(); }
          showToast("Credits added — you're all set!", true);
        } else if (d && (d.status === "ACTIVE" || d.status === "CREATED")) {
          showToast("Payment is still processing…", false);
        }
      })
      .catch(function () {});
  }

  // ── styles ─────────────────────────────────────────────────────────────────
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
      "@media(max-width:480px){.sw-credit-nudge-text{white-space:normal;}}" +
      // buyable badge
      ".sw-credit-badge-buyable{cursor:pointer;transition:transform .12s ease,box-shadow .12s ease;}" +
      ".sw-credit-badge-buyable:hover{transform:translateY(-1px);box-shadow:0 3px 8px rgba(0,0,0,0.12);}" +
      ".sw-credit-plus{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;" +
      "margin-left:0.2rem;border-radius:999px;background:#6b4e0e;color:#fff8e6;flex:0 0 auto;}" +
      // overlay + modal
      ".sw-buy-overlay{position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;" +
      "padding:18px;background:rgba(26,32,28,0.55);backdrop-filter:blur(2px);}" +
      ".sw-buy-modal{position:relative;width:100%;max-width:420px;background:#faf8f2;border:1px solid #e7e0d2;" +
      "border-radius:20px;padding:24px 22px 18px;box-shadow:0 24px 60px rgba(0,0,0,0.28);font-family:inherit;}" +
      ".sw-buy-close{position:absolute;top:12px;right:14px;background:transparent;border:none;font-size:1.5rem;" +
      "line-height:1;color:#6a7770;cursor:pointer;}" +
      ".sw-buy-close:hover{color:#2b4338;}" +
      ".sw-buy-title{margin:0 0 4px;font-family:'Fraunces',Georgia,serif;font-size:1.4rem;color:#2b4338;}" +
      ".sw-buy-sub{margin:0 0 16px;font-size:0.9rem;color:#6a7770;line-height:1.4;}" +
      ".sw-buy-packs{display:flex;flex-direction:column;gap:10px;}" +
      ".sw-buy-loading{padding:18px 0;text-align:center;color:#6a7770;font-size:0.9rem;}" +
      ".sw-buy-pack{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;" +
      "padding:15px 16px;background:#fff;border:1.5px solid #e3ddcf;border-radius:14px;cursor:pointer;" +
      "font-family:inherit;text-align:left;width:100%;transition:border-color .12s ease,transform .12s ease,box-shadow .12s ease;}" +
      ".sw-buy-pack:hover{border-color:#c9a978;transform:translateY(-1px);box-shadow:0 4px 14px rgba(201,169,120,0.18);}" +
      ".sw-buy-pack-best{border-color:#c9a978;background:linear-gradient(180deg,#fffdf7,#fbf4e6);}" +
      ".sw-buy-pack-busy{opacity:0.6;cursor:default;}" +
      ".sw-buy-pack-left{display:flex;flex-direction:column;gap:3px;align-items:flex-start;min-width:0;}" +
      ".sw-buy-pack-right{display:flex;flex-direction:column;align-items:flex-end;gap:1px;flex:0 0 auto;}" +
      ".sw-buy-credits{font-weight:700;color:#2b4338;font-size:1.05rem;line-height:1.1;}" +
      ".sw-buy-blurb{font-size:0.78rem;color:#6a7770;line-height:1.25;}" +
      ".sw-buy-percredit{font-size:0.73rem;color:#9a7d3f;display:flex;align-items:center;gap:6px;margin-top:1px;}" +
      ".sw-buy-save{background:#e6efe2;color:#3f6b4a;font-weight:800;font-size:0.62rem;padding:1px 6px;" +
      "border-radius:999px;letter-spacing:0.02em;white-space:nowrap;}" +
      ".sw-buy-price{font-weight:800;color:#6b4e0e;font-size:1.12rem;line-height:1.1;}" +
      ".sw-buy-go{font-size:0.72rem;color:#9aa39a;font-weight:700;}" +
      ".sw-buy-pack:hover .sw-buy-go{color:#c9a978;}" +
      ".sw-buy-tag{position:absolute;top:-9px;left:14px;background:#c9a978;color:#3a2c05;font-size:0.66rem;" +
      "font-weight:800;letter-spacing:0.03em;text-transform:uppercase;padding:2px 8px;border-radius:999px;}" +
      ".sw-buy-note{margin:14px 0 2px;text-align:center;font-size:0.74rem;color:#9aa39a;}" +
      // toast
      ".sw-buy-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(12px);z-index:3200;" +
      "background:#2b4338;color:#f4f1ea;padding:0.7rem 1.1rem;border-radius:12px;font-size:0.88rem;" +
      "box-shadow:0 10px 30px rgba(0,0,0,0.28);opacity:0;transition:opacity .25s ease,transform .25s ease;max-width:90vw;}" +
      ".sw-buy-toast-in{opacity:1;transform:translateX(-50%) translateY(0);}" +
      ".sw-buy-toast-err{background:#8a4a3a;}";
    var s = document.createElement("style");
    s.id = "swCreditStyles";
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // ── fetch interceptor: keep the badge in sync with server-side charging ────
  // Every charged AI endpoint returns the new balance in an `X-Credits-Balance`
  // header; a 402 means out of credits. We read both globally so no per-call
  // wiring is needed in care-path, and open the Buy modal on 402.
  function installFetchInterceptor() {
    if (window.__swCreditsFetchPatched) return;
    var _fetch = window.fetch;
    if (typeof _fetch !== "function") return;
    window.__swCreditsFetchPatched = true;
    window.fetch = function (input) {
      var p = _fetch.apply(this, arguments);
      var url = (typeof input === "string") ? input : (input && input.url) || "";
      if (url.indexOf("/api/") === -1) return p;
      return p.then(function (res) {
        try {
          var b = res.headers && res.headers.get("X-Credits-Balance");
          if (b !== null && b !== undefined && b !== "") {
            var n = parseInt(b, 10);
            if (!isNaN(n)) { authed = true; balance = n; renderBadge(); pulse(); }
          }
          if (res.status === 402) {
            res.clone().json().then(function (d) {
              if (d && d.error === "insufficient_credits") {
                if (typeof d.balance === "number") { balance = d.balance; renderBadge(); }
                openBuy();
              }
            }).catch(function () {});
          }
        } catch (_e) {}
        return res;
      });
    };
  }

  // ── init: one request resolves auth AND balance ───────────────────────────
  function init() {
    injectStyles();
    installFetchInterceptor();
    fetch("/api/credits", { credentials: "include" })
      .then(function (r) {
        if (r && r.ok) return r.json();
        return null;            // 401 (logged out) or error
      })
      .then(function (d) {
        if (d && typeof d.balance === "number") {
          authed = true;
          balance = d.balance;
          markLoggedIn();
          hideNudge();
          renderBadge();
          checkReturn();        // reconcile a Cashfree return, if any
        } else {
          authed = false;
          renderBadge();        // hides badge
          showNudge();
        }
      })
      .catch(function () {
        authed = false;
        renderBadge();
        showNudge();
      });
    // Re-assert the badge after shared.js / i18n.js rebuild the auth header.
    setTimeout(renderBadge, 600);
    setTimeout(renderBadge, 1500);
  }

  window.SwCredits = { get: get, spend: spend, reload: reload, openBuy: openBuy };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
