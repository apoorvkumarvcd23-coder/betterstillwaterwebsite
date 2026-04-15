document.addEventListener("DOMContentLoaded", () => {
  const THEME_STORAGE_KEY = "stillwater_theme";

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((toggle) => {
      const modeLabel = theme === "dark" ? "Dark" : "Light";
      toggle.setAttribute(
        "aria-label",
        `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      );
      toggle.setAttribute("title", `Theme: ${modeLabel}`);
      const label = toggle.querySelector("span");
      if (label) {
        label.textContent = `${modeLabel} mode`;
      }
    });
  }

  function createThemeToggle(extraClasses = "") {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = `theme-toggle ${extraClasses}`.trim();
    toggle.setAttribute("data-theme-toggle", "true");

    const text = document.createElement("span");
    text.className = "theme-toggle-label";
    toggle.appendChild(text);

    toggle.addEventListener("click", () => {
      const current =
        document.documentElement.getAttribute("data-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });

    return toggle;
  }

  function mountThemeToggles() {
    const header = document.querySelector(".header");
    const authActions = document.getElementById("authActions");

    if (
      authActions &&
      !authActions.querySelector(".header-theme-toggle-inline")
    ) {
      authActions.prepend(createThemeToggle("header-theme-toggle-inline"));
    } else if (header && !header.querySelector(".header-theme-toggle")) {
      header.appendChild(createThemeToggle("header-theme-toggle"));
    }

    const settingsMount = document.getElementById("themeSettingsMount");
    if (settingsMount && !settingsMount.querySelector("[data-theme-toggle]")) {
      settingsMount.appendChild(createThemeToggle());
    }
  }

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
    const brandElements = document.querySelectorAll(".header-logo");
    brandElements.forEach((element) => {
      const text = (element.textContent || "").trim();
      if (!text || !text.toLowerCase().includes("stillwater")) return;
      if (element.querySelector(".stillwater-logo-mark")) return;

      element.classList.add("stillwater-brand");

      const label = document.createElement("span");
      label.className = "stillwater-brand-text";
      label.textContent = text;

      const logo = document.createElement("img");
      logo.className = "stillwater-logo-mark";
      logo.src = "images/logo.png";
      logo.alt = "Stillwater logo";

      element.textContent = "";
      element.appendChild(logo);
      element.appendChild(label);
    });
  }

  applyTheme(getPreferredTheme());
  normalizePrimaryNavigation();
  normalizeWaitlistLinks();
  normalizeFooters();
  injectStillwaterLogo();
  mountThemeToggles();
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
        });
    }
  };

  initCookieConsent();

  // Auth-aware header actions (main site)
  const authActions = document.getElementById("authActions");
  if (authActions) {
    const authMenuButton = document.getElementById("authMenuButton");
    const authMenu = document.getElementById("authMenu");
    const btnLogin = document.getElementById("btnLogin");
    const btnAdmin = document.getElementById("btnAdmin");
    const btnIntake = document.getElementById("btnIntake");
    const AUTH_COMPACT_BREAKPOINT = 1039;
    const MAX_COMPACT_NAME_CHARS = 8;
    const MAX_FULL_NAME_CHARS = 22;
    let activeUser = null;

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

    const applyAuthActionsLayout = () => {
      const isAuthenticated = Boolean(activeUser);
      const isCompact =
        isAuthenticated && window.innerWidth <= AUTH_COMPACT_BREAKPOINT;

      document.body.classList.toggle("auth-actions-compact", isCompact);

      if (!isAuthenticated) {
        if (btnAdmin) btnAdmin.style.display = "none";
        if (btnIntake) btnIntake.style.display = "none";
        if (btnLogin) btnLogin.style.display = "inline-flex";
        if (authMenuButton) {
          authMenuButton.style.display = "none";
        }
        return;
      }

      if (btnLogin) btnLogin.style.display = "none";

      const safeName =
        typeof activeUser.name === "string" && activeUser.name.trim()
          ? activeUser.name.trim()
          : "Member";
      const firstName = safeName.split(/\s+/)[0] || "Member";
      const compactName = clampLabel(firstName, MAX_COMPACT_NAME_CHARS);
      const fullName = clampLabel(safeName, MAX_FULL_NAME_CHARS);

      if (authMenuButton) {
        const greetingText = isCompact ? `Hi, ${compactName}` : `Hi, ${fullName}`;
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
          !isCompact && activeUser.role === "admin" ? "inline-flex" : "none";
      }

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
        setAuthMenuLink(
          "authMenuIntake",
          "/intake.html",
          "Wellness Assessment",
        );
        if (user.role === "admin") {
          setAuthMenuLink("authMenuAdmin", "/admin.html", "Admin Dashboard");
        } else {
          removeAuthMenuLink("authMenuAdmin");
        }

        applyAuthActionsLayout();

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
});

