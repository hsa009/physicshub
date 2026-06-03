#!/usr/bin/env node
/**
 * verify-question-images.mjs
 *
 * Reads the Grade 11 Physics revision docx and produces a new
 * src/data/question-images.json keyed by question_id (q1..q60), where
 * each entry is either { src, alt } (the first image attached to the
 * question in the docx) or null (the docx has no image for that question).
 *
 * This is the source of truth for M5.6 — the previous hand-curated
 * mapping was best-effort; this script reads the actual docx so we
 * never disagree with the original.
 *
 * Approach:
 *   1. Use adm-zip to read word/document.xml and word/_rels/document.xml.rels
 *   2. Build rId -> media filename map from the rels
 *   3. Walk <w:p> paragraphs in document.xml in order
 *   4. For each paragraph, extract the visible text (concatenate <w:t> contents)
 *      and the first <a:blip r:embed="rIdN"/> it contains (if any)
 *   5. Find paragraphs that begin with "<n>. " — these mark the start of
 *      question n. The first image in any paragraph from that start up
 *      until the next "<m>. " marker is associated with question n.
 *   6. If no image is found before the next question, the entry is null.
 *   7. Use the pic:cNvPr @descr attribute as the alt text if available.
 *
 * Usage:  npm run verify:question-images
 *
 * Output: src/data/question-images.json (overwrites the existing file).
 *   Also writes a corrections report to stdout comparing with the
 *   previous file.
 */

import AdmZip from "adm-zip";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOCX = resolve(__dirname, "..", "Grade11_Physics_Final_Revision.docx");
const OUT = resolve(__dirname, "..", "src", "data", "question-images.json");

/* ----------------------------------------------------------------- */
/* 1. Load the docx as XML                                           */
/* ----------------------------------------------------------------- */

const zip = new AdmZip(DOCX);
const docXml = zip.readAsText("word/document.xml");
const relsXml = zip.readAsText("word/_rels/document.xml.rels");

/* ----------------------------------------------------------------- */
/* 2. Build rId -> image filename map                                */
/* ----------------------------------------------------------------- */

const rIdToFile = new Map();
const relMatches = relsXml.matchAll(
  /<Relationship\s+Id="([^"]+)"\s+Type="[^"]*image"\s+Target="([^"]+)"\s*\/>/g,
);
for (const m of relMatches) {
  // The docx rels use .jpeg for some JPGs; the extraction script
  // (scripts/extract-images.mjs) normalises them to .jpg, so mirror that.
  const file = m[2]
    .replace(/^media\//, "")
    .replace(/\.jpeg$/i, ".jpg");
  rIdToFile.set(m[1], file);
}

/* ----------------------------------------------------------------- */
/* 3. Walk paragraphs                                                */
/* ----------------------------------------------------------------- */

// Split on </w:p> to get paragraph chunks. Each chunk contains all the
// text, drawings, etc. for one paragraph. We re-attach the close tag
// so regex matching is simpler.
const paraChunks = docXml.split(/<\/w:p>/g);

const paragraphs = [];
for (const chunk of paraChunks) {
  if (!chunk.includes("<w:p ")) continue;
  // Visible text: concatenate <w:t>...</w:t> contents
  const textParts = [];
  const textRe = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let tm;
  while ((tm = textRe.exec(chunk)) !== null) {
    textParts.push(decodeXml(tm[1]));
  }
  const text = textParts.join("").trim();

  // First blip embed (image rId)
  const blipMatch = chunk.match(/<a:blip\s+r:embed="([^"]+)"/);
  const rId = blipMatch?.[1];

  // Alt text: prefer pic:cNvPr @descr, fall back to wp:docPr @descr
  const altMatch =
    chunk.match(/<pic:cNvPr[^>]+descr="([^"]+)"/) ||
    chunk.match(/<wp:docPr[^>]+descr="([^"]+)"/);
  const alt = altMatch ? decodeXml(altMatch[1]) : "";

  paragraphs.push({ text, rId, alt });
}

