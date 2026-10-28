import page from './web/index.html';

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  hostname: Bun.env.HOST ?? '127.0.0.1',
  routes: { '/': page },
  fetch() { return new Response('Not found', { status: 404 }); },
  development: Bun.env.NODE_ENV !== 'production' && { hmr: true, console: true },
});
console.log(`Fishdraw: ${server.url}`);
