import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        cloudflare({
            viteEnvironment: {
                name: "ssr",
            },
        }),
    ],
    resolve: {
        alias: {
            // Mirrors the `paths` entry in tsconfig.json. Keep the two in sync:
            // TypeScript resolves imports with one, Vite bundles with the other.
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    server: {
        host: true,
        proxy: {
            // Dev-only: the browser calls same-origin `/api/*`, Vite forwards it
            // to the Express server. In production `VITE_API_URL` points the
            // client straight at the API instead - see src/lib/api/apiFetch.ts.
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});
