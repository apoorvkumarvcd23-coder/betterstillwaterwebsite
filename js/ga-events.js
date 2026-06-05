// Site-wide GA4 event tracking. Loaded on every page right after the GA
// snippet (see scripts/inject-ga.js). gtag() is stubbed on every host, so these
// calls are safe on test/localhost (no-op) — only prod actually transmits.
//
// Two ways an element gets tracked, checked in this order on every click:
//   1. data-ga-event="<event_name>"  — for dynamically-rendered elements that
//      set the attribute when they're built (chat buttons, recipe-library tabs,
//      provider dropdown items, etc.). Optional companions: data-ga-label,
//      data-ga-purpose.
//   2. A static SELECTOR RULE below — for stable elements that exist in the
//      HTML (header/footer nav, mobile menu, login page, launcher cards, yoga
//      buttons). First matching rule wins; closest() so an inner icon/span
//      click still matches its container.
//
// Every event ships a consistent parameter set (event_category, event_label,
// button_name, page_path, tracking_purpose, section_name, and link_url for
// anchors). Categories/sections are derived from the event-name prefix so each
// call site only has to supply the name.
(function wireGaEvents() {
  if (window.__swGaEventsWired) return;
  window.__swGaEventsWired = true;

  // event-name prefix → human category / section
  function categoryFor(name) {
    if (/^header_/.test(name) || /^footer_/.test(name) || /^mobile_menu/.test(name)) return "navigation";
    if (/^homepage_/.test(name)) return "homepage";
    if (/^login_page_/.test(name)) return "login";
    if (/^user_homepage_/.test(name)) return "dashboard";
    if (/^ai_yoga_tutor_/.test(name)) return "ai_yoga_tutor";
    if (/^ai_nutritionist_/.test(name)) return "ai_nutritionist";
    if (/^recipe_library_/.test(name)) return "recipe_library";
    if (/^chronic_disease_management_/.test(name)) return "chronic_disease_management";
    if (/^trusted_providers_/.test(name)) return "trusted_providers";
    return "engagement";
  }

  function labelFor(el) {
    if (!el || !el.getAttribute) return "";
    var explicit = el.getAttribute("data-ga-label") || el.getAttribute("aria-label");
    if (explicit && explicit.trim()) return explicit.trim();
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    return text.slice(0, 100);
  }

  // Build the standard parameter bundle and send the event.
  function track(name, el) {
    if (!name || typeof window.gtag !== "function") return;
    var category = categoryFor(name);
    var label = labelFor(el) || name;
    var params = {
      event_category: category,
      section_name: category,
      button_name: name,
      event_label: label,
      page_path: (location.pathname || "") + (location.search || ""),
      tracking_purpose:
        (el && el.getAttribute && el.getAttribute("data-ga-purpose")) || label,
    };
    var href = el && el.getAttribute && el.getAttribute("href");
    if (href) params.link_url = href;
    try { window.gtag("event", name, params); } catch (_err) {}
  }

  // Static-element rules: [event_name, css_selector]. Header vs footer share
  // some hrefs (#how, #pricing, #pillars), so those are scoped by ancestor
  // (.nav-links / #authActions for header, footer for footer).
  var rules = [
    // ── header / nav (all pages) ──────────────────────────────────────────
    ["header_logo_home", ".header-logo, a.logo.header-logo, .top-brand, .home-link"],
    ["header_nav_products", ".nav-links a[href='#pillars'][data-i18n='home.nav.product'], #authActions a[href='#pillars'][data-i18n='home.nav.product']"],
    ["header_nav_how_it_works", ".nav-links a[href='#how'], #authActions a[href='#how']"],
    ["header_nav_pricing", ".nav-links a[href='#pricing'], #authActions a[href='#pricing']"],
    ["header_nav_logout", "#btnLogout, #authMenuLogout"],
    ["header_nav_login_signup", "#btnLogin, #mmLogin"],
    ["header_nav_admin_dashboard", "#btnAdmin, #authMenuAdmin"],

    // ── footer (all pages; href-scoped under <footer>) ────────────────────
    ["footer_nav_terms_of_use", "footer a[href*='terms-of-use']"],
    ["footer_nav_privacy_policy", "footer a[href*='privacy-policy']"],
    ["footer_nav_testimonials", "footer a[href*='testimonials']"],
    ["footer_nav_blog", "footer a[href*='blog']"],
    ["footer_nav_meet_aria", "footer a[href='#aria']"],
    ["footer_nav_the_platform", "footer a[href='#pillars']"],
    ["footer_nav_how_it_works", "footer a[href='#how']"],
    ["footer_nav_pricing", "footer a[href='#pricing']"],

    // ── mobile menu ───────────────────────────────────────────────────────
    ["mobile_menu_open", ".menu-btn"],
    ["mobile_menu_close", ".menu-drawer-close, .mobile-menu-close"],

    // ── login page (auth.html / admin-served.html) ────────────────────────
    ["login_page_button_google_auth", "#googleAuthLink, .auth-cta-google"],
    ["login_page_button_continue_with_mobile", ".auth-cta-phone"],
    ["login_page_link_back_to_site", ".back-link"],

    // ── user homepage / dashboard launcher cards (care-path.html) ──────────
    ["user_homepage_ai_yoga_tutor", "#swLaunchYoga"],
    ["user_homepage_ai_nutritionist", "#swLaunchNutrition"],
    ["user_homepage_chronic_disease_management", "#swLaunchChronic"],
    ["user_homepage_ai_guided_meditation", "#swLaunchMeditation"],

    // ── AI Yoga Tutor flow (care-path.html) ───────────────────────────────
    ["ai_yoga_tutor_button_practice_tadasana", "#yogaBetaOpen"],
    ["ai_yoga_tutor_button_practice_balasana", "#yogaBalasanaOpen"],
    ["ai_yoga_tutor_button_go_back_menu", "#yogaIntroBack"],
    ["ai_yoga_tutor_button_go_skip_guide", "#yogaSkip, #balasanaSkip"],
    ["ai_yoga_tutor_button_back_to_care_path", "#yogaBackCarepath, #balasanaBackCarepath"],

    // ── AI Nutritionist / Recipe Library static bits (care-path.html) ─────
    ["ai_nutritionist_button_new_chat", "#swNewChat"],
    ["ai_nutritionist_button_clear_chat", "#careSidebarClear"],
    ["recipe_library_button_go_back", "#mgBackBtn"],
  ];

  function findRuleMatch(el) {
    for (var i = 0; i < rules.length; i++) {
      var matched = el.closest(rules[i][1]);
      if (matched) return { name: rules[i][0], el: matched };
    }
    return null;
  }

  document.addEventListener(
    "click",
    function (e) {
      var target = e.target;
      if (!target || typeof target.closest !== "function") return;

      // 1) data-ga-event attribute wins (dynamic elements).
      var tagged = target.closest("[data-ga-event]");
      if (tagged) {
        track(tagged.getAttribute("data-ga-event"), tagged);
        return;
      }
      // 2) static selector rules.
      var r = findRuleMatch(target);
      if (r) track(r.name, r.el);
    },
    true
  );
})();
