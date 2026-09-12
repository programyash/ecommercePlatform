/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" switches the app to hash routing (static builds). */
  readonly VITE_HASH_ROUTER?: string
  /** Optional ISO timestamp that pins "now" for the synthetic data. */
  readonly VITE_DEMO_NOW?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
