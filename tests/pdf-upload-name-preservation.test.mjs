import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import compiled or dynamically test generateSafeUniqueFilename
const uploadMiddlewarePath = path.join(__dirname, '../backend/dist/middleware/upload.middleware.js');
const { generateSafeUniqueFilename } = await import(`file://${uploadMiddlewarePath.replace(/\\/g, '/')}`);

test('1. generateSafeUniqueFilename preserves clean original names', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-pdf-test-'));
    try {
        const result = generateSafeUniqueFilename(tempDir, 'Science_Lab_Catalogue_2026.pdf');
        assert.equal(result, 'Science_Lab_Catalogue_2026.pdf');

        const result2 = generateSafeUniqueFilename(tempDir, 'Robotics-Setup-Guide.pdf');
        assert.equal(result2, 'Robotics-Setup-Guide.pdf');
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('2. generateSafeUniqueFilename sanitizes spaces, symbols, and special characters cleanly', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-pdf-test-'));
    try {
        const result = generateSafeUniqueFilename(tempDir, 'Campus Furniture & Equipment (Final Version) 2026.pdf');
        assert.equal(result, 'Campus-Furniture-Equipment-Final-Version-2026.pdf');

        const result2 = generateSafeUniqueFilename(tempDir, 'AI-Stations (Math #1 & Physics!).pdf');
        assert.equal(result2, 'AI-Stations-Math-1-Physics.pdf');
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('3. generateSafeUniqueFilename prevents directory traversal and illegal path characters', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-pdf-test-'));
    try {
        const result = generateSafeUniqueFilename(tempDir, '../../../etc/passwd.pdf');
        assert.equal(result, 'passwd.pdf');

        const result2 = generateSafeUniqueFilename(tempDir, '..\\..\\windows\\system32.pdf');
        assert.equal(result2, 'system32.pdf');
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('4. generateSafeUniqueFilename handles duplicates with sequential suffixes without losing the original name', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-pdf-test-'));
    try {
        // Upload 1: does not exist
        const file1 = generateSafeUniqueFilename(tempDir, 'Annual_Prospectus_2026.pdf');
        assert.equal(file1, 'Annual_Prospectus_2026.pdf');
        fs.writeFileSync(path.join(tempDir, file1), 'dummy pdf content 1');

        // Upload 2: same name uploaded to another card or as an update
        const file2 = generateSafeUniqueFilename(tempDir, 'Annual_Prospectus_2026.pdf');
        assert.equal(file2, 'Annual_Prospectus_2026-1.pdf');
        fs.writeFileSync(path.join(tempDir, file2), 'dummy pdf content 2');

        // Upload 3: third time same name
        const file3 = generateSafeUniqueFilename(tempDir, 'Annual_Prospectus_2026.pdf');
        assert.equal(file3, 'Annual_Prospectus_2026-2.pdf');
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('5. generateSafeUniqueFilename provides safe fallback for blank or symbol-only filenames', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-pdf-test-'));
    try {
        const result = generateSafeUniqueFilename(tempDir, '???###.pdf');
        assert.match(result, /^file-\d+\.pdf$/);

        const result2 = generateSafeUniqueFilename(tempDir, '   .pdf');
        assert.match(result2, /^file-\d+\.pdf$/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('6. Backend upload-document route returns filename and originalName', () => {
    const pagesRoutesFile = fs.readFileSync(path.join(__dirname, '../backend/src/routes/pages.routes.ts'), 'utf8');
    assert.ok(pagesRoutesFile.includes("filename: req.file.filename"), 'Must return filename');
    assert.ok(pagesRoutesFile.includes("originalName: req.file.originalname"), 'Must return originalName');
});

test('7. Backend static file server configures Content-Disposition inline header for PDFs', () => {
    const indexFile = fs.readFileSync(path.join(__dirname, '../backend/src/index.ts'), 'utf8');
    assert.ok(indexFile.includes("filePath.endsWith('.pdf')"), 'Must check .pdf extension in setHeaders');
    assert.ok(indexFile.includes("Content-Disposition"), 'Must set Content-Disposition header');
});

test('8. Admin UnifiedPageEditor preserves and displays decoded filename', () => {
    const editorFile = fs.readFileSync(path.join(__dirname, '../frontend/src/admin/components/UnifiedPageEditor.tsx'), 'utf8');
    assert.ok(editorFile.includes('decodeURIComponent'), 'Must decode URI component for clean filename display');
    assert.ok(editorFile.includes('resolveMediaUrl(value)'), 'Must resolve media URL for preview link');
});
