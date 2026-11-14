/** Serves the built editor (`bun run build`) with Bun. Every unknown path falls
 * back to index.html so client-side routes and shared links resolve. */
const root = new URL('./dist/', import.meta.url);
const index = Bun.file(new URL('index.html', root));
if (!(await index.exists())) throw new Error('Missing dist/. Run `bun run build` first.');

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  hostname: Bun.env.HOST ?? '127.0.0.1',
  async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname);
    if (!path.includes('..') && path !== '/') {
      const file = Bun.file(new URL(`.${path}`, root));
      if (await file.exists()) {
        // Hashed assets never change; the page itself always revalidates.
        return new Response(file, { headers: path.startsWith('/assets/') ? { 'cache-control': 'public, max-age=31536000, immutable' } : {} });
      }
    }
    return new Response(index, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } });
  },
});
console.log(`Fishdraw: ${server.url}`);