/* ----------------------------------------------------------------- */
/* 4. Associate images with questions                                */
/* ----------------------------------------------------------------- */

const QUESTION_RE = /^(\d+)\.\s+/;
const questionMap = new Map(); // n -> { src, alt } | null

let currentN = null;
let currentImage = null;

for (const p of paragraphs) {
  const m = p.text.match(QUESTION_RE);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 60) {
      // Close out the previous question
      if (currentN !== null) {
        questionMap.set(currentN, currentImage);
      }
      currentN = n;
      currentImage = null;
      // Edge case: image is in the SAME paragraph as the "N. " marker
      if (p.rId) {
        const file = rIdToFile.get(p.rId);
        if (file) currentImage = { src: `/images/lessons/${file}`, alt: p.alt || "" };
      }
      continue;
    }
  }

  // Track the first image encountered in the question's chunk
  if (currentN !== null && !currentImage && p.rId) {
    const file = rIdToFile.get(p.rId);
    if (file) {
      currentImage = { src: `/images/lessons/${file}`, alt: p.alt || "" };
    }
  }
}

// Close out the final question
if (currentN !== null) {
  questionMap.set(currentN, currentImage);
}

/* ----------------------------------------------------------------- */
/* 5. Build the output JSON                                          */
/* ----------------------------------------------------------------- */

const out = {
  _meta: {
    generated_at: new Date().toISOString(),
    source:
      "scripts/verify-question-images.mjs (auto-extracted from the docx)",
    note: "Source of truth: docx. If the question has an image attached in the docx, src is the public path; alt is from the pic:cNvPr descr. If not, the entry is null and the question renders text-only.",
  },
};

for (let n = 1; n <= 60; n++) {
  out[`q${n}`] = questionMap.get(n) ?? null;
}

/* ----------------------------------------------------------------- */
/* 6. Compare with the previous file and print a report              */
/* ----------------------------------------------------------------- */

let previous = {};
try {
  previous = JSON.parse(readFileSync(OUT, "utf8"));
} catch {
  // No previous file
}

const corrections = [];
const additions = [];
const removals = [];
const kept = [];
for (let n = 1; n <= 60; n++) {
  const id = `q${n}`;
  const prev = previous[id] ?? null;
  const next = out[id];
  const prevSrc = prev?.src ?? null;
  const nextSrc = next?.src ?? null;
  if (prevSrc === nextSrc) {
    kept.push(id);
    continue;
  }
  if (prevSrc && !nextSrc) {
    removals.push({ id, was: prevSrc });
  } else if (!prevSrc && nextSrc) {
    additions.push({ id, src: nextSrc });
  } else {
    corrections.push({ id, was: prevSrc, now: nextSrc });
  }
}

console.log(`\nDocx extraction summary (${OUT}):`);
console.log(`  total questions:   60`);
console.log(`  with image:        ${[...questionMap.values()].filter(Boolean).length}`);
console.log(`  text-only:         ${[...questionMap.values()].filter((v) => !v).length}`);
console.log(`  same as previous:  ${kept.length}`);
console.log(`  corrections:       ${corrections.length}`);
for (const c of corrections) {
  console.log(`    ${c.id}: ${c.was} -> ${c.now}`);
}
console.log(`  additions:         ${additions.length}`);
for (const a of additions) {
  console.log(`    ${a.id}: added ${a.src}`);
}
console.log(`  removals:          ${removals.length}`);
for (const r of removals) {
  console.log(`    ${r.id}: removed ${r.was}`);
}

/* ----------------------------------------------------------------- */
/* 7. Write                                                           */
/* ----------------------------------------------------------------- */

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`\nWrote ${OUT}`);

/* ----------------------------------------------------------------- */
/* Helpers                                                            */
/* ----------------------------------------------------------------- */

function decodeXml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}
