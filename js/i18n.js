// Lightweight i18n: dictionary + toggle button. Any element with
// data-i18n="key" gets its textContent replaced; data-i18n-placeholder
// fills the placeholder; data-i18n-aria-label fills aria-label.
//
// Translate more pages by adding data-i18n attributes — no JS changes needed.
//
// API: window.SwI18n.t("key"), .getLang(), .setLang("hi"|"en"), .apply()
// Event: "sw:langchange" fires on <window> when the language is changed.
(function () {
  const STORAGE_KEY = "sw_lang";
  const SUPPORTED = ["en", "hi"];

  // ── Dictionary ────────────────────────────────────────────────────────
  const DICT = {
    // Common nav / buttons
    "nav.home": { en: "Home", hi: "होम" },
    "nav.howItWorks": { en: "How it works", hi: "यह कैसे काम करता है" },
    "nav.features": { en: "Features", hi: "विशेषताएं" },
    "auth.login": { en: "Login / Sign up", hi: "लॉगिन / साइन अप" },
    "auth.logout": { en: "Log out", hi: "लॉग आउट" },
    "auth.continueCarePath": { en: "Continue Care Path", hi: "केयर पाथ जारी रखें" },
    "auth.wellnessAssessment": { en: "Wellness Assessment", hi: "वेलनेस आकलन" },
    "auth.adminDashboard": { en: "Admin Dashboard", hi: "एडमिन डैशबोर्ड" },

    // Home page hero / sections (key bits)
    "home.eyebrow": { en: "Your AI companion for personal health", hi: "व्यक्तिगत स्वास्थ्य के लिए आपका AI साथी" },
    "home.cta.continue": { en: "Continue Care Path", hi: "केयर पाथ जारी रखें" },

    // Footer common
    "footer.legal": { en: "Legal & Compliance", hi: "कानूनी एवं अनुपालन" },
    "footer.privacy": { en: "Privacy Policy", hi: "गोपनीयता नीति" },
    "footer.terms": { en: "Terms of Use", hi: "उपयोग की शर्तें" },
    "footer.medical": { en: "Health Warning / Medical Disclaimer", hi: "स्वास्थ्य चेतावनी / चिकित्सकीय अस्वीकरण" },
    "footer.testimonials": { en: "Testimonials", hi: "प्रशंसापत्र" },

    // Care path sidebar
    "carepath.yourPath": { en: "Your Care Path", hi: "आपका केयर पाथ" },
    "carepath.providers": { en: "Verified Wellness Providers", hi: "सत्यापित वेलनेस प्रदाता" },
    "carepath.yoga": { en: "Practice Yoga with AI", hi: "AI के साथ योग का अभ्यास करें" },

    // Aria companion
    "aria.greeting": { en: "Hi, Aria here", hi: "नमस्ते, मैं Aria हूँ" },
    "aria.disclaimer": { en: "Aria offers lifestyle guidance and does not replace your doctor's advice.", hi: "Aria जीवनशैली मार्गदर्शन देती है और आपके डॉक्टर की सलाह का स्थान नहीं लेती।" },

    // Mode names
    "aria.mode.mealplan": { en: "Meal Plan", hi: "भोजन योजना" },
    "aria.mode.recipes": { en: "Recipes", hi: "व्यंजन" },
    "aria.mode.journaling": { en: "Journaling", hi: "जर्नल" },
    "aria.modeBlurb.mealplan": { en: "Plan your meals", hi: "अपने भोजन की योजना बनाएं" },
    "aria.modeBlurb.recipes": { en: "Cook something good", hi: "कुछ अच्छा पकाएं" },
    "aria.modeBlurb.journaling": { en: "Log your day", hi: "अपना दिन दर्ज करें" },

    // Meal Plan choose
    "aria.mp.title": { en: "Your meal plan", hi: "आपकी भोजन योजना" },
    "aria.mp.intro": {
      en: "Let Stilwater build a weekly plan from your tastes, or get today's plan tuned to what you ate yesterday.",
      hi: "Stilwater को अपने स्वाद के अनुसार साप्ताहिक योजना बनाने दें, या कल जो खाया उस पर आधारित आज की योजना प्राप्त करें।",
    },
    "aria.mp.generateWeekly.title": { en: "Generate Stilwater weekly plan", hi: "Stilwater साप्ताहिक योजना बनाएं" },
    "aria.mp.generateWeekly.body": {
      en: "Tell us your preferred cuisines and what to avoid — by voice or text.",
      hi: "हमें बताएं कि कौन से व्यंजन पसंद हैं और किनसे बचना है — आवाज़ या टेक्स्ट से।",
    },
    "aria.mp.generateToday.title": { en: "Generate today's plan", hi: "आज की योजना बनाएं" },
    "aria.mp.generateToday.body": {
      en: "Built from your plan and yesterday's journal.",
      hi: "आपकी योजना और कल की जर्नल के आधार पर।",
    },
    "aria.mp.setupFirst": { en: "Set up a plan first", hi: "पहले एक योजना बनाएं" },
    "aria.mp.weekly.title": { en: "Stilwater weekly plan", hi: "Stilwater साप्ताहिक योजना" },
    "aria.mp.weekly.hint": {
      en: "Tell us what you like and what to skip. Tap the mic to speak, or just type.",
      hi: "हमें बताएं क्या पसंद है और क्या छोड़ना है। बोलने के लिए माइक दबाएं, या टाइप करें।",
    },
    "aria.mp.cuisinesLabel": { en: "Cuisines you prefer", hi: "पसंदीदा व्यंजन" },
    "aria.mp.cuisinesPlaceholder": { en: "e.g. Mediterranean, South Indian, Japanese", hi: "जैसे भारतीय, भूमध्यसागरीय, जापानी" },
    "aria.mp.avoidLabel": { en: "Foods to avoid", hi: "जिनसे बचना है" },
    "aria.mp.avoidPlaceholder": { en: "e.g. peanuts, shellfish, red meat", hi: "जैसे मूंगफली, अंडा, चीनी" },
    "aria.mp.generateBtn": { en: "Generate weekly plan", hi: "साप्ताहिक योजना बनाएं" },
    "aria.mp.generating": { en: "Generating…", hi: "बनाई जा रही है…" },
    "aria.mp.editPrefs": { en: "Edit prefs", hi: "प्राथमिकताएं बदलें" },
    "aria.mp.yourWeekly": { en: "Your weekly plan", hi: "आपकी साप्ताहिक योजना" },
    "aria.mp.today.title": { en: "Today's plan", hi: "आज की योजना" },
    "aria.mp.today.differentBtn": { en: "Generate a different plan for today", hi: "आज के लिए अलग योजना बनाएं" },
    "aria.mp.today.error": { en: "Aria couldn't build a different plan. Please try again.", hi: "Aria अलग योजना नहीं बना पाई। फिर से कोशिश करें।" },
    "aria.mp.weeklyError": { en: "Aria couldn't build the plan. Please try again.", hi: "Aria योजना नहीं बना पाई। फिर से कोशिश करें।" },
    "aria.mp.unreachable": { en: "Couldn't reach Aria right now. Please try again.", hi: "अभी Aria तक नहीं पहुँच पा रहे। फिर से कोशिश करें।" },
    "aria.mp.uploadBtn": { en: "Upload", hi: "अपलोड" },
    "aria.mp.generateWeeklyShort": { en: "Generate weekly", hi: "साप्ताहिक बनाएं" },
    "aria.mp.setupBody": {
      en: "Today's plan builds on a plan you've uploaded or a Stilwater weekly plan. Add one to get started.",
      hi: "आज की योजना आपकी अपलोड की योजना या Stilwater साप्ताहिक योजना पर आधारित है। शुरू करने के लिए एक जोड़ें।",
    },

    // Day names
    "day.Monday": { en: "Monday", hi: "सोमवार" },
    "day.Tuesday": { en: "Tuesday", hi: "मंगलवार" },
    "day.Wednesday": { en: "Wednesday", hi: "बुधवार" },
    "day.Thursday": { en: "Thursday", hi: "गुरुवार" },
    "day.Friday": { en: "Friday", hi: "शुक्रवार" },
    "day.Saturday": { en: "Saturday", hi: "शनिवार" },
    "day.Sunday": { en: "Sunday", hi: "रविवार" },

    // Meal slot names
    "slot.Breakfast": { en: "Breakfast", hi: "नाश्ता" },
    "slot.Snack": { en: "Snack", hi: "स्नैक" },
    "slot.Lunch": { en: "Lunch", hi: "दोपहर का भोजन" },
    "slot.Evening Snack": { en: "Evening Snack", hi: "शाम का स्नैक" },
    "slot.Dinner": { en: "Dinner", hi: "रात का भोजन" },

    // Back / common
    "common.back": { en: "Back", hi: "वापस" },

    // Recipes
    "aria.recipes.title": { en: "Recipes", hi: "व्यंजन" },
    "aria.recipes.intro.withPlan": {
      en: "Cooking videos for each meal in today's plan, or search any dish below.",
      hi: "आज की योजना के हर भोजन के लिए कुकिंग वीडियो, या नीचे कोई व्यंजन खोजें।",
    },
    "aria.recipes.intro.noPlan": {
      en: "Search any dish for cooking videos. Generate a weekly plan in Meal Plan to get videos for each meal automatically.",
      hi: "कुकिंग वीडियो के लिए कोई भी व्यंजन खोजें। हर भोजन के वीडियो स्वतः पाने के लिए Meal Plan में साप्ताहिक योजना बनाएं।",
    },
    "aria.recipes.searchPlaceholder": { en: "Search any dish — e.g. paneer tikka", hi: "कोई व्यंजन खोजें — जैसे पनीर टिक्का" },
    "aria.recipes.find": { en: "Find", hi: "खोजें" },
    "aria.recipes.loading": { en: "Finding a recipe video…", hi: "रेसिपी वीडियो खोज रहे हैं…" },
    "aria.recipes.footerNote": {
      en: "One plant-based cooking video per dish — click to open it on YouTube.",
      hi: "हर व्यंजन के लिए एक प्लांट-बेस्ड कुकिंग वीडियो — YouTube पर खोलने के लिए क्लिक करें।",
    },
    "aria.recipes.cantReach": { en: "Couldn't reach Aria right now.", hi: "अभी Aria तक नहीं पहुँच पा रहे।" },

    // Journaling
    "aria.journal.greeting": {
      en: "Hi, I'm Aria — your Stilwater companion. Pick what you'd like to journal, then type your entry, tap the mic to speak it, or the camera to add a photo. Just include the time and I'll capture it.",
      hi: "नमस्ते, मैं Aria हूँ — आपकी Stilwater साथी। चुनें कि क्या जर्नल करना है, फिर अपनी प्रविष्टि टाइप करें, बोलने के लिए माइक दबाएं, या फोटो जोड़ने के लिए कैमरा दबाएं। बस समय शामिल करें और मैं उसे दर्ज कर लूँगी।",
    },
    "aria.journal.cat.food": { en: "Food", hi: "भोजन" },
    "aria.journal.cat.exercise": { en: "Exercise", hi: "व्यायाम" },
    "aria.journal.cat.sleep": { en: "Sleep", hi: "नींद" },
    "aria.journal.cat.mood": { en: "Mood", hi: "मूड" },
    "aria.journal.prompt.food": { en: "What did you eat, and when?", hi: "आपने क्या और कब खाया?" },
    "aria.journal.prompt.exercise": { en: "What movement did you do, and when?", hi: "आपने क्या व्यायाम और कब किया?" },
    "aria.journal.prompt.sleep": { en: "How did you sleep, and when?", hi: "आपने कैसे और कब सोया?" },
    "aria.journal.prompt.mood": { en: "How are you feeling, and when?", hi: "आप कैसा महसूस कर रहे हैं, और कब?" },
    "aria.journal.inputHint": {
      en: "Type, speak, or snap a photo — just include the time in your entry.",
      hi: "टाइप करें, बोलें, या फोटो लें — अपनी प्रविष्टि में समय शामिल करें।",
    },
    "aria.journal.listening": { en: "Listening…", hi: "सुन रही हूँ…" },
    "aria.journal.response.food": { en: "Logged to your food journal. 🍽️", hi: "आपके भोजन जर्नल में दर्ज। 🍽️" },
    "aria.journal.response.exercise": { en: "Added to your exercise journal. 💪", hi: "आपके व्यायाम जर्नल में जोड़ा गया। 💪" },
    "aria.journal.response.sleep": { en: "Noted in your sleep journal. 🌙", hi: "आपके नींद जर्नल में नोट किया। 🌙" },
    "aria.journal.response.mood": { en: "Saved to your mood journal. Thanks for checking in.", hi: "आपके मूड जर्नल में सहेजा गया। चेक-इन के लिए धन्यवाद।" },
    "aria.journal.photoNote": { en: " Photo saved with the entry.", hi: " फोटो प्रविष्टि के साथ सहेजी गई।" },
    "aria.journal.voiceUnsupported": {
      en: "Voice input isn't supported in this browser, but you can type your entry instead.",
      hi: "इस ब्राउज़र में आवाज़ इनपुट उपलब्ध नहीं है, लेकिन आप प्रविष्टि टाइप कर सकते हैं।",
    },

    // Cookie banner
    "cookie.title": { en: "We respect your sanctuary.", hi: "हम आपकी निजता का सम्मान करते हैं।" },
    "cookie.body": {
      en: 'This website uses strictly necessary cookies (like express-session) to securely maintain your authentication state when accessing The Bridge and the Recovery Portal. By continuing or pressing "Accept Cookies", you consent to our use of these exact cookies.',
      hi: 'यह वेबसाइट The Bridge और Recovery Portal के दौरान आपके लॉगिन को सुरक्षित रखने के लिए केवल आवश्यक कुकीज़ का उपयोग करती है। जारी रखकर या "Accept Cookies" दबाकर आप इन कुकीज़ के उपयोग की सहमति देते हैं।',
    },
    "cookie.accept": { en: "Accept Cookies", hi: "कुकीज़ स्वीकारें" },
  };

  function getLang() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (_e) {}
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    const nav = String((navigator && navigator.language) || "en").toLowerCase();
    return nav.indexOf("hi") === 0 ? "hi" : "en";
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_e) {}
    document.documentElement.lang = lang;
    apply();
    try {
      window.dispatchEvent(new CustomEvent("sw:langchange", { detail: { lang } }));
    } catch (_e) {}
  }

  function t(key, fallback) {
    const entry = DICT[key];
    if (!entry) return fallback != null ? fallback : key;
    const lang = getLang();
    return entry[lang] || entry.en || (fallback != null ? fallback : key);
  }

  function apply() {
    const lang = getLang();
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key, null);
      if (val != null) el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const val = t(key, null);
      if (val != null) el.setAttribute("placeholder", val);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria-label");
      const val = t(key, null);
      if (val != null) el.setAttribute("aria-label", val);
    });
    // Refresh the toggle pill's label after every switch.
    const btn = document.getElementById("swLangToggle");
    if (btn) btn.textContent = lang === "en" ? "हिं" : "EN";
  }

  function mountToggle() {
    if (document.getElementById("swLangToggle")) return;
    const btn = document.createElement("button");
    btn.id = "swLangToggle";
    btn.className = "sw-lang-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Toggle language");
    btn.title = "Language / भाषा";
    btn.textContent = getLang() === "en" ? "हिं" : "EN";
    btn.addEventListener("click", () => {
      const current = getLang();
      setLang(current === "en" ? "hi" : "en");
    });

    // Best placement: just before #authActions inside the header. If not
    // present, drop a fixed pill in the top-right corner as a fallback.
    const auth = document.getElementById("authActions");
    if (auth && auth.parentNode) {
      auth.parentNode.insertBefore(btn, auth);
      return;
    }
    btn.classList.add("sw-lang-toggle-floating");
    document.body.appendChild(btn);
  }

  // Public API
  window.SwI18n = { t, getLang, setLang, apply, mountToggle, supported: SUPPORTED };

  // Apply right away (before DOMContentLoaded fires for late-loaded scripts).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      apply();
      mountToggle();
    });
  } else {
    apply();
    mountToggle();
  }
})();
