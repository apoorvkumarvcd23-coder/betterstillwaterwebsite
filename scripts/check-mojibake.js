const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const EXTENSIONS = new Set([".html", ".css", ".js", ".ts", ".tsx"]);
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".playwright-mcp",
]);

// Typical UTF-8 interpreted as Latin-1 artifacts and replacement-char issues.
const PATTERNS = [
  /â€”/g,
  /â€“/g,
  /â€[\x9c\x9d\x98\x99\x93\x94\xA6]/g,
  /âœ/g,
  /ðŸ/g,
  /â‚¹/g,
  /Ã[\x80-\xBF]/g,
  /�/g,
];

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walk(full, files);
      }
      continue;
    }

    if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const matches = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const hit = PATTERNS.some((pattern) => pattern.test(line));
    for (const pattern of PATTERNS) {
      pattern.lastIndex = 0;
    }
    if (hit) {
      matches.push({ line: i + 1, text: line.trim().slice(0, 220) });
    }
  }

  return matches;
}

function main() {
  const files = walk(ROOT);
  const findings = [];
  const selfPath = path
    .join(ROOT, "scripts", "check-mojibake.js")
    .replace(/\\/g, "/");

  for (const file of files) {
    if (file.replace(/\\/g, "/") === selfPath) {
      continue;
    }
    const hits = scanFile(file);
    if (hits.length > 0) {
      findings.push({ file, hits });
    }
  }

  if (findings.length === 0) {
    console.log("PASS: No mojibake patterns found.");
    process.exit(0);
  }

  console.error("FAIL: Mojibake patterns detected.\n");
  for (const finding of findings) {
    const rel = path.relative(ROOT, finding.file).replace(/\\\\/g, "/");
    for (const hit of finding.hits) {
      console.error(`${rel}:${hit.line} -> ${hit.text}`);
    }
  }

  process.exit(1);
}

main();
