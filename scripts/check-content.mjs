import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readContent } from '../src/lib/content.mjs';
try {
  const content = readContent();
  if (!existsSync(resolve(process.env.RUSLITIKI_PUBLIC_DIR || 'public', content.logo.slice(1)))) throw new Error('The selected logo is missing from the image library.');
  console.log('Content is valid.');
} catch(error) { console.error(error.message); process.exitCode = 1; }
