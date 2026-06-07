import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL':          JSON.stringify(env.VITE_SUPABASE_URL          || env.vite_supabase_url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY':     JSON.stringify(env.VITE_SUPABASE_ANON_KEY     || env.vite_supabase_anon_key),
      'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_STRIPE_PUBLISHABLE_KEY || env.vite_stripe_publishable_key),
      'import.meta.env.VITE_STUDIO_PASSWORD':        JSON.stringify(env.VITE_STUDIO_PASSWORD        || env.vite_studio_password),
    },
  }
})
