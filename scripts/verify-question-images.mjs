#!/usr/bin/env node

import AdmZip from "adm-zip";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOCX = resolve(__dirname, "..", "Grade11_Physics_Final_Revision.docx");
const OUT = resolve(__dirname, "..", "src", "data", "question-images.json");

const zip = new AdmZip(DOCX);
const docXml = zip.readAsText("word/document.xml");
const relsXml = zip.readAsText("word/_rels/document.xml.rels");

const rIdToFile = new Map();
const relMatches = relsXml.matchAll(
  /<Relationship\s+Id="([^"]+)"\s+Type="[^"]*image"\s+Target="([^"]+)"\s*\/>/g,
);
for (const m of relMatches) {
  const file = m[2]
    .replace(/^media\
    .replace(/\.jpeg$/i, ".jpg");
  rIdToFile.set(m[1], file);
}

const paraChunks = docXml.split(/<\/w:p>/g);

const paragraphs = [];
for (const chunk of paraChunks) {
  if (!chunk.includes("<w:p ")) continue;
  const textParts = [];
  const textRe = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let tm;
  while ((tm = textRe.exec(chunk)) !== null) {
    textParts.push(decodeXml(tm[1]));
  }
  const text = textParts.join("").trim();

  const blipMatch = chunk.match(/<a:blip\s+r:embed="([^"]+)"/);
  const rId = blipMatch?.[1];

  const altMatch =
    chunk.match(/<pic:cNvPr[^>]+descr="([^"]+)"/) ||
    chunk.match(/<wp:docPr[^>]+descr="([^"]+)"/);
  const alt = altMatch ? decodeXml(altMatch[1]) : "";

  paragraphs.push({ text, rId, alt });
}

const QUESTION_RE = /^(\d+)\.\s+/;
const questionMap = new Map();

let currentN = null;
let currentImage = null;

for (const p of paragraphs) {
  const m = p.text.match(QUESTION_RE);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 60) {
      if (currentN !== null) {
        questionMap.set(currentN, currentImage);
      }
      currentN = n;
      currentImage = null;
      if (p.rId) {
        const file = rIdToFile.get(p.rId);
        if (file) currentImage = { src: `/images/lessons/${file}`, alt: p.alt || "" };
      }
      continue;
    }
  }

  if (currentN !== null && !currentImage && p.rId) {
    const file = rIdToFile.get(p.rId);
    if (file) {
      currentImage = { src: `/images/lessons/${file}`, alt: p.alt || "" };
    }
  }
}

if (currentN !== null) {
  questionMap.set(currentN, currentImage);
}

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

let previous = {};
try {
  previous = JSON.parse(readFileSync(OUT, "utf8"));
} catch {
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

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`\nWrote ${OUT}`);

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
