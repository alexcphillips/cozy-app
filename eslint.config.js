import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

/**
 * One config for the whole monorepo, split by workspace: browser globals and
 * React rules for `ui/`, Node globals for `server/`, neither for `shared/`
 * (which must run in both).
 */
export default defineConfig([
    globalIgnores(["**/dist", "**/node_modules"]),

    {
        files: ["**/*.{ts,tsx}"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: { ecmaVersion: 2022 },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
        },
    },

    {
        files: ["ui/**/*.{ts,tsx}"],
        extends: [
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: { globals: globals.browser },
    },

    {
        files: ["server/**/*.ts"],
        languageOptions: { globals: globals.node },
    },
]);
