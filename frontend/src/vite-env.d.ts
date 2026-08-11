/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовый URL backend API, см. docker-compose.yml (env VITE_API_URL). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
