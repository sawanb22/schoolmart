import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.resolve(__dirname, '../public/images');

async function getSharp() {
  try {
    const sharpModule = await import('sharp');
    return sharpModule.default || sharpModule;
  } catch (err) {
    console.warn('[optimize-images] Warning: sharp could not be loaded dynamically.', err?.message || err);
    return null;
  }
}

function findImages(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findImages(fullPath));
    } else if (/\.(png|jpe?g)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function optimizeImages() {
  const sharp = await getSharp();
  if (!sharp) {
    console.log('[optimize-images] Skipping image optimization because sharp is not available.');
    return;
  }

  const files = findImages(IMAGES_DIR);
  console.log(`[optimize-images] Found ${files.length} static images in ${IMAGES_DIR}`);

  let totalOriginalBytes = 0;
  let totalWebpBytes = 0;
  let generatedCount = 0;

  for (const filePath of files) {
    const parsed = path.parse(filePath);
    // Skip if it's already a generated variant like name-960
    const stat = fs.statSync(filePath);
    totalOriginalBytes += stat.size;

    const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);
    try {
      const sharpInstance = sharp(filePath);
      const metadata = await sharpInstance.metadata();

      // 1. Generate full-size webp (quality 78)
      await sharp(filePath)
        .webp({ quality: 78 })
        .toFile(webpPath);
      generatedCount++;

      const webpStat = fs.statSync(webpPath);
      totalWebpBytes += webpStat.size;
      console.log(
        `[optimize-images] ${parsed.base} (${(stat.size / 1024).toFixed(1)} KB) -> ${parsed.name}.webp (${(webpStat.size / 1024).toFixed(1)} KB)`
      );

      // 2. If wider than 960px, generate -960.webp
      if (metadata.width && metadata.width > 960) {
        const variant960Path = path.join(parsed.dir, `${parsed.name}-960.webp`);
        await sharp(filePath)
          .resize({ width: 960 })
          .webp({ quality: 78 })
          .toFile(variant960Path);
        generatedCount++;
        const v960Stat = fs.statSync(variant960Path);
        console.log(
          `[optimize-images]   ↳ Generated 960px variant: ${parsed.name}-960.webp (${(v960Stat.size / 1024).toFixed(1)} KB)`
        );
      }
    } catch (err) {
      console.error(`[optimize-images] Failed to process ${filePath}:`, err?.message || err);
    }
  }

  const savingsPct = totalOriginalBytes > 0
    ? (((totalOriginalBytes - totalWebpBytes) / totalOriginalBytes) * 100).toFixed(1)
    : 0;

  console.log('\n--- Summary ---');
  console.log(`Images scanned: ${files.length}`);
  console.log(`WebP files generated: ${generatedCount}`);
  console.log(`Original total size: ${(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`WebP total size (base): ${(totalWebpBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Size reduction: ${savingsPct}%\n`);
}

optimizeImages();
