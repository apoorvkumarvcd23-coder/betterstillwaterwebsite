// Site-wide GA event tracking. Loaded on every HTML page right after the
// GA snippet (see scripts/inject-ga.js). The gtag() function is stubbed on
// every host, so these calls are safe on test and localhost — they just
// no-op there. Only prod actually transmits to Google Analytics.
//
// Rules are checked top-down on every click; first match wins, then we
// stop. Each rule pairs a GA event name with a predicate that returns the
// matched element (truthy) or null. Predicates use closest() so a click on
// an inner element (icon, span, svg) still matches its container button.
(function wireGaEvents() {
  if (window.__swGaEventsWired) return;
  window.__swGaEventsWired = true;

  function textMatch(el, target) {
    return (el.textContent || "").trim().toLowerCase() === target.toLowerCase();
  }

  function menuLink(el, label) {
    var a = el.closest(".menu-list a");
    return a && textMatch(a, label) ? a : null;
  }

  var rules = [
    // Generic escape hatch — any element (including dynamically rendered
    // ones) can opt in by setting data-ga-event="<event_name>". First rule
    // so it always wins over the static selectors below.
    ["__data-ga-event__", function (el) {
      var tagged = el.closest("[data-ga-event]");
      return tagged || null;
    }],
    ["nav_logout", function (el) { return el.closest("#btnLogout"); }],
    ["nav_login_signup", function (el) { return el.closest("#btnLogin, #mmLogin"); }],
    ["nav_admin_dashboard", function (el) { return el.closest("#btnAdmin"); }],
    ["nav_wellness_providers", function (el) { return el.closest("#btnProviders"); }],
    ["nav_wellness_assessment", function (el) { return el.closest("#btnIntake"); }],
    ["nav_logo_home", function (el) { return el.closest(".header-logo, .top-brand, .home-link"); }],
    ["btn_menu_open", function (el) { return el.closest(".menu-btn"); }],
    ["btn_menu_close", function (el) { return el.closest(".menu-drawer-close, .mobile-menu-close"); }],
    ["btn_practice_yoga_ai", function (el) { return el.closest("#btnYoga, #btnYogaSidebar"); }],
    ["btn_try_ai_coach", function (el) { return el.closest("#yogaBetaOpen"); }],
    ["btn_practice_now", function (el) { return el.closest("#yogaPracticeNow"); }],
    ["btn_restart_video", function (el) { return el.closest("#yogaRestart"); }],
    ["menu_vision", function (el) { return menuLink(el, "Vision"); }],
    ["menu_testimonials", function (el) { return menuLink(el, "Testimonials"); }],
    ["menu_blog", function (el) { return menuLink(el, "Blog"); }],
    ["menu_waitlist", function (el) { return menuLink(el, "Waitlist"); }],
    ["btn_cancel", function (el) { return el.closest(".modal-close"); }],
    ["btn_submit", function (el) {
      var b = el.closest('button[type="submit"], input[type="submit"]');
      return b && b.closest("form") ? b : null;
    }],
  ];

  document.addEventListener("click", function (e) {
    if (typeof window.gtag !== "function") return;
    var target = e.target;
    if (!target || typeof target.closest !== "function") return;
    for (var i = 0; i < rules.length; i++) {
      var matched = rules[i][1](target);
      if (matched) {
        // For the generic data-ga-event rule, read the event name from the
        // attribute; for all other rules, use the declared event name.
        var name = rules[i][0] === "__data-ga-event__"
          ? matched.getAttribute("data-ga-event")
          : rules[i][0];
        if (!name) return;
        try { window.gtag("event", name); } catch (_err) {}
        return;
      }
    }
  }, true);
})();
