/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHEETS_API_URL?: string
  readonly VITE_ADMIN_PATH?: string
  readonly VITE_ADMIN_PIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
