/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOME_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
