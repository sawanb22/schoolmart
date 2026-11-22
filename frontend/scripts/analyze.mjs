import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const distDir = path.resolve(frontendDir, 'dist');

console.log('📊 Running bundle analysis with rollup-plugin-visualizer...');

await build({
  configFile: path.resolve(frontendDir, 'vite.config.ts'),
  root: frontendDir,
  mode: 'production',
  plugins: [
    visualizer({
      filename: path.resolve(distDir, 'stats.html'),
      title: 'SchoolMart Bundle Visualizer',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ],
  build: {
    emptyOutDir: false,
  },
});

console.log(`✅ Bundle analysis complete! Report generated at: ${path.resolve(distDir, 'stats.html')}`);
