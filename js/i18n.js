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
    "common.backHome": { en: "Back to Home", hi: "होम पर वापस" },

    // Legal pages captions / headings
    "legal.captionLegal": { en: "Legal", hi: "कानूनी" },
    "legal.captionSafety": { en: "Legal & Safety", hi: "कानूनी एवं सुरक्षा" },

    // Privacy Policy
    "privacy.title": { en: "Privacy Policy", hi: "गोपनीयता नीति" },
    "privacy.p1": { en: "We collect limited information to provide waitlist access, assessments, and community support communications.", hi: "हम वेटलिस्ट एक्सेस, मूल्यांकन और सामुदायिक सहायता संवाद के लिए सीमित जानकारी एकत्र करते हैं।" },
    "privacy.p2": { en: "Information submitted in forms may include your name, contact details, language preference, and optional wellness context.", hi: "फ़ॉर्म में दी गई जानकारी में आपका नाम, संपर्क विवरण, भाषा प्राथमिकता और वैकल्पिक वेलनेस संदर्भ शामिल हो सकते हैं।" },
    "privacy.p3": { en: "We use this information to improve service quality, support continuity, and coordinate trusted holistic partner pathways.", hi: "हम इस जानकारी का उपयोग सेवा गुणवत्ता सुधारने, सहायता निरंतरता बनाए रखने और विश्वसनीय समग्र साझेदार मार्गों के समन्वय के लिए करते हैं।" },
    "privacy.p4": { en: "We do not sell your personal information. Access is restricted to authorized team members and approved service systems.", hi: "हम आपकी व्यक्तिगत जानकारी नहीं बेचते। पहुँच केवल अधिकृत टीम सदस्यों और स्वीकृत सेवा प्रणालियों तक सीमित है।" },
    "privacy.p5": { en: "You may request correction or deletion of your data by contacting holistic_health@stillwater.you.", hi: "अपने डेटा में सुधार या उसे हटाने के लिए holistic_health@stillwater.you पर संपर्क करें।" },
    "privacy.p6": { en: "By using this site, you agree to this policy and any updates posted on this page.", hi: "इस साइट का उपयोग करके आप इस नीति और इस पृष्ठ पर प्रकाशित किसी भी अद्यतन से सहमत होते हैं।" },

    // Terms of Use
    "terms.title": { en: "Terms of Use", hi: "उपयोग की शर्तें" },
    "terms.p1": { en: "Stilwater provides guidance-oriented wellness content and community pathways for educational and supportive purposes.", hi: "Stilwater शैक्षिक और सहायक उद्देश्यों के लिए मार्गदर्शन-केंद्रित वेलनेस सामग्री और सामुदायिक मार्ग प्रदान करता है।" },
    "terms.p2": { en: "You agree to provide accurate information in forms and avoid misuse of the platform.", hi: "आप फ़ॉर्म में सटीक जानकारी देने और प्लेटफ़ॉर्म के दुरुपयोग से बचने के लिए सहमत हैं।" },
    "terms.p3": { en: "Partner recommendations are shared to support informed wellbeing choices and do not replace professional diagnosis or emergency care.", hi: "साझेदार सिफारिशें सूचित कल्याण निर्णयों के समर्थन के लिए साझा की जाती हैं और पेशेवर निदान या आपातकालीन देखभाल का स्थान नहीं लेतीं।" },
    "terms.p4": { en: "Stilwater may update product features, forms, and policies to improve safety, quality, and user experience.", hi: "Stilwater सुरक्षा, गुणवत्ता और उपयोगकर्ता अनुभव में सुधार के लिए उत्पाद सुविधाओं, फ़ॉर्म और नीतियों को अद्यतन कर सकता है।" },
    "terms.p5": { en: "Continued use of this site indicates acceptance of these terms.", hi: "इस साइट का निरंतर उपयोग इन शर्तों की स्वीकृति को दर्शाता है।" },

    // Medical Disclaimer
    "medical.title": { en: "Health Warning / Medical Disclaimer", hi: "स्वास्थ्य चेतावनी / चिकित्सकीय अस्वीकरण" },
    "medical.p1": { en: "Stilwater offers supportive wellness guidance focused on awareness, balance, and lifestyle wellbeing.", hi: "Stilwater जागरूकता, संतुलन और जीवनशैली कल्याण पर केंद्रित सहायक वेलनेस मार्गदर्शन प्रदान करता है।" },
    "medical.p2": { en: "Information on this website is not a substitute for medical diagnosis, treatment, or emergency intervention.", hi: "इस वेबसाइट की जानकारी चिकित्सीय निदान, उपचार या आपातकालीन हस्तक्षेप का विकल्प नहीं है।" },
    "medical.p3": { en: "If you have severe symptoms, urgent distress, or a medical emergency, contact qualified healthcare professionals immediately.", hi: "यदि आपको गंभीर लक्षण, तत्काल कष्ट या चिकित्सकीय आपात स्थिति है, तो तुरंत योग्य स्वास्थ्य पेशेवरों से संपर्क करें।" },
    "medical.p4": { en: "Any provider listed in the community should be evaluated according to your personal health context and clinician advice.", hi: "समुदाय में सूचीबद्ध किसी भी प्रदाता का मूल्यांकन आपकी व्यक्तिगत स्वास्थ्य स्थिति और चिकित्सक सलाह के अनुसार किया जाना चाहिए।" },
    "medical.p5": { en: "By using this platform, you acknowledge responsibility for your health decisions and agree to seek professional medical care when needed.", hi: "इस प्लेटफ़ॉर्म का उपयोग करके आप अपने स्वास्थ्य निर्णयों की ज़िम्मेदारी स्वीकार करते हैं और आवश्यकता होने पर पेशेवर चिकित्सकीय देखभाल लेने के लिए सहमत हैं।" },

    // Testimonials chooser page
    "testimonials.title": { en: "Choose Your Testimonial AI", hi: "अपना प्रशंसापत्र AI चुनें" },
    "testimonials.subtitle": { en: "Select which testimonial knowledge base you want to chat with.", hi: "चुनें कि आप किस प्रशंसापत्र ज्ञान-कोष से बात करना चाहते हैं।" },
    "testimonials.openAi": { en: "Open AI", hi: "AI खोलें" },
    "testimonials.card.diabetes.title": { en: "Sharan Diabetes Mate AI", hi: "Sharan मधुमेह मेट AI" },
    "testimonials.card.diabetes.body": { en: "Uses diabetes-focused testimonials and outcomes.", hi: "मधुमेह-केंद्रित प्रशंसापत्र और परिणामों का उपयोग करता है।" },
    "testimonials.card.amarEye.title": { en: "Amar Eye Vision Mate AI", hi: "Amar Eye विज़न मेट AI" },
    "testimonials.card.amarEye.body": { en: "Uses Amar Eye Yoga testimonial data.", hi: "Amar Eye Yoga प्रशंसापत्र डेटा का उपयोग करता है।" },
    "testimonials.card.sharanOther.title": { en: "Sharan Other Diseases Testimonials AI", hi: "Sharan अन्य रोग प्रशंसापत्र AI" },
    "testimonials.card.sharanOther.body": { en: "Uses Sharan testimonials for other chronic disease journeys.", hi: "अन्य दीर्घकालिक बीमारी यात्राओं के लिए Sharan प्रशंसापत्रों का उपयोग करता है।" },
    "testimonials.card.holistic.title": { en: "Holistic wellness AI", hi: "समग्र वेलनेस AI" },
    "testimonials.card.holistic.body": { en: "Uses holistic wellness testimonials across multiple programs.", hi: "कई कार्यक्रमों के समग्र वेलनेस प्रशंसापत्रों का उपयोग करता है।" },

    // Nav (home page)
    "nav.howItWorks": { en: "How it works", hi: "यह कैसे काम करता है" },
    "nav.features": { en: "Features", hi: "विशेषताएं" },

    // Auth zone
    "auth.login": { en: "Login / Sign up", hi: "लॉगिन / साइन अप" },
    "auth.logout": { en: "Log out", hi: "लॉग आउट" },
    "auth.adminDashboard": { en: "Admin Dashboard", hi: "एडमिन डैशबोर्ड" },
    "auth.wellnessAssessment": { en: "Wellness Assessment", hi: "वेलनेस आकलन" },
    "intake.skipForNow": { en: "Skip for now →", hi: "अभी छोड़ें →" },
    "auth.continueCarePath": { en: "Continue Your Personalized Care Path", hi: "अपना वैयक्तिकृत केयर पाथ जारी रखें" },
    "auth.home": { en: "Home", hi: "होम" },
    "auth.greetingPrefix": { en: "Hi", hi: "नमस्ते" },

    // Home — document title + meta
    "home.docTitle": { en: "Stilwater Health AI — Still the mind. Nourish the body.", hi: "Stilwater हेल्थ AI — मन को शांत करें। शरीर को पोषित करें।" },
    "home.metaDescription": {
      en: "Stilwater is an AI wellness companion built around yoga, meditation, and plant-based nutrition — to support healthy living, especially for people managing diabetes and hypertension.",
      hi: "Stilwater एक AI वेलनेस साथी है जो योग, ध्यान और पादप-आधारित पोषण पर आधारित है — मधुमेह और उच्च रक्तचाप के साथ जी रहे लोगों के लिए स्वस्थ जीवन का समर्थन करता है।",
    },

    // Home — nav
    "home.nav.meetAria": { en: "Meet Aria", hi: "Aria से मिलें" },
    "home.nav.platform": { en: "The Platform", hi: "प्लेटफ़ॉर्म" },
    "home.nav.product": { en: "Product", hi: "उत्पाद" },
    "home.nav.dashboard": { en: "Dashboard", hi: "डैशबोर्ड" },
    "home.nav.how": { en: "How it works", hi: "यह कैसे काम करता है" },
    "home.nav.pricing": { en: "Pricing", hi: "मूल्य निर्धारण" },

    // Home hero
    "home.heroEyebrow": { en: "Your AI companion for healthy living", hi: "स्वस्थ जीवन के लिए आपका AI साथी" },
    "home.heroTitleA": { en: "Still the mind.", hi: "मन को शांत करें।" },
    "home.heroTitleB": { en: "Nourish the body.", hi: "शरीर को पोषित करें।" },
    "home.heroSub": {
      en: "Stilwater is an AI wellness companion built around three pillars — yoga, meditation, and plant-based nutrition — to support healthy living, especially for people managing diabetes and hypertension.",
      hi: "Stilwater एक AI वेलनेस साथी है जो तीन आधारों पर बना है — योग, ध्यान और पादप-आधारित पोषण — मधुमेह और उच्च रक्तचाप के साथ जी रहे लोगों के लिए स्वस्थ जीवन का समर्थन करता है।",
    },
    "home.heroPillars": { en: "Yoga · Meditation · Plant-based nutrition.", hi: "योग · ध्यान · पादप-आधारित पोषण।" },
    "home.startJourney": { en: "Start wellness journey", hi: "वेलनेस यात्रा शुरू करें" },
    "home.meetAria": { en: "Meet Aria", hi: "Aria से मिलें" },

    // Home — Aria section
    "home.aria.name": { en: "Aria", hi: "Aria" },
    "home.aria.tagline": { en: "Your AI Companion", hi: "आपका AI साथी" },
    "home.aria.eyebrow": { en: "Meet Aria", hi: "Aria से मिलें" },
    "home.aria.titleA": { en: "A companion that", hi: "एक साथी जो" },
    "home.aria.titleB": { en: "walks with you.", hi: "आपके साथ चलता है।" },
    "home.aria.greeting": { en: "Hi, I'm Aria.", hi: "नमस्ते, मैं Aria हूँ।" },
    "home.aria.p1": { en: "I'm Stilwater's AI companion — here to help you settle into a plant-based, whole-food lifestyle for healthier, calmer living.", hi: "मैं Stilwater का AI साथी हूँ — स्वस्थ और शांत जीवन के लिए पादप-आधारित, संपूर्ण-आहार जीवनशैली अपनाने में आपकी मदद करने के लिए यहाँ हूँ।" },
    "home.aria.p2": { en: "I suggest delicious plant-based recipes you can ease into based on your taste and meal preferences — no overnight overhaul, just steady, enjoyable change.", hi: "मैं स्वादिष्ट पादप-आधारित रेसिपी सुझाता हूँ जिन्हें आप अपनी पसंद और भोजन वरीयताओं के अनुसार धीरे-धीरे अपना सकें — रातोंरात बदलाव नहीं, बस स्थिर, सुखद परिवर्तन।" },
    "home.aria.p3": { en: "I help you keep a simple daily journal of what you eat, how you move, and how you meditate — so you can actually see the rhythm of your practice.", hi: "मैं आपकी रोज़ की सरल जर्नल रखने में मदद करता हूँ — आप क्या खाते हैं, कैसे चलते-फिरते हैं, और कैसे ध्यान करते हैं — ताकि आप अपनी साधना की लय देख सकें।" },
    "home.aria.p4": { en: "And if you start drifting from your plan, I'll give you a gentle call to check in and help you find your way back. Not a notification. A real, kind nudge.", hi: "और अगर आप अपनी योजना से भटकने लगें, तो मैं हाल पूछने और आपको रास्ते पर लाने के लिए एक हल्की कॉल करूँगा। केवल सूचना नहीं — एक सच्ची, स्नेहपूर्ण याद।" },
    "home.aria.p5": { en: "I also answer your questions about wellness and nutrition — and when something's beyond me, I connect you to verified providers and doctors, so you always know where to turn.", hi: "मैं वेलनेस और पोषण से जुड़े आपके सवालों के जवाब भी देता हूँ — और जब कुछ मेरी सीमा से परे हो, तो आपको सत्यापित प्रदाताओं और डॉक्टरों से जोड़ता हूँ, ताकि आपको हमेशा पता रहे कि कहाँ जाना है।" },

    // Home — Platform / pillars
    "home.platform.eyebrow": { en: "The Platform", hi: "प्लेटफ़ॉर्म" },
    "home.platform.titleA": { en: "Three AI guides.", hi: "तीन AI गाइड।" },
    "home.platform.titleB": { en: "One integrated practice.", hi: "एक एकीकृत साधना।" },
    "home.platform.lede": { en: "Yoga, meditation, and plant-based nutrition aren't three separate apps. They're one practice that reinforces itself — a calmer mind makes the practice stick, the practice makes the eating mindful, and mindful eating steadies both body and mind.", hi: "योग, ध्यान और पादप-आधारित पोषण तीन अलग ऐप नहीं हैं। ये एक ऐसी साधना हैं जो खुद को मज़बूत करती है — शांत मन साधना को बनाए रखता है, साधना खाने को सजग बनाती है, और सजग खाना तन-मन दोनों को स्थिर करता है।" },

    "home.pillar.yoga.title": { en: "AI Yoga", hi: "AI योग" },
    "home.pillar.yoga.tag": { en: "Record. Score. Improve.", hi: "रिकॉर्ड करें। आँकें। बेहतर बनें।" },
    "home.pillar.yoga.body": { en: "Record your asana practice and Aria gives you AI feedback on your form — the assessment loop most yoga apps don't offer. Pranayama breathwork built in.", hi: "अपनी आसन साधना रिकॉर्ड करें और Aria आपकी मुद्रा पर AI फ़ीडबैक देती है — वो आकलन चक्र जो ज़्यादातर योग ऐप नहीं देते। प्राणायाम साँस-क्रिया अंतर्निहित।" },
    "home.pillar.nutrition.title": { en: "AI Plant-Based Nutrition", hi: "AI पादप-आधारित पोषण" },
    "home.pillar.nutrition.tag": { en: "Eat the way the body loves.", hi: "वैसे खाएं जैसे शरीर पसंद करता है।" },
    "home.pillar.nutrition.body": { en: "Personalized plant-based meal plans and delicious whole-food recipes that adapt to your taste — the gentle path away from stress-driven eating.", hi: "वैयक्तिकृत पादप-आधारित भोजन योजनाएँ और स्वादिष्ट संपूर्ण-आहार रेसिपी जो आपकी पसंद के अनुसार ढलती हैं — तनाव-प्रेरित खाने से दूर ले जाने वाला सौम्य रास्ता।" },
    "home.pillar.meditation.title": { en: "AI Meditation", hi: "AI ध्यान" },
    "home.pillar.meditation.tag": { en: "Still the mind.", hi: "मन को शांत करें।" },
    "home.pillar.meditation.body": { en: "Guided meditation and breathwork to lower the stress that quietly undoes the rest — the foundation everything else grows from.", hi: "तनाव कम करने के लिए मार्गदर्शित ध्यान और साँस-क्रिया जो बाकी सब चुपचाप तोड़ देता है — वो आधार जिस पर सब कुछ टिका है।" },

    // Home — How it works
    "home.how.eyebrow": { en: "How it works", hi: "यह कैसे काम करता है" },
    "home.how.titleA": { en: "A practice that", hi: "एक साधना जो" },
    "home.how.titleB": { en: "fits your life.", hi: "आपके जीवन में बैठती है।" },
    "home.how.lede": { en: "No overhaul, no impossible plan. Aria meets you where you are and helps you build a daily rhythm — gently, consistently.", hi: "कोई पूरा बदलाव नहीं, कोई असंभव योजना नहीं। Aria आपसे वहीं मिलती है जहाँ आप हैं और आपको रोज़ की लय बनाने में मदद करती है — सौम्यता से, निरंतरता से।" },
    "home.step1.title": { en: "Tell Aria about you", hi: "Aria को अपने बारे में बताएं" },
    "home.step1.body": { en: "Your preferences, your goals, the conditions you live with. Aria builds a plan you can follow easily — no overhaul, no overwhelm.", hi: "आपकी पसंद, आपके लक्ष्य, आपकी स्थितियाँ। Aria एक ऐसी योजना बनाती है जिसे आप आसानी से अपना सकें — कोई पूरा बदलाव नहीं, कोई बोझ नहीं।" },
    "home.step2.title": { en: "Get your daily plan", hi: "अपनी रोज़ की योजना पाएं" },
    "home.step2.body": { en: "Plant-based recipes you'll actually want to eat, a short yoga session, a few minutes of meditation.", hi: "पादप-आधारित रेसिपी जिन्हें आप वाकई खाना चाहेंगे, एक छोटा योग सत्र, कुछ मिनट का ध्यान।" },
    "home.step3.title": { en: "Journal as you go", hi: "साथ-साथ जर्नल रखें" },
    "home.step3.body": { en: "Quick entries for meals, movement, and meditation — so you can see your practice take shape.", hi: "भोजन, गति और ध्यान के लिए त्वरित प्रविष्टियाँ — ताकि आप अपनी साधना को आकार लेते देख सकें।" },
    "home.step4.title": { en: "A kind voice when needed", hi: "ज़रूरत पड़ने पर एक स्नेहपूर्ण आवाज़" },
    "home.step4.body": { en: "If you drift, Aria calls to check in. Not a buzz on your screen — a real, warm reminder.", hi: "अगर आप भटक जाएँ, Aria हाल पूछने के लिए कॉल करती है। स्क्रीन पर एक बज़ नहीं — एक सच्ची, गर्मजोश याद।" },

    // Home — Pricing
    "home.pricing.eyebrow": { en: "Subscription", hi: "सदस्यता" },
    "home.pricing.titleA": { en: "Simple,", hi: "सरल," },
    "home.pricing.titleB": { en: "honest pricing.", hi: "ईमानदार मूल्य।" },
    "home.pricing.lede": { en: "One plan, everything included. Cancel anytime.", hi: "एक योजना, सब कुछ शामिल। कभी भी रद्द करें।" },
    "home.pricing.badge": { en: "Aria Companion", hi: "Aria साथी" },
    "home.pricing.planName": { en: "Full access", hi: "पूर्ण पहुँच" },
    "home.pricing.planSub": { en: "Yoga · Meditation · Plant-based nutrition", hi: "योग · ध्यान · पादप-आधारित पोषण" },
    "home.pricing.period": { en: " /month", hi: " /माह" },
    "home.pricing.f1": { en: "Personalized plant-based meal plans & recipes", hi: "वैयक्तिकृत पादप-आधारित भोजन योजनाएँ और रेसिपी" },
    "home.pricing.f2": { en: "AI yoga sessions with form feedback", hi: "मुद्रा फ़ीडबैक के साथ AI योग सत्र" },
    "home.pricing.f3": { en: "Guided meditation & pranayama library", hi: "मार्गदर्शित ध्यान और प्राणायाम पुस्तकालय" },
    "home.pricing.f4": { en: "Daily journal: food, movement & meditation", hi: "रोज़ की जर्नल: भोजन, गति और ध्यान" },
    "home.pricing.f5": { en: "Gentle phone check-ins from Aria", hi: "Aria की तरफ़ से हल्के फ़ोन चेक-इन" },
    "home.pricing.f6": { en: "Q&A on wellness & nutrition, with referrals to verified doctors", hi: "वेलनेस और पोषण पर सवाल-जवाब, सत्यापित डॉक्टरों के रेफ़रल के साथ" },
    "home.pricing.f7": { en: "Cancel anytime, no hidden fees", hi: "कभी भी रद्द करें, कोई छिपा शुल्क नहीं" },
    "home.pricing.cta": { en: "Start with Aria", hi: "Aria के साथ शुरुआत करें" },

    // Home — Footer
    "home.foot.tagline": { en: "Still the mind. Nourish the body.", hi: "मन को शांत करें। शरीर को पोषित करें।" },
    "home.foot.blurb": { en: "Wellness for life with chronic conditions. Yoga, meditation & plant-based nutrition — guided by Aria.", hi: "दीर्घकालिक स्थितियों के साथ जीने के लिए वेलनेस। योग, ध्यान और पादप-आधारित पोषण — Aria द्वारा निर्देशित।" },
    "home.foot.explore": { en: "Explore", hi: "खोजें" },
    "home.foot.stilwater": { en: "Stilwater", hi: "Stilwater" },
    "home.foot.disclaimerTitle": { en: "A note on wellness & medical care.", hi: "वेलनेस और चिकित्सकीय देखभाल पर एक नोट।" },
    "home.foot.disclaimerBody": { en: " Stilwater is a wellness companion and supports your practice alongside your medical care — not in place of it. Please consult your physician for medical advice, diagnosis, or treatment decisions, especially if you live with diabetes, hypertension, or any chronic condition.", hi: " Stilwater एक वेलनेस साथी है और आपकी चिकित्सकीय देखभाल के साथ आपकी साधना का समर्थन करता है — उसके स्थान पर नहीं। चिकित्सकीय सलाह, निदान या उपचार निर्णयों के लिए, विशेष रूप से यदि आप मधुमेह, उच्च रक्तचाप या किसी दीर्घकालिक स्थिति के साथ जी रहे हैं, अपने चिकित्सक से परामर्श करें।" },
    "home.foot.copyright": { en: "© 2026 Stilwater Health AI. All rights reserved.", hi: "© 2026 Stilwater हेल्थ AI। सर्वाधिकार सुरक्षित।" },

    "home.seeHowItWorks": { en: "See how AI wellness support works →", hi: "देखें AI वेलनेस सहायता कैसे काम करती है →" },

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
    "footer.blog": { en: "Blog", hi: "ब्लॉग" },
    "footer.copyright": { en: "© 2026 Stilwater. All rights reserved.", hi: "© 2026 Stilwater। सर्वाधिकार सुरक्षित।" },
    "footer.tagline": {
      en: "Your AI companion for personal health — personalized diet, lifestyle, and exercise guidance for living well with a chronic condition.",
      hi: "व्यक्तिगत स्वास्थ्य के लिए आपकी AI साथी — दीर्घकालिक स्थितियों के साथ अच्छे ढंग से जीने के लिए वैयक्तिकृत आहार, जीवनशैली और व्यायाम मार्गदर्शन।",
    },

    // Care-path sidebar
    "carepath.yourPath": { en: "Your Wellness Journey", hi: "आपकी वेलनेस यात्रा" },
    "carepath.newChat": { en: "New chat", hi: "नई चैट" },
    "carepath.chats": { en: "Chats", hi: "चैट्स" },
    "carepath.noChats": { en: "No chats yet.", hi: "अभी तक कोई चैट नहीं।" },
    "carepath.providers": { en: "Verified Wellness Providers", hi: "सत्यापित वेलनेस प्रदाता" },
    "carepath.yoga": { en: "Practice Yoga with AI", hi: "AI के साथ योग का अभ्यास करें" },
    "carepath.wellnessAssessment": { en: "Take Wellness Assessment", hi: "स्वास्थ्य आकलन लें" },
    "carepath.plantRecipes": { en: "Plant-Based Recipes", hi: "पादप-आधारित रेसिपी" },
    "carepath.stilwaterAIChat": { en: "Stilwater AI Chat", hi: "Stilwater AI चैट" },
    "carepath.partners.title": { en: "Trusted Partners", hi: "विश्वसनीय साझेदार" },
    "carepath.partners.sharan": { en: "SHARAN", hi: "SHARAN" },
    "carepath.partners.healy": { en: "Healy", hi: "Healy" },
    "carepath.partners.amar": { en: "Amar Eye", hi: "Amar Eye" },

    // Post-login selection screen (3 options)
    "launcher.title": { en: "Welcome to your wellness journey", hi: "आपकी वेलनेस यात्रा में आपका स्वागत है" },
    "launcher.subtitle": { en: "Choose where you'd like to begin.", hi: "तय करें कि आप कहाँ से शुरू करना चाहेंगे।" },
    "launcher.yoga.title": { en: "AI Yoga Tutor (Beta)", hi: "AI योग शिक्षक (बीटा)" },
    "launcher.yoga.desc": { en: "Practice asanas with live AI form feedback.", hi: "लाइव AI फ़ॉर्म फ़ीडबैक के साथ आसनों का अभ्यास करें।" },
    "launcher.nutrition.title": { en: "AI Nutritionist for Healthy Living", hi: "स्वस्थ जीवन के लिए AI पोषण विशेषज्ञ" },
    "launcher.nutrition.desc": { en: "Ask Aria, your AI companion for healthy living, anything about plant-based nutrition and delicious plant-based recipes. Get personalized, adaptive meal plans and links to YouTube recipes, all in one place.", hi: "स्वस्थ जीवन के लिए आपकी AI साथी Aria से पादप-आधारित पोषण और स्वादिष्ट पादप-आधारित रेसिपी के बारे में कुछ भी पूछें। व्यक्तिगत, अनुकूल भोजन योजनाएँ और YouTube रेसिपी के लिंक — सब एक ही जगह पाएँ।" },
    "launcher.recipes.title": { en: "Explore Plant-Based Recipes", hi: "पादप-आधारित रेसिपी देखें" },
    "launcher.recipes.desc": { en: "Browse meal plans, recipe videos, and your journal.", hi: "भोजन योजनाएँ, रेसिपी वीडियो और अपनी जर्नल देखें।" },
    "launcher.chronic.title": { en: "Chronic Disease Management", hi: "दीर्घकालिक रोग प्रबंधन" },
    "launcher.chronic.desc": { en: "Get connected to verified and trusted holistic wellness providers to manage your chronic conditions effectively.", hi: "अपनी दीर्घकालिक स्थितियों को प्रभावी ढंग से प्रबंधित करने के लिए सत्यापित और विश्वसनीय समग्र स्वास्थ्य प्रदाताओं से जुड़ें।" },
    "launcher.meditation.title": { en: "AI Guided Meditation (Coming Soon)", hi: "AI निर्देशित ध्यान (जल्द आ रहा है)" },
    "launcher.meditation.desc": { en: "Follow a calming guided meditation video.", hi: "एक शांत निर्देशित ध्यान वीडियो का अनुसरण करें।" },
    "launcher.back": { en: "Back", hi: "वापस" },
    "launcher.options": { en: "Options", hi: "विकल्प" },

    // Aria — Plant-Based Recipes chat (3-question ChatGPT-style flow)
    "aria.recipes.chat.greetDiabetes": {
      en: "Hi, I'm Aria. I see you're managing diabetes — let's find plant-based meals that keep your blood sugar steady and still taste great. Three quick questions and I'll pull cooking videos you can try tonight.",
      hi: "नमस्ते, मैं Aria हूँ। आप मधुमेह का प्रबंधन कर रहे हैं — आइए ऐसी पादप-आधारित भोजन खोजें जो आपकी रक्त शर्करा स्थिर रखें और स्वादिष्ट भी हों। तीन छोटे सवाल और मैं आज रात बनाने वाली रेसिपी वीडियो ले आती हूँ।",
    },
    "aria.recipes.chat.greetEye": {
      en: "Hi, I'm Aria. Since eye health is on your radar, I'll lean toward plant-based meals rich in lutein, zeaxanthin, and omega-3s. Three quick questions and I'll pull cooking videos for you.",
      hi: "नमस्ते, मैं Aria हूँ। चूँकि आँखों के स्वास्थ्य पर ध्यान है, मैं ल्यूटीन, ज़ीएक्सैंथिन और ओमेगा-3 से भरपूर पादप-आधारित भोजन सुझाऊँगी। तीन छोटे सवाल और मैं आपके लिए रेसिपी वीडियो ले आती हूँ।",
    },
    "aria.recipes.chat.greetHypertension": {
      en: "Hi, I'm Aria. With blood pressure in mind, I'll suggest plant-based meals that are heart-friendly and low in sodium. Three quick questions and I'll find cooking videos for you.",
      hi: "नमस्ते, मैं Aria हूँ। रक्तचाप को ध्यान में रखते हुए, मैं हृदय-अनुकूल और कम सोडियम वाली पादप-आधारित भोजन सुझाऊँगी। तीन छोटे सवाल और मैं आपके लिए रेसिपी वीडियो ढूँढती हूँ।",
    },
    "aria.recipes.chat.greetGeneric": {
      en: "Hi, I'm Aria. Tell me a bit about your tastes and I'll find delicious plant-based recipes you'll actually want to cook. Three quick questions — that's it.",
      hi: "नमस्ते, मैं Aria हूँ। अपनी पसंद के बारे में थोड़ा बताइए और मैं ऐसी स्वादिष्ट पादप-आधारित रेसिपी ढूँढूँगी जिन्हें आप वाकई बनाना चाहेंगे। बस तीन छोटे सवाल।",
    },
    "aria.recipes.chat.qLikes": {
      en: "What kinds of dishes or flavours do you love eating? (e.g. South Indian, lentil curries, oats, salads)",
      hi: "आप किस तरह के व्यंजन या स्वाद पसंद करते हैं? (जैसे दक्षिण भारतीय, दाल, ओट्स, सलाद)",
    },
    "aria.recipes.chat.phLikes": {
      en: "e.g. dal, paneer-free curries, oats, fruits",
      hi: "जैसे दाल, बिना पनीर की सब्ज़ी, ओट्स, फल",
    },
    "aria.recipes.chat.qAvoid": {
      en: "Anything you'd rather avoid — allergies, dislikes, or foods that don't sit right with you?",
      hi: "क्या कुछ है जिसे आप टालना चाहेंगे — एलर्जी, नापसंदगी, या ऐसा भोजन जो आपको रास नहीं आता?",
    },
    "aria.recipes.chat.phAvoid": {
      en: "e.g. peanuts, mushrooms, bitter gourd — or 'nothing'",
      hi: "जैसे मूँगफली, मशरूम, करेला — या 'कुछ नहीं'",
    },
    "aria.recipes.chat.qCondition": {
      en: "Anything about your health I should keep in mind while picking recipes? (diabetes-friendly, low salt, gut-friendly, etc.)",
      hi: "रेसिपी चुनते समय आपके स्वास्थ्य के बारे में मुझे क्या ध्यान रखना चाहिए? (मधुमेह-अनुकूल, कम नमक, पेट-अनुकूल आदि)",
    },
    "aria.recipes.chat.phCondition": {
      en: "e.g. diabetes-friendly, low sodium — or 'whatever works'",
      hi: "जैसे मधुमेह-अनुकूल, कम सोडियम — या 'जो भी ठीक हो'",
    },
    "aria.recipes.chat.thinking": {
      en: "Got it. Pulling 3 plant-based recipe videos that match what you told me…",
      hi: "ठीक है। आपकी बातों से मेल खाती 3 पादप-आधारित रेसिपी वीडियो ढूँढ रही हूँ…",
    },
    "aria.recipes.chat.loading": { en: "Finding 3 plant-based recipe videos…", hi: "3 पादप-आधारित रेसिपी वीडियो ढूँढी जा रही हैं…" },
    "aria.recipes.chat.empty": {
      en: "Couldn't find recipe videos for that combination. Try rephrasing or asking again.",
      hi: "उस संयोजन के लिए रेसिपी वीडियो नहीं मिले। दोबारा शब्दों में बदलाव कर देखें या फिर पूछें।",
    },
    "aria.recipes.chat.send": { en: "Send", hi: "भेजें" },
    "aria.recipes.chat.restart": { en: "Ask Aria again", hi: "Aria से फिर पूछें" },
    "aria.recipes.chat.attach": { en: "Attach a file", hi: "फ़ाइल जोड़ें" },
    "aria.recipes.chat.voice": { en: "Voice input", hi: "आवाज़ इनपुट" },
    "aria.recipes.chat.voiceUnsupported": { en: "Voice input not supported in this browser", hi: "इस ब्राउज़र में आवाज़ इनपुट उपलब्ध नहीं है" },

    // Stilwater AI Chat — LLM-backed free-form chat
    "aria.chat.greetDiabetes": {
      en: "I'm Aria. I know you're managing diabetes — what would you like to ask? I can share plant-based foods, mindful-eating tips, and gentle daily practices that help with blood sugar. Pick one of the starters below or type your own.",
      hi: "मैं Aria हूँ। आप मधुमेह का प्रबंधन कर रहे हैं — क्या पूछना चाहेंगे? मैं पादप-आधारित भोजन, सजग खानपान और रक्त शर्करा के लिए सहायक दिनचर्या साझा कर सकती हूँ। नीचे से कोई सुझाव चुनें या अपना सवाल लिखें।",
    },
    "aria.chat.greetEye": {
      en: "I'm Aria. I know eye health is on your mind — what would you like to ask? I can suggest plant-based foods, eye yoga, and screen-time habits that support your vision. Pick a starter or type your own question.",
      hi: "मैं Aria हूँ। आपकी आँखों के स्वास्थ्य पर ध्यान है — क्या पूछना चाहेंगे? मैं दृष्टि को सहारा देने वाले पादप-आधारित भोजन, आँखों के योग और स्क्रीन-समय की आदतें सुझा सकती हूँ। नीचे से कोई सुझाव चुनें या अपना सवाल लिखें।",
    },
    "aria.chat.greetHypertension": {
      en: "I'm Aria. I see blood pressure is on your radar — what would you like to ask? I can share heart-friendly plant foods, calming breathwork, and daily rhythms that help. Pick a starter or type your own.",
      hi: "मैं Aria हूँ। आपके ध्यान में रक्तचाप है — क्या पूछना चाहेंगे? मैं हृदय-अनुकूल पादप भोजन, शांत साँस-क्रिया और सहायक दिनचर्या साझा कर सकती हूँ।",
    },
    "aria.chat.greetGeneral": {
      en: "I'm Aria — your Stilwater wellness companion. Ask me anything about plant-based eating, mindful living, yoga, or breathing — I'm here to help. Pick a starter below or type your own.",
      hi: "मैं Aria हूँ — आपकी Stilwater वेलनेस साथी। पादप-आधारित भोजन, सजग जीवन, योग या साँस-क्रिया के बारे में कुछ भी पूछें — मैं मदद के लिए हूँ। नीचे से कोई सुझाव चुनें या अपना सवाल लिखें।",
    },
    "aria.chat.startDiabetes.1": { en: "What plant-based foods help stabilize blood sugar?", hi: "रक्त शर्करा स्थिर रखने में कौन से पादप-आधारित भोजन मदद करते हैं?" },
    "aria.chat.startDiabetes.2": { en: "How can I reduce sugar cravings naturally?", hi: "मैं मीठे की क्रेविंग को प्राकृतिक रूप से कैसे कम करूँ?" },
    "aria.chat.startDiabetes.3": { en: "What's a simple morning routine for diabetes management?", hi: "मधुमेह प्रबंधन के लिए एक सरल सुबह की दिनचर्या क्या होगी?" },
    "aria.chat.startEye.1": { en: "What plant-based foods support eye health?", hi: "आँखों के स्वास्थ्य के लिए कौन से पादप-आधारित भोजन सहायक हैं?" },
    "aria.chat.startEye.2": { en: "Are there yoga or eye exercises for tired eyes?", hi: "थकी आँखों के लिए योग या आँख-व्यायाम कौन से हैं?" },
    "aria.chat.startEye.3": { en: "How can I reduce eye strain from screens?", hi: "स्क्रीन से आँखों की थकान कैसे कम करूँ?" },
    "aria.chat.startHypertension.1": { en: "What plant-based foods help lower blood pressure?", hi: "रक्तचाप कम करने में कौन से पादप-आधारित भोजन मदद करते हैं?" },
    "aria.chat.startHypertension.2": { en: "Which breathing exercises calm the heart?", hi: "कौन सी साँस-क्रियाएँ हृदय को शांत करती हैं?" },
    "aria.chat.startHypertension.3": { en: "How do I cut sodium without losing flavour?", hi: "स्वाद खोए बिना नमक कैसे कम करूँ?" },
    "aria.chat.startGeneral.1": { en: "What's a simple plant-based meal I can try tonight?", hi: "आज रात बनाने के लिए एक सरल पादप-आधारित भोजन क्या है?" },
    "aria.chat.startGeneral.2": { en: "How do I start a daily mindfulness practice?", hi: "मैं रोज़ की सजगता-साधना कैसे शुरू करूँ?" },
    "aria.chat.startGeneral.3": { en: "What are some gentle yoga poses for stress?", hi: "तनाव के लिए कुछ सौम्य योगासन कौन से हैं?" },
    "aria.chat.greetNutrition": {
      en: "I'm Aria, your AI companion for healthy living. Feel free to ask me anything about healthy living and plant-based recipes.",
      hi: "मैं Aria हूँ, स्वस्थ जीवन के लिए आपकी AI साथी। स्वस्थ जीवन और पादप-आधारित रेसिपी के बारे में मुझसे कुछ भी पूछें।",
    },
    "aria.chat.startNutrition.1": { en: "Can Type 2 Diabetes be reversed?", hi: "क्या टाइप 2 मधुमेह को ठीक किया जा सकता है?" },
    "aria.chat.startNutrition.2": { en: "Is animal food good for health?", hi: "क्या पशु आहार स्वास्थ्य के लिए अच्छा है?" },
    "aria.chat.startNutrition.3": { en: "Suggest some good recipes for breakfast.", hi: "नाश्ते के लिए कुछ अच्छी रेसिपी सुझाएँ।" },
    "aria.chat.thinking": { en: "Aria is thinking…", hi: "Aria सोच रही है…" },
    "aria.chat.viewPrompt": { en: "View system prompt being sent", hi: "भेजा जा रहा सिस्टम प्रॉम्प्ट देखें" },
    "aria.chat.errorGeneric": { en: "I couldn't reach the AI just now. Please try again.", hi: "मैं अभी AI तक नहीं पहुँच पाई। कृपया फिर से प्रयास करें।" },
    "aria.chat.errorNetwork": { en: "Network hiccup — please try once more.", hi: "नेटवर्क समस्या — कृपया फिर से प्रयास करें।" },
    "aria.chat.composePh": { en: "Ask Aria anything…", hi: "Aria से कुछ भी पूछें…" },
    "aria.chat.clear": { en: "Clear chat", hi: "चैट साफ़ करें" },
    "aria.chat.clearConfirm": { en: "Clear this conversation? This can't be undone.", hi: "इस बातचीत को साफ़ करें? यह पूर्ववत नहीं की जा सकती।" },
    "carepath.meditation": { en: "AI Driven Meditation", hi: "AI द्वारा संचालित ध्यान" },

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
    "aria.mp.safetyNote": { en: "Aria offers lifestyle guidance and does not replace your doctor’s advice.", hi: "Aria जीवनशैली मार्गदर्शन देती है और आपके डॉक्टर की सलाह का स्थान नहीं लेती।" },
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
    // Meal Plan sub-tab labels
    "aria.mp.weekly.tab": { en: "Weekly", hi: "साप्ताहिक" },
    "aria.mp.today.tab": { en: "Today", hi: "आज" },
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
    "aria.recipes.intro.withPlan": { en: "Tap a meal below for 3 cooking videos, or search any dish.", hi: "नीचे किसी भोजन पर टैप करें और 3 कुकिंग वीडियो पाएं, या कोई व्यंजन खोजें।" },
    "aria.recipes.intro.noPlan": { en: "Search any dish for cooking videos. Generate a weekly plan in Meal Plan to get videos for each meal automatically.", hi: "कुकिंग वीडियो के लिए कोई व्यंजन खोजें। हर भोजन के वीडियो स्वतः पाने के लिए Meal Plan में साप्ताहिक योजना बनाएं।" },
    "aria.recipes.searchPlaceholder": { en: "Search any dish — e.g. paneer tikka", hi: "कोई व्यंजन खोजें — जैसे पनीर टिक्का" },
    "aria.recipes.find": { en: "Find", hi: "खोजें" },
    "aria.recipes.loading": { en: "Finding a recipe video…", hi: "रेसिपी वीडियो खोज रहे हैं…" },
    "aria.recipes.footerNote": { en: "One plant-based cooking video per dish — click to open it on YouTube.", hi: "हर व्यंजन के लिए एक प्लांट-बेस्ड कुकिंग वीडियो — YouTube पर खोलने के लिए क्लिक करें।" },
    "aria.recipes.footerNote3": { en: "Aria fetches 3 plant-based cooking videos per dish.", hi: "Aria हर व्यंजन के लिए 3 प्लांट-बेस्ड कुकिंग वीडियो लाती है।" },
    "aria.recipes.searchIntro": { en: "Search any dish — Aria finds 3 plant-based cooking videos.", hi: "कोई भी व्यंजन खोजें — Aria 3 प्लांट-बेस्ड कुकिंग वीडियो ढूँढती है।" },
    "aria.recipes.popupTitle": { en: "Recipe videos for", hi: "इसके लिए रेसिपी वीडियो:" },
    "aria.recipes.loading3": { en: "Finding 3 plant-based recipe videos…", hi: "3 प्लांट-बेस्ड रेसिपी वीडियो ढूँढ रही हूँ…" },
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
    "aria.journal.cat.bloodSugar": { en: "Blood Sugar", hi: "रक्त शर्करा" },
    "aria.journal.cat.bloodPressure": { en: "Blood Pressure", hi: "रक्तचाप" },
    "aria.journal.prompt.food": { en: "What did you eat, and when?", hi: "आपने क्या और कब खाया?" },
    "aria.journal.prompt.exercise": { en: "What movement did you do, and when?", hi: "आपने क्या व्यायाम और कब किया?" },
    "aria.journal.prompt.sleep": { en: "How did you sleep, and when?", hi: "आपने कैसे और कब सोया?" },
    "aria.journal.prompt.mood": { en: "How are you feeling, and when?", hi: "आप कैसा महसूस कर रहे हैं, और कब?" },
    "aria.journal.prompt.bloodSugar": { en: "Your blood sugar reading, and when (e.g. 110 mg/dL at 8 am, fasting)", hi: "आपकी रक्त शर्करा रीडिंग और समय (जैसे 110 mg/dL सुबह 8 बजे, खाली पेट)" },
    "aria.journal.prompt.bloodPressure": { en: "Your blood pressure reading, and when (e.g. 120/80 at 9 am)", hi: "आपका रक्तचाप रीडिंग और समय (जैसे 120/80 सुबह 9 बजे)" },
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
        // Place the toggle just before the auth pill (#authMenuWrap) so the
        // nav order reads: [page links] → language toggle → Hi, [name] / Login.
        const anchor = auth.querySelector("#authMenuWrap") || auth.firstChild;
        auth.insertBefore(wrap, anchor);
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
