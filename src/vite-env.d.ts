/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAITOKEN?: string;
  readonly VITE_ANTHROPICTOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

