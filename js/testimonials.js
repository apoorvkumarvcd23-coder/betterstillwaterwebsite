const SAMPLE_QUESTIONS_BY_DATASET = {
  diabetes: {
    English: [
      "Find testimonials where people reduced diabetes medicine after switching to plant-based diet",
      "Give me testimonial of patient who reduced type 2 diabetes",
      "Can type 2 diabetes be reversed?",
    ],
    Hindi: [
      "पौधा-आधारित आहार अपनाने के बाद जिन लोगों ने मधुमेह की दवाएं कम कीं, ऐसे प्रशंसापत्र दिखाएं",
      "टाइप 2 मधुमेह कम करने वाले मरीज का प्रशंसापत्र दिखाएं",
      "क्या टाइप 2 मधुमेह रिवर्स हो सकता है?",
    ],
  },
  amar_eye_yoga: {
    English: [
      "What kind of eye problems are people facing before coming to Amar Eye Yoga?",
      "What improvements do people notice after following the eye exercises and treatment?",
      "How does the overall experience (training, environment, support) impact their recovery journey?",
    ],
    Hindi: [
      "अमर आई योग आने से पहले लोगों को किस तरह की आंखों की समस्याएं थीं?",
      "आंखों के अभ्यास और उपचार के बाद लोगों ने क्या सुधार महसूस किया?",
      "ट्रेनिंग, वातावरण और सपोर्ट का उनके रिकवरी सफर पर क्या असर पड़ा?",
    ],
  },
  holistic_wellness: {
    English: [
      "Give me testimonial of patient who reduced type 2 diabetes",
      "What improvements do people notice after following the eye exercises and treatment?",
      "Find one testimonial showing measurable improvements after natural healing steps.",
    ],
    Hindi: [
      "टाइप 2 मधुमेह कम करने वाले मरीज का प्रशंसापत्र दिखाएं",
      "आंखों के अभ्यास और उपचार के बाद लोगों ने क्या सुधार महसूस किया?",
      "ऐसा एक प्रशंसापत्र दिखाएं जिसमें प्राकृतिक उपायों के बाद मापने योग्य सुधार हुआ हो।",
    ],
  },
  sharan_other_diseases: {
    English: [
      "Show testimonials where people improved chronic conditions other than diabetes.",
      "What lifestyle changes are repeatedly mentioned in Sharan testimonials?",
      "Find one testimonial showing measurable improvements after natural healing steps.",
    ],
    Hindi: [
      "मधुमेह के अलावा अन्य पुरानी बीमारियों में सुधार वाले प्रशंसापत्र दिखाएं।",
      "शरण के प्रशंसापत्र में बार-बार कौन से जीवनशैली परिवर्तन बताए गए हैं?",
      "ऐसा एक प्रशंसापत्र दिखाएं जिसमें प्राकृतिक उपायों के बाद मापने योग्य सुधार हुआ हो।",
    ],
  },
  aa_wellness: {
    English: [
      "Find testimonials where people reduced diabetes medicine after switching to plant-based diet",
      "Find one testimonial showing measurable improvements after natural healing steps.",
    ],
    Hindi: [
      "पौधा-आधारित आहार अपनाने के बाद जिन लोगों ने मधुमेह की दवाएं कम कीं, ऐसे प्रशंसापत्र दिखाएं",
      "ऐसा एक प्रशंसापत्र दिखाएं जिसमें प्राकृतिक उपायों के बाद मापने योग्य सुधार हुआ हो।",
    ],
  },
};

