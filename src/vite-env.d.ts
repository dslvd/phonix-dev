/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VERTEX_AI_API_KEY?: string;
  readonly VITE_VERTEX_AI_PROJECT_ID?: string;
  readonly VITE_VERTEX_AI_LOCATION?: string;
  readonly VITE_GOOGLE_CLOUD_PROJECT?: string;
  readonly VITE_GOOGLE_CLOUD_LOCATION?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_VISION_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
