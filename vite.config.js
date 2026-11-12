import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [cloudflare()],
  environments: {
    client: { build: { rollupOptions: { input: ['index.html', 'docs.html', 'privacy.html', '404.html'] } } },
  },
})