const COPY = {
  English: {
    back: "Back",
    sampleQuestions: "Sample Questions",
    askLabel: "Ask your question",
    queryPlaceholder: "Type your question here...",
    askButton: "Ask",
    voiceButton: "Mic",
    speakButton: "Speak",
    stopButton: "Stop",
    thinking: "Thinking...",
    fetching: "Fetching response...",
    responseReady: "Response ready.",
    failedPrefix: "Failed to fetch response:",
    listening: "Listening...",
    voiceUnsupported: "Voice input is not supported in this browser.",
    voiceError: "Voice recognition error. Please try again.",
    answerLabel: "Answer",
    sourcesLabel: "Sources",
    voiceLabel: "Voice Output",
    authRequired: "Please login to continue.",
    noAnswer: "No answer returned.",
    noSources: "No sources returned.",
    heroTitle: {
      diabetes: "StillWater Diabetes Testimonial AI",
      amar_eye_yoga: "Amar Eye Yoga Testimonials AI",
      holistic_wellness: "Holistic wellness AI",
      sharan_other_diseases: "Sharan Other Diseases Testimonials AI",
      aa_wellness: "AA Wellness AI",
    },
    datasetDiabetes: "Diabetes",
    datasetAmar: "Amar Eye Yoga",
    datasetHolistic: "Holistic wellness",
    datasetSharan: "Sharan Other Diseases",
    datasetAa: "AA Wellness",
  },
  Hindi: {
    back: "वापस",
    sampleQuestions: "नमूना प्रश्न",
    askLabel: "अपना प्रश्न पूछें",
    queryPlaceholder: "अपना प्रश्न यहां टाइप करें...",
    askButton: "पूछें",
    voiceButton: "माइक",
    speakButton: "बोलें",
    stopButton: "रोकें",
    thinking: "सोच रहा है...",
    fetching: "उत्तर प्राप्त किया जा रहा है...",
    responseReady: "उत्तर तैयार है।",
    failedPrefix: "उत्तर प्राप्त नहीं हो सका:",
    listening: "सुन रहा है...",
    voiceUnsupported: "इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।",
    voiceError: "वॉइस पहचान में त्रुटि हुई। कृपया पुनः प्रयास करें।",
    answerLabel: "उत्तर",
    sourcesLabel: "स्रोत",
    voiceLabel: "आवाज़ आउटपुट",
    authRequired: "जारी रखने के लिए कृपया लॉगिन करें।",
    noAnswer: "कोई उत्तर प्राप्त नहीं हुआ।",
    noSources: "कोई स्रोत प्राप्त नहीं हुए।",
    heroTitle: {
      diabetes: "स्टिलवॉटर डायबिटीज टेस्टिमोनियल एआई",
      amar_eye_yoga: "अमर आई योग टेस्टिमोनियल्स एआई",
      holistic_wellness: "समग्र वेलनेस एआई",
      sharan_other_diseases: "शरण अदर डिजीजेस टेस्टिमोनियल्स एआई",
      aa_wellness: "एए वेलनेस एआई",
    },
    datasetDiabetes: "डायबिटीज",
    datasetAmar: "अमर आई योग",
    datasetHolistic: "समग्र वेलनेस",
    datasetSharan: "शरण अदर डिजीजेस",
    datasetAa: "एए वेलनेस",
  },
};

let language = "English";
let latestAnswer = "";
let isLoading = false;
let isRecording = false;
const testimonialDataset =
  (document.body && document.body.getAttribute("data-dataset")) || "diabetes";

const langButton = document.getElementById("langButton");
const langCurrent = document.getElementById("langCurrent");
const langMenu = document.getElementById("langMenu");
const backLink = document.getElementById("backLink");
const heroTitle = document.getElementById("heroTitle");
const datasetDiabetesLabel = document.getElementById("datasetDiabetesLabel");
const datasetAmarLabel = document.getElementById("datasetAmarLabel");
const datasetHolisticLabel = document.getElementById("datasetHolisticLabel");
const datasetSharanLabel = document.getElementById("datasetSharanLabel");
const datasetAaLabel = document.getElementById("datasetAaLabel");
const queryInput = document.getElementById("queryInput");
const askButton = document.getElementById("askButton");
const voiceButton = document.getElementById("voiceButton");
const samplesLabel = document.getElementById("samplesLabel");
const askLabel = document.getElementById("askLabel");
const answerLabel = document.getElementById("answerLabel");
const sourcesLabel = document.getElementById("sourcesLabel");
const voiceLabel = document.getElementById("voiceLabel");
const sampleQuestions = document.getElementById("sampleQuestions");
const resultsSection = document.getElementById("resultsSection");
const answerBody = document.getElementById("answerBody");
const sourcesList = document.getElementById("sourcesList");
const statusMessage = document.getElementById("statusMessage");
const speakButton = document.getElementById("speakButton");
const stopButton = document.getElementById("stopButton");

