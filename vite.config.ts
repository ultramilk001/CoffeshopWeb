import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  // Gunakan '/CoffeshopWeb/' untuk semua production build (baik di local komputer Anda maupun di GitHub Actions)
  // Gunakan '/' hanya untuk development mode (serve / preview AI Studio) agar tampil sempurna
  const isBuild = command === 'build';

  return {
    base: isBuild ? '/CoffeshopWeb/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});