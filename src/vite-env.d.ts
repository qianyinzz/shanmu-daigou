/// <reference types="vite/client" />

declare module '@vitejs/plugin-react' {
  import type { Plugin } from 'vite';
  const plugin: (options?: Record<string, unknown>) => Plugin;
  export default plugin;
}

declare module '@tailwindcss/vite' {
  import type { Plugin } from 'vite';
  const plugin: (options?: Record<string, unknown>) => Plugin;
  export default plugin;
}
