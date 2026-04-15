let currentLang = "en";
let latestAnswer = "";

const userInput = document.getElementById("userInput");
const charCount = document.getElementById("charCount");
const askBtn = document.getElementById("askBtn");
const voiceTab = document.getElementById("voiceTab");
const textTab = document.getElementById("textTab");
const langToggle = document.getElementById("langToggle");
const languageSelect = document.getElementById("languageSelect");
const respLoading = document.getElementById("respLoading");
const respContent = document.getElementById("respContent");
const respIntro = document.getElementById("respIntro");
const insightsList = document.getElementById("insightsList");
const takeawayText = document.getElementById("takeawayText");
const speakBtn = document.getElementById("speakBtn");
const stopSpeakBtn = document.getElementById("stopSpeakBtn");

function updateCount() {
  charCount.textContent = `${userInput.value.length}/500`;
}

userInput.addEventListener("input", updateCount);

userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    askStillwater();
  }
});

askBtn.addEventListener("click", askStillwater);

textTab.addEventListener("click", function () {
  textTab.classList.add("active");
  voiceTab.classList.remove("active");
});

voiceTab.addEventListener("click", function () {
  voiceTab.classList.add("active");
  textTab.classList.remove("active");
  startVoiceInput();
});

langToggle.addEventListener("click", function () {
  currentLang = currentLang === "en" ? "hi" : "en";
  languageSelect.value = currentLang;
  langToggle.textContent = currentLang === "en" ? "English" : "हिंदी";
});

languageSelect.addEventListener("change", function () {
  currentLang = languageSelect.value;
  langToggle.textContent = currentLang === "en" ? "English" : "हिंदी";
});

document.querySelectorAll(".question-item").forEach(item => {
  item.addEventListener("click", function () {
    const question = item.getAttribute("data-question");
    userInput.value = question;
    updateCount();
  });
});

speakBtn.addEventListener("click", function () {
  if (!latestAnswer) return;

  const utter = new SpeechSynthesisUtterance(latestAnswer);
  utter.lang = currentLang === "hi" ? "hi-IN" : "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
});

stopSpeakBtn.addEventListener("click", function () {
  window.speechSynthesis.cancel();
});

function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice input is not supported in this browser. Please use Chrome.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = currentLang === "hi" ? "hi-IN" : "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = function (event) {
    userInput.value = event.results[0][0].transcript;
    updateCount();
    textTab.classList.add("active");
    voiceTab.classList.remove("active");
  };

  recognition.onerror = function () {
    textTab.classList.add("active");
    voiceTab.classList.remove("active");
  };

  recognition.onend = function () {
    textTab.classList.add("active");
    voiceTab.classList.remove("active");
  };
}

function splitAnswerIntoPoints(answer) {
  const cleaned = answer
    .replace(/\r/g, "")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const bulletLines = cleaned.filter(line =>
    line.startsWith("-") ||
    line.startsWith("•") ||
    /^\d+\./.test(line)
  );

  if (bulletLines.length >= 2) {
    return bulletLines.slice(0, 3).map(line =>
      line.replace(/^[-•]\s*/, "").replace(/^\d+\.\s*/, "")
    );
  }

  const sentences = answer
    .replace(/\n/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  return sentences.slice(0, 3);
}

function getTakeaway(answer) {
  const sentences = answer
    .replace(/\n/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (sentences.length > 0) {
    return sentences[sentences.length - 1];
  }

  return answer;
}

function renderInsights(points) {
  const icons = [
    { emoji: "🌱", bg: "#dcfce7" },
    { emoji: "📊", bg: "#dbeafe" },
    { emoji: "👥", bg: "#f3e8ff" }
  ];

  insightsList.innerHTML = "";

  if (!points.length) {
    points = ["No clear insights found in the testimonials."];
  }

  points.slice(0, 3).forEach((point, index) => {
    const meta = icons[index] || icons[0];

    const item = document.createElement("div");
    item.className = "insight-item";
    item.innerHTML = `
      <div class="insight-icon" style="background:${meta.bg};">${meta.emoji}</div>
      <div>${escapeHtml(point)}</div>
    `;
    insightsList.appendChild(item);
  });
}

function renderSources(sources) {
  const sourcesGrid = document.getElementById("sourcesGrid");
  sourcesGrid.innerHTML = "";

  if (!sources || !sources.length) {
    sourcesGrid.innerHTML = `
      <div class="source-card">
        <div class="source-thumb yt">▶</div>
        <div class="source-body">
          <div class="source-type yt">Source</div>
          <div class="source-org">No sources available</div>
          <div class="source-desc">No linked source was returned for this answer.</div>
          <a class="source-link" href="#" target="_blank" rel="noopener noreferrer">Open</a>
        </div>
      </div>
    `;
    return;
  }

  const colorClasses = ["yt", "research", "story"];

  sources.slice(0, 3).forEach((src, index) => {
    const colorClass = colorClasses[index % colorClasses.length];
    const title = escapeHtml(src.title || "Source");
    const url = src.url || "#";
    const desc = src.score ? `Relevance score: ${Number(src.score).toFixed(3)}` : "Retrieved from testimonial dataset.";

    const card = document.createElement("div");
    card.className = "source-card";
    card.innerHTML = `
      <div class="source-thumb ${colorClass}">${index === 0 ? "▶" : index === 1 ? "🔬" : "👤"}</div>
      <div class="source-body">
        <div class="source-type ${index === 0 ? "yt" : ""}">Source ${index + 1}</div>
        <div class="source-org">${title}</div>
        <div class="source-desc">${escapeHtml(desc)}</div>
        <a class="source-link" href="${url}" target="_blank" rel="noopener noreferrer">Open</a>
      </div>
    `;
    sourcesGrid.appendChild(card);
  });
}

async function askStillwater() {
  const q = userInput.value.trim();

  if (!q) {
    userInput.focus();
    return;
  }

  respLoading.style.display = "block";
  respContent.style.display = "none";
  latestAnswer = "";

  try {
    const response = await fetch("/api/rag/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: q,
        language: currentLang
      })
    });

    const data = await response.json();

    respLoading.style.display = "none";
    respContent.style.display = "block";

    if (data.error) {
      respIntro.textContent = "Sorry, I had trouble fetching insights. Please try again.";
      renderInsights(["Unable to process your request right now."]);
      takeawayText.textContent = "Please retry with a clearer question.";
      renderSources([]);
      return;
    }

    const answer = data.answer || "No answer returned.";
    latestAnswer = stripMarkdown(answer);

    respIntro.textContent = "Here's what I found from real patient stories.";

    const points = splitAnswerIntoPoints(latestAnswer);
    renderInsights(points);

    takeawayText.textContent = getTakeaway(latestAnswer);

    renderSources(data.sources || []);
  } catch (err) {
    respLoading.style.display = "none";
    respContent.style.display = "block";
    respIntro.textContent = "Sorry, I had trouble fetching insights. Please try again.";
    renderInsights(["Network or server error occurred while loading the answer."]);
    takeawayText.textContent = "Please check the backend connection and try again.";
    renderSources([]);
  }
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

updateCount();