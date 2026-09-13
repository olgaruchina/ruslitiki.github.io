import type { APIRoute } from 'astro';
import { readContent } from '../lib/content.mjs';
import { renderLlms } from '../lib/llms.mjs';

export const GET: APIRoute = ({ site }) => new Response(renderLlms(readContent(), site), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
