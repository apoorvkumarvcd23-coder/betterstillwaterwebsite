// Upgrade helper: rewrites the Google Analytics snippet in every top-level
// *.html so the gtag() stub is defined on ALL hosts, while the GA script
// itself only loads on prod. This means gtag('event', ...) calls work on
// test (no-op) and prod (real send) — so when test code is promoted to
// prod, event wiring is not lost or different.
//
// Safe to re-run.
const fs = require("fs");
const path = require("path");

// Single GA4 property (2026-06-05): replaced the old G-3YFE71RLJZ +
// G-GP7VFJF628 pair with one new property. The gtag script + config still
// load on prod hosts ONLY (see the gate below), so test never transmits.
const MEASUREMENT_ID = "G-GNF77Q61ZQ";

const NEW_SNIPPET = `<!-- Google tag (gtag.js) — gtag stub everywhere; script + config load on prod only -->
    <script>
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function(){ dataLayer.push(arguments); };
      gtag('js', new Date());
      (function(){
        var prodHosts = ['stillwater.you','www.stillwater.you','stillwater-main.onrender.com'];
        if (prodHosts.indexOf(location.hostname) === -1) return;
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}';
        document.head.appendChild(s);
        gtag('config', '${MEASUREMENT_ID}');
      })();
    </script>
    <script src="js/ga-events.js" defer></script>`;

// Match the existing prod-only snippet — the comment plus the <script> block
// that follows it (any indentation, any whitespace between). Also greedily
// consume an optional trailing ga-events.js tag so a re-run doesn't leave a
// stale duplicate behind.
const OLD_SNIPPET_RE = /<!--\s*Google tag \(gtag\.js\)[^>]*-->\s*<script>[\s\S]*?<\/script>(?:\s*<script src="js\/ga-events\.js"[^>]*><\/script>)?/;

const root = path.resolve(__dirname, "..");
const files = fs.readdirSync(root).filter((f) => f.endsWith(".html"));

let upgraded = 0;
let skipped = 0;
let missing = 0;
for (const f of files) {
  const p = path.join(root, f);
  const content = fs.readFileSync(p, "utf8");

  // Re-process even already-injected files so a measurement-ID change here is
  // pushed out to every page. Replacement is idempotent: NEW_SNIPPET still
  // matches OLD_SNIPPET_RE, so a page already on the current ID is a no-op.
  if (!OLD_SNIPPET_RE.test(content)) {
    console.log(`MISS  ${f}  (no recognisable GA snippet)`);
    missing++;
    continue;
  }

  const updated = content.replace(OLD_SNIPPET_RE, NEW_SNIPPET);
  fs.writeFileSync(p, updated);
  console.log(`OK    ${f}`);
  upgraded++;
}

console.log(
  `\nDone. Upgraded ${upgraded}, already-current ${skipped}, missing ${missing}.`
);
