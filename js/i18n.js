// Lightweight site-wide i18n.
//
// HTML side: add data-i18n="key" (textContent), data-i18n-placeholder="key",
// data-i18n-aria-label="key", or data-i18n-title="key" to any element. The
// helper walks the DOM on load and on language change and replaces those
// attributes from the dictionary.
//
// JS side: window.SwI18n.t("key", "fallback") returns the translated string.
// Listen for the "sw:langchange" event on window to know when to re-render.
//
// The dropdown auto-mounts inside #authActions on every page; falls back to
// a fixed pill in the top-right if the page has no auth zone.
(function () {
  const STORAGE_KEY = "sw_lang";
  const SUPPORTED = ["en", "hi"];

  // ── Dictionary ────────────────────────────────────────────────────────
  // Keep every entry's hi value matching the en value exactly in meaning.
  // If a key is missing in Hindi, the helper falls back to the English copy
  // so the UI never shows the raw key.
  const DICT = {
    // Generic
    "common.back": { en: "Back", hi: "वापस" },
    "common.close": { en: "Close", hi: "बंद करें" },

    // Nav (home page)
    "nav.howItWorks": { en: "How it works", hi: "यह कैसे काम करता है" },
    "nav.features": { en: "Features", hi: "विशेषताएं" },

    // Auth zone
    "auth.login": { en: "Login / Sign up", hi: "लॉगिन / साइन अप" },
    "auth.logout": { en: "Log out", hi: "लॉग आउट" },
    "auth.adminDashboard": { en: "Admin Dashboard", hi: "एडमिन डैशबोर्ड" },
    "auth.wellnessAssessment": { en: "Wellness Assessment", hi: "वेलनेस आकलन" },
    "auth.continueCarePath": { en: "Continue Care Path", hi: "केयर पाथ जारी रखें" },
    "auth.home": { en: "Home", hi: "होम" },
    "auth.greetingPrefix": { en: "Hi", hi: "नमस्ते" },

    // Home hero
    "home.heroEyebrow": { en: "Your AI companion for personal health", hi: "व्यक्तिगत स्वास्थ्य के लिए आपकी AI साथी" },
    "home.heroTitleA": { en: "Managing a chronic condition,", hi: "दीर्घकालिक स्थिति को संभालना —" },
    "home.heroTitleB": { en: "one good day at a time.", hi: "एक-एक अच्छा दिन।" },
    "home.heroSub": {
      en: "Living with diabetes or hypertension? Stilwater builds you a personalized diet, lifestyle, and exercise routine — complete with recipe links — so you can take steady, daily steps toward managing your condition and living well.",
      hi: "मधुमेह या उच्च रक्तचाप के साथ जी रहे हैं? Stilwater आपके लिए वैयक्तिकृत आहार, जीवनशैली और व्यायाम दिनचर्या तैयार करता है — रेसिपी लिंक के साथ — ताकि आप अपनी स्थिति को संभालने और अच्छे ढंग से जीने की दिशा में रोज़ छोटे, स्थिर कदम बढ़ा सकें।",
    },
    "home.seeHowItWorks": { en: "See how it works →", hi: "देखें कैसे काम करता है →" },

    // Home — How it works
    "home.howKicker": { en: "How it works", hi: "यह कैसे काम करता है" },
    "home.howTitle": { en: "Your plan, shaped around your life.", hi: "आपकी योजना, आपकी ज़िंदगी के अनुसार।" },
    "home.step1.title": { en: "Share where you are", hi: "बताएं आप कहाँ हैं" },
    "home.step1.body": { en: "Tell Stilwater your current conditions and your everyday diet and lifestyle. The more it knows, the better it understands you.", hi: "Stilwater को अपनी मौजूदा स्थितियाँ और रोज़ का खान-पान व जीवनशैली बताएं। जितना ज़्यादा जानेगा, उतना बेहतर समझेगा।" },
    "home.step2.title": { en: "Get your regimen", hi: "अपनी दिनचर्या पाएं" },
    "home.step2.body": { en: "The AI creates a personalized diet, lifestyle, and exercise routine — with recipe links — designed to be easy to follow, day after day.", hi: "AI एक वैयक्तिकृत आहार, जीवनशैली और व्यायाम दिनचर्या बनाता है — रेसिपी लिंक के साथ — जिसे रोज़ आसानी से अपनाया जा सके।" },
    "home.step3.title": { en: "Follow & refine", hi: "अपनाएं और निखारें" },
    "home.step3.body": { en: "As you check in, Stilwater keeps learning your preferences and adjusts your meal plans and routines to fit you better over time.", hi: "जैसे-जैसे आप चेक-इन करते हैं, Stilwater आपकी पसंद सीखता है और समय के साथ आपकी भोजन योजना व दिनचर्या को आपके अनुसार ढालता है।" },

    // Home — Features
    "home.featKicker": { en: "What you can do", hi: "आप क्या कर सकते हैं" },
    "home.featTitle": { en: "A companion you can talk to, any time.", hi: "एक साथी जिससे आप कभी भी बात कर सकते हैं।" },
    "home.feat1.title": { en: "Chat any time", hi: "कभी भी चैट करें" },
    "home.feat1.body": { en: "Ask questions whenever they come up and get clear, personalized answers — no waiting for an appointment.", hi: "जब भी सवाल आए पूछें और स्पष्ट, वैयक्तिकृत जवाब पाएं — अपॉइंटमेंट का इंतज़ार नहीं।" },
    "home.feat2.title": { en: "Snap your food", hi: "अपने खाने की फोटो लें" },
    "home.feat2.body": { en: "Upload a photo of a meal and ask whether it's the right choice for you. Get an answer in seconds.", hi: "अपने भोजन की फोटो अपलोड करें और पूछें कि क्या यह आपके लिए सही है। सेकंडों में उत्तर पाएं।" },
    "home.feat3.title": { en: "Keep a journal", hi: "जर्नल रखें" },
    "home.feat3.body": { en: "Upload your daily journals and Stilwater learns your preferences, tailoring suggestions to what actually works for you.", hi: "अपनी रोज़ की जर्नल अपलोड करें — Stilwater आपकी पसंद सीखता है और आपके लिए कारगर सुझाव देता है।" },
    "home.feat4.title": { en: "Meals & movement", hi: "भोजन और गति" },
    "home.feat4.body": { en: "Receive easy daily meal plans and exercise routines you can genuinely keep up with, refined as you go.", hi: "रोज़ की आसान भोजन योजना और व्यायाम दिनचर्या पाएं जिन्हें आप वाकई निभा सकें, समय के साथ बेहतर होती हुई।" },

    // Home — Final CTA
    "home.finalTitle": { en: "Steadier days start here.", hi: "स्थिर दिनों की शुरुआत यहीं से।" },
    "home.finalBody": { en: "Join the waitlist and be among the first to meet Stilwater — your personalized companion for living well with a chronic condition.", hi: "वेटलिस्ट में शामिल हों और Stilwater से मिलने वालों में पहले बनें — दीर्घकालिक स्थिति के साथ अच्छे ढंग से जीने के लिए आपका वैयक्तिकृत साथी।" },
    "home.disclaimerLabel": { en: "A note on care:", hi: "देखभाल पर एक नोट:" },
    "home.disclaimerBody": { en: "Stilwater offers personalized lifestyle, diet, and exercise guidance to support you alongside your medical care. It does not diagnose, treat, or cure any disease and does not replace advice from your doctor. Always consult your care team before changing your diet, medication, or exercise, and seek immediate medical attention in an emergency.", hi: "Stilwater आपकी चिकित्सकीय देखभाल के साथ-साथ वैयक्तिकृत जीवनशैली, आहार और व्यायाम मार्गदर्शन देता है। यह किसी बीमारी का निदान, उपचार या इलाज नहीं करता और आपके डॉक्टर की सलाह का स्थान नहीं लेता। आहार, दवा या व्यायाम बदलने से पहले हमेशा अपनी देखभाल टीम से सलाह लें, और आपात स्थिति में तुरंत चिकित्सकीय सहायता लें।" },

    // Welcome popup (home)
    "welcome.eyebrow": { en: "Your AI companion", hi: "आपकी AI साथी" },
    "welcome.titleA": { en: "Hello, I'm", hi: "नमस्ते, मैं हूँ" },
    "welcome.titleB": { en: "— your AI companion for personal health.", hi: "— व्यक्तिगत स्वास्थ्य के लिए आपकी AI साथी।" },
    "welcome.subtitle": { en: "To start, please log in.", hi: "शुरू करने के लिए कृपया लॉगिन करें।" },
    "welcome.continueGoogle": { en: "Continue with Google", hi: "Google से जारी रखें" },
    "welcome.later": { en: "Maybe later", hi: "बाद में" },

    // Cookie banner
    "cookie.title": { en: "We respect your sanctuary.", hi: "हम आपकी निजता का सम्मान करते हैं।" },
    "cookie.body": {
      en: 'This website uses strictly necessary cookies (like express-session) to securely maintain your authentication state when accessing The Bridge and the Recovery Portal. By continuing or pressing "Accept Cookies", you consent to our use of these exact cookies.',
      hi: 'यह वेबसाइट The Bridge और Recovery Portal में आपके लॉगिन को सुरक्षित रखने के लिए केवल आवश्यक कुकीज़ का उपयोग करती है। जारी रखकर या "कुकीज़ स्वीकारें" दबाकर आप इन कुकीज़ के उपयोग पर सहमति देते हैं।',
    },
    "cookie.accept": { en: "Accept Cookies", hi: "कुकीज़ स्वीकारें" },

    // Footer (shared on most pages)
    "footer.legal": { en: "Legal & Compliance", hi: "कानूनी एवं अनुपालन" },
    "footer.privacy": { en: "Privacy Policy", hi: "गोपनीयता नीति" },
    "footer.terms": { en: "Terms of Use", hi: "उपयोग की शर्तें" },
    "footer.medical": { en: "Health Warning / Medical Disclaimer", hi: "स्वास्थ्य चेतावनी / चिकित्सकीय अस्वीकरण" },
    "footer.testimonials": { en: "Testimonials", hi: "प्रशंसापत्र" },
    "footer.copyright": { en: "© 2026 Stilwater. All rights reserved.", hi: "© 2026 Stilwater। सर्वाधिकार सुरक्षित।" },
    "footer.tagline": {
      en: "Your AI companion for personal health — personalized diet, lifestyle, and exercise guidance for living well with a chronic condition.",
      hi: "व्यक्तिगत स्वास्थ्य के लिए आपकी AI साथी — दीर्घकालिक स्थितियों के साथ अच्छे ढंग से जीने के लिए वैयक्तिकृत आहार, जीवनशैली और व्यायाम मार्गदर्शन।",
    },

    // Care-path sidebar
    "carepath.yourPath": { en: "Your Care Path", hi: "आपका केयर पाथ" },
    "carepath.providers": { en: "Verified Wellness Providers", hi: "सत्यापित वेलनेस प्रदाता" },
    "carepath.yoga": { en: "Practice Yoga with AI", hi: "AI के साथ योग का अभ्यास करें" },

    // Aria companion shell
    "aria.greeting": { en: "Hi, Aria here", hi: "नमस्ते, मैं Aria हूँ" },
    "aria.disclaimer": { en: "Aria offers lifestyle guidance and does not replace your doctor's advice.", hi: "Aria जीवनशैली मार्गदर्शन देती है और आपके डॉक्टर की सलाह का स्थान नहीं लेती।" },

    // Aria modes
    "aria.mode.mealplan": { en: "Meal Plan", hi: "भोजन योजना" },
    "aria.mode.recipes": { en: "Recipes", hi: "व्यंजन" },
    "aria.mode.journaling": { en: "Journaling", hi: "जर्नल" },
    "aria.modeBlurb.mealplan": { en: "Plan your meals", hi: "अपने भोजन की योजना बनाएं" },
    "aria.modeBlurb.recipes": { en: "Cook something good", hi: "कुछ अच्छा पकाएं" },
    "aria.modeBlurb.journaling": { en: "Log your day", hi: "अपना दिन दर्ज करें" },

    // Meal Plan
    "aria.mp.title": { en: "Your meal plan", hi: "आपकी भोजन योजना" },
    "aria.mp.intro": {
      en: "Let Stilwater build a weekly plan from your tastes, or get today's plan tuned to what you ate yesterday.",
      hi: "Stilwater को अपने स्वाद के अनुसार साप्ताहिक योजना बनाने दें, या कल जो खाया उस पर आधारित आज की योजना प्राप्त करें।",
    },
    "aria.mp.generateWeekly.title": { en: "Generate Stilwater weekly plan", hi: "Stilwater साप्ताहिक योजना बनाएं" },
    "aria.mp.generateWeekly.body": { en: "Tell us your preferred cuisines and what to avoid — by voice or text.", hi: "हमें बताएं कि कौन से व्यंजन पसंद हैं और किनसे बचना है — आवाज़ या टेक्स्ट से।" },
    "aria.mp.generateToday.title": { en: "Generate today's plan", hi: "आज की योजना बनाएं" },
    "aria.mp.generateToday.body": { en: "Built from your plan and yesterday's journal.", hi: "आपकी योजना और कल की जर्नल के आधार पर।" },
    "aria.mp.setupFirst": { en: "Set up a plan first", hi: "पहले एक योजना बनाएं" },
    "aria.mp.weekly.title": { en: "Stilwater weekly plan", hi: "Stilwater साप्ताहिक योजना" },
    "aria.mp.weekly.hint": { en: "Tell us what you like and what to skip. Tap the mic to speak, or just type.", hi: "हमें बताएं क्या पसंद है और क्या छोड़ना है। बोलने के लिए माइक दबाएं, या टाइप करें।" },
    "aria.mp.cuisinesLabel": { en: "Cuisines you prefer", hi: "पसंदीदा व्यंजन" },
    "aria.mp.cuisinesPlaceholder": { en: "e.g. Mediterranean, South Indian, Japanese", hi: "उदा. भारतीय, भूमध्यसागरीय, जापानी" },
    "aria.mp.likeLabel": { en: "Food I like to eat", hi: "मैं जो खाना पसंद करता/करती हूँ" },
    "aria.mp.likePlaceholder": { en: "e.g. dal, oats, lentil soups, seasonal fruits", hi: "उदा. दाल, ओट्स, मसूर का सूप, मौसमी फल" },
    "aria.mp.avoidLabel": { en: "Food I don't like to eat", hi: "मैं जो खाना नहीं पसंद करता/करती" },
    "aria.mp.avoidPlaceholder": { en: "e.g. peanuts, mushrooms, bitter gourd", hi: "उदा. मूंगफली, मशरूम, करेला" },
    "aria.mp.generateBtn": { en: "Generate weekly plan", hi: "साप्ताहिक योजना बनाएं" },
    "aria.mp.generating": { en: "Generating…", hi: "बनाई जा रही है…" },
    "aria.mp.editPrefs": { en: "Edit prefs", hi: "प्राथमिकताएं बदलें" },
    "aria.mp.yourWeekly": { en: "Your weekly plan", hi: "आपकी साप्ताहिक योजना" },
    "aria.mp.today.title": { en: "Today's plan", hi: "आज की योजना" },
    "aria.mp.today.differentBtn": { en: "Generate a different plan for today", hi: "आज के लिए अलग योजना बनाएं" },
    "aria.mp.today.prefAsk": { en: "Do you have any meal preference for today? I can generate based on your preference.", hi: "क्या आज के लिए कोई विशेष भोजन पसंद है? मैं आपकी पसंद के आधार पर योजना बना सकती हूँ।" },
    "aria.mp.today.prefPlaceholder": { en: "e.g. lighter dinner, more protein, soup-based, low-carb…", hi: "उदा. हल्का डिनर, ज़्यादा प्रोटीन, सूप, कम कार्ब्स…" },
    "aria.mp.today.generateBtn": { en: "Generate", hi: "बनाएं" },
    "aria.mp.today.cancel": { en: "Cancel", hi: "रद्द करें" },
    "aria.mp.today.error": { en: "Aria couldn't build a different plan. Please try again.", hi: "Aria अलग योजना नहीं बना पाई। फिर से कोशिश करें।" },
    "aria.mp.weeklyError": { en: "Aria couldn't build the plan. Please try again.", hi: "Aria योजना नहीं बना पाई। फिर से कोशिश करें।" },
    "aria.mp.unreachable": { en: "Couldn't reach Aria right now. Please try again.", hi: "अभी Aria तक नहीं पहुँच पा रहे। फिर से कोशिश करें।" },
    "aria.mp.uploadBtn": { en: "Upload", hi: "अपलोड" },
    "aria.mp.generateWeeklyShort": { en: "Generate weekly", hi: "साप्ताहिक बनाएं" },
    "aria.mp.setupBody": {
      en: "Today's plan builds on a plan you've uploaded or a Stilwater weekly plan. Add one to get started.",
      hi: "आज की योजना आपकी अपलोड की हुई योजना या Stilwater साप्ताहिक योजना पर आधारित होती है। शुरू करने के लिए एक जोड़ें।",
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

    // Recipes
    "aria.recipes.title": { en: "Recipes", hi: "व्यंजन" },
    "aria.recipes.intro.withPlan": { en: "Cooking videos for each meal in today's plan, or search any dish below.", hi: "आज की योजना के हर भोजन के लिए कुकिंग वीडियो, या नीचे कोई व्यंजन खोजें।" },
    "aria.recipes.intro.noPlan": { en: "Search any dish for cooking videos. Generate a weekly plan in Meal Plan to get videos for each meal automatically.", hi: "कुकिंग वीडियो के लिए कोई व्यंजन खोजें। हर भोजन के वीडियो स्वतः पाने के लिए Meal Plan में साप्ताहिक योजना बनाएं।" },
    "aria.recipes.searchPlaceholder": { en: "Search any dish — e.g. paneer tikka", hi: "कोई व्यंजन खोजें — जैसे पनीर टिक्का" },
    "aria.recipes.find": { en: "Find", hi: "खोजें" },
    "aria.recipes.loading": { en: "Finding a recipe video…", hi: "रेसिपी वीडियो खोज रहे हैं…" },
    "aria.recipes.footerNote": { en: "One plant-based cooking video per dish — click to open it on YouTube.", hi: "हर व्यंजन के लिए एक प्लांट-बेस्ड कुकिंग वीडियो — YouTube पर खोलने के लिए क्लिक करें।" },
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
    "aria.journal.inputHint": { en: "Type, speak, or snap a photo — just include the time in your entry.", hi: "टाइप करें, बोलें, या फोटो लें — अपनी प्रविष्टि में समय शामिल करें।" },
    "aria.journal.listening": { en: "Listening…", hi: "सुन रही हूँ…" },
    "aria.journal.thanks": { en: "Thanks — your entry is saved.", hi: "धन्यवाद — आपकी प्रविष्टि सहेज ली गई।" },
    "aria.journal.voiceUnsupported": { en: "Voice input isn't supported in this browser, but you can type your entry instead.", hi: "इस ब्राउज़र में आवाज़ इनपुट उपलब्ध नहीं है, लेकिन आप प्रविष्टि टाइप कर सकते हैं।" },

    // Language dropdown
    "lang.label": { en: "Language", hi: "भाषा" },
    "lang.en": { en: "English", hi: "English" },
    "lang.hi": { en: "हिंदी", hi: "हिंदी" },
  };

  function getLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (_e) {}
    const nav = String((navigator && navigator.language) || "en").toLowerCase();
    return nav.indexOf("hi") === 0 ? "hi" : "en";
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_e) {}
    document.documentElement.lang = lang;
    apply();
    try { window.dispatchEvent(new CustomEvent("sw:langchange", { detail: { lang } })); } catch (_e) {}
  }

  function t(key, fallback) {
    const entry = DICT[key];
    if (!entry) return fallback != null ? fallback : (key || "");
    const lang = getLang();
    return entry[lang] || entry.en || (fallback != null ? fallback : key);
  }

  function apply() {
    try {
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
      document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        const val = t(key, null);
        if (val != null) el.setAttribute("title", val);
      });
      // Refresh the dropdown's visible code and active-option state.
      const codeEl = document.getElementById("swLangCode");
      if (codeEl) codeEl.textContent = lang === "hi" ? "हिं" : "EN";
      document.querySelectorAll(".sw-lang-opt").forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-lang") === lang);
      });
    } catch (_e) {
      // Never throw — i18n should be additive, not breaking.
    }
  }

  function ensureDropdownStyles() {
    try {
      if (document.getElementById("swLangStyles")) return;
      const style = document.createElement("style");
      style.id = "swLangStyles";
      style.textContent =
        ".sw-lang-wrap{position:relative;display:inline-flex;align-items:center;flex-shrink:0;margin-right:.5rem;}" +
        ".sw-lang-btn{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.7);border:1px solid rgba(47,72,66,.18);border-radius:999px;padding:5px 9px;color:#2f4842;font-family:inherit;font-size:.78rem;font-weight:600;line-height:1;cursor:pointer;transition:background .18s ease;}" +
        ".sw-lang-btn:hover{background:rgba(255,255,255,.95);}" +
        ".sw-lang-btn .sw-lang-globe{display:inline-flex;align-items:center;}" +
        ".sw-lang-btn .sw-lang-chev{width:10px;height:10px;}" +
        ".sw-lang-menu{position:absolute;top:calc(100% + 6px);right:0;min-width:140px;background:#fff;border:1px solid rgba(47,72,66,.16);border-radius:12px;padding:5px;box-shadow:0 16px 40px -20px rgba(28,42,42,.4);z-index:10001;}" +
        ".sw-lang-menu[hidden]{display:none;}" +
        ".sw-lang-opt{display:block;width:100%;text-align:left;background:transparent;border:none;border-radius:8px;padding:9px 10px;color:#2f4842;font-family:inherit;font-size:.86rem;font-weight:500;cursor:pointer;}" +
        ".sw-lang-opt:hover{background:rgba(47,72,66,.06);}" +
        ".sw-lang-opt.is-active{background:rgba(192,132,87,.14);color:#c08457;font-weight:700;}" +
        ".sw-lang-wrap-floating{position:fixed;top:.8rem;right:.8rem;z-index:10000;}" +
        "@media (max-width:1039px){.sw-lang-btn{padding:4px 7px;gap:3px;font-size:.7rem;}.sw-lang-btn .sw-lang-globe svg{width:13px;height:13px;}}" +
        "@media (max-width:480px){.sw-lang-btn{padding:5px 6px;}.sw-lang-btn .sw-lang-code{display:none;}.sw-lang-btn .sw-lang-chev{display:none;}.sw-lang-menu{right:auto;left:0;}}";
      (document.head || document.documentElement).appendChild(style);
    } catch (_e) {}
  }

  function mountDropdown() {
    try {
      ensureDropdownStyles();
      if (document.getElementById("swLangBtn")) return;

      const wrap = document.createElement("div");
      wrap.id = "swLangWrap";
      wrap.className = "sw-lang-wrap";

      const btn = document.createElement("button");
      btn.id = "swLangBtn";
      btn.type = "button";
      btn.className = "sw-lang-btn";
      btn.setAttribute("aria-label", "Language / भाषा");
      btn.setAttribute("aria-haspopup", "true");
      btn.setAttribute("aria-expanded", "false");
      btn.title = "Language / भाषा";
      btn.innerHTML =
        '<span class="sw-lang-globe" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="12" cy="12" r="9"/>' +
            '<path d="M3 12h18"/>' +
            '<path d="M12 3c2.5 3 2.5 15 0 18"/>' +
            '<path d="M12 3c-2.5 3-2.5 15 0 18"/>' +
          '</svg>' +
        '</span>' +
        '<span class="sw-lang-code" id="swLangCode">' + (getLang() === "hi" ? "हिं" : "EN") + '</span>' +
        '<svg class="sw-lang-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

      const menu = document.createElement("div");
      menu.id = "swLangMenu";
      menu.className = "sw-lang-menu";
      menu.hidden = true;
      menu.setAttribute("role", "menu");
      menu.innerHTML =
        '<button type="button" role="menuitemradio" class="sw-lang-opt' + (getLang() === "en" ? " is-active" : "") + '" data-lang="en">English</button>' +
        '<button type="button" role="menuitemradio" class="sw-lang-opt' + (getLang() === "hi" ? " is-active" : "") + '" data-lang="hi">हिंदी</button>';

      const openMenu = () => { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); };
      const closeMenu = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (menu.hidden) openMenu(); else closeMenu();
      });
      menu.addEventListener("click", (e) => {
        const opt = e.target && e.target.closest && e.target.closest(".sw-lang-opt");
        if (!opt) return;
        const lang = opt.getAttribute("data-lang");
        if (lang) setLang(lang);
        closeMenu();
      });
      document.addEventListener("click", (e) => {
        if (!menu.hidden && !wrap.contains(e.target)) closeMenu();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !menu.hidden) closeMenu();
      });

      wrap.appendChild(btn);
      wrap.appendChild(menu);

      // Best placement: just inside #authActions so it sits next to "Hi,
      // [name]" / "Continue Care Path". Fallback: float top-right.
      const auth = document.getElementById("authActions");
      if (auth) {
        auth.insertBefore(wrap, auth.firstChild);
      } else {
        wrap.classList.add("sw-lang-wrap-floating");
        document.body.appendChild(wrap);
      }
    } catch (_e) {}
  }

  // Public API
  window.SwI18n = { t, getLang, setLang, apply, mountDropdown, supported: SUPPORTED };

  function init() {
    apply();
    mountDropdown();
    // Re-apply after a tick in case shared.js injects auth elements
    // (e.g. authActions content) after we first ran.
    setTimeout(() => { apply(); if (!document.getElementById("swLangBtn")) mountDropdown(); }, 80);
    setTimeout(apply, 400);
    // Dispatch sw:langchange after init so JS-driven UIs that started
    // rendering before i18n loaded (e.g. care-path Aria) re-render and
    // pick up the translated labels.
    try {
      window.dispatchEvent(new CustomEvent("sw:langchange", { detail: { lang: getLang(), initial: true } }));
    } catch (_e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
