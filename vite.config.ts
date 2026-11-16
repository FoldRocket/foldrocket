import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const entry = process.env.FRKT_ENTRY || 'admin';
const entries: Record<string, { file: string; name: string; out: string }> = {
  admin: {
    file: 'admin/src/main.tsx',
    name: 'FRKTAdmin',
    out: 'admin.js',
  },
  'admin-free': {
    file: 'admin/src/main-free.tsx',
    name: 'FRKTAdmin',
    out: 'admin.js',
  },
  'media-modal': {
    file: 'admin/src/media-modal/main.tsx',
    name: 'FRKTMediaModal',
    out: 'media-modal-app.js',
  },
};

const selected = entries[entry] || entries.admin;
const isMediaModal = entry === 'media-modal';
const isFreeBuild = process.env.FRKT_EDITION === 'free' || process.env.FRKT_EDITION === 'wporg';
const packageVersion = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'),
).version;
// Plugin releases may intentionally be rebuilt without changing their public
// version. Use a per-build asset id so cached entries never reference chunks
// removed by a later 1.4.30 package.
const assetBuildId = process.env.FRKT_ASSET_BUILD_ID || `${packageVersion}-${Date.now()}`;

/**
 * WordPress appends ?ver=... to the enqueued entry module. Rollup may let lazy
 * chunks import shared exports back from that entry; without the same query
 * string the browser treats admin.js and admin.js?ver=... as two modules and
 * boots React twice. Keep those circular entry imports on the exact URL that
 * WordPress enqueues.
 */
const wordpressModuleVersionPlugin = {
  name: 'frkt-wordpress-module-version',
  generateBundle(_options: unknown, bundle: Record<string, { type: string; code?: string }>) {
    if (isMediaModal) return;

    const entryImport = `../${selected.out}`;
    const versionedEntryImport = `${entryImport}?ver=${assetBuildId}`;
    for (const output of Object.values(bundle)) {
      if (output.type !== 'chunk' || !output.code) continue;
      output.code = output.code.split(entryImport).join(versionedEntryImport);
    }
    this.emitFile({
      type: 'asset',
      fileName: 'build-id.txt',
      source: assetBuildId,
    });
  },
};

export default defineConfig({
  // Relative preload URLs are required because the plugin can live below any
  // WordPress content URL, not at the site root.
  base: './',
  plugins: [react({ jsxRuntime: isFreeBuild ? 'classic' : 'automatic' }), wordpressModuleVersionPlugin],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __FRKT_FREE__: JSON.stringify(isFreeBuild),
  },
  build: {
    outDir: process.env.FRKT_OUT_DIR || 'assets/js',
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, selected.file),
      // WordPress.org plugins must use the React and ReactDOM copies bundled
      // with WordPress. The commercial build remains self-contained.
      external: isFreeBuild ? ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'] : [],
      output: {
        // The WordPress media bridge is a classic script and calls the global
        // mount API immediately after this dependency loads. Keep that entry
        // self-contained; the admin SPA can use native module code splitting.
        format: isMediaModal || isFreeBuild ? 'iife' : 'es',
        name: selected.name,
        inlineDynamicImports: isMediaModal || isFreeBuild,
        globals: isFreeBuild
          ? {
              react: 'React',
              'react-dom': 'ReactDOM',
              'react-dom/client': 'ReactDOM',
              'react/jsx-runtime': 'ReactJSXRuntime',
            }
          : undefined,
        entryFileNames: selected.out,
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'chunks/[name]-[hash][extname]',
      },
    },
  },
});
