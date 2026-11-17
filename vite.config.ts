import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  return {
    plugins: [
      react(),
      {
        name: 'development-csp',
        apply: 'serve',
        // React Fast Refresh inserts a development-only inline preamble.
        // The restrictive production policy is retained in the built HTML.
        transformIndexHtml: html => html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*\/>/, ''),
      },
    ],
    // Keep the existing public API setting; never expose the server's environment.
    define: { 'process.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL || '') },
    server: { host: 'localhost', port: 3000, strictPort: true },
    preview: { host: 'localhost', port: 3000, strictPort: true },
    build: { outDir: 'build', target: 'es2020', sourcemap: false },
  };
});
