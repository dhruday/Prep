import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Optional: if you want to proxy gRPC-Web calls through Vite dev server
    // (useful if you can't run Docker). Uncomment and remove the Envoy address
    // in transport.ts instead.
    //
    // proxy: {
    //   '/user.v1.UserService': {
    //     target: 'http://localhost:8080',
    //     changeOrigin: true,
    //   },
    // },
  },
});
