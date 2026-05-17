/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Full API base, e.g. https://api-payverify-dev.../api  */
    readonly VITE_API_BASE?: string;

    /** Optional request timeout in ms (string in .env, parsed to number) */
    readonly VITE_HTTP_TIMEOUT_MS?: string;

    /** Legacy/alt var if you prefer VITE_API_URL */
    readonly VITE_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
