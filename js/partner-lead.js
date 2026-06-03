// Lead-capture for the Chronic Disease Management partner pages.
// Intercepts the Book / Consult / Connect CTAs, collects Name / Phone / Email
// in a modal, POSTs to /api/partner-lead, and shows a thank-you message.
// Works whether the partner page is embedded (iframe) or opened standalone —
// the fetch is same-origin with credentials.
(function () {
  function partnerName() {
    var t = (document.title || "").trim();
    if (t) return t;
    var f = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
    return f || "Stilwater";
  }

  var overlay = null;
  var currentInterest = "";

  function build() {
    if (overlay) return;
    var style = document.createElement("style");
    style.textContent =
      ".sw-lead-overlay{position:fixed;inset:0;background:rgba(20,40,30,.5);display:none;align-items:center;justify-content:center;z-index:99999;padding:18px;}" +
      ".sw-lead-overlay.open{display:flex;}" +
      ".sw-lead-card{background:#fffdfa;border:1px solid #e3dacd;border-radius:20px;max-width:420px;width:100%;padding:24px;box-shadow:0 20px 50px rgba(24,55,39,.25);font-family:Inter,Arial,sans-serif;box-sizing:border-box;}" +
      ".sw-lead-card h3{margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;color:#173a32;font-size:22px;}" +
      ".sw-lead-card p.sub{margin:0 0 4px;color:#63736a;font-size:14px;line-height:1.5;}" +
      ".sw-lead-card label{display:block;font-size:13px;font-weight:700;color:#2c4037;margin:14px 0 6px;}" +
      ".sw-lead-card label .sw-req{color:#c0392b;}" +
      ".sw-lead-card input{width:100%;box-sizing:border-box;border:1px solid #e3dacd;border-radius:12px;padding:12px 14px;font-size:15px;background:#fbf8f1;color:#2e4038;}" +
      ".sw-lead-card input:focus{outline:none;border-color:rgba(38,79,69,.45);box-shadow:0 0 0 3px rgba(38,79,69,.1);background:#fffdf9;}" +
      ".sw-lead-actions{display:flex;gap:10px;margin-top:20px;}" +
      ".sw-lead-actions button{flex:1;border:none;border-radius:999px;padding:13px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit;}" +
      ".sw-lead-submit{background:#264f45;color:#fff;}.sw-lead-submit:hover{background:#173a32;}.sw-lead-submit:disabled{opacity:.6;cursor:default;}" +
      ".sw-lead-cancel{background:#f2eee5;color:#3a4f46;}.sw-lead-cancel:hover{background:#e7e0d2;}" +
      ".sw-lead-err{color:#9a4b3b;font-size:13px;margin-top:10px;min-height:1em;}" +
      ".sw-lead-interest{font-weight:700;color:#264f45;}" +
      ".sw-lead-thanks{text-align:center;}.sw-lead-thanks .ok{font-size:42px;}.sw-lead-thanks h3{margin:10px 0 4px;}";
    document.head.appendChild(style);

    overlay = document.createElement("div");
    overlay.className = "sw-lead-overlay";
    overlay.innerHTML =
      '<div class="sw-lead-card" role="dialog" aria-modal="true" aria-label="Book a consultation">' +
        '<div class="sw-lead-form">' +
          "<h3>Book a consultation</h3>" +
          '<p class="sub">Share your details and a Stilwater representative will reach out to you<span class="sw-lead-about"></span>.</p>' +
          "<label>Name <span class=\"sw-req\">*</span></label><input type=\"text\" id=\"swLeadName\" autocomplete=\"name\" required />" +
          "<label>Phone number <span class=\"sw-req\">*</span></label><input type=\"tel\" id=\"swLeadPhone\" autocomplete=\"tel\" required />" +
          "<label>Email <span class=\"sw-req\">*</span></label><input type=\"email\" id=\"swLeadEmail\" autocomplete=\"email\" required />" +
          '<div class="sw-lead-err" id="swLeadErr"></div>' +
          '<div class="sw-lead-actions">' +
            '<button type="button" class="sw-lead-cancel" id="swLeadCancel">Cancel</button>' +
            '<button type="button" class="sw-lead-submit" id="swLeadSubmit">Submit</button>' +
          "</div>" +
        "</div>" +
        '<div class="sw-lead-thanks" style="display:none">' +
          '<div class="ok">🌿</div>' +
          "<h3>Thank you for connecting</h3>" +
          '<p class="sub">Our representative will reach out to you soon.</p>' +
          '<div class="sw-lead-actions"><button type="button" class="sw-lead-submit" id="swLeadClose">Close</button></div>' +
        "</div>" +
      "</div>";
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
    overlay.querySelector("#swLeadCancel").addEventListener("click", closeModal);
    overlay.querySelector("#swLeadClose").addEventListener("click", closeModal);
    overlay.querySelector("#swLeadSubmit").addEventListener("click", submit);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });
  }

  function openModal(interest) {
    currentInterest = interest || "";
    build();
    overlay.querySelector(".sw-lead-form").style.display = "";
    overlay.querySelector(".sw-lead-thanks").style.display = "none";
    overlay.querySelector("#swLeadErr").textContent = "";
    var about = overlay.querySelector(".sw-lead-about");
    if (about) about.innerHTML = currentInterest ? ' about <span class="sw-lead-interest">' + escapeHtml(currentInterest) + "</span>" : "";
    overlay.classList.add("open");
    setTimeout(function () { try { overlay.querySelector("#swLeadName").focus(); } catch (e) {} }, 30);
  }

  function closeModal() { if (overlay) overlay.classList.remove("open"); }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function submit() {
    var name = overlay.querySelector("#swLeadName").value.trim();
    var phone = overlay.querySelector("#swLeadPhone").value.trim();
    var email = overlay.querySelector("#swLeadEmail").value.trim();
    var err = overlay.querySelector("#swLeadErr");
    if (!name || !phone || !email) { err.textContent = "Please fill in your name, phone, and email."; return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = "Please enter a valid email address."; return; }
    var btn = overlay.querySelector("#swLeadSubmit");
    btn.disabled = true; btn.textContent = "Submitting…";
    var partner = partnerName() + (currentInterest ? " — " + currentInterest : "");
    fetch("/api/partner-lead", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, phone: phone, email: email, partner: partner }),
    })
      .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
      .then(function () {
        overlay.querySelector(".sw-lead-form").style.display = "none";
        overlay.querySelector(".sw-lead-thanks").style.display = "";
      })
      .catch(function () { err.textContent = "Couldn't submit right now — please try again."; })
      .then(function () { btn.disabled = false; btn.textContent = "Submit"; });
  }

  // Wire every Book / Consult / Connect CTA: the program cards (a.prog) and the
  // primary clay buttons (.btn-clay). Clicking opens the form instead of
  // navigating (including the external program links, per design).
  function wire() {
    var els = document.querySelectorAll("a.prog, a.btn-clay, button.btn-clay");
    Array.prototype.forEach.call(els, function (el) {
      if (el.getAttribute("data-sw-lead")) return;
      el.setAttribute("data-sw-lead", "1");
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var head = el.querySelector("h4");
        var interest = head
          ? head.textContent.trim()
          : (el.textContent || "").replace(/[→↗←\s]+$/, "").trim();
        openModal(interest);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
