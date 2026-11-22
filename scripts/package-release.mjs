import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = process.env.RELEASE_VERSION || rootPkg.version || '1.0.0';

console.log(`\n==================================================`);
console.log(`📦 Packaging CampusMart Release v${version}`);
console.log(`==================================================\n`);

// 1. Build backend
console.log('🔨 Building backend...');
execSync('npm run build --prefix backend', { cwd: rootDir, stdio: 'inherit' });

// 2. Build frontend
console.log('\n🔨 Building frontend...');
execSync('node frontend/build.js', { cwd: rootDir, stdio: 'inherit' });

// 3. Prepare release directory
const releaseDir = path.join(rootDir, 'release');
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

const frontendZip = path.join(releaseDir, `frontend-${version}.zip`);
const backendZip = path.join(releaseDir, `backend-${version}.zip`);

if (fs.existsSync(frontendZip)) fs.unlinkSync(frontendZip);
if (fs.existsSync(backendZip)) fs.unlinkSync(backendZip);

// 4. Package frontend zip
console.log('\n📦 Packaging frontend zip...');
const frontendDist = path.join(rootDir, 'frontend', 'dist');
if (!fs.existsSync(frontendDist)) {
  throw new Error(`Frontend dist directory not found at ${frontendDist}`);
}
execSync(`tar -a -c -f "${frontendZip}" -C "${frontendDist}" .`, { cwd: rootDir, stdio: 'inherit' });
console.log(`✓ Created ${frontendZip} (${(fs.statSync(frontendZip).size / 1024 / 1024).toFixed(2)} MB)`);

// 5. Package backend zip
console.log('\n📦 Packaging backend zip...');
const stagingDir = path.join(releaseDir, 'staging-backend');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Copy backend dist (which includes dist/scripts/)
fs.cpSync(path.join(rootDir, 'backend', 'dist'), path.join(stagingDir, 'dist'), { recursive: true });
// Copy backend prisma (schema + migrations)
fs.cpSync(path.join(rootDir, 'backend', 'prisma'), path.join(stagingDir, 'prisma'), { recursive: true });
// Copy package files
fs.copyFileSync(path.join(rootDir, 'backend', 'package.json'), path.join(stagingDir, 'package.json'));
if (fs.existsSync(path.join(rootDir, 'backend', 'package-lock.json'))) {
  fs.copyFileSync(path.join(rootDir, 'backend', 'package-lock.json'), path.join(stagingDir, 'package-lock.json'));
}
if (fs.existsSync(path.join(rootDir, 'backend', '.env.example'))) {
  fs.copyFileSync(path.join(rootDir, 'backend', '.env.example'), path.join(stagingDir, '.env.example'));
}

execSync(`tar -a -c -f "${backendZip}" -C "${stagingDir}" .`, { cwd: rootDir, stdio: 'inherit' });
console.log(`✓ Created ${backendZip} (${(fs.statSync(backendZip).size / 1024 / 1024).toFixed(2)} MB)`);

// Clean up staging directory
fs.rmSync(stagingDir, { recursive: true, force: true });

console.log(`\n==================================================`);
console.log(`✅ Release packages ready in release/`);
console.log(`   - Frontend: release/frontend-${version}.zip`);
console.log(`   - Backend:  release/backend-${version}.zip`);
console.log(`==================================================\n`);
