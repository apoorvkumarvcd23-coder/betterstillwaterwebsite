// One-shot helper: insert the Google Analytics gtag snippet just before
// </head> in every top-level *.html file. Safe to re-run — skips files
// that already contain the measurement ID.
const fs = require("fs");
const path = require("path");

const MEASUREMENT_ID = "G-3YFE71RLJZ";
const SNIPPET = `<!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${MEASUREMENT_ID}');
    </script>
  `;

const root = path.resolve(__dirname, "..");
const files = fs.readdirSync(root).filter((f) => f.endsWith(".html"));

let added = 0;
let skipped = 0;
for (const f of files) {
  const p = path.join(root, f);
  const content = fs.readFileSync(p, "utf8");
  if (content.includes(MEASUREMENT_ID)) {
    console.log(`SKIP  ${f}  (already has GA)`);
    skipped++;
    continue;
  }
  if (!content.includes("</head>")) {
    console.log(`SKIP  ${f}  (no </head>)`);
    skipped++;
    continue;
  }
  const updated = content.replace("</head>", `  ${SNIPPET}</head>`);
  fs.writeFileSync(p, updated);
  console.log(`OK    ${f}`);
  added++;
}

console.log(`\nDone. Added to ${added} files, skipped ${skipped}.`);
