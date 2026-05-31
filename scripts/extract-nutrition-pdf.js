#!/usr/bin/env node
/**
 * One-off (local) extraction step for the nutrition knowledge base.
 *
 * Parses a nutrition/recipe PDF into overlapping text chunks and writes a
 * small JSON file under data/nutrition/. The server then embeds those chunks
 * into Postgres (nutrition.chunks) — so the big binary PDF never needs to be
 * committed or parsed at runtime. To add another book later: run this on the
 * new PDF and commit the resulting JSON; the server picks it up on ingest.
 *
 * Usage:
 *   node scripts/extract-nutrition-pdf.js "Timeless recipes for healthy living.pdf" "Timeless Recipes for Healthy Living"
 */
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

const CHUNK_CHARS = 1100;
const CHUNK_OVERLAP = 180;

function chunkPlainText(text, size, overlap) {
  const clean = String(text || "").replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const chunks = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(i + size, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(i, end);
      const para = slice.lastIndexOf("\n\n");
      const sent = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
      const cut = para > size * 0.5 ? para : (sent > size * 0.5 ? sent + 1 : -1);
      if (cut > 0) end = i + cut;
    }
    const piece = clean.slice(i, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    i = Math.max(end - overlap, i + 1);
  }
  return chunks;
}

async function main() {
  const pdfArg = process.argv[2] || "Timeless recipes for healthy living.pdf";
  const title = process.argv[3] || "Timeless Recipes for Healthy Living";
  const pdfPath = path.resolve(process.cwd(), pdfArg);
  if (!fs.existsSync(pdfPath)) {
    console.error("PDF not found:", pdfPath);
    process.exit(1);
  }
  console.log("Parsing", pdfPath, "...");
  const parsed = await pdfParse(fs.readFileSync(pdfPath));
  const rawLen = (parsed.text || "").length;
  const chunks = chunkPlainText(parsed.text, CHUNK_CHARS, CHUNK_OVERLAP);
  console.log(`Pages: ${parsed.numpages}, extracted text chars: ${rawLen}, chunks: ${chunks.length}`);

  const outDir = path.resolve(process.cwd(), "data", "nutrition");
  fs.mkdirSync(outDir, { recursive: true });
  const slug = path.basename(pdfArg).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const outPath = path.join(outDir, slug + ".json");
  const payload = {
    title,
    filename: path.basename(pdfArg),
    slug,
    numPages: parsed.numpages,
    chunkChars: CHUNK_CHARS,
    chunkOverlap: CHUNK_OVERLAP,
    chunks: chunks.map((content, chunk_index) => ({ chunk_index, content })),
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`Wrote ${chunks.length} chunks -> ${outPath} (${kb} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
