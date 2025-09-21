/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // aur bhi vars add karna ho to yahan likho
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
