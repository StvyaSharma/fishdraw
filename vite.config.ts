import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig({
  root: 'web',
  plugins: [
    // The router plugin must come before React.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: 'routes',
      generatedRouteTree: 'routeTree.gen.ts',
      addExtensions: true,
      quoteStyle: 'single',
    }),
    react(),
  ],
  server: { host: '127.0.0.1', port: Number(process.env.PORT ?? 3000) },
  preview: { host: '127.0.0.1', port: Number(process.env.PORT ?? 3000) },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        // Framework code changes far less often than the app: separate chunks
        // stay cached across deploys.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'panels', test: /node_modules[\\/](dialkit|motion|motion-dom|motion-utils|framer-motion)[\\/]/ },
            { name: 'router', test: /node_modules[\\/]@tanstack[\\/]/ },
          ],
        },
      },
    },
  },
});
