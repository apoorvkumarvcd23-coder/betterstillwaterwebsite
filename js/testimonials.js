let currentLang = "en";

const userInput = document.getElementById("userInput");
const charCount = document.getElementById("charCount");
const askBtn = document.getElementById("askBtn");
const languageSelect = document.getElementById("languageSelect");
const chatFeed = document.getElementById("chatFeed");
const composer = document.getElementById("composer");

function updateCount() {
  charCount.textContent = `${userInput.value.length}/500`;
}

function scrollFeedToBottom() {
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function normalizeAnswer(text) {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function appendMessage(role, content, sources) {
  const article = document.createElement("article");
  article.className = `msg ${role === "user" ? "user-msg" : "assistant-msg"}`;

  const roleLabel = role === "user" ? "You" : "StillWater";
  article.innerHTML = `
    <div class="msg-role">${roleLabel}</div>
    <div class="msg-body">${escapeHtml(content)}</div>
  `;

  if (role === "assistant" && Array.isArray(sources) && sources.length > 0) {
    const details = document.createElement("details");
    details.className = "sources-dropdown";
    details.innerHTML = `
      <summary>Sources (${sources.length})</summary>
      <ul class="sources-list">
        ${sources
          .map((source, index) => {
            const title = escapeHtml(source.title || `Source ${index + 1}`);
            const url = String(source.url || "").trim();
            const score =
              typeof source.score === "number" && Number.isFinite(source.score)
                ? ` - relevance ${source.score.toFixed(3)}`
                : "";
            const linkHtml = url
              ? `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open</a>`
              : `<span class="source-meta">No URL available</span>`;

            return `
              <li>
                <span class="source-title">${title}</span>
                <div class="source-meta">Source ${index + 1}${score}</div>
                ${linkHtml}
              </li>
            `;
          })
          .join("")}
      </ul>
    `;
    article.appendChild(details);
  }

  chatFeed.appendChild(article);
  scrollFeedToBottom();
}

function appendTypingMessage() {
  const article = document.createElement("article");
  article.className = "msg assistant-msg";
  article.innerHTML = `
    <div class="msg-role">StillWater</div>
    <div class="msg-body"><span class="typing"><span></span><span></span><span></span></span></div>
  `;
  chatFeed.appendChild(article);
  scrollFeedToBottom();
  return article;
}

async function sendMessage() {
  const query = userInput.value.trim();
  if (!query) {
    userInput.focus();
    return;
  }

  appendMessage("user", query);
  userInput.value = "";
  updateCount();

  askBtn.disabled = true;
  const typing = appendTypingMessage();

  try {
    const response = await fetch("/api/rag/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        language: currentLang,
      }),
    });

    const data = await response.json();
    typing.remove();

    if (!response.ok || data.error) {
      appendMessage("assistant", "I could not process that right now. Please try again.");
      return;
    }

    const answer = normalizeAnswer(data.answer || "No answer returned.");
    appendMessage("assistant", answer, data.sources || []);
  } catch (error) {
    typing.remove();
    appendMessage("assistant", "Network error. Please check connection and retry.");
  } finally {
    askBtn.disabled = false;
    userInput.focus();
  }
}

userInput.addEventListener("input", updateCount);

userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

languageSelect.addEventListener("change", () => {
  currentLang = languageSelect.value;
});

document.querySelectorAll(".prompt-chip").forEach((button) => {
  button.addEventListener("click", () => {
    userInput.value = button.getAttribute("data-question") || "";
    updateCount();
    userInput.focus();
  });
});

updateCount();