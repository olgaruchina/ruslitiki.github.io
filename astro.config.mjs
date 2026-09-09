import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.ruslitiki.com',
  output: 'static',
  trailingSlash: 'always',
  publicDir: process.env.RUSLITIKI_PUBLIC_DIR || './public',
  build: { format: 'directory' },
});