function setStatus(message) {
  statusMessage.textContent = message || "";
}

function getApiLanguage() {
  return language === "Hindi" ? "hi" : "en";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function applyLanguageCopy() {
  const copy = COPY[language];
  langCurrent.textContent = language;
  if (backLink) backLink.textContent = copy.back;
  if (heroTitle) {
    heroTitle.textContent =
      (copy.heroTitle && copy.heroTitle[testimonialDataset]) ||
      (copy.heroTitle && copy.heroTitle.diabetes) ||
      "";
  }
  if (datasetDiabetesLabel)
    datasetDiabetesLabel.textContent = copy.datasetDiabetes;
  if (datasetAmarLabel) datasetAmarLabel.textContent = copy.datasetAmar;
  if (datasetHolisticLabel)
    datasetHolisticLabel.textContent = copy.datasetHolistic;
  if (datasetSharanLabel) datasetSharanLabel.textContent = copy.datasetSharan;
  if (datasetAaLabel) datasetAaLabel.textContent = copy.datasetAa;
  samplesLabel.textContent = copy.sampleQuestions;
  askLabel.textContent = copy.askLabel;
  queryInput.placeholder = copy.queryPlaceholder;
  answerLabel.textContent = copy.answerLabel;
  sourcesLabel.textContent = copy.sourcesLabel;
  voiceLabel.textContent = copy.voiceLabel;
  voiceButton.textContent = copy.voiceButton;
  voiceButton.title = copy.voiceButton;
  voiceButton.setAttribute("aria-label", copy.voiceButton);
  speakButton.textContent = copy.speakButton;
  stopButton.textContent = copy.stopButton;

  if (!isLoading) {
    askButton.textContent = copy.askButton;
  }

  document.querySelectorAll(".lang-item").forEach((button) => {
    const active = button.getAttribute("data-lang") === language;
    button.classList.toggle("is-active", active);
  });
}

function renderSampleQuestions() {
  sampleQuestions.innerHTML = "";

  const datasetQuestions =
    SAMPLE_QUESTIONS_BY_DATASET[testimonialDataset] ||
    SAMPLE_QUESTIONS_BY_DATASET.diabetes;
  const questions = datasetQuestions[language] || datasetQuestions.English;

  questions.forEach((question) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sample-pill";
    button.textContent = question;
    button.addEventListener("click", () => {
      queryInput.value = question;
      queryInput.focus();
    });
    sampleQuestions.appendChild(button);
  });
}

function openLanguageMenu() {
  langMenu.hidden = false;
  langMenu.classList.add("is-open");
  langButton.setAttribute("aria-expanded", "true");
}

function closeLanguageMenu() {
  langMenu.classList.remove("is-open");
  langMenu.hidden = true;
  langButton.setAttribute("aria-expanded", "false");
}

function normalizeAnswer(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .trim();
}

function renderAnswer(answer) {
  const cleaned = normalizeAnswer(answer);
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    answerBody.innerHTML = `<p>${escapeHtml(COPY[language].noAnswer)}</p>`;
    return;
  }

  let html = "";
  let inList = false;

  lines.forEach((line) => {
    const isBullet =
      line.startsWith("*") || line.startsWith("-") || /^\d+\./.test(line);

    if (isBullet) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHtml(line.replace(/^\*\s*|^-\s*|^\d+\.\s*/, ""))}</li>`;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${escapeHtml(line)}</p>`;
    }
  });

  if (inList) {
    html += "</ul>";
  }

  answerBody.innerHTML = html;
}

