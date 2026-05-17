/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
    plugins: [react(), svgr()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: {
        port: 5173, strictPort: true, open: true,
        proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } }
    },
    preview: { port: 5174, strictPort: true }
});
