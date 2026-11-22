import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { runMediaAudit } from './audit-media-urls';
import { UPLOADS_DIR } from '../src/lib/uploads-dir';

const BASE_REMOTE = 'https://sportsurf.in/new';
const CONCURRENCY = 5;

async function downloadFile(urlPath: string, targetPath: string): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
    try {
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 0) {
            return { success: true, skipped: true };
        }

        const uploadIdx = urlPath.indexOf('/uploads/');
        let subPath = urlPath.substring(uploadIdx);
        subPath = subPath.split('?')[0].split('#')[0].replace(/["'\]]+$/, '');

        // Encode URI path segments safely but keep slashes
        const encodedSubPath = subPath
            .split('/')
            .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
            .join('/');
        const remoteUrl = `${BASE_REMOTE}${encodedSubPath}`;

        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const resp = await fetch(remoteUrl);
        if (!resp.ok) {
            return { success: false, error: `HTTP ${resp.status} ${resp.statusText} from ${remoteUrl}` };
        }

        const arrayBuffer = await resp.arrayBuffer();
        fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

async function main() {
    console.log('[download-legacy-uploads] Auditing media URLs to find missing files...');
    const audit = await runMediaAudit();

    // Map unique expected path to url
    const uniqueDownloads = new Map<string, string>();
    for (const missing of audit.uploadsFound.missingFiles) {
        if (!uniqueDownloads.has(missing.expectedPath)) {
            uniqueDownloads.set(missing.expectedPath, missing.url);
        }
    }

    console.log(`[download-legacy-uploads] Found ${uniqueDownloads.size} unique files to check/download.`);
    if (uniqueDownloads.size === 0) {
        console.log('[download-legacy-uploads] No missing files. Everything is on disk!');
        return;
    }

    const items = Array.from(uniqueDownloads.entries());
    let succeeded = 0;
    let skipped = 0;
    let failed = 0;
    const failures: Array<{ path: string; url: string; error?: string }> = [];

    // Worker queue with concurrency limit
    let index = 0;
    async function worker() {
        while (index < items.length) {
            const currentIdx = index++;
            const [targetPath, url] = items[currentIdx];
            const relName = path.relative(UPLOADS_DIR, targetPath);

            const res = await downloadFile(url, targetPath);
            if (res.success) {
                if (res.skipped) {
                    skipped++;
                } else {
                    succeeded++;
                }
                const done = succeeded + skipped;
                if (done % 25 === 0 || done === items.length) {
                    console.log(`[download-legacy-uploads] Progress: ${done}/${items.length} (new: ${succeeded}, skipped: ${skipped})...`);
                }
            } else {
                failed++;
                console.warn(`[FAILED] ${relName}: ${res.error}`);
                failures.push({ path: targetPath, url, error: res.error });
            }
        }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker());
    await Promise.all(workers);

    console.log('\n================ DOWNLOAD SUMMARY ================');
    console.log(`Total checked   : ${items.length}`);
    console.log(`Newly downloaded: ${succeeded}`);
    console.log(`Already on disk : ${skipped}`);
    console.log(`Failed          : ${failed}`);

    if (failed > 0) {
        console.log('\nFailed downloads:');
        for (const f of failures) {
            console.log(`  - ${f.url} -> ${f.error}`);
        }
    }
    console.log('==================================================\n');
}

main().catch((err) => {
    console.error('[download-legacy-uploads] Fatal error:', err);
    process.exit(1);
});
