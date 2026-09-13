export function GET() {
  const text = process.env.RUSLITIKI_PREVIEW === '1'
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\nSitemap: https://www.ruslitiki.com/sitemap.xml\n';
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
