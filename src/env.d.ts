/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OVERLAY_CONFIG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}