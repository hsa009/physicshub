#!/usr/bin/env node

import AdmZip from "adm-zip";
import sharp from "sharp";
import {
  mkdirSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import {
  dirname,
  resolve,
  extname,
  basename,
  join,
} from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOCX = resolve(__dirname, "..", "Grade11_Physics_Final_Revision.docx");
const OUT_DIR = resolve(
  __dirname,
  "..",
  "public",
  "images",
  "lessons",
);
const MANIFEST = resolve(OUT_DIR, "image-manifest.json");

const MAX_DIMENSION = 1200;
const PNG_COMPRESSION = 9;
const JPEG_QUALITY = 82;
const MIN_SIZE_BYTES = 1024;

mkdirSync(OUT_DIR, { recursive: true });

const zip = new AdmZip(DOCX);
const allMediaEntries = zip
  .getEntries()
  .filter(
    (e) =>
      e.entryName.startsWith("word/media/") &&
      !e.isDirectory &&
      e.header.size >= MIN_SIZE_BYTES,
  );

console.log(
  `Found ${allMediaEntries.length} embedded images in docx (>= ${MIN_SIZE_BYTES} bytes)`,
);

const manifest = {
  extracted_at: new Date().toISOString(),
  source: "Grade11_Physics_Final_Revision.docx",
  total: 0,
  total_original_bytes: 0,
  total_compressed_bytes: 0,
  images: [],
};

let originalTotal = 0;
let compressedTotal = 0;
let skipped = 0;
let failed = 0;

for (const entry of allMediaEntries) {
  const ext = extname(entry.entryName).toLowerCase();
  const filename = basename(entry.entryName);
  const buffer = entry.getData();
  const originalSize = buffer.length;
  originalTotal += originalSize;

  try {
    if (ext === ".svg" || ext === ".svgz") {
      writeFileSync(join(OUT_DIR, filename), buffer);
      manifest.images.push({
        filename,
        format: "svg",
        width: null,
        height: null,
        original_bytes: originalSize,
        compressed_bytes: originalSize,
        savings_pct: 0,
        resized: false,
      });
      compressedTotal += originalSize;
      continue;
    }

    const meta = await sharp(buffer).metadata();
    let pipeline = sharp(buffer);
    let resized = false;

    if (
      (meta.width || 0) > MAX_DIMENSION ||
      (meta.height || 0) > MAX_DIMENSION
    ) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
      resized = true;
    }

    let outputBuffer;
    let outputFormat;
    let outputFilename = filename;

    if (ext === ".png") {
      outputBuffer = await pipeline
        .png({ compressionLevel: PNG_COMPRESSION, palette: true })
        .toBuffer();
      outputFormat = "png";
    } else if (ext === ".jpg" || ext === ".jpeg") {
      outputBuffer = await pipeline
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      outputFormat = "jpeg";
      if (ext === ".jpeg") {
        outputFilename = filename.replace(/\.jpeg$/, ".jpg");
      }
    } else if (ext === ".gif") {
      outputBuffer = await pipeline.gif().toBuffer();
      outputFormat = "gif";
    } else if (ext === ".webp") {
      outputBuffer = await pipeline.webp({ quality: JPEG_QUALITY }).toBuffer();
      outputFormat = "webp";
    } else {
      writeFileSync(join(OUT_DIR, filename), buffer);
      manifest.images.push({
        filename,
        format: ext.slice(1),
        width: meta.width || null,
        height: meta.height || null,
        original_bytes: originalSize,
        compressed_bytes: originalSize,
        savings_pct: 0,
        resized: false,
      });
      compressedTotal += originalSize;
      continue;
    }

    writeFileSync(join(OUT_DIR, outputFilename), outputBuffer);

    const finalMeta = await sharp(outputBuffer).metadata();
    const compressedSize = outputBuffer.length;
    compressedTotal += compressedSize;
    const savings = originalSize - compressedSize;
    const savingsPct = originalSize > 0
      ? Math.round((savings / originalSize) * 1000) / 10
      : 0;

    manifest.images.push({
      filename: outputFilename,
      format: outputFormat,
      width: finalMeta.width,
      height: finalMeta.height,
      original_bytes: originalSize,
      compressed_bytes: compressedSize,
      savings_pct: savingsPct,
      resized,
    });
  } catch (err) {
    failed += 1;
    console.warn(`! failed to process ${filename}: ${err.message} — copying raw`);
    try {
      copyFileSync(join(OUT_DIR, filename), buffer);
      manifest.images.push({
        filename,
        format: ext.slice(1) || "unknown",
        width: null,
        height: null,
        original_bytes: originalSize,
        compressed_bytes: originalSize,
        savings_pct: 0,
        resized: false,
        error: err.message,
      });
      compressedTotal += originalSize;
    } catch (copyErr) {
      skipped += 1;
      console.error(`x could not write ${filename}: ${copyErr.message}`);
    }
  }
}

manifest.total = manifest.images.length;
manifest.total_original_bytes = originalTotal;
manifest.total_compressed_bytes = compressedTotal;
manifest.total_savings_pct = originalTotal > 0
  ? Math.round(((originalTotal - compressedTotal) / originalTotal) * 1000) / 10
  : 0;
manifest.failed = failed;
manifest.skipped = skipped;

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

const originalMB = (originalTotal / 1024 / 1024).toFixed(2);
const compressedMB = (compressedTotal / 1024 / 1024).toFixed(2);
console.log(`\n✓ wrote ${manifest.total} images to ${OUT_DIR}`);
console.log(`  ${originalMB} MB → ${compressedMB} MB (${manifest.total_savings_pct}% savings)`);
if (failed > 0) console.log(`  ${failed} failed (raw copy kept)`);
if (skipped > 0) console.log(`  ${skipped} skipped entirely`);
console.log(`  manifest: ${MANIFEST}`);
