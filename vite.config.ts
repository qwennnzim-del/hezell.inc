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
      // Updated to match the user's specific variable name
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    }
  }
})