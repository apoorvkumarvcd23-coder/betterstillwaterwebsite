const SAMPLE_QUESTIONS = {
  English: ["Reduce Medicines", "Type 2 Reversed", "Can Type 2 Be Reversed?"],
  Hindi: [
    "दवाइयां कम करें",
    "टाइप 2 रिवर्स हुआ",
    "क्या टाइप 2 रिवर्स हो सकता है?",
  ],
};

const COPY = {
  English: {
    sampleQuestions: "Sample Questions",
    askLabel: "Ask your question",
    queryPlaceholder: "Type your question here...",
    askButton: "Ask",
    thinking: "Thinking...",
    answerLabel: "Answer",
    sourcesLabel: "Sources",
    voiceLabel: "Voice Output",
    authRequired: "Please login to continue.",
  },
  Hindi: {
    sampleQuestions: "नमूना प्रश्न",
    askLabel: "अपना प्रश्न पूछें",
    queryPlaceholder: "अपना प्रश्न यहां टाइप करें...",
    askButton: "पूछें",
    thinking: "सोच रहा है...",
    answerLabel: "उत्तर",
    sourcesLabel: "स्रोत",
    voiceLabel: "आवाज़ आउटपुट",
    authRequired: "जारी रखने के लिए कृपया लॉगिन करें।",
  },
};

let language = "English";
let latestAnswer = "";
let isLoading = false;
let isRecording = false;

const langButton = document.getElementById("langButton");
const langCurrent = document.getElementById("langCurrent");
const langMenu = document.getElementById("langMenu");
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
  samplesLabel.textContent = copy.sampleQuestions;
  askLabel.textContent = copy.askLabel;
  queryInput.placeholder = copy.queryPlaceholder;
  answerLabel.textContent = copy.answerLabel;
  sourcesLabel.textContent = copy.sourcesLabel;
  voiceLabel.textContent = copy.voiceLabel;

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

  SAMPLE_QUESTIONS[language].forEach((question) => {
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
    answerBody.innerHTML = "<p>No answer returned.</p>";
    return;
  }

  let html = "";
  let inList = false;

  lines.forEach((line) => {
    const isBullet = line.startsWith("*") || line.startsWith("-") || /^\d+\./.test(line);

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
    sourcesList.innerHTML = '<div class="source-item"><p class="source-title">No sources returned.</p></div>';
    return;
  }

  safeSources.forEach((source, index) => {
    const title = source && source.title ? String(source.title) : `Source ${index + 1}`;
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
  setStatus("Fetching response...");

  try {
    const response = await fetch("/api/rag/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        language: getApiLanguage(),
      }),
    });

    if (response.status === 401) {
      setStatus(COPY[language].authRequired);
      window.location.href = "/auth.html?returnTo=/testimonials.html";
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
    setStatus("Response ready.");
  } catch (error) {
    setStatus(`Failed to fetch response: ${error.message}`);
  } finally {
    isLoading = false;
    askButton.disabled = false;
    askButton.textContent = COPY[language].askButton;
  }
}

function toggleVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setStatus("Voice input is not supported in this browser.");
    return;
  }

  if (isRecording) {
    return;
  }

  isRecording = true;
  voiceButton.classList.add("is-recording");
  setStatus("Listening...");

  const recognition = new SpeechRecognition();
  recognition.lang = language === "Hindi" ? "hi-IN" : "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    queryInput.value = event.results[0][0].transcript || "";
    queryInput.focus();
  };

  recognition.onerror = () => {
    setStatus("Voice recognition error. Please try again.");
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