function renderSources(sources) {
  sourcesList.innerHTML = "";
  const safeSources = Array.isArray(sources) ? sources : [];

  if (!safeSources.length) {
    sourcesList.innerHTML = `<div class="source-item"><p class="source-title">${escapeHtml(COPY[language].noSources)}</p></div>`;
    return;
  }

  safeSources.forEach((source, index) => {
    const title =
      source && source.title ? String(source.title) : `Source ${index + 1}`;
    const url = source && source.url ? String(source.url) : "#";
    const score =
      source && typeof source.score !== "undefined"
        ? Number(source.score).toFixed(4)
        : null;

    const wrapper = document.createElement("div");
    wrapper.className = "source-item";
    wrapper.innerHTML = `
      <h4 class="source-title">${escapeHtml(`${index + 1}. ${title}`)}</h4>
      <a class="source-url" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>
      <div class="source-meta">${score ? `Score: ${score}` : ""}</div>
    `;
    sourcesList.appendChild(wrapper);
  });
}

async function askQuestion() {
  const query = queryInput.value.trim();
  if (!query || isLoading) {
    return;
  }

  isLoading = true;
  askButton.disabled = true;
  askButton.textContent = COPY[language].thinking;
  setStatus(COPY[language].fetching);

  try {
    const response = await fetch("/api/rag/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        language: getApiLanguage(),
        dataset: testimonialDataset,
      }),
    });

    if (response.status === 401) {
      setStatus(COPY[language].authRequired);
      const returnTo = `${window.location.pathname}${window.location.search || ""}`;
      window.location.href = `/auth.html?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data && data.error ? data.error : "Request failed.");
    }

    latestAnswer = normalizeAnswer(data.answer || "");
    renderAnswer(latestAnswer);
    renderSources(data.sources || []);
    resultsSection.hidden = false;
    setStatus(COPY[language].responseReady);
  } catch (error) {
    setStatus(`${COPY[language].failedPrefix} ${error.message}`);
  } finally {
    isLoading = false;
    askButton.disabled = false;
    askButton.textContent = COPY[language].askButton;
  }
}

function toggleVoiceInput() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setStatus(COPY[language].voiceUnsupported);
    return;
  }

  if (isRecording) {
    return;
  }

  isRecording = true;
  voiceButton.classList.add("is-recording");
  setStatus(COPY[language].listening);

  const recognition = new SpeechRecognition();
  recognition.lang = language === "Hindi" ? "hi-IN" : "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    queryInput.value = event.results[0][0].transcript || "";
    queryInput.focus();
  };

  recognition.onerror = () => {
    setStatus(COPY[language].voiceError);
  };

  recognition.onend = () => {
    isRecording = false;
    voiceButton.classList.remove("is-recording");
  };

  recognition.start();
}

function speakAnswer() {
  if (!latestAnswer) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(latestAnswer);
  utterance.lang = language === "Hindi" ? "hi-IN" : "en-US";
  window.speechSynthesis.speak(utterance);
}

langButton.addEventListener("click", () => {
  if (langMenu.hidden) {
    openLanguageMenu();
  } else {
    closeLanguageMenu();
  }
});

document.querySelectorAll(".lang-item").forEach((button) => {
  button.addEventListener("click", () => {
    language = button.getAttribute("data-lang") || "English";
    applyLanguageCopy();
    renderSampleQuestions();
    closeLanguageMenu();
  });
});

document.addEventListener("click", (event) => {
  if (!langMenu.hidden && !event.target.closest(".lang-wrap")) {
    closeLanguageMenu();
  }
});

queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    askQuestion();
  }
});

askButton.addEventListener("click", askQuestion);
voiceButton.addEventListener("click", toggleVoiceInput);
speakButton.addEventListener("click", speakAnswer);
stopButton.addEventListener("click", () => window.speechSynthesis.cancel());

applyLanguageCopy();
renderSampleQuestions();
