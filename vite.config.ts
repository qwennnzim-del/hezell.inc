
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Allow process access for node environment variables in config
declare const process: any;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Updated to match the strict GenAI requirement for API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
