/**
 * Local (one-off) OCR extraction for the nutrition knowledge base.
 *
 * The recipe PDF has no text layer (text is baked into page images), so we
 * rasterize each page and OCR it with Tesseract, then write overlapping text
 * chunks to data/nutrition/<slug>.json. The server embeds those chunks into
 * Postgres (nutrition.chunks) on ingest — the big PDF and OCR never run at
 * runtime. To add another scanned book later: run this on it and commit the
 * resulting JSON.
 *
 * Heavy OCR deps are local-only (not runtime). Install ad-hoc before running:
 *   npm i -D pdfjs-dist @napi-rs/canvas tesseract.js
 *
 * Usage:
 *   node scripts/ocr-nutrition-pdf.mjs "Timeless recipes for healthy living.pdf" "Timeless Recipes for Healthy Living" [maxPages]
 */
import fs from "fs";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";

const CHUNK_CHARS = 1100;
const CHUNK_OVERLAP = 180;
const RENDER_SCALE = 2.0; // higher DPI → better OCR

function chunkPlainText(text, size, overlap) {
  const clean = String(text || "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
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
  const maxPages = process.argv[4] ? parseInt(process.argv[4], 10) : Infinity;
  const pdfPath = path.resolve(process.cwd(), pdfArg);
  if (!fs.existsSync(pdfPath)) { console.error("PDF not found:", pdfPath); process.exit(1); }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  const numPages = Math.min(doc.numPages, maxPages);
  console.log(`PDF pages: ${doc.numPages} — OCR'ing ${numPages} at scale ${RENDER_SCALE}`);

  const worker = await createWorker("eng");
  const pageTexts = [];
  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    const png = canvas.toBuffer("image/png");
    const { data: { text } } = await worker.recognize(png);
    const clean = (text || "").trim();
    pageTexts.push({ page: p, text: clean });
    process.stdout.write(`  p${p}: ${clean.length} chars\n`);
  }
  await worker.terminate();

  // Build chunks per page so we can keep page numbers for citations.
  const allChunks = [];
  let idx = 0;
  for (const { page, text } of pageTexts) {
    for (const content of chunkPlainText(text, CHUNK_CHARS, CHUNK_OVERLAP)) {
      allChunks.push({ chunk_index: idx++, content, page });
    }
  }

  const outDir = path.resolve(process.cwd(), "data", "nutrition");
  fs.mkdirSync(outDir, { recursive: true });
  const slug = path.basename(pdfArg).replace(/\.[^.]+$/, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const outPath = path.join(outDir, slug + ".json");
  fs.writeFileSync(outPath, JSON.stringify({
    title, filename: path.basename(pdfArg), slug,
    numPages: doc.numPages, ocr: true, chunkChars: CHUNK_CHARS, chunkOverlap: CHUNK_OVERLAP,
    chunks: allChunks,
  }, null, 2), "utf8");
  const totalChars = pageTexts.reduce((s, p) => s + p.text.length, 0);
  console.log(`OCR total chars: ${totalChars}, chunks: ${allChunks.length}`);
  console.log(`Wrote -> ${outPath} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
