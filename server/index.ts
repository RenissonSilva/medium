import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types';
import { lanUrls } from './net';
import { RoomManager } from './rooms';

const isDev = process.argv.includes('--dev');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
/** URL pública (ex.: https://medium.onrender.com). Se vazia, o QR code usa o endereço atual. */
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '') || null;

const here = dirname(fileURLToPath(import.meta.url));
// Em dev este arquivo roda de server/index.ts; em produção ele vira dist/server.js (ao lado de dist/client).
const projectRoot = join(here, '..');
const clientDist = existsSync(join(here, 'client')) ? join(here, 'client') : join(projectRoot, 'dist', 'client');

const app = express();
app.disable('x-powered-by');
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  serveClient: false,
  pingInterval: 10_000,
  pingTimeout: 10_000,
  // Em dev o HMR do Vite divide o mesmo servidor HTTP.
  destroyUpgrade: !isDev,
});

const rooms = new RoomManager(io);
rooms.attach();

app.get('/api/config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ publicUrl: PUBLIC_URL, lanUrls: lanUrls(PORT) });
});
// Foto de perfil. O hash no endereço muda junto com a foto, então dá para guardar em cache para sempre.
app.get('/api/photo/:code/:player/:hash', (req, res) => {
  const photo = rooms.photo(req.params.code, req.params.player, req.params.hash);
  if (!photo) {
    res.set('Cache-Control', 'no-store').status(404).end();
    return;
  }
  res.set({
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'private, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(photo.data);
});
app.get('/healthz', (_req, res) => {
  res.type('text').send('ok');
});

if (isDev) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    configFile: join(projectRoot, 'vite.config.ts'),
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  if (!existsSync(join(clientDist, 'index.html'))) {
    console.error('Não achei o build do cliente. Rode "npm run build" antes de "npm start".');
    process.exit(1);
  }
  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${sep}assets${sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );
  // Qualquer outra rota (ex.: /4KQ7 vindo do QR code) abre o app.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(join(clientDist, 'index.html'));
  });
}

httpServer.listen(PORT, HOST, () => {
  const lan = lanUrls(PORT);
  console.log('\n  Medium está no ar!\n');
  console.log(`  Neste computador:  http://localhost:${PORT}`);
  if (lan[0]) console.log(`  No celular (mesma Wi-Fi):  ${lan[0]}`);
  if (PUBLIC_URL) console.log(`  Endereço público:  ${PUBLIC_URL}`);
  console.log('');
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    io.close();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
