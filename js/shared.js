// Inject the site-wide i18n script as early as possible. It's defensive
// (try/catch around everything) so even a failure cannot break the page.
(function loadI18n() {
  try {
    if (document.querySelector('script[data-sw-i18n]')) return;
    const s = document.createElement("script");
    s.src = "js/i18n.js";
    s.setAttribute("data-sw-i18n", "1");
    (document.head || document.documentElement).appendChild(s);
  } catch (_e) {}
})();

// Register the PWA service worker (makes the site installable + offline-ready).
// Registered on window load so it never competes with critical page resources.
// The SW itself is network-first, so it can't serve stale content while online.
(function registerServiceWorker() {
  try {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[pwa] SW registration failed", err));
    });
  } catch (_e) {}
})();

document.addEventListener("DOMContentLoaded", () => {
  const THEME_STORAGE_KEY = "stillwater_theme";

  function getPreferredTheme() {
    // Light mode is temporarily disabled; force dark to avoid contrast regressions.
    return "dark";
  }

  function applyTheme(theme) {
    // The site ships a single light theme. Remove any data-theme attribute
    // so neither the legacy dark nor the partial light override blocks apply.
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    document.querySelectorAll("[data-theme-toggle]").forEach((toggle) => {
      const modeLabel = "Dark";
      toggle.setAttribute(
        "aria-label",
        "Theme toggle disabled while dark mode is enforced",
      );
      toggle.setAttribute("title", `Theme: ${modeLabel}`);
      const label = toggle.querySelector("span");
      if (label) {
        label.textContent = `${modeLabel} mode`;
      }
    });
  }

  // COMMENTED OUT: Theme toggle functionality temporarily disabled
  // function createThemeToggle(extraClasses = "") {
  //   const toggle = document.createElement("button");
  //   toggle.type = "button";
  //   toggle.className = `theme-toggle ${extraClasses}`.trim();
  //   toggle.setAttribute("data-theme-toggle", "true");
  //
  //   const text = document.createElement("span");
  //   text.className = "theme-toggle-label";
  //   toggle.appendChild(text);
  //
  //   toggle.addEventListener("click", () => {
  //     const current =
  //       document.documentElement.getAttribute("data-theme") || "dark";
  //     applyTheme(current === "dark" ? "light" : "dark");
  //   });
  //
  //   return toggle;
  // }

  // COMMENTED OUT: Theme toggle mount functionality temporarily disabled
  // function mountThemeToggles() {
  //   const header = document.querySelector(".header");
  //   const authActions = document.getElementById("authActions");
  //
  //   if (
  //     authActions &&
  //     !authActions.querySelector(".header-theme-toggle-inline")
  //   ) {
  //     authActions.prepend(createThemeToggle("header-theme-toggle-inline"));
  //   } else if (header && !header.querySelector(".header-theme-toggle")) {
  //     header.appendChild(createThemeToggle("header-theme-toggle"));
  //   }
  //
  //   const settingsMount = document.getElementById("themeSettingsMount");
  //   if (settingsMount && !settingsMount.querySelector("[data-theme-toggle]")) {
  //     settingsMount.appendChild(createThemeToggle());
  //   }
  // }

  function adjustHomeHeaderLayout() {
    if (!document.body.classList.contains("home-landing")) return;

    const nav = document.querySelector(".home-nav-links");
    const logo = document.querySelector(".home-landing .header-logo");
    const auth = document.getElementById("authActions");
    const menuBtn = document.querySelector(".home-landing .menu-btn");

    if (!nav || !logo || !auth || !menuBtn) return;

    const desktop = window.innerWidth >= 1360;
    document.body.classList.remove("home-nav-collapsed");

    if (!desktop) return;

    const navRect = nav.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    const authRect = auth.getBoundingClientRect();

    const overlapWithLogo = navRect.left <= logoRect.right + 28;
    const overlapWithAuth = navRect.right >= authRect.left - 28;
    const authTooWide =
      authRect.width > Math.max(260, window.innerWidth * 0.22);

    if (overlapWithLogo || overlapWithAuth || authTooWide) {
      document.body.classList.add("home-nav-collapsed");
    }
  }

  function normalizePrimaryNavigation() {
    const menuLists = document.querySelectorAll(".menu-list");
    menuLists.forEach((list) => {
      list.querySelectorAll("a").forEach((anchor) => {
        const href = (anchor.getAttribute("href") || "").toLowerCase();
        if (href.includes("fundraising.html")) {
          anchor.closest("li")?.remove();
        }
      });

      list.querySelectorAll("a").forEach((anchor) => {
        const label = (anchor.textContent || "").trim().toLowerCase();
        const href = (anchor.getAttribute("href") || "").trim().toLowerCase();
        const isWaitlistLink = label.includes("waitlist");
        const pointsToAuth = href === "auth.html" || href === "/auth.html";
        if (isWaitlistLink && pointsToAuth) {
          anchor.setAttribute("href", "/auth.html?showAuth=1");
        }
      });
    });
  }

  function normalizeWaitlistLinks() {
    document
      .querySelectorAll('a[href="auth.html"], a[href="/auth.html"]')
      .forEach((anchor) => {
        const label = (anchor.textContent || "").toLowerCase();
        if (label.includes("waitlist") || label.includes("join")) {
          anchor.setAttribute("href", "/auth.html?showAuth=1");
        }
      });
  }

  // Inject the unified home-style footer on any page that has the standard
  // `<footer class="footer container">` placeholder. The home page renders
  // its own footer inline and is skipped (it has class="footer" only via
  // the no-class <footer> tag we don't touch).
  function injectUnifiedFooter() {
    try {
      const candidates = document.querySelectorAll("footer.footer.container, footer.home-style-footer");
      candidates.forEach((footer) => {
        if (footer.getAttribute("data-sw-unified") === "1") return;
        footer.className = "home-style-footer";
        footer.setAttribute("data-sw-unified", "1");
        footer.innerHTML = `
          <div class="footer-top">
            <div class="footer-left">
              <a href="index.html" class="brand">Stil<span>water</span></a>
              <p data-i18n="footer.tagline">Your AI companion for personal health — personalized diet, lifestyle, and exercise guidance for living well with a chronic condition.</p>
              <div class="footer-social">
                <a href="https://www.instagram.com/Stilwater_Official" target="_blank" rel="noopener" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
                </a>
                <a href="https://www.linkedin.com/company/Stilwater-Official" target="_blank" rel="noopener" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 10v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M11 17v-4c0-1.5 1-3 3-3s3 1.5 3 3v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M11 10v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="7" cy="7.5" r="1" fill="currentColor"/></svg>
                </a>
                <a href="https://www.Facebook.com/StilwaterOfficial" target="_blank" rel="noopener" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </a>
                <a href="http://www.pinterest.com/stilwater-official" target="_blank" rel="noopener" aria-label="Pinterest">
                  <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 18l2-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9 11c0-2 1.5-3.5 3.5-3.5s3.5 1.3 3.5 3.3-1.5 3.7-3.3 3.7c-1 0-1.7-.5-1.7-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </a>
                <a href="https://x.com/StilWater_AI" target="_blank" rel="noopener" aria-label="X / Twitter">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M4 4l16 16M4 20L20 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </a>
              </div>
            </div>
            <div class="footer-right">
              <h4 data-i18n="footer.legal">Legal &amp; Compliance</h4>
              <a href="privacy-policy.html" data-i18n="footer.privacy">Privacy Policy</a>
              <a href="terms-of-use.html" data-i18n="footer.terms">Terms of Use</a>
              <a href="medical-disclaimer.html" data-i18n="footer.medical">Health Warning / Medical Disclaimer</a>
              <a href="testimonials.html" data-i18n="footer.testimonials">Testimonials</a>
            </div>
          </div>
          <div class="footer-bottom" data-i18n="footer.copyright">&copy; 2026 Stilwater. All rights reserved.</div>
        `;
      });
      // Re-apply i18n so freshly-injected data-i18n attrs translate immediately.
      if (window.SwI18n && window.SwI18n.apply) window.SwI18n.apply();
    } catch (_e) {}
  }

  // Make sure the unified-footer styles exist on pages that don't already
  // ship them (any page outside index.html / partners.html).
  function ensureFooterStyles() {
    try {
      if (document.getElementById("swUnifiedFooterStyles")) return;
      const s = document.createElement("style");
      s.id = "swUnifiedFooterStyles";
      s.textContent =
        ".home-style-footer{background:#2f4842;color:rgba(244,241,234,.82);padding:60px clamp(20px,5vw,64px) 32px;}" +
        ".home-style-footer .footer-top{display:flex;flex-wrap:wrap;gap:40px;justify-content:space-between;align-items:flex-start;max-width:1180px;margin:0 auto;}" +
        ".home-style-footer .footer-left{max-width:380px;}" +
        ".home-style-footer .footer-left .brand{font-family:\"Fraunces\",Georgia,serif;font-size:1.45rem;font-weight:500;letter-spacing:.5px;color:#f4f1ea;text-decoration:none;}" +
        ".home-style-footer .footer-left .brand span{color:#d9a679;}" +
        ".home-style-footer .footer-left p{font-size:.92rem;color:rgba(244,241,234,.7);margin:14px 0 22px;}" +
        ".home-style-footer .footer-social{display:flex;gap:14px;}" +
        ".home-style-footer .footer-social a{width:40px;height:40px;border-radius:50%;border:1px solid rgba(244,241,234,.28);display:grid;place-items:center;color:rgba(244,241,234,.8);transition:background .25s,color .25s,transform .25s;}" +
        ".home-style-footer .footer-social a:hover{background:rgba(244,241,234,.12);color:#f4f1ea;transform:translateY(-2px);}" +
        ".home-style-footer .footer-social svg{width:18px;height:18px;}" +
        ".home-style-footer .footer-right{display:flex;flex-direction:column;gap:6px;min-width:180px;}" +
        ".home-style-footer .footer-right h4{font-size:.74rem;letter-spacing:.2em;text-transform:uppercase;color:#d9a679;margin-bottom:10px;font-weight:500;}" +
        ".home-style-footer .footer-right a{color:rgba(244,241,234,.78);text-decoration:none;font-size:.93rem;padding:5px 0;transition:color .25s;}" +
        ".home-style-footer .footer-right a:hover{color:#f4f1ea;}" +
        ".home-style-footer .footer-bottom{margin-top:42px;padding-top:24px;border-top:1px solid rgba(244,241,234,.16);font-size:.84rem;color:rgba(244,241,234,.6);text-align:center;}" +
        "@media (max-width:620px){.home-style-footer .footer-top{flex-direction:column;gap:34px;}}";
      (document.head || document.documentElement).appendChild(s);
    } catch (_e) {}
  }

  function normalizeFooters() {
    const footerLists = document.querySelectorAll("footer ul");
    footerLists.forEach((list) => {
      list.querySelectorAll("a").forEach((anchor) => {
        const href = (anchor.getAttribute("href") || "").toLowerCase();
        if (href.includes("fundraising.html")) {
          anchor.closest("li")?.remove();
        }
      });
    });

    ensureFooterStyles();
    injectUnifiedFooter();

    document
      .querySelectorAll("footer .grid-2 > div:last-child")
      .forEach((box) => {
        if (box.querySelector("[data-compliance-column]")) return;

        const compliance = document.createElement("div");
        compliance.setAttribute("data-compliance-column", "true");
        compliance.innerHTML = `
        <h4 class="text-caption" style="margin-bottom: 1.5rem;">Legal & Compliance</h4>
        <ul class="compliance-links">
          <li><a href="privacy-policy.html">Privacy Policy</a></li>
          <li><a href="terms-of-use.html">Terms of Use</a></li>
          <li><a href="medical-disclaimer.html">Health Warning / Medical Disclaimer</a></li>
          <li><a href="testimonials.html">Testimonials</a></li>
          <li><a href="blog.html">Blog</a></li>
          <!-- <li><a href="careers.html">Careers</a></li> -->
        </ul>
      `;
        box.appendChild(compliance);
      });

    document.querySelectorAll(".footer-bottom a").forEach((anchor) => {
      if ((anchor.textContent || "").toLowerCase().includes("privacy")) {
        anchor.setAttribute("href", "privacy-policy.html");
      }
    });
  }

  function injectStillwaterLogo() {
    // Render the brand as the two-tone "Stilwater" wordmark the home page
    // uses: "Stil" in moss, "water" in clay. No logo image, no box.
    const brandElements = document.querySelectorAll(".header-logo");
    brandElements.forEach((element) => {
      const text = (element.textContent || "").trim();
      const lower = text.toLowerCase();
      if (!text || (!lower.includes("stilwater") && !lower.includes("stillwater"))) return;
      if (element.querySelector(".header-logo-tail")) return;

      element.textContent = "";
      element.appendChild(document.createTextNode("Stil"));
      const tail = document.createElement("span");
      tail.className = "header-logo-tail";
      tail.textContent = "water";
      element.appendChild(tail);
    });
  }

  applyTheme(getPreferredTheme());
  normalizePrimaryNavigation();
  normalizeWaitlistLinks();
  normalizeFooters();
  injectStillwaterLogo();
  // mountThemeToggles(); // COMMENTED OUT: Theme toggle functionality temporarily disabled
  adjustHomeHeaderLayout();
  applyTheme(document.documentElement.getAttribute("data-theme") || "dark");

  let homeHeaderResizeTimeout = null;
  window.addEventListener("resize", () => {
    if (homeHeaderResizeTimeout) {
      clearTimeout(homeHeaderResizeTimeout);
    }
    homeHeaderResizeTimeout = setTimeout(adjustHomeHeaderLayout, 80);
  });

  // Drawer Menu Logic
  const menuBtn = document.querySelector(".menu-btn");
  const closeBtn = document.querySelector(".menu-drawer-close");
  const drawer = document.querySelector(".menu-drawer");

  if (drawer) {
    // Ensure drawer is always closed on page load
    drawer.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (menuBtn && closeBtn && drawer) {
    menuBtn.addEventListener("click", () => {
      drawer.classList.add("active");
      document.body.style.overflow = "hidden"; // Prevent scrolling when menu is open
    });

    closeBtn.addEventListener("click", () => {
      drawer.classList.remove("active");
      document.body.style.overflow = "";
    });
  }

  // Sticky Header Logic
  const header = document.querySelector(".header");
  if (header) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    });
  }

  // Scroll Animations (Intersection Observer)
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.15,
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); // Run once
      }
    });
  }, observerOptions);

  document.querySelectorAll(".fade-up").forEach((el) => {
    observer.observe(el);
  });

  // Cookie Consent Logic
  const initCookieConsent = () => {
    if (!localStorage.getItem("stillwater_cookie_consent")) {
      // Create banner dynamically
      const banner = document.createElement("div");
      banner.className = "cookie-banner";
      banner.innerHTML = `
        <div class="cookie-text">
          <strong style="color: var(--color-text-primary); display: block; margin-bottom: 0.25rem;">We respect your sanctuary.</strong>
          This website uses strictly necessary cookies (like express-session) to securely maintain your authentication state when accessing The Bridge and the Recovery Portal. By continuing or pressing "Accept Cookies", you consent to our use of these exact cookies.
        </div>
        <div class="cookie-buttons">
          <button id="btnAcceptCookies" class="btn btn-solid btn-cookie">Accept Cookies</button>
        </div>
      `;

      document.body.appendChild(banner);

      // Trigger animation after brief delay
      setTimeout(() => {
        banner.classList.add("show");
      }, 1000);

      // Handle Acceptance
      document
        .getElementById("btnAcceptCookies")
        .addEventListener("click", () => {
          localStorage.setItem("stillwater_cookie_consent", "true");
          banner.classList.remove("show");
          setTimeout(() => banner.remove(), 600); // Remove from DOM after animation
          // Flush the page view now that consent has been granted.
          if (typeof window.__swTrackFlush === "function") {
            window.__swTrackFlush();
          }
        });
    }
  };

  initCookieConsent();

  // First-party page-view / user-journey tracking (consent-aware).
  (function initPageTracking() {
    const CONSENT_KEY = "stillwater_cookie_consent";
    const VISITOR_KEY = "sw_visitor_id";
    const SESSION_KEY = "sw_session_id";
    const ATTR_KEY = "sw_first_touch";

    const uuid = () => {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return (
        "v-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10)
      );
    };

    // Capture acquisition source immediately into sessionStorage (no network,
    // no consent needed for a same-tab value) so first-touch referrer/UTM
    // survive even if consent is granted a few page views later.
    let firstTouch = null;
    try {
      firstTouch = JSON.parse(sessionStorage.getItem(ATTR_KEY) || "null");
    } catch (_e) {
      firstTouch = null;
    }
    let isLanding = false;
    if (!firstTouch) {
      isLanding = true;
      const qp = new URLSearchParams(window.location.search);
      firstTouch = {
        referrer: document.referrer || "",
        utmSource: qp.get("utm_source") || "",
        utmMedium: qp.get("utm_medium") || "",
        utmCampaign: qp.get("utm_campaign") || "",
        utmTerm: qp.get("utm_term") || "",
        utmContent: qp.get("utm_content") || "",
      };
      try {
        sessionStorage.setItem(ATTR_KEY, JSON.stringify(firstTouch));
      } catch (_e) {}
    }

    const hasConsent = () => localStorage.getItem(CONSENT_KEY) === "true";

    const stableId = (store, key) => {
      let value = null;
      try {
        value = store.getItem(key);
      } catch (_e) {}
      if (!value) {
        value = uuid();
        try {
          store.setItem(key, value);
        } catch (_e) {}
      }
      return value;
    };

    let sent = false;
    const sendPageView = () => {
      if (sent || !hasConsent()) return;
      sent = true;
      const payload = {
        visitorId: stableId(localStorage, VISITOR_KEY),
        sessionId: stableId(sessionStorage, SESSION_KEY),
        path: window.location.pathname + window.location.search,
        title: document.title || "",
        referrer: firstTouch.referrer,
        utmSource: firstTouch.utmSource,
        utmMedium: firstTouch.utmMedium,
        utmCampaign: firstTouch.utmCampaign,
        utmTerm: firstTouch.utmTerm,
        utmContent: firstTouch.utmContent,
        isLanding: isLanding,
      };
      try {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        if (navigator.sendBeacon && navigator.sendBeacon("/api/track", blob)) {
          return;
        }
      } catch (_e) {}
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: "include",
      }).catch(() => {});
    };

    // Exposed so the cookie-consent accept handler can flush immediately.
    window.__swTrackFlush = sendPageView;

    if (hasConsent()) {
      sendPageView();
    }
  })();

  // Auth-aware header actions (main site)
  const authActions = document.getElementById("authActions");
  if (authActions) {
    const authMenuButton = document.getElementById("authMenuButton");
    const authMenu = document.getElementById("authMenu");
    const btnLogin = document.getElementById("btnLogin");
    const btnAdmin = document.getElementById("btnAdmin");
    const btnIntake = document.getElementById("btnIntake");
    const btnDashboard = document.getElementById("btnDashboard");
    const AUTH_COMPACT_BREAKPOINT = 1039;
    const MAX_COMPACT_NAME_CHARS = 8;
    const MAX_FULL_NAME_CHARS = 22;
    let activeUser = null;

    const hasAdminRole = (user) => {
      const role = String(user?.role || "")
        .trim()
        .toLowerCase();
      return role === "admin";
    };

    const setAdminDrawerAccess = (isAdmin) => {
      document.querySelectorAll(".menu-list").forEach((list) => {
        const existing = list.querySelector("[data-admin-drawer-link='true']");
        if (isAdmin) {
          if (existing) return;
          const item = document.createElement("li");
          item.setAttribute("data-admin-drawer-link", "true");
          const link = document.createElement("a");
          link.href = "/admin.html";
          link.textContent = "Admin Portal";
          item.appendChild(link);
          list.appendChild(item);
          return;
        }

        if (existing) {
          existing.remove();
        }
      });
    };

    const clampLabel = (value, maxChars) => {
      if (value.length <= maxChars) return value;
      return `${value.slice(0, Math.max(1, maxChars - 3))}...`;
    };

    const setAuthMenuLink = (id, href, label) => {
      if (!authMenu) return;

      let link = document.getElementById(id);
      if (!link) {
        link = document.createElement("a");
        link.id = id;
        link.style.display = "block";
        link.style.padding = "0.5rem 0.75rem";
        link.style.color = "var(--color-text-primary)";
        link.style.textDecoration = "none";
        link.style.fontSize = "0.8rem";
        const logoutLink = document.getElementById("btnLogout");
        authMenu.insertBefore(link, logoutLink || null);
      }

      link.href = href;
      link.textContent = label;
    };

    const removeAuthMenuLink = (id) => {
      const link = document.getElementById(id);
      if (link) link.remove();
    };

    // Add a "Dashboard" link (→ the care-path dashboard) to the header on every
    // page, positioned just before the language toggle. Shown only when logged
    // in; the home page already ships its own #btnDashboard, so skip it there.
    // Re-evaluate the Dashboard link whenever the care-path SPA switches views
    // (the launcher is shown/hidden without a page reload).
    let _swLauncherObserved = false;
    const observeLauncherForDashNav = () => {
      if (_swLauncherObserved) return;
      const launcher = document.getElementById("swLauncher");
      if (!launcher) return;
      _swLauncherObserved = true;
      try {
        const cb = () => ensureDashboardNav(Boolean(activeUser));
        const opts = { attributes: true, attributeFilter: ["hidden"] };
        new MutationObserver(cb).observe(launcher, opts);
        // The yoga-intro and meditation views sit ON TOP of the launcher, so
        // watch them too — the Dashboard link should still show there.
        ["yogaIntroModal", "meditationModal"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) new MutationObserver(cb).observe(el, opts);
        });
      } catch (_e) {}
    };

    const ensureDashboardNav = (isAuthenticated) => {
      try {
        const actions = document.getElementById("authActions");
        if (!actions) return;
        observeLauncherForDashNav();
        let dash = document.getElementById("swDashboardNav");
        // Hide ONLY on the pure launcher (the 4-card dashboard). The yoga-intro
        // and meditation views sit on top of the launcher, so keep the link
        // there (they're not the dashboard).
        const launcher = document.getElementById("swLauncher");
        const yogaModal = document.getElementById("yogaIntroModal");
        const medModal = document.getElementById("meditationModal");
        const overlayOpen = !!((yogaModal && !yogaModal.hidden) || (medModal && !medModal.hidden));
        const onDashboard = !!(launcher && !launcher.hidden) && !overlayOpen;
        if (!isAuthenticated || document.getElementById("btnDashboard") || onDashboard) {
          if (dash) dash.style.display = "none";
          return;
        }
        if (!ensureDashboardNav._styled) {
          ensureDashboardNav._styled = true;
          const s = document.createElement("style");
          s.textContent =
            ".sw-dash-nav{display:inline-flex;align-items:center;text-decoration:none;" +
            "background:rgba(255,255,255,.7);border:1px solid rgba(47,72,66,.18);border-radius:999px;" +
            "padding:5px 12px;color:#2f4842;font-family:inherit;font-size:.8rem;font-weight:600;" +
            "line-height:1;flex-shrink:0;margin-right:.5rem;cursor:pointer;transition:background .18s ease;}" +
            ".sw-dash-nav:hover{background:rgba(255,255,255,.95);}";
          (document.head || document.documentElement).appendChild(s);
        }
        if (!dash) {
          dash = document.createElement("a");
          dash.id = "swDashboardNav";
          dash.className = "sw-dash-nav";
          dash.href = "/care-path.html?view=select";
          dash.setAttribute("data-i18n", "home.nav.dashboard");
          dash.textContent = (window.SwI18n && window.SwI18n.t)
            ? window.SwI18n.t("home.nav.dashboard", "Dashboard") : "Dashboard";
        }
        dash.style.display = "inline-flex";
        // Sit just before the language toggle: [Dashboard] [EN] [coins] [Hi, name].
        const ref = actions.querySelector(".sw-lang-wrap")
          || document.getElementById("swCreditBadge")
          || document.getElementById("authMenuWrap")
          || actions.firstChild;
        if (ref) actions.insertBefore(dash, ref);
        else if (!dash.parentNode) actions.appendChild(dash);
      } catch (_e) {}
    };

    const applyAuthActionsLayout = () => {
      const isAuthenticated = Boolean(activeUser);
      ensureDashboardNav(isAuthenticated);
      const isCompact =
        isAuthenticated && window.innerWidth <= AUTH_COMPACT_BREAKPOINT;

      document.body.classList.toggle("auth-actions-compact", isCompact);

      if (!isAuthenticated) {
        if (btnAdmin) btnAdmin.style.display = "none";
        if (btnIntake) btnIntake.style.display = "none";
        if (btnDashboard) btnDashboard.hidden = true;
        if (btnLogin) btnLogin.style.display = "inline-flex";
        if (authMenuButton) {
          authMenuButton.style.display = "none";
        }
        setAdminDrawerAccess(false);
        return;
      }

      if (btnLogin) btnLogin.style.display = "none";
      // Logged in → show the Dashboard nav link (home page only; the element
      // simply doesn't exist on other pages).
      if (btnDashboard) btnDashboard.hidden = false;

      const safeName =
        typeof activeUser.name === "string" && activeUser.name.trim()
          ? activeUser.name.trim()
          : "Member";
      const firstName = safeName.split(/\s+/)[0] || "Member";
      const compactName = clampLabel(firstName, MAX_COMPACT_NAME_CHARS);
      const fullName = clampLabel(safeName, MAX_FULL_NAME_CHARS);

      if (authMenuButton) {
        const hiWord = (window.SwI18n && window.SwI18n.t) ? window.SwI18n.t("auth.greetingPrefix", "Hi") : "Hi";
        const greetingText = isCompact ? `${hiWord}, ${compactName}` : `${hiWord}, ${fullName}`;
        authMenuButton.innerHTML = `
          <span class="auth-btn-label">${greetingText}</span>
          <svg class="auth-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        authMenuButton.setAttribute("aria-label", "User Profile Menu");
        authMenuButton.style.display = "inline-flex";
        authMenuButton.style.alignItems = "center";
        authMenuButton.style.gap = "0.4rem";
      }

      if (btnIntake) {
        btnIntake.style.display = isCompact ? "none" : "inline-flex";
      }

      if (btnAdmin) {
        btnAdmin.style.display =
          !isCompact && hasAdminRole(activeUser) ? "inline-flex" : "none";
      }

      setAdminDrawerAccess(hasAdminRole(activeUser));

      requestAnimationFrame(() => adjustHomeHeaderLayout());
    };

    const loginUrl = `/auth.html?returnTo=${encodeURIComponent(window.location.href)}`;
    if (btnLogin) btnLogin.setAttribute("href", loginUrl);

    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (!user || user.authenticated === false) {
          activeUser = null;
          removeAuthMenuLink("authMenuIntake");
          removeAuthMenuLink("authMenuAdmin");
          if (authMenu) authMenu.style.display = "none";
          applyAuthActionsLayout();
          return;
        }

        activeUser = user;

        // Returning logged-in customers who come back to the site land on the
        // care-path selection screen instead of the marketing home page. Only
        // fires when *arriving* at home (direct visit / bookmark / external
        // link — referrer is empty or off-site); internal navigation such as
        // the care-path "Home" / logo link still shows the home page. Logged-out
        // visitors are never redirected (this whole branch is auth-only).
        const homePath = (window.location.pathname || "").toLowerCase();
        const onHomePage =
          homePath === "/" || homePath === "/index.html" || homePath.endsWith("/index.html");
        if (onHomePage && !hasAdminRole(user)) {
          let internalNav = false;
          try {
            internalNav =
              Boolean(document.referrer) &&
              new URL(document.referrer).origin === window.location.origin;
          } catch (_e) {
            internalNav = false;
          }
          if (!internalNav) {
            window.location.replace("/care-path.html?view=select");
            return;
          }
        }

        const latestSubmissionId =
          typeof user.latestSubmissionId === "string" && user.latestSubmissionId.trim()
            ? user.latestSubmissionId.trim()
            : "";
        // When the user is already on the care-path page, swap the primary
        // header button to "Home" so they can jump back to the main site.
        // On every other page it stays "Continue Your Personalized Care Path" (or "Wellness
        // Assessment" if no assessment is completed yet).
        const currentPath = (window.location.pathname || "").toLowerCase();
        const onCarePath =
          currentPath === "/care-path.html" ||
          currentPath === "/care-path" ||
          currentPath.endsWith("/care-path.html");
        // Label is always "Continue Your Personalized Care Path" regardless of auth state;
        // only the target changes (smart-routed to the right place).
        let intakeTarget;
        if (onCarePath) {
          intakeTarget = "/";
        } else if (user.hasCompletedAssessment && latestSubmissionId) {
          intakeTarget = `/care-path.html?submissionId=${encodeURIComponent(latestSubmissionId)}`;
        } else {
          intakeTarget = "/care-path.html";
        }
        const intakeLabelKey = "auth.continueCarePath";
        const tx = (k, fb) => (window.SwI18n && window.SwI18n.t) ? window.SwI18n.t(k, fb) : fb;

        const applyIntakeButton = () => {
          const lbl = tx(intakeLabelKey, "Continue Your Personalized Care Path");
          if (btnIntake) {
            btnIntake.href = intakeTarget;
            btnIntake.textContent = lbl;
          }
          document.querySelectorAll("[data-care-cta]").forEach((el) => {
            el.setAttribute("href", intakeTarget);
            el.textContent = lbl;
          });
        };

        // The Continue Your Personalized Care Path / Home / Wellness Assessment link is already
        // shown as the prominent header button (btnIntake) — keep the auth
        // dropdown free of duplicates so it only contains Log out (and Admin
        // Dashboard for admins, since btnAdmin is hidden on mobile).
        removeAuthMenuLink("authMenuIntake");
        applyIntakeButton();
        if (hasAdminRole(user)) {
          setAuthMenuLink("authMenuAdmin", "/admin.html", tx("auth.adminDashboard", "Admin Dashboard"));
        } else {
          removeAuthMenuLink("authMenuAdmin");
        }

        applyAuthActionsLayout();

        // Re-translate auth-related labels whenever the user toggles language.
        window.addEventListener("sw:langchange", () => {
          applyIntakeButton();
          if (hasAdminRole(user)) {
            setAuthMenuLink("authMenuAdmin", "/admin.html", tx("auth.adminDashboard", "Admin Dashboard"));
          }
          applyAuthActionsLayout();
        });

        // Defer layout adjustment to allow DOM to render new button states
        requestAnimationFrame(() => adjustHomeHeaderLayout());
      })
      .catch(() => {
        activeUser = null;
        removeAuthMenuLink("authMenuIntake");
        removeAuthMenuLink("authMenuAdmin");
        if (authMenu) authMenu.style.display = "none";
        applyAuthActionsLayout();

        // Defer layout adjustment to allow DOM to render new button states
        requestAnimationFrame(() => adjustHomeHeaderLayout());
      });

    let authLayoutResizeTimeout = null;
    window.addEventListener("resize", () => {
      if (authLayoutResizeTimeout) {
        clearTimeout(authLayoutResizeTimeout);
      }
      authLayoutResizeTimeout = setTimeout(() => {
        applyAuthActionsLayout();
      }, 80);
    });

    if (authMenuButton && authMenu) {
      authMenuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        authMenu.style.display =
          authMenu.style.display === "block" ? "none" : "block";
      });

      document.addEventListener("click", () => {
        authMenu.style.display = "none";
      });

      authMenu.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }
  }

  // ── Mobile: add auth-actions-compact class when authenticated on mobile ──
  // This lets CSS tighten the auth zone further to prevent logo collision.
  function updateAuthCompactClass() {
    const isMobile = window.innerWidth <= 767;
    const authMenuBtn = document.getElementById("authMenuButton");
    if (isMobile && authMenuBtn) {
      document.body.classList.add("auth-actions-compact");
    } else {
      document.body.classList.remove("auth-actions-compact");
    }
  }

  // Run once + on resize
  updateAuthCompactClass();
  window.addEventListener("resize", updateAuthCompactClass);

  // ── Mobile: partner card tap-to-reveal ──────────────────────────────────
  // On touch devices the :hover state never fires, so partner details are
  // permanently hidden. This handler toggles a .mobile-open class on tap.
  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) {
    document.querySelectorAll(".partner-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        // If the click is on an anchor inside the card let it navigate;
        // only toggle if the card itself (or non-link child) is tapped.
        if (e.target.closest("a") && e.target.closest("a") !== card) return;
        card.classList.toggle("mobile-open");
      });
    });
  }

  // GA event tracking lives in js/ga-events.js so it loads on every page
  // (including ones that don't include shared.js, e.g. intake.html).
});